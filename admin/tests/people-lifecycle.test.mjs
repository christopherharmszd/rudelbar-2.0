import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sqliteD1} from './sqlite-d1.mjs';
import {createAccounts,accountCookie} from '../lib/accounts.mjs';
import {changePersonLifecycle} from '../lib/people-lifecycle.mjs';
import {peopleFor,visitorPayload,catalogFor,configurationFor,eventList} from '../lib/abend-service.mjs';
import {createLiveService} from '../lib/live-service.mjs';
import {cleanCatalog,cleanExperience,DEFAULT_CATALOG,defaultExperience,experienceId,withoutDeletedPeople} from '../../shared/experience.mjs';
const schema=(await Promise.all(['0001_live_stations','0002_notifications','0003_accounts','0004_native_accounts'].map(n=>readFile(new URL('../migrations/'+n+'.sql',import.meta.url),'utf8')))).join('\n');
const admin={name:'Redaktion'},editor={accountId:'other-editor',roles:[{role:'editor'}]},password='Local-only-profile-password-2026!';
function setup(){
 const db=sqliteD1();db.connection.exec(schema);const docs=new Map();
 const profile={_id:'drafts.person-alex',_type:'rudelAppPerson',_rev:'profile-revision',personId:'person-alex',name:'Alex',role:'Betreuung',email:'alex@example.invalid',archived:false};docs.set(profile._id,profile);
 const client={list:async type=>[...docs.values()].filter(d=>d._type===type),getDocument:async id=>docs.get(id),savePrivate:async(type,id,input,revision)=>{const doc=docs.get('drafts.'+id);if(doc?._rev!==revision)throw Object.assign(new Error('Conflict'),{status:409});const next={...doc,...input,_rev:crypto.randomUUID()};docs.set('drafts.'+id,next);return next;}};
 const env={LIVE_DB:db,RUDELBAR_SESSION_SECRET:'local-only-profile-secret-with-32-characters'};
 const event={eventId:'evening-a',title:'Ein Abend',teamIds:['person-alex'],date:'2026-11-01',visibility:'public'};
 const accounts=createAccounts(env,{people:()=>peopleFor(client),events:async()=>[event]});
 const live=createLiveService(env,null,{getContext:async()=>({event,release:{state:'open'},people:await peopleFor(client),stations:[{id:'dj',name:'DJ',kind:'music',operatorIds:['person-alex'],enabled:true}]})});
 const account=async()=>{const a=(await accounts.save(admin,{personId:'person-alex',email:'alex@example.invalid',roles:[{role:'station',eventId:'evening-a'}]})).account;const invitation=await accounts.invite(admin,a.id);await accounts.complete({token:invitation.token,password});return accounts.get(a.id);};
 return {db,client,env,profile,docs,event,accounts,live,account,close:()=>db.connection.close()};
}
test('deleting a linked profile hides it immediately, revokes access and preserves conversations and account history',async()=>{
 const s=setup();try{
  const account=await s.account(),login=await s.accounts.signIn(account.email,password),grant=await s.live.issueGrant('evening-a','person-alex');
  const visitor=await s.live.session({eventId:'evening-a',name:'Gast'});await s.live.submit({eventId:'evening-a',sessionToken:visitor.sessionToken,stationId:'dj',clientKey:'saved-request',input:{song:'Ein Lied'}});
  const sessionRequest=new Request('https://cms.test',{headers:{Cookie:accountCookie(login.token)}});assert.ok(await s.accounts.session(sessionRequest));
  await changePersonLifecycle(s.env,s.client,admin,'person-alex',{revision:s.profile._rev},'delete');
  assert.equal((await peopleFor(s.client)).length,0);assert.equal((await peopleFor(s.client,{includeDeleted:true})).length,1);assert.equal(await s.accounts.session(sessionRequest),null);
  assert.equal((await s.accounts.get(account.id)).enabled,false);await assert.rejects(()=>s.live.operator(grant.code),e=>e.status===401);
  assert.equal(s.db.connection.prepare('SELECT COUNT(*) n FROM live_requests').get().n,1);assert.equal(s.db.connection.prepare('SELECT COUNT(*) n FROM app_credentials').get().n,1);
  await assert.rejects(()=>s.accounts.signIn(account.email,password),e=>e.status===401);
 }finally{s.close();}
});
test('restoration is paused and never revives old sessions, links or a disabled account',async()=>{
 const s=setup();try{
  const account=await s.account(),invitation=await s.accounts.invite(admin,account.id,{purpose:'reset'});
  await changePersonLifecycle(s.env,s.client,admin,'person-alex',{revision:s.profile._rev},'delete');
  const deleted=s.docs.get(s.profile._id);await changePersonLifecycle(s.env,s.client,admin,'person-alex',{revision:deleted._rev},'restore');
  const restored=(await peopleFor(s.client))[0];assert.equal(restored.archived,true);assert.equal(restored.deletedAt,null);assert.equal((await s.accounts.get(account.id)).enabled,false);
  await assert.rejects(()=>s.accounts.complete({token:invitation.token,password:'A-different-test-password!'}),e=>e.status===410);
 }finally{s.close();}
});
test('stale requests and self-deletion cannot change a profile; only admins may delete linked account profiles',async()=>{
 const s=setup();try{
  await s.account();
  await assert.rejects(()=>changePersonLifecycle(s.env,s.client,admin,'person-alex',{revision:'old'},'delete'),e=>e.status===409);
  await assert.rejects(()=>changePersonLifecycle(s.env,s.client,{...admin,personId:'person-alex'},'person-alex',{revision:s.profile._rev},'delete'),e=>e.status===409);
  await assert.rejects(()=>changePersonLifecycle(s.env,s.client,editor,'person-alex',{revision:s.profile._rev},'delete'),e=>e.status===403);
  assert.equal(s.docs.get(s.profile._id).deletedAt,undefined);assert.equal(s.db.connection.prepare('SELECT enabled FROM app_accounts').get().enabled,1);
 }finally{s.close();}
});
test('deleted assignments do not block preparation and never silently open a private station to the whole team',async()=>{
 const s=setup();try{
  const catalog=cleanCatalog(DEFAULT_CATALOG),input={...defaultExperience('evening-a'),equipment:[{id:'kicker-1',hostId:'person-alex',place:'Am Wagen'}],stations:[{id:'dj',name:'DJ',kind:'music',operatorIds:['person-alex'],enabled:true}]};
  await changePersonLifecycle(s.env,s.client,admin,'person-alex',{revision:s.profile._rev},'delete');
  const all=await peopleFor(s.client,{includeDeleted:true}),config=cleanExperience(input,catalog,'evening-a',all,[]);
  assert.equal(config.equipment[0].hostId,'');assert.deepEqual(config.stations[0].operatorIds,[]);assert.equal(config.stations[0].assignmentRequired,true);
  const ctx={event:s.event,release:{state:'open'},people:[{personId:'person-nora',name:'Nora'}],stations:config.stations};s.event.teamIds=['person-nora'];
  const live=createLiveService(s.env,null,{getContext:async()=>ctx}),grant=await live.issueGrant('evening-a','person-nora');assert.equal((await live.staffContext(await live.operator(grant.code))).stations.length,0);assert.equal((await live.staffContext(await live.publisher('evening-a'))).stations.length,1);
  assert.equal(visitorPayload(config,s.event,all).team.length,0);assert.equal(visitorPayload(config,s.event,all).equipment[0].host,'');
  s.docs.set('drafts.'+experienceId('evening-a'),{...input,_id:'drafts.'+experienceId('evening-a'),_type:'rudelAppExperience'});
  assert.equal((await configurationFor(s.client,'evening-a')).experience.equipment[0].hostId,'');
 }finally{s.close();}
});
test('a new working catalog starts empty rather than silently receiving fictional equipment or prices',async()=>{
 const s=setup();try{assert.deepEqual(await catalogFor(s.client),{equipment:[],games:[],program:[],drinks:[],revision:''});}finally{s.close();}
});
