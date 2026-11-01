import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sqliteD1} from './sqlite-d1.mjs';
import {createMemberOnboarding} from '../lib/member-onboarding.mjs';
import {createAccounts} from '../lib/accounts.mjs';
import {peopleFor,partnersFor,visitorPayload,eventList} from '../lib/abend-service.mjs';
import {defaultExperience} from '../../shared/experience.mjs';
import {editsContent,managesUsers,writesPosts} from '../lib/permissions.mjs';
const schema=(await Promise.all(['0001_live_stations','0002_notifications','0003_accounts','0004_native_accounts','0005_member_onboarding'].map(n=>readFile(new URL('../migrations/'+n+'.sql',import.meta.url),'utf8')))).join('\n');
const admin={name:'Redaktion'},editor={accountId:'editor',name:'Backstage',roles:[{role:'editor'}]},origin='https://cms.example.test';
const input=(extra={})=>({clientKey:crypto.randomUUID(),profile:{name:'Lokale Prüfperson',email:'local@example.invalid',role:'Musik',membershipType:'rudelbar'},createAccount:true,roles:[{role:'author'}],delivery:'link',...extra});
function setup(){
 const db=sqliteD1();db.connection.exec(schema);const docs=new Map(),deliveries=[];let failType='';
 const client={list:async type=>[...docs.values()].filter(d=>d._type===type),getDocument:async id=>docs.get(id)||null,savePrivate:async(type,id,fields,revision)=>{
  if(type===failType){failType='';throw new Error('Simulated temporary write failure');}
  const previous=docs.get('drafts.'+id);if(previous&&revision!==undefined&&previous._rev!==revision)throw Object.assign(new Error('Conflict'),{status:409});
  const doc={...previous,...fields,_id:'drafts.'+id,_type:type,_rev:crypto.randomUUID()};docs.set(doc._id,doc);return doc;
 }};
 const env={LIVE_DB:db,RUDELBAR_SESSION_SECRET:'local-only-onboarding-secret-with-32-characters',ACCOUNT_MAILER:{send:async m=>{deliveries.push(m);return {accepted:true};}}};
 const service=createMemberOnboarding(env,client),accounts=createAccounts(env,{people:()=>peopleFor(client),events:()=>eventList(client)});
 const evening={_id:'drafts.event',_type:'rudelAppEvent',_rev:'event-revision',eventId:'event',title:'Ein echter Testfixture-Abend',date:'2026-11-01',venue:'Ort',visibility:'public',teamIds:[],accessCode:'fixture-access'};
 return {db,docs,client,env,service,accounts,deliveries,evening,failNext:type=>{failType=type;},close:()=>db.connection.close()};
}
test('email prerequisites are checked before creating a profile, partner, account or operation',async()=>{
 const s=setup();try{
  const value=input({delivery:'email',profile:{name:'Person',email:'local@example.invalid',membershipType:'partner'},newPartner:{name:'Fixture-Partner'}});
  await assert.rejects(()=>s.service.submit(admin,value,origin),e=>e.status===503);
  assert.equal(s.docs.size,0);assert.equal(s.db.connection.prepare('SELECT COUNT(*) n FROM app_accounts').get().n,0);assert.equal(s.db.connection.prepare('SELECT COUNT(*) n FROM app_member_onboarding').get().n,0);
 }finally{s.close();}
});
test('explicit profile-only creation needs no mailbox and never silently creates a login or invitation',async()=>{
 const s=setup();try{
  const value=input({createAccount:false,roles:[],delivery:'none'}),result=await s.service.submit(editor,value,origin);
  assert.equal(result.createAccount,false);assert.equal(result.invitation,null);assert.equal((await peopleFor(s.client)).length,1);assert.equal((await peopleFor(s.client))[0].archived,false);
  assert.equal(s.db.connection.prepare('SELECT COUNT(*) n FROM app_accounts').get().n,0);assert.equal(s.deliveries.length,0);
  const retry=await s.service.submit(editor,value,origin);assert.equal(retry.personId,result.personId);assert.equal((await peopleFor(s.client)).length,1);
 }finally{s.close();}
});
test('one operation creates a branded partner profile, scoped account, evening membership and manual invitation',async()=>{
 const s=setup();try{
  s.docs.set(s.evening._id,s.evening);
  const value=input({profile:{name:'Partnerperson',email:'partner@example.invalid',membershipType:'partner',avatarUrl:'https://cdn.sanity.io/images/test/staging/avatar.png'},newPartner:{name:'Sportverein Fixture',logoUrl:'https://cdn.sanity.io/images/test/staging/logo.png'},roles:[{role:'station',eventId:'event'}]}),result=await s.service.submit(admin,value,origin);
  const person=(await peopleFor(s.client))[0],account=await s.accounts.get(result.accountId);assert.equal(person.membershipType,'partner');assert.equal(account.enabled,true);assert.ok(!managesUsers({accountId:account.id,roles:account.roles}));assert.ok(!editsContent({accountId:account.id,roles:account.roles}));
  assert.ok((await eventList(s.client))[0].teamIds.includes(person.personId));assert.ok(result.invitation.url.startsWith(origin+'/einladung#'));assert.equal(s.deliveries.length,0);
  const publicData=visitorPayload(defaultExperience('event'),{eventId:'event',teamIds:[person.personId]},await peopleFor(s.client),await partnersFor(s.client));assert.equal(publicData.team[0].affiliation.name,'Sportverein Fixture');assert.equal(publicData.team[0].avatarUrl,value.profile.avatarUrl);assert.ok(!JSON.stringify(publicData).includes('partner@example.invalid'));
  const retry=await s.service.submit(admin,value,origin);assert.equal(retry.personId,result.personId);assert.equal(retry.accountId,result.accountId);assert.equal(s.db.connection.prepare('SELECT COUNT(*) n FROM app_accounts').get().n,1);assert.equal((await peopleFor(s.client)).length,1);
  assert.ok(!s.db.connection.prepare('SELECT result_json FROM app_member_onboarding').get().result_json.includes('#'),'raw invitation tokens are not persisted in the operation');
 }finally{s.close();}
});
test('an existing profile receives a login in place instead of becoming a duplicate',async()=>{
 const s=setup();try{
  const first=await s.service.submit(admin,input({createAccount:false,roles:[]}),origin),person=(await peopleFor(s.client))[0];
  const result=await s.service.submit(admin,input({personId:person.personId,profileRevision:person.revision,profile:person}),origin);
  assert.equal(result.personId,first.personId);assert.ok(result.accountId);assert.equal((await peopleFor(s.client)).length,1);assert.equal((await s.accounts.list()).accounts.length,1);
 }finally{s.close();}
});
test('partial infrastructure failure can resume with the same operation and does not duplicate records',async()=>{
 const s=setup();try{
  s.docs.set(s.evening._id,s.evening);s.failNext('rudelAppEvent');const value=input({roles:[{role:'station',eventId:'event'}]});
  await assert.rejects(()=>s.service.submit(admin,value,origin),/Simulated/);const pending=(await peopleFor(s.client))[0];assert.equal(pending.onboardingPending,true);assert.equal(pending.archived,true);
  const result=await s.service.submit(admin,value,origin);assert.ok(result.accountId);assert.equal((await peopleFor(s.client)).length,1);assert.equal((await peopleFor(s.client))[0].onboardingPending,false);assert.equal(s.db.connection.prepare('SELECT COUNT(*) n FROM app_accounts').get().n,1);
 }finally{s.close();}
});
test('accepted email invitations are not resent when the completed wizard request is retried',async()=>{
 const s=setup();try{
  await s.accounts.mail.save(admin,{revision:0,password:'synthetic-mailbox-password',enabled:true});const value=input({delivery:'email'}),first=await s.service.submit(admin,value,origin);assert.equal(first.invitation.delivery,'accepted');assert.equal(s.deliveries.length,1);
  await s.service.submit(admin,value,origin);assert.equal(s.deliveries.length,1);assert.equal(s.db.connection.prepare('SELECT COUNT(*) n FROM app_accounts').get().n,1);
 }finally{s.close();}
});
test('profile affiliation never grants administration and limited roles cannot provision accounts',async()=>{
 const s=setup();try{
  await assert.rejects(()=>s.service.submit(editor,input(),origin),e=>e.status===403);
  await assert.rejects(()=>s.service.submit({accountId:'station',roles:[{role:'station',eventId:'event'}]},input({createAccount:false}),origin),e=>e.status===403);
  assert.equal(s.docs.size,0);assert.ok(writesPosts({accountId:'writer',roles:[{role:'author'}]}));assert.ok(!editsContent({accountId:'writer',roles:[{role:'author'}]}));
 }finally{s.close();}
});

test('unknown partners and unsupported avatar or logo URLs are rejected before any member data is created',async()=>{
 const s=setup();try{
  for(const value of [input({profile:{name:'Person',email:'local@example.invalid',membershipType:'partner',partnerId:'partner-missing'}}),input({profile:{name:'Person',email:'local@example.invalid',avatarUrl:'https://foreign.invalid/track.png'}}),input({profile:{name:'Person',email:'local@example.invalid',membershipType:'partner'},newPartner:{name:'Partner',logoUrl:'javascript:alert(1)'}})])await assert.rejects(()=>s.service.submit(admin,value,origin),e=>e.status===400);
  assert.equal(s.docs.size,0);assert.equal(s.db.connection.prepare('SELECT COUNT(*) n FROM app_accounts').get().n,0);
 }finally{s.close();}
});
