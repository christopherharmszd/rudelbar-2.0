import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {sqliteD1} from './sqlite-d1.mjs';
import {topicsForSignals,readLiveSignals,liveSignalSocket,expireLiveSignals} from '../lib/live-signals.mjs';
const directory=new URL('../migrations/',import.meta.url),schema=(await Promise.all((await readdir(directory)).filter(n=>n.endsWith('.sql')).sort().map(n=>readFile(new URL(n,directory),'utf8')))).join('\n');
test('every signal trigger references real source columns and leaves original source tables intact',()=>{
 const db=sqliteD1();try{db.connection.exec(schema);const triggers=db.connection.prepare("SELECT tbl_name,sql FROM sqlite_master WHERE type='trigger' AND name LIKE 'app_signal_%'").all();assert.ok(triggers.length>40);
 for(const t of triggers){const columns=new Set(db.connection.prepare('PRAGMA table_info('+t.tbl_name+')').all().map(c=>c.name));for(const match of t.sql.matchAll(/\b(?:NEW|OLD)\.([a-z_]+)/gi))assert.ok(columns.has(match[1]),t.tbl_name+'.'+match[1]);}
 }finally{db.connection.close();}
});
test('routing keeps personal markers private, de-duplicates topics and ignores stale revisions',()=>{
 const rows=[{audience:'guest',recipient:'g:one',topic:'inbox',revision:2},{audience:'guest',recipient:'g:two',topic:'inbox',revision:3},{audience:'team',recipient:'',topic:'moderation',revision:4},{audience:'public',recipient:'',topic:'wall',revision:5},{audience:'guest',recipient:'g:one',topic:'inbox',revision:1}];
 assert.deepEqual(topicsForSignals({audience:'guest',scopes:['g:one'],cursor:1},rows),['inbox','wall']);assert.deepEqual(topicsForSignals({audience:'public',scopes:[],cursor:1},rows),['wall']);assert.deepEqual(topicsForSignals({audience:'team',scopes:[],cursor:1},rows),['moderation','wall']);
});
test('markers commit with the source write, coalesce changes, and do not survive a rolled-back write',async()=>{
 const db=sqliteD1();try{db.connection.exec(schema);await db.prepare("INSERT INTO wall_controls(event_id,config_json,updated_at) VALUES('evening','{}',1)").run();const before=await readLiveSignals(db,'evening');assert.equal(before.rows[0].topic,'wall');
 await assert.rejects(()=>db.batch([db.prepare("UPDATE wall_controls SET revision=2 WHERE event_id='evening'"),db.prepare("INSERT INTO missing_table VALUES('invalid')")]));assert.equal((await readLiveSignals(db,'evening')).revision,before.revision);
 for(let i=0;i<100;i++)await db.prepare("UPDATE wall_controls SET revision=revision+1 WHERE event_id='evening'").run();const after=await readLiveSignals(db,'evening',before.revision);assert.equal(after.rows.length,1);assert.equal(after.revision,before.revision+100);assert.equal((await readLiveSignals(db,'different')).rows.length,0);
 }finally{db.connection.close();}
});
test('the socket bridge requires a same-origin upgrade before forwarding trusted identity metadata',async()=>{
 let forwarded=0;const env={APP_FEED:{idFromName:id=>id,get:id=>({fetch:async request=>{forwarded++;assert.equal(request.headers.get('x-live-viewer'),'g:one');assert.equal(request.headers.get('cookie'),null);return new Response('fixture');}})}};
 const input={eventId:'evening',audience:'guest',viewer:'g:one',scopes:['g:one'],expiresAt:Date.now()+60000};assert.equal((await liveSignalSocket(env,new Request('https://app.test/api/guest/updates',{headers:{origin:'https://foreign.test',upgrade:'websocket'}}),input)).status,403);assert.equal(forwarded,0);
 await liveSignalSocket(env,new Request('https://app.test/api/guest/updates',{headers:{origin:'https://app.test',upgrade:'websocket',cookie:'never-forward-me'}}),input);assert.equal(forwarded,1);
});
test('expired change markers are removed in bounded maintenance without touching source messages',async()=>{
 const db=sqliteD1();try{db.connection.exec(schema);const now=3*86400000;await db.prepare("INSERT INTO app_live_signals VALUES('old','guest','g:old','inbox',1,1)").run();await db.prepare("INSERT INTO app_live_signals VALUES('current','guest','g:current','inbox',2,?)").bind(now).run();await expireLiveSignals({LIVE_DB:db,RUDELBAR_RUNTIME_CONTEXT:'1'},now);assert.equal((await readLiveSignals(db,'old')).rows.length,0);assert.equal((await readLiveSignals(db,'current')).rows.length,1);assert.equal(db.connection.prepare('SELECT last_run FROM app_live_signal_maintenance').get().last_run,now);}
 finally{db.connection.close();}
});
