import test from 'node:test';import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';
import {sqliteD1} from './sqlite-d1.mjs';import {createReporting,readsReports,reportWindow,dateBound} from '../lib/reporting.mjs';
const migrationDir=new URL('../migrations/',import.meta.url),schema=(await Promise.all((await readdir(migrationDir)).filter(n=>n.endsWith('.sql')).sort().map(n=>readFile(new URL(n,migrationDir),'utf8')))).join('\n');
function fixture(){const db=sqliteD1();db.connection.exec(schema);const now=Date.now(),event={eventId:'event-one',title:'Abend',date:new Date(now).toISOString().slice(0,10),visibility:'public',app:{state:'open'}};db.connection.prepare('INSERT INTO live_visitors VALUES(?,?,?,?,?,?)').run('visitor-one',event.eventId,'hash','Kein Berichtsname',now,now+86400000);return {db,service:createReporting(db),now,event,person:{id:'visitor-one',event_id:event.eventId},window:reportWindow({},event.date)};}
async function enable(f){const s=await f.service.settings();return f.service.configure({}, {revision:s.revision,enabled:true,analysisEnabled:true,purpose:'Abläufe des Abends auswerten.',legalBasis:'Für diesen isolierten Test festgelegt',privacyUrl:'https://rudelbar.example/datenschutz',policyVersion:'analysis-v1'});}
function request(f,id='request-one'){f.db.connection.prepare("INSERT OR IGNORE INTO live_requests VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(id,f.event.eventId,'music','Musik',f.person.id,id,'music','Privater Inhalt','{}','','new',f.now,f.now,f.now,1,id);}
test('reporting starts without invented history and repeated reads never count as activity',async()=>{const f=fixture();try{
 request(f,'before-enabled');assert.equal(f.db.connection.prepare('SELECT COUNT(*) AS n FROM domain_events').get().n,0);await enable(f);request(f);request(f);
 const report=await f.service.report(f.event,f.window);assert.equal(report.metrics.guestAccesses.value,1);assert.equal(report.metrics.requests[0].count,2);assert.equal(report.metrics.activeGuests.value,1);assert.equal(report.metrics.activeGuests.partial,true);
 assert.equal(JSON.stringify(report).includes('Privater Inhalt'),false);assert.equal(JSON.stringify(report).includes('Kein Berichtsname'),false);assert.equal(JSON.stringify(report).includes('visitor-one'),false);
 await f.service.report(f.event,f.window);assert.equal(f.db.connection.prepare('SELECT COUNT(*) AS n FROM domain_events').get().n,1);
 }finally{f.db.connection.close();}});
test('client ingestion requires the current affirmative purpose consent, rejects spoofed business actions, and deduplicates exact retries',async()=>{const f=fixture();try{
 await enable(f);const events=[{key:'view-once',type:'view.opened',view:'home'}];assert.equal((await f.service.ingest(f.person,{events},null)).accepted,0);
 await f.service.guestConsent(f.person,{version:'analysis-v1',enabled:true,operationKey:'consent-one'});
 const result=await Promise.all([f.service.ingest(f.person,{events},null),f.service.ingest(f.person,{events},null)]);assert.equal(result.reduce((n,r)=>n+r.accepted,0),1);
 await assert.rejects(()=>f.service.ingest(f.person,{events:[{key:'fake',type:'request.created'}]},null),e=>e.status===400);
 await assert.rejects(()=>f.service.ingest(f.person,{events:[{key:'wrong',type:'offer.opened',refs:{objectId:'not-released'}}]},null),e=>e.status===400);
 await assert.rejects(()=>f.service.ingest(f.person,{events:[{key:'view-once',type:'view.opened',view:'map'}]},null),e=>e.status===409);
 await f.service.guestConsent(f.person,{version:'analysis-v1',enabled:false,operationKey:'withdraw-one'});assert.equal(f.db.connection.prepare('SELECT COUNT(*) AS n FROM measurement_events').get().n,0);assert.equal((await f.service.ingest(f.person,{events},null)).accepted,0);
 }finally{f.db.connection.close();}});
test('changed policy invalidates old consent; conflicting concurrent reuse of one key never creates two events',async()=>{const f=fixture();try{
 await enable(f);await f.service.guestConsent(f.person,{version:'analysis-v1',enabled:true,operationKey:'consent-one'});
 const results=await Promise.allSettled(['home','map'].map(view=>f.service.ingest(f.person,{events:[{key:'collision',type:'view.opened',view}]},null)));assert.equal(results.filter(r=>r.status==='rejected').length,1);assert.equal(f.db.connection.prepare('SELECT COUNT(*) AS n FROM measurement_events').get().n,1);
 const s=await f.service.settings();await f.service.configure({}, {revision:s.revision,enabled:true,analysisEnabled:true,purpose:s.purpose,legalBasis:s.legal_basis,privacyUrl:s.privacy_url,policyVersion:'analysis-v2'});assert.equal((await f.service.guestSettings(f.person)).enabled,false);
 }finally{f.db.connection.close();}});
test('raw retention produces bounded non-sensitive totals exactly once, without retaining guest references',async()=>{const f=fixture();try{
 await enable(f);request(f);f.db.connection.prepare('INSERT INTO domain_events(id,event_id,participation_id,type,operation_key,recorded_at) VALUES(?,?,?,?,?,?)').run('sensitive',f.event.eventId,f.person.id,'dating.activated','sensitive',f.now);
 await f.service.retention(f.now+31*86400000);await f.service.retention(f.now+31*86400000);
 const raw=f.db.connection.prepare('SELECT COUNT(*) AS n FROM domain_events').get().n;assert.equal(raw,0);const rows=f.db.connection.prepare('SELECT * FROM reporting_daily').all();assert.equal(rows.length,1);assert.equal(rows[0].count,1);assert.equal(rows[0].type,'request.created');assert.equal(rows[0].expires_at,f.now+396*86400000);assert.equal('participation_id'in rows[0],false);
 await f.service.retention(f.now+397*86400000);assert.equal(f.db.connection.prepare('SELECT COUNT(*) AS n FROM reporting_daily').get().n,0);
 }finally{f.db.connection.close();}});
test('team reaction and a written answer use different clocks, and internal notes are excluded',async()=>{const f=fixture();try{
 await enable(f);request(f);f.db.connection.prepare('INSERT INTO live_activity(event_id,request_id,audience,actor,kind,created_at) VALUES(?,?,?,?,?,?)').run(f.event.eventId,'request-one','guest','publisher','status',f.now+60000);
 const add=f.db.connection.prepare('INSERT INTO live_messages VALUES(?,?,?,?,?,?)');add.run('internal','request-one','internal','Team','Privat',f.now+30000);add.run('reply','request-one','team','Team','Antwort',f.now+180000);
 const r=await f.service.report(f.event,f.window);assert.equal(r.metrics.reaction.median,1);assert.equal(r.metrics.response.median,3);
 }finally{f.db.connection.close();}});
test('sensitive whole-evening totals suppress small groups and roles do not leak all reports',async()=>{const f=fixture();try{
 await enable(f);f.db.connection.prepare('INSERT INTO domain_events(id,event_id,participation_id,type,operation_key,recorded_at) VALUES(?,?,?,?,?,?)').run('sensitive',f.event.eventId,f.person.id,'dating.activated','sensitive',f.now);
 let r=await f.service.report(f.event,f.window,{sensitive:true});assert.equal(r.metrics.dating.values[0].state,'suppressed');assert.equal(r.metrics.dating.values[0].value,null);
 r=await f.service.report(f.event,f.window);assert.deepEqual(r.metrics.dating.values,[]);
 for(const role of ['station','host','author'])assert.equal(readsReports({accountId:'personal',roles:[{role,eventId:f.event.eventId}]},f.event.eventId),false);
 const manager={accountId:'manager',roles:[{role:'manager',eventId:f.event.eventId}]};assert.equal(readsReports(manager,f.event.eventId),true);assert.equal(readsReports(manager,'other-event'),false);
 }finally{f.db.connection.close();}});
test('Berlin day boundaries handle summer time and invalid ranges safely',()=>{assert.equal(dateBound('2026-06-01'),Date.parse('2026-05-31T22:00:00Z'));assert.equal(dateBound('2026-11-01'),Date.parse('2026-10-31T23:00:00Z'));assert.equal(dateBound('2026-03-29',true)-dateBound('2026-03-29'),23*3600000);assert.throws(()=>reportWindow({from:'2026-02-30',to:'2026-03-01'}));assert.throws(()=>reportWindow({from:'2025-01-01',to:'2026-03-01'}));});
test('funnel completion belongs to the same opted-in start and real operation, not to unrelated totals',async()=>{const f=fixture();try{
 await enable(f);await f.service.guestConsent(f.person,{version:'analysis-v1',enabled:true,operationKey:'consent'});
 await f.service.ingest(f.person,{events:[{type:'action.started',key:'request-one-started',action:'music'},{type:'action.started',key:'not-completed-started',action:'music'}]},null);request(f);
 const r=await f.service.report(f.event,f.window);assert.deepEqual(r.metrics.funnels.map(row=>({...row})),[{action:'music',started:2,completed:1}]);
 }finally{f.db.connection.close();}});
test('initial host placement is not an independent join, real joins and explicit departures remain measured',async()=>{const f=fixture();try{
 await enable(f);const now=f.now;f.db.connection.prepare('INSERT INTO live_visitors VALUES(?,?,?,?,?,?)').run('visitor-two',f.event.eventId,'hash','Anderer Gast',now,now+86400000);
 f.db.connection.prepare('INSERT INTO game_rounds(id,event_id,booth_id,offer_type,offer_id,host_visitor_id,client_key,capacity,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run('round-one',f.event.eventId,'booth','games','game',f.person.id,'round-key',2,now,now);
 f.db.connection.prepare('INSERT INTO game_round_members(round_id,visitor_id,joined_at) VALUES(?,?,?)').run('round-one',f.person.id,now);
 assert.equal(f.db.connection.prepare("SELECT COUNT(*) AS n FROM domain_events WHERE type='round.joined'").get().n,0);
 f.db.connection.prepare('INSERT INTO game_round_members VALUES(?,?,?,?)').run('round-one','visitor-two',now,'join-key');f.db.connection.prepare('DELETE FROM game_round_members WHERE round_id=? AND visitor_id=?').run('round-one','visitor-two');
 const rows=f.db.connection.prepare("SELECT type,participation_id FROM domain_events WHERE type IN('round.joined','round.left') ORDER BY type").all();assert.deepEqual(rows.map(r=>[r.type,r.participation_id]),[['round.joined','visitor-two'],['round.left','visitor-two']]);
 }finally{f.db.connection.close();}});
test('cursor maintenance does not count as accepted push; only an actual delivery update does',async()=>{const f=fixture();try{
 await enable(f);f.db.connection.prepare('INSERT INTO live_push_subscriptions(id,event_id,recipient,audience,endpoint_hash,subscription_json,return_path,expires_at,last_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('push-one',f.event.eventId,'v:'+f.person.id,'guest','hash','{}','/',f.now+86400000,201,f.now,f.now);
 await f.db.prepare('UPDATE live_push_subscriptions SET cursor=1 WHERE id=?').bind('push-one').run();assert.equal(f.db.connection.prepare("SELECT COUNT(*) AS n FROM domain_events WHERE type='push.accepted'").get().n,0);
 await f.db.prepare('UPDATE live_push_subscriptions SET cursor=2,last_status=201 WHERE id=?').bind('push-one').run();assert.equal(f.db.connection.prepare("SELECT COUNT(*) AS n FROM domain_events WHERE type='push.accepted'").get().n,1);
 }finally{f.db.connection.close();}});
