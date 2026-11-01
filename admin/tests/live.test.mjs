import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sqliteD1} from './sqlite-d1.mjs';
import {createLiveService} from '../lib/live-service.mjs';
import {liveApi} from '../lib/live-api.mjs';
import visitorWorker from '../../event-app/worker.mjs';
const schema=await readFile(new URL('../migrations/0001_live_stations.sql',import.meta.url),'utf8')+await readFile(new URL('../migrations/0002_notifications.sql',import.meta.url),'utf8')+await readFile(new URL('../migrations/0003_accounts.sql',import.meta.url),'utf8');
async function setup(){
 const db=sqliteD1();db.connection.exec(schema);
 const ctx={event:{eventId:'evening-a',visibility:'public',accessCode:'private-key',teamIds:['person-a','person-b']},release:{state:'open'},people:[{personId:'person-a',name:'Alex',archived:false},{personId:'person-b',name:'Nora',archived:false}],stations:[
 {id:'dj',name:'Musik',kind:'music',operatorIds:['person-a'],enabled:true},
 {id:'karaoke',name:'Mikro',kind:'karaoke',operatorIds:['person-b'],enabled:true},
 {id:'technik',name:'Technik',kind:'message',operatorIds:['person-a'],enabled:true},
 {id:'team',name:'Gemeinsamer Eingang',kind:'message',operatorIds:[],enabled:true}]};
 const service=createLiveService({LIVE_DB:db},null,{getContext:async id=>{if(id!=='evening-a')throw Object.assign(new Error('Not found'),{status:404});return ctx;}});
 const a=await service.session({eventId:'evening-a',name:'Gast A'}),b=await service.session({eventId:'evening-a',name:'Gast B'});
 const grantA=await service.issueGrant('evening-a','person-a'),grantB=await service.issueGrant('evening-a','person-b');
 return {db,ctx,service,a,b,grantA,grantB,actorA:await service.operator(grantA.code),actorB:await service.operator(grantB.code),close:()=>db.connection.close()};
}
const input={music:{song:'Dancing Queen',artist:'ABBA',note:'Zum Tanzen'},karaoke:{song:'Ein Kompliment',format:'duet'},message:{text:'Kann uns jemand helfen?',subject:'Eine Frage'}};
async function submit(s,stationId,kind='message',extra={}){return s.service.submit({eventId:'evening-a',stationId,sessionToken:s.a.sessionToken,clientKey:crypto.randomUUID(),input:input[kind],...extra});}
const status=code=>error=>error.status===code;

test('every station type stores a real request and a visitor only sees their own conversations',async()=>{
 const s=await setup();try{
  for(const [station,kind] of [['dj','music'],['karaoke','karaoke'],['technik','message'],['team','message']]){const {request}=await submit(s,station,kind);assert.equal(request.kind,kind);assert.equal(request.stationId,station);assert.equal(request.visitorName,'Gast A');assert.equal(request.status,'new');}
  assert.equal((await s.service.mine({eventId:'evening-a',sessionToken:s.a.sessionToken})).requests.length,4);
  assert.equal((await s.service.mine({eventId:'evening-a',sessionToken:s.b.sessionToken})).requests.length,0);
  const own=(await s.service.mine({eventId:'evening-a',sessionToken:s.a.sessionToken})).requests[0];
  await assert.rejects(()=>s.service.mine({eventId:'evening-a',sessionToken:s.b.sessionToken,id:own.id}),status(404));
  await assert.rejects(()=>s.service.mine({eventId:'other',sessionToken:s.a.sessionToken}),status(401));
 }finally{s.close();}
});

test('operator access follows person assignments and the shared team station',async()=>{
 const s=await setup();try{
  for(const station of ['dj','karaoke','technik','team'])await submit(s,station,station==='dj'?'music':station==='karaoke'?'karaoke':'message');
  const a=await s.service.inbox(s.actorA),b=await s.service.inbox(s.actorB);
  assert.deepEqual(new Set(a.requests.map(r=>r.stationId)),new Set(['dj','technik','team']));
  assert.deepEqual(new Set(b.requests.map(r=>r.stationId)),new Set(['karaoke','team']));
  const karaoke=b.requests.find(r=>r.stationId==='karaoke');
  await assert.rejects(()=>s.service.inbox(s.actorA,{id:karaoke.id}),status(404));
  await assert.rejects(()=>s.service.staffUpdate(s.actorA,karaoke.id,{status:'done',revision:karaoke.revision}),status(404));
  assert.equal((await s.service.inbox(await s.service.publisher('evening-a'))).requests.length,4);
 }finally{s.close();}
});

test('team replies and status changes return to the guest while internal notes stay private',async()=>{
 const s=await setup();try{
  let {request}=await submit(s,'technik');
  let result=await s.service.staffUpdate(s.actorA,request.id,{reply:'Wir kommen gleich zu dir.',status:'in_progress',revision:request.revision});
  assert.equal(result.request.status,'in_progress');
  result=await s.service.staffUpdate(s.actorA,request.id,{reply:'Intern: Schlüssel bei Nora.',internal:true,revision:result.request.revision});
  const guest=await s.service.mine({eventId:'evening-a',sessionToken:s.a.sessionToken,id:request.id});
  assert.ok(guest.messages.some(m=>m.body==='Wir kommen gleich zu dir.'));assert.ok(!JSON.stringify(guest).includes('Schlüssel'));
  const listing=await s.service.mine({eventId:'evening-a',sessionToken:s.a.sessionToken});assert.ok(!JSON.stringify(listing).includes('Schlüssel'));
  const reply=await s.service.guestUpdate({eventId:'evening-a',sessionToken:s.a.sessionToken,id:request.id,input:{reply:'Wir sind am Kicker.',revision:result.request.revision}});
  assert.equal(reply.messages.at(-1).body,'Wir sind am Kicker.');
  const done=await s.service.staffUpdate(s.actorA,request.id,{status:'done',revision:reply.request.revision});assert.equal(done.request.status,'done');
 }finally{s.close();}
});

test('concurrent stale replies fail atomically and do not append a duplicate message',async()=>{
 const s=await setup();try{
  const {request}=await submit(s,'dj','music');
  await s.service.staffUpdate(s.actorA,request.id,{reply:'Eingeplant',status:'queued',revision:request.revision});
  await assert.rejects(()=>s.service.staffUpdate(s.actorA,request.id,{reply:'Stale reply',status:'done',revision:request.revision}),status(409));
  const thread=await s.service.inbox(s.actorA,{id:request.id});assert.equal(thread.request.status,'queued');assert.ok(!JSON.stringify(thread).includes('Stale reply'));
 }finally{s.close();}
});

test('idempotency and rate limiting prevent duplicate submissions and request floods',async()=>{
 const s=await setup();try{
  const clientKey=crypto.randomUUID(),opts={eventId:'evening-a',stationId:'team',sessionToken:s.a.sessionToken,clientKey,input:input.message};
  const first=await s.service.submit(opts),again=await s.service.submit(opts);assert.equal(first.request.id,again.request.id);
  for(let i=1;i<10;i++)await submit(s,'team');
  await assert.rejects(()=>submit(s,'team'),status(429));
  assert.equal((await s.service.mine({eventId:'evening-a',sessionToken:s.a.sessionToken})).requests.length,10);
 }finally{s.close();}
});

test('station pause, event closure and private access are enforced on server writes',async()=>{
 const s=await setup();try{
  const {request}=await submit(s,'dj','music');
  await s.service.stationState(s.actorA,'dj',{accepting:false,revision:0});
  await assert.rejects(()=>submit(s,'dj','music'),status(409));
  await assert.rejects(()=>s.service.stationState(s.actorB,'dj',{accepting:true,revision:1}),status(403));
  await s.service.stationState(s.actorA,'dj',{accepting:true,revision:1});
  s.ctx.release.state='closed';await assert.rejects(()=>submit(s,'team'),status(409));
  await assert.rejects(()=>s.service.guestUpdate({eventId:'evening-a',sessionToken:s.a.sessionToken,id:request.id,input:{reply:'Still closed',revision:request.revision}}),status(409));
  assert.equal((await s.service.mine({eventId:'evening-a',sessionToken:s.a.sessionToken})).requests.length,1);
  s.ctx.release.state='open';s.ctx.event.visibility='private';
  await assert.rejects(()=>s.service.session({eventId:'evening-a',name:'Intruder'}),status(404));
  await assert.rejects(()=>submit(s,'team'),status(404));
  assert.ok((await submit(s,'team','message',{accessCode:'private-key'})).request.id);
 }finally{s.close();}
});

test('forwarding transfers access and karaoke requests can be prioritised and cancelled',async()=>{
 const s=await setup();try{
  let {request}=await submit(s,'technik');
  const moved=await s.service.staffUpdate(s.actorA,request.id,{stationId:'karaoke',revision:request.revision});assert.equal(moved.request.stationId,'karaoke');
  await assert.rejects(()=>s.service.inbox(s.actorA,{id:request.id}),status(404));assert.equal((await s.service.inbox(s.actorB,{id:request.id})).request.id,request.id);
  const second=await submit(s,'karaoke','karaoke');
  const promoted=await s.service.staffUpdate(s.actorB,second.request.id,{status:'queued',promote:true,revision:second.request.revision});
  assert.ok(promoted.request.queueOrder<moved.request.queueOrder);
  const cancelled=await s.service.guestUpdate({eventId:'evening-a',sessionToken:s.a.sessionToken,id:second.request.id,input:{cancel:true,revision:promoted.request.revision}});assert.equal(cancelled.request.status,'cancelled');
  await assert.rejects(()=>s.service.staffUpdate(s.actorB,second.request.id,{status:'done',revision:cancelled.request.revision}),status(400));
 }finally{s.close();}
});

test('personal links are revocable, expire and stop working when a profile leaves the team',async()=>{
 const s=await setup();try{
  await s.service.revoke('evening-a',s.grantA.id);await assert.rejects(()=>s.service.operator(s.grantA.code),status(401));
  s.ctx.people[1].archived=true;await assert.rejects(()=>s.service.operator(s.grantB.code),status(403));
  s.ctx.people[1].archived=false;await s.db.prepare('UPDATE live_grants SET expires_at=? WHERE id=?').bind(Date.now()-1,s.grantB.id).run();
  await assert.rejects(()=>s.service.operator(s.grantB.code),status(401));
  assert.ok(!(await s.service.grants('evening-a')).grants.some(g=>g.code||g.secret_hash));
 }finally{s.close();}
});

test('guest HTTP writes reject cross-origin calls and use an HttpOnly event-scoped cookie',async()=>{
 const s=await setup();try{
  const origin='https://app.example',env={ASSETS:{fetch:()=>new Response('app')},CONTENT:{guestAction:async(action,args)=>{try{return {status:200,...await s.service[action](args)};}catch(e){return {status:e.status||500,error:e.message};}}}};
  const request=(path,method='POST',body,headers={})=>new Request(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...headers},body:body?JSON.stringify(body):undefined});
  const bad=await visitorWorker.fetch(request('/api/guest/session','POST',{eventId:'evening-a',name:'HTTP'},{Origin:'https://other.example'}),env);assert.equal(bad.status,403);
  const created=await visitorWorker.fetch(request('/api/guest/session','POST',{eventId:'evening-a',name:'HTTP'}),env);assert.equal(created.status,200);assert.match(created.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);assert.ok(!(await created.clone().text()).includes('sessionToken'));
  const cookie=created.headers.get('set-cookie').split(';')[0];
  const sent=await visitorWorker.fetch(request('/api/guest/requests','POST',{eventId:'evening-a',stationId:'team',clientKey:crypto.randomUUID(),input:input.message},{Cookie:cookie}),env);assert.equal(sent.status,200);
  const own=await visitorWorker.fetch(request('/api/guest/requests?abend=evening-a','GET',null,{Cookie:cookie}),env);assert.equal((await own.json()).requests.length,1);
 }finally{s.close();}
});


test('personal team sessions coexist in separate tabs with isolated CSRF tokens',async()=>{
 const s=await setup();try{
  const origin='https://team.example';
  const call=async(path,{method='GET',body,cookie,csrf,originHeader=origin}={})=>{
   const request=new Request(origin+path,{method,headers:{Origin:originHeader,...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
   try{return await liveApi(request,{}, {service:s.service,json:(status,data,headers={})=>Response.json(data,{status,headers}),session:async()=>null,data:r=>r.json()});}catch(e){return Response.json({error:e.message},{status:e.status||500});}
  };
  const loginA=await call('/api/live/login',{method:'POST',body:{code:s.grantA.code}}),loginB=await call('/api/live/login',{method:'POST',body:{code:s.grantB.code}});
  const a=await loginA.json(),b=await loginB.json();assert.equal(a.sessionId,s.grantA.id);assert.equal(b.sessionId,s.grantB.id);
  const cookie=loginA.headers.get('set-cookie').split(';')[0]+'; '+loginB.headers.get('set-cookie').split(';')[0];
  const ctxA=await(await call('/api/live/session?s='+a.sessionId,{cookie})).json();
  const ctxB=await(await call('/api/live/session?s='+b.sessionId,{cookie})).json();
  assert.equal(ctxA.person.name,'Alex');assert.equal(ctxB.person.name,'Nora');assert.notEqual(ctxA.csrf,ctxB.csrf);
  assert.equal((await call('/api/live/stations/karaoke?s='+b.sessionId,{method:'POST',body:{accepting:false,revision:0},cookie,csrf:ctxA.csrf})).status,403);
  assert.equal((await call('/api/live/session',{cookie})).status,401);
  assert.equal((await call('/api/live/login',{method:'POST',body:{code:s.grantA.code},originHeader:'https://other.example'})).status,403);
 }finally{s.close();}
});
