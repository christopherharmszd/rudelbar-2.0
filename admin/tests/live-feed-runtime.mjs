// Isolated Cloudflare runtime: no production calls, emails or push messages.
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {unstable_splitSqlQuery} from 'wrangler';
const source=`import {LiveFeed} from './lib/live-feed.mjs';
export class MeasuredFeed extends LiveFeed{
 constructor(ctx,env){const counts={watchdog:0};super(ctx,{...env,LIVE_DB:{prepare(sql){if(sql.includes('AND revision>?'))counts.watchdog++;return env.LIVE_DB.prepare(sql);}}});this.counts=counts;}
 async fetch(request){if(new URL(request.url).pathname==='/probe')return Response.json({...this.counts,sockets:this.ctx.getWebSockets().length,alarm:await this.ctx.storage.getAlarm()});return super.fetch(request);}
}
export default {fetch(request,env){const url=new URL(request.url),headers=new Headers(request.headers);headers.set('x-live-event','evening');headers.set('x-live-audience',url.searchParams.get('team')?'team':'guest');headers.set('x-live-viewer','g:'+url.searchParams.get('viewer'));headers.set('x-live-scopes',JSON.stringify(['g:'+url.searchParams.get('viewer')]));headers.set('x-live-expiry',String(Date.now()+60000));return env.APP_FEED.get(env.APP_FEED.idFromName('evening')).fetch(new Request('https://internal'+url.pathname,{headers}));}};`;
const bundled=(await build({stdin:{contents:source,sourcefile:'live-feed-runtime.mjs',resolveDir:new URL('../',import.meta.url).pathname},bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']})).outputFiles[0].text;
const mf=new Miniflare({workers:[{config:{name:'live-feed-runtime',compatibilityDate:'2026-09-28',manifest:{mainModule:'index.mjs',modules:{'index.mjs':{type:'esm',contents:bundled}}},exports:{MeasuredFeed:{type:'durable-object',storage:'sqlite'}},env:{LIVE_DB:{type:'d1',name:'isolated-live-feed'},APP_FEED:{type:'durable-object',worker:'live-feed-runtime',exportName:'MeasuredFeed'}}}}]});
const wait=ms=>new Promise(r=>setTimeout(r,ms)),sockets=[];
try{
 await mf.ready;const db=await mf.getD1Database('LIVE_DB'),directory=new URL('../migrations/',import.meta.url);
 for(const file of (await readdir(directory)).filter(n=>n.endsWith('.sql')).sort())for(const sql of unstable_splitSqlQuery(await readFile(new URL(file,directory),'utf8')))await db.prepare(sql).run();
 const notices=Array.from({length:150},()=>[]);
 for(let i=0;i<150;i++){const response=await mf.dispatchFetch('https://runtime.test/socket?viewer='+i,{headers:{upgrade:'websocket'}});assert.equal(response.status,101,response.status!==101?await response.text():undefined);const socket=response.webSocket;socket.accept();socket.addEventListener('message',event=>notices[i].push(JSON.parse(event.data)));sockets.push(socket);}
 await wait(20);assert.ok(notices.every(items=>items[0]?.type==='ready'));
 const probe=async()=>await(await mf.dispatchFetch('https://runtime.test/probe')).json();const first=await probe();assert.equal(first.sockets,150);
 await db.prepare("INSERT INTO app_live_signals VALUES('evening','guest','g:0','inbox',1,1)").run();
 await db.prepare("INSERT INTO app_live_signals VALUES('evening','team','','moderation',2,1)").run();
 const deadline=Date.now()+6500;while(!notices[0].some(n=>n.type==='change')&&Date.now()<deadline)await wait(25);
 assert.deepEqual(notices[0].find(n=>n.type==='change')?.topics,['inbox']);assert.ok(notices.slice(1).every(items=>items.every(n=>n.type!=='change')));assert.equal((await probe()).watchdog,first.watchdog+1);
 const ns=await mf.getDurableObjectNamespace('APP_FEED');await mf.unsafeEvictDurableObject('live-feed-runtime','MeasuredFeed',{name:'evening',webSockets:'hibernate'});
 await db.prepare("INSERT INTO app_live_signals VALUES('evening','public','','configuration',3,1)").run();
 const changed=Date.now()+6500;while(!notices.every(items=>items.some(n=>n.type==='change'&&n.topics.includes('configuration')))&&Date.now()<changed)await wait(25);
 assert.ok(notices.every(items=>items.some(n=>n.type==='change'&&n.topics.includes('configuration'))));
 assert.ok(notices.flat().every(item=>Object.keys(item).every(key=>['type','topics','revision'].includes(key))));
 for(const socket of sockets)socket.close();await wait(100);
 const stopped=(await probe()).watchdog;await wait(5500);assert.equal((await probe()).watchdog,stopped);assert.equal((await probe()).alarm,null);
 console.log(JSON.stringify({clients:150,intervalMs:5000,checksPerInterval:1,personalIsolation:true,hibernation:true,noChecksWithoutClients:true,providerCalls:0}));
}finally{for(const socket of sockets)try{socket.close();}catch{}await mf.dispose();}
