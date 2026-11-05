import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const qa=new URL('../.qa/',import.meta.url),context=JSON.parse(await readFile(new URL('wall-local-context.json',qa),'utf8'));
const {cms,guest,cookie,csrf}=context;
if(new URL(cms).hostname!=='localhost'||new URL(guest).hostname!=='localhost')throw Error('Local fixture only.');
const eventId=JSON.parse(await readFile(new URL('wall-density.json',qa),'utf8')).events.find(e=>e.count===1).eventId;
async function request(action,method='GET',body,query={}){
 const response=await fetch(cms+'/api/wall/'+action+'?'+new URLSearchParams({abend:eventId,...query}),{method,headers:{Origin:cms,Cookie:cookie,'X-CSRF-Token':csrf,...(body instanceof Uint8Array?{'Content-Length':String(body.length)}:body?{'Content-Type':'application/json'}:{})},...(body?{body:body instanceof Uint8Array?body:JSON.stringify(body)}:{})});
 assert.ok(response.ok,action+': '+response.status);return response;
}
const before=await (await fetch(guest+'/api/guest/wall/state?abend='+eventId)).json();
const archive=await (await request('archive/export','POST',{})).json();assert.equal(archive.manifest.posts.length,1);
const restoreId=crypto.randomUUID();await request('archive/restore','POST',{manifest:archive.manifest,sha256:archive.sha256,signature:archive.signature,operationKey:restoreId});
for(const file of archive.manifest.files){
 const source=await request('archive/file','GET',null,{export:archive.id,path:file.path});
 await request('archive/restore-file','PUT',new Uint8Array(await source.arrayBuffer()),{restore:restoreId,path:file.path});
}
const completed=await (await request('archive/finalize','POST',{id:restoreId})).json();assert.equal(completed.ready,true);
const view=await (await request('archive/view','GET',null,{restore:restoreId})).json();assert.equal(view.manifest.expiresAt,archive.manifest.expiresAt);assert.equal(view.manifest.posts[0].externalConsent,false);
const after=await (await fetch(guest+'/api/guest/wall/state?abend='+eventId)).json();assert.deepEqual(after.posts,before.posts,'Restoration must not republish contributions.');
await writeFile(new URL('wall-archive-context.json',qa),JSON.stringify({eventId,restoreId}),{mode:0o600});
console.log(JSON.stringify({isolated:true,passed:true,eventId,restoreId,files:archive.manifest.files.length,unchangedPublicPosts:after.posts.length}));
