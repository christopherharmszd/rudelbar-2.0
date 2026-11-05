import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanEncounters,encounterIssues,cleanEncounterProfile,compatibleEncounters} from '../../shared/encounters.mjs';
import {encounterFixture} from './encounter-fixture.mjs';
const config={enabled:true,playEnabled:true,danceEnabled:true,datingEnabled:true,privacyUrl:'https://example.test/privacy',policyVersion:'encounters-v1',notice:'Sichtbar nur nach eigener Wahl für diesen Abend.',datingNotice:'Dating freiwillig und nur mit 18+-Selbstauskunft.',profileHours:12,messageDays:7};
const dating=(extra={})=>cleanEncounterProfile({about:'Ein Abend vor Ort',interests:['Musik'],agree:true,policyVersion:'encounters-v1',over18:true,gender:'woman',seeking:['woman'],...extra},config,'dating');
test('encounter purposes are separately off by default and persistent contacts require explicit information and duration',()=>{const c=cleanEncounters({});assert.equal(c.enabled,false);assert.equal(c.datingEnabled,false);assert.equal(c.contactsEnabled,false);assert.equal(encounterIssues({}).length,0);assert.equal(encounterIssues(config).length,0);assert.ok(encounterIssues({...config,contactsEnabled:true}).length);assert.ok(encounterIssues({...config,datingNotice:''}).length);});
test('dating needs an explicit adult self-attestation, own gender and deliberate preferences; an empty preference never means everyone',()=>{assert.throws(()=>dating({over18:false}));assert.throws(()=>dating({seeking:[]}));assert.throws(()=>dating({gender:undefined}));assert.throws(()=>dating({agree:false}));assert.throws(()=>dating({policyVersion:'old'}));assert.deepEqual(dating().seeking,['woman']);assert.equal(dating().over18,true);});
test('mutual compatibility supports diverse explicit choices, never infers from names, and pauses exclude discovery',()=>{const a={...dating({gender:'nonbinary',seeking:['woman']}),profileId:'a',state:'active'},b={...dating({gender:'woman',seeking:['nonbinary']}),profileId:'b',state:'active'};assert.equal(compatibleEncounters(a,b),true);assert.equal(compatibleEncounters(a,{...b,seeking:['man']}),false);assert.equal(compatibleEncounters(a,{...b,state:'paused'}),false);assert.equal(compatibleEncounters(a,{...b,over18:false}),false);assert.equal(compatibleEncounters(a,{...b,profileId:'a'}),false);});
test('play and dance do not create dating purposes or retain gender and search data',()=>{const p=cleanEncounterProfile({agree:true,policyVersion:'encounters-v1',about:'Karten spielen',interests:['Karten'],gender:'man',seeking:['woman'],over18:true},config,'play');assert.equal(p.over18,false);assert.equal(p.gender,'');assert.deepEqual(p.seeking,[]);assert.equal(compatibleEncounters({...p,profileId:'a',state:'active'},{...p,profileId:'b',state:'active'}),true);assert.equal(compatibleEncounters({...p,profileId:'a',state:'active'},{...p,mode:'dance',profileId:'b',state:'active'}),false);});
test('discovery is separately consented, bounded and reveals neither persistent identifiers nor private preferences',async()=>{
 const s=await encounterFixture();try{
  await assert.rejects(()=>s.service.browse(s.guests[0],{mode:'dating'}),e=>e.status===409);
  for(let i=0;i<5;i++)await s.optIn(i);
  const listing=await s.service.browse(s.guests[0],{mode:'dating'});assert.equal(listing.profiles.length,3);assert.equal(listing.more,true);
  for(const row of listing.profiles){assert.equal(row.alias===s.guests[0].name,row.id===(await s.service.mine(s.guests[1])).profiles[0].id);for(const key of ['profileId','profile_id','gender','seeking','consentVersion'])assert.equal(Object.hasOwn(row,key),false);}
  const more=await s.service.browse(s.guests[0],{mode:'dating',skip:listing.profiles.map(p=>p.id)});assert.equal(more.profiles.length,1);
  await s.optIn(1,{revision:1,gender:'man',seeking:['woman']});assert.equal((await s.service.browse(s.guests[0],{mode:'dating'})).profiles.length,3);
 }finally{s.close();}
});
test('same-name guests require real mutual interest; retries do not create extra contexts and changed commands conflict',async()=>{
 const s=await encounterFixture();try{
  const a=(await s.optIn(0)).profiles[0],b=(await s.optIn(1)).profiles[0];
  const request={mode:'dating',targetId:b.id,operationKey:crypto.randomUUID()};await Promise.all([s.service.interest(s.guests[0],request),s.service.interest(s.guests[0],request)]);
  assert.equal((await s.service.mine(s.guests[0])).matches.length,0);
  await s.service.interest(s.guests[1],{mode:'dating',targetId:a.id,operationKey:crypto.randomUUID()});
  const own=await s.service.mine(s.guests[0]);assert.equal(own.matches.length,1);assert.equal(own.matches[0].name,'Gleicher Name');assert.equal(s.db.connection.prepare('SELECT COUNT(*) AS n FROM social_contexts').get().n,1);
  await assert.rejects(()=>s.service.interest(s.guests[0],{...request,targetId:a.id}),e=>e.status===409);
  assert.ok(!JSON.stringify(s.db.connection.prepare('SELECT * FROM encounter_operations').all()).includes('Ein schöner Abend'));
 }finally{s.close();}
});
test('pause, withdrawal, stale revisions, session revocation and app closure stop new interactions without replay resurrection',async()=>{
 const s=await encounterFixture();try{
  const original=s.input(),a=(await s.service.optIn(s.guests[0],original)).profiles[0],b=(await s.optIn(1)).profiles[0];
  await s.service.setState(s.guests[0],{mode:'dating',state:'paused',revision:1,operationKey:crypto.randomUUID()});assert.equal((await s.service.browse(s.guests[1],{mode:'dating'})).profiles.length,0);
  await assert.rejects(()=>s.service.interest(s.guests[1],{mode:'dating',targetId:a.id,operationKey:crypto.randomUUID()}),e=>e.status===404);
  await assert.rejects(()=>s.optIn(0,{revision:1}),e=>e.status===409);
  await s.service.setState(s.guests[0],{mode:'dating',state:'withdrawn',revision:2,operationKey:crypto.randomUUID()});
  assert.equal((await s.service.optIn(s.guests[0],original)).profiles[0].state,'withdrawn');const withdrawn=(await s.service.mine(s.guests[0])).profiles[0];assert.equal(withdrawn.about,'');assert.deepEqual(withdrawn.seeking,[]);
  s.db.connection.prepare('UPDATE guest_sessions SET revoked_at=? WHERE participation_id=?').run(Date.now(),s.guests[1].id);await assert.rejects(()=>s.optIn(1,{revision:b.revision}),e=>e.status===409);
  s.ctx.release.state='closed';await assert.rejects(()=>s.optIn(2),e=>e.status===409);
 }finally{s.close();}
});
test('global blocks apply in both directions and consent changes never infer a new dating purpose',async()=>{
 const s=await encounterFixture();try{const a=(await s.optIn(0)).profiles[0],b=(await s.optIn(1)).profiles[0];
  s.db.connection.prepare('INSERT INTO guest_blocks(blocker_profile,blocked_profile,created_at) VALUES(?,?,?)').run(s.guests[1].profile_id,s.guests[0].profile_id,Date.now());assert.equal((await s.service.browse(s.guests[0],{mode:'dating'})).profiles.length,0);await assert.rejects(()=>s.service.interest(s.guests[1],{mode:'dating',targetId:a.id,operationKey:crypto.randomUUID()}),e=>e.status===404);
  s.ctx.release.config.encounters.policyVersion='encounters-v2';assert.equal((await s.service.mine(s.guests[0])).profiles[0].consentVersion,'encounters-v1');await assert.rejects(()=>s.service.interest(s.guests[0],{mode:'dating',targetId:b.id,operationKey:crypto.randomUUID()}),e=>e.status===409);
 }finally{s.close();}
});
test('hosted staffing retains deliberate inheritance versus local assignment and rejects contradictory selections',()=>{
 const offer={id:'welcome',title:'Ankommen',kind:'welcome',enabled:true,minPeople:2,maxPeople:8};
 assert.equal(cleanEncounters({offers:[offer]}).offers[0].staffingMode,'inherit');
 assert.equal(cleanEncounters({offers:[{...offer,hostPersonIds:['one']}]}).offers[0].staffingMode,'assigned');
 for(const invalid of [{staffingMode:'assigned'},{staffingMode:'unattended',hostPersonIds:['one']},{staffingMode:'inherit',hostPersonIds:['one']},{staffingMode:'unknown'}])assert.throws(()=>cleanEncounters({offers:[{...offer,...invalid}]}));
});
