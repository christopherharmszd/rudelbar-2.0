import test from 'node:test';
import assert from 'node:assert/strict';
import {encounterFixture} from './encounter-fixture.mjs';
import {createEncounterSessions} from '../lib/encounter-sessions.mjs';
import {createReporting,reportWindow} from '../lib/reporting.mjs';
async function setup(extra={}){const f=await encounterFixture(extra),reporting=createReporting(f.db),s=await reporting.settings();await reporting.configure({}, {revision:s.revision,enabled:true,analysisEnabled:false,purpose:'Isolierte Ablaufprüfung',legalBasis:'Fiktive Testpersonen',privacyUrl:'https://example.test/privacy',policyVersion:'test-v1'});const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(Date.now());return {...f,reporting,event:{eventId:'evening',date,title:'Isoliert',app:{state:'open'}},window:reportWindow({},date)};}
test('play and dance operations produce accurate pairs once, with no private profile text in reports',async()=>{
 const f=await setup();try{
  for(const mode of ['play','dance']){
   const a=(await f.optIn(0,{mode})).profiles.find(p=>p.mode===mode),b=(await f.optIn(1,{mode})).profiles.find(p=>p.mode===mode);
   const input={mode,targetId:b.id,operationKey:crypto.randomUUID()};await f.service.interest(f.guests[0],input);await f.service.interest(f.guests[0],input);await f.service.interest(f.guests[1],{mode,targetId:a.id,operationKey:crypto.randomUUID()});
  }
  const report=await f.reporting.report(f.event,f.window);for(const mode of ['play','dance']){const rows=report.metrics.encounters.events;assert.equal(rows.find(r=>r.type===mode+'.activated').count,2);assert.equal(rows.find(r=>r.type===mode+'.interest').count,2);assert.equal(rows.find(r=>r.type===mode+'.matched').count,1);}
  assert.equal(report.metrics.activeGuests.value,2);assert.ok(!JSON.stringify(report).includes('Ein schöner Abend'));assert.ok(!JSON.stringify(report).includes(f.guests[0].profile_id));
 }finally{f.close();}
});
test('hosted counts distinguish ordinary rounds from sensitive speed-dating enrolment and ignore expiry cleanup',async()=>{
 const f=await setup({offers:[{id:'welcome',title:'Keine Berichtsbeschreibung',kind:'welcome',enabled:true,intro:'Freiwillige Anmeldung.',minPeople:2,maxPeople:8},{id:'speed',title:'Keine Berichtsbeschreibung',kind:'speed-dating',enabled:true,intro:'Getrennt freiwillig.',minPeople:2,maxPeople:8}]});try{
  const service=createEncounterSessions(f.env,{encounters:f.service}),admin={name:'Redaktion'};
  for(const offerId of ['welcome','speed'])await service.open(admin,'evening',{offerId,operationKey:crypto.randomUUID()});
  const sessions=(await service.catalog(admin,'evening')).sessions,welcome=sessions.find(s=>s.offerId==='welcome'),speed=sessions.find(s=>s.offerId==='speed');
  for(let i=0;i<2;i++)await service.join(f.guests[i],{sessionId:welcome.id,agree:true,policyVersion:'encounters-v1'});
  await f.optIn(0);await service.join(f.guests[0],{sessionId:speed.id,agree:true,policyVersion:'encounters-v1'});
  const before=await service.staff(admin,'evening',{sessionId:welcome.id});await service.staff(admin,'evening',{sessionId:welcome.id,action:'start',revision:before.session.revision});
  let r=await f.reporting.report(f.event,f.window,{sensitive:true});assert.equal(r.metrics.encounters.events.find(x=>x.type==='encounter.opened').count,1);assert.equal(r.metrics.encounters.events.find(x=>x.type==='encounter.joined').count,2);assert.equal(r.metrics.encounters.events.find(x=>x.type==='encounter.started').count,1);assert.equal(r.metrics.dating.values.find(x=>x.type==='dating.round.joined').state,'suppressed');assert.ok(!r.metrics.series.some(x=>x.type.startsWith('dating.')));
  f.db.connection.prepare('UPDATE encounter_sessions SET expires_at=1 WHERE id=?').run(welcome.id);f.db.connection.prepare('DELETE FROM encounter_session_members WHERE session_id=?').run(welcome.id);r=await f.reporting.report(f.event,f.window);assert.ok(!r.metrics.encounters.events.some(x=>x.type==='encounter.left'));assert.ok(!JSON.stringify(r).includes('Keine Berichtsbeschreibung'));
 }finally{f.close();}
});
test('confirmed contacts are distinct connections with a five-person guard, never general hourly or retained totals',async()=>{
 const f=await setup();try{
  const now=Date.now(),put=f.db.connection.prepare('INSERT INTO social_contexts(id,event_id,kind,reference_id,profile_a,profile_b,state,policy_json,created_at,updated_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)');
  const pair=(i,j,id)=>{const [a,b]=[f.guests[i].profile_id,f.guests[j].profile_id].sort();put.run(id,'evening','contact',id,a,b,'active','{}',now,now,now+86400000);};pair(0,1,'contact-one');
  let r=await f.reporting.report(f.event,f.window,{sensitive:true});assert.equal(r.metrics.dating.values.find(x=>x.type==='contact.confirmed').state,'suppressed');assert.ok(!r.metrics.series.some(x=>x.type==='contact.confirmed'));
  pair(2,3,'contact-two');pair(0,4,'contact-three');r=await f.reporting.report(f.event,f.window,{sensitive:true});assert.equal(r.metrics.dating.values.find(x=>x.type==='contact.confirmed').value,3);assert.ok(!JSON.stringify(r).includes(f.guests[0].profile_id));
  const restricted=await f.reporting.report(f.event,f.window);assert.deepEqual(restricted.metrics.dating.values,[]);
  await f.reporting.retention(now+31*86400000);assert.equal(f.db.connection.prepare("SELECT COUNT(*) AS n FROM reporting_daily WHERE type='contact.confirmed'").get().n,0);
 }finally{f.close();}
});
