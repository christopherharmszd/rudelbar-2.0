import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sqliteD1} from './sqlite-d1.mjs';
import {createAccounts,hash,accountCookie} from '../lib/accounts.mjs';
import {passwordApi} from '../lib/password-api.mjs';
import worker,{passwordVerifier} from '../worker.mjs';
import {editsContent,managesEvent,managesUsers} from '../lib/permissions.mjs';
import {createLiveService} from '../lib/live-service.mjs';
import {experienceApi} from '../lib/experience-api.mjs';
import {liveApi} from '../lib/live-api.mjs';
const schema=(await Promise.all(['0001_live_stations','0002_notifications','0003_accounts','0004_native_accounts','0005_member_onboarding','0006_station_photos'].map(name=>readFile(new URL('../migrations/'+name+'.sql',import.meta.url),'utf8')))).join('\n');
const password='Local-only-personal-password-2026!',newPassword='Another-local-password-2026!';
const legacy={sub:'redaktion@rudelbar.local',name:'Redaktion',csrf:'legacy-csrf'},origin='https://cms.example.test';
const json=(status,body,headers={})=>Response.json(body,{status,headers}),status=expected=>error=>error.status===expected;
function setup(){
 const db=sqliteD1();db.connection.exec(schema);
 const profiles=[{personId:'person-a',name:'Alex',email:'alex@example.invalid'},{personId:'person-b',name:'Nora',email:'nora@example.invalid'}];
 const event={eventId:'evening-a',teamIds:['person-a','person-b'],title:'Unser Abend',venue:'Dorf',visibility:'private',accessCode:'never-public'};
 const ctx={event,release:{state:'open'},people:profiles,stations:[{id:'dj',name:'DJ',kind:'music',operatorIds:['person-a'],enabled:true},{id:'karaoke',name:'Karaoke',kind:'karaoke',operatorIds:['person-b'],enabled:true},{id:'team',name:'Team',kind:'message',operatorIds:[],enabled:true}]};
 const env={LIVE_DB:db,RUDELBAR_SESSION_SECRET:'local-only-native-test-secret-with-32-characters',LOGIN_LIMITER:{limit:async()=>({success:true})}};
 const service=createAccounts(env,{people:async()=>profiles,events:async()=>[event,{eventId:'evening-b',teamIds:[]}]});
 const live=createLiveService(env,null,{getContext:async id=>{if(id!==event.eventId)throw Object.assign(new Error('Unknown evening'),{status:404});return ctx;}});
 const create=async(roles=[{role:'station',eventId:'evening-a'}],personId='person-a')=>(await service.save(legacy,{personId,email:profiles.find(p=>p.personId===personId).email,roles})).account;
 const signIn=async account=>{const invite=await service.invite(legacy,account.id);await service.complete({token:invite.token,password});return service.signIn(account.email,password);};
 const user=async login=>service.session(new Request(origin,{headers:{cookie:accountCookie(login.token)}}));
 return {db,env,service,create,signIn,user,profiles,event,ctx,live,close:()=>db.connection.close()};
}
test('personal passwords work without an external provider and credentials, links and sessions never store plaintext',async()=>{
 const s=setup();try{
  const account=await s.create(),invite=await s.service.invite(legacy,account.id);
  assert.equal((await s.service.inspect(invite.token)).email,account.email);
  await assert.rejects(()=>s.service.complete({token:invite.token,password:'too-short'}),status(400));
  await s.service.complete({token:invite.token,password});
  const login=await s.service.signIn(account.email.toUpperCase(),password),user=await s.user(login);assert.equal(user.accountId,account.id);assert.equal(user.personId,'person-a');
  await assert.rejects(()=>s.service.complete({token:invite.token,password:newPassword}),status(410));
  for(const email of [account.email,'unknown@example.invalid'])await assert.rejects(()=>s.service.signIn(email,'wrong-password'),e=>e.status===401&&e.message==='E-Mail oder Passwort stimmt nicht.');
  const stored=['app_credentials','app_sessions','app_password_links'].map(table=>JSON.stringify(s.db.connection.prepare('SELECT * FROM '+table).all())).join('');
  for(const secret of [password,login.token,invite.token])assert.ok(!stored.includes(secret));
  const list=JSON.stringify(await s.service.list());assert.ok(!list.includes('token_hash'));assert.ok(!list.includes('password_json'));assert.ok(!list.includes(login.token));
  assert.equal((await s.service.get(account.id)).activated,true);
 }finally{s.close();}
});
test('account changes also revoke old station links; disabled profiles cannot receive a fresh link',async()=>{
 const s=setup();try{
  const account=await s.create(),grant=await s.live.issueGrant('evening-a','person-a');assert.equal((await s.live.operator(grant.code)).personId,'person-a');
  const updated=await s.service.save(legacy,{...account,enabled:false},account.id);await assert.rejects(()=>s.live.operator(grant.code),status(401));await assert.rejects(()=>s.live.issueGrant('evening-a','person-a'),status(403));
  await s.service.save(legacy,{...updated.account,enabled:true},account.id);await assert.rejects(()=>s.live.operator(grant.code),status(401));
 }finally{s.close();}
});
test('rights changes revoke sessions, stale edits do not revoke a new session, and disabling blocks new sign-in',async()=>{
 const s=setup();try{
  const account=await s.create(),first=await s.signIn(account),before=await s.user(first);
  const current=await s.service.get(account.id);
  const updated=(await s.service.save(legacy,{...current,enabled:true,roles:[{role:'manager',eventId:'evening-a'}]},account.id)).account;
  assert.equal(await s.user(first),null);
  const second=await s.service.signIn(account.email,password);assert.ok(managesEvent(await s.user(second),'evening-a'));
  await assert.rejects(()=>s.service.save(legacy,{...account,enabled:true},account.id),status(409));assert.ok(await s.user(second));
  await s.service.save(legacy,{...updated,enabled:false},account.id);assert.equal(await s.user(second),null);await assert.rejects(()=>s.service.signIn(account.email,password),status(401));
  assert.ok(!managesUsers(before));assert.ok(!editsContent(before));
 }finally{s.close();}
});
test('accounts require active, unique profiles and scoped roles; a session cannot promote itself',async()=>{
 const s=setup();try{
  const account=await s.create(),user=await s.user(await s.signIn(account));
  await assert.rejects(()=>s.service.save(user,{...account,roles:[{role:'admin'}]},account.id),status(403));
  await assert.rejects(()=>s.create(),status(409));
  await assert.rejects(()=>s.service.save(legacy,{personId:'person-b',email:'other@example.invalid',roles:[{role:'station',eventId:'evening-b'}]}),status(400));
  s.profiles[0].archived=true;assert.equal(await s.user(await s.service.signIn(account.email,password).catch(()=>({token:''}))),null);
 }finally{s.close();}
});
test('event and station authorization is applied to live data and notification recipients',async()=>{
 const s=setup();try{
  const account=await s.create(),user=await s.user(await s.signIn(account));
  const actor=await s.live.accountActor('evening-a',user),ctx=await s.live.staffContext(actor);assert.deepEqual(ctx.stations.map(v=>v.id),['dj','team']);assert.equal(ctx.publisher,false);assert.equal(ctx.personalAccount,true);
  assert.equal(s.live.recipient(actor).id,'u:'+account.id);
  await assert.rejects(()=>s.live.stationState(actor,'karaoke',{accepting:false,revision:0}),status(403));
  const visitor=await s.live.session({eventId:'evening-a',accessCode:'never-public',name:'Gast'}),request=await s.live.submit({eventId:'evening-a',accessCode:'never-public',sessionToken:visitor.sessionToken,stationId:'karaoke',clientKey:'request-a',input:{song:'Song',artist:'Artist',singers:'Gast'}});
  assert.equal((await s.live.inbox(actor)).requests.length,0);await assert.rejects(()=>s.live.inbox(actor,{id:request.request.id}),status(404));
  const manager={...user,roles:[{role:'manager',eventId:'evening-a'}]},host={...user,roles:[{role:'host',eventId:'evening-a'}]};
  assert.equal((await s.live.staffContext(await s.live.accountActor('evening-a',manager))).canManage,true);assert.equal((await s.live.staffContext(await s.live.accountActor('evening-a',host))).canManage,false);
  assert.equal((await s.live.inbox(await s.live.accountActor('evening-a',host))).requests.length,1);
  s.event.teamIds=[];await assert.rejects(()=>s.live.accountActor('evening-a',user),status(403));
 }finally{s.close();}
});
test('HTTP editorial routes filter events and contact fields for restricted accounts',async()=>{
 const s=setup();try{
  const user=await s.user(await s.signIn(await s.create())),docs=[{_type:'rudelAppPerson',...s.profiles[0],_id:'drafts.person-a'},{_type:'rudelAppPerson',...s.profiles[1],_id:'drafts.person-b'},{_type:'rudelAppEvent',...s.event,_id:'drafts.rudel-app-event-evening-a'}];
  const client={list:async type=>docs.filter(d=>d._type===type).map(d=>({...d,draft:true})),getDocument:async id=>docs.find(d=>d._id===id)};
  const args={client,json,session:async()=>user,authorized:async()=>({user}),data:r=>r.json()};
  const people=await(await experienceApi(new Request(origin+'/api/abend/people'),s.env,args)).json();assert.equal(people.people.length,2);assert.ok(!JSON.stringify(people).includes('@'));
  docs.push({_type:'rudelAppEvent',...s.event,eventId:'other-event',teamIds:['person-b'],title:'Anderer Abend',_id:'drafts.other-event'});
  const events=await(await experienceApi(new Request(origin+'/api/abend/events'),s.env,args)).json();assert.equal(events.events.length,1);assert.equal(events.events[0].canManage,false);assert.ok(!JSON.stringify(events).includes('never-public'));assert.ok(!JSON.stringify(events).includes('other-event'));assert.ok(!JSON.stringify(events).includes('guestUrl'));
  await assert.rejects(()=>experienceApi(new Request(origin+'/api/abend/catalog',{method:'PUT',body:'{}'}),s.env,args),status(403));
  await assert.rejects(()=>experienceApi(new Request(origin+'/api/abend/catalog'),s.env,args),status(403));
  await assert.rejects(()=>experienceApi(new Request(origin+'/api/abend/events',{method:'POST',body:'{}'}),s.env,args),status(403));
 }finally{s.close();}
});
test('personal live logout revokes the backend session rather than only hiding the UI',async()=>{
 const s=setup();try{
  const login=await s.signIn(await s.create()),user=await s.user(login);
  const response=await liveApi(new Request(origin+'/api/live/logout?abend=evening-a',{method:'POST',headers:{Origin:origin,'X-CSRF-Token':user.csrf},body:'{}'}),s.env,{service:s.live,session:async()=>user,json,data:r=>r.json()});
  assert.equal(response.status,200);assert.ok(response.headers.get('set-cookie').includes('rb_account=;'));assert.equal(await s.user(login),null);
 }finally{s.close();}
});
test('password reset does not change the old password until a single atomic completion; sessions and station links are revoked',async()=>{
 const s=setup();try{
  const a=await s.create(),login=await s.signIn(a),grant=await s.live.issueGrant('evening-a','person-a');
  const reset=await s.service.invite(legacy,a.id,{purpose:'reset'});
  assert.ok(await s.user(login));assert.ok(await s.service.signIn(a.email,password));
  const concurrent=await Promise.allSettled([s.service.complete({token:reset.token,password:newPassword}),s.service.complete({token:reset.token,password:password+'different'})]);
  assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);assert.equal(await s.user(login),null);await assert.rejects(()=>s.live.operator(grant.code),status(401));
  await assert.rejects(()=>s.service.signIn(a.email,password),status(401));
 }finally{s.close();}
});
test('expired, disabled and revision-stale invitations cannot change credentials',async()=>{
 const s=setup();try{
  const a=await s.create(),expired=await s.service.invite(legacy,a.id);
  s.db.connection.prepare('UPDATE app_password_links SET expires_at=0').run();await assert.rejects(()=>s.service.complete({token:expired.token,password}),status(410));
  const stale=await s.service.invite(legacy,a.id);await s.service.save(legacy,{...a,enabled:false},a.id);await assert.rejects(()=>s.service.complete({token:stale.token,password}),status(410));
  assert.equal(s.db.connection.prepare('SELECT COUNT(*) n FROM app_credentials').get().n,0);
 }finally{s.close();}
});
test('own password changes require the old password and end all sessions; protected accounts cannot revoke their own administration',async()=>{
 const s=setup();try{
  const a=await s.create([{role:'admin'}]),login=await s.signIn(a),user=await s.user(login);
  await assert.rejects(()=>s.service.change(user,{currentPassword:'incorrect',password:newPassword}),status(403));assert.ok(await s.user(login));
  const current=await s.service.get(a.id);await assert.rejects(()=>s.service.save(user,{...current,enabled:false},a.id),status(400));
  await s.service.change(user,{currentPassword:password,password:newPassword});assert.equal(await s.user(login),null);assert.ok(await s.service.signIn(a.email,newPassword));
 }finally{s.close();}
});
test('native auth API enforces origin and CSRF and does not report an unconfigured email as sent',async()=>{
 const s=setup();try{
  const args={accounts:s.service,json,data:r=>r.json(),session:async()=>null,authorized:async()=>({error:json(401,{error:'Bitte anmelden.'})})};
  assert.equal((await passwordApi(new Request(origin+'/api/auth/config'),s.env,args)).status,200);
  const post=(path,headers={Origin:origin})=>passwordApi(new Request(origin+path,{method:'POST',headers,body:'{}'}),s.env,args);
  assert.equal((await post('/api/auth/forgot')).status,503);assert.equal((await post('/api/auth/change')).status,401);assert.equal((await post('/api/auth/complete',{Origin:'https://foreign.test'})).status,403);
 }finally{s.close();}
});
test('repeated personal sign-in failures are rate limited even from different IPs',async()=>{
 const s=setup();try{for(let n=0;n<8;n++)await assert.rejects(()=>s.service.signIn('unknown@example.invalid',password),status(401));await assert.rejects(()=>s.service.signIn('unknown@example.invalid',password),status(429));}finally{s.close();}
});

test('full Worker router shares personal authentication across Backstage, old editorial APIs and Live, retaining legacy Redaktion',async()=>{
 const s=setup(),originalFetch=globalThis.fetch;try{
  const secret=s.env.RUDELBAR_SESSION_SECRET;Object.assign(s.env,{SANITY_PROJECT_ID:'localtest',SANITY_DATASET:'staging',SANITY_EDITOR_TOKEN:'synthetic-token',RUDELBAR_PASSWORD_VERIFIER:await passwordVerifier(secret,'legacy-only-test-password')});
  globalThis.fetch=async url=>{const u=new URL(url);assert.equal(u.host,'localtest.api.sanity.io');return Response.json({result:s.profiles.map(p=>({_id:'drafts.'+p.personId,_type:'rudelAppPerson',...p}))});};
  const a=await s.create(),invitation=await s.service.invite(legacy,a.id);await s.service.complete({token:invitation.token,password});
  const call=(path,body,cookie,csrf)=>worker.fetch(new Request(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})},body:body?JSON.stringify(body):undefined}),s.env);
  const response=await call('/api/login',{email:a.email,password});assert.equal(response.status,200);
  const cookie=response.headers.getSetCookie().find(v=>v.startsWith('rb_account='));assert.ok(cookie.includes('HttpOnly'));assert.ok(cookie.includes('SameSite=Strict'));assert.ok(response.headers.getSetCookie().some(v=>v.startsWith('rb_session=;')));
  const user=(await(await call('/api/session',null,cookie)).json()).user;assert.equal(user.email,a.email);assert.equal(user.legacy,false);
  assert.equal((await call('/api/posts',null,cookie)).status,403);assert.equal((await call('/api/accounts',null,cookie)).status,403);
  assert.equal((await call('/api/auth/change',{currentPassword:password,password:newPassword},cookie)).status,403);
  assert.equal((await call('/api/logout',{},cookie,user.csrf)).status,200);assert.equal((await(await call('/api/session',null,cookie)).json()).user,null);
  const old=await call('/api/login',{email:'redaktion@rudelbar.local',password:'legacy-only-test-password'});assert.equal(old.status,200);const oldCookie=old.headers.getSetCookie().find(v=>v.startsWith('rb_session='));assert.equal((await(await call('/api/session',null,oldCookie)).json()).user.legacy,true);
 }finally{globalThis.fetch=originalFetch;s.close();}
});
