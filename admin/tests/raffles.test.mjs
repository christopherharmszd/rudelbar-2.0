import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {sqliteD1} from './sqlite-d1.mjs';
import {createLiveService} from '../lib/live-service.mjs';
import {createRaffles} from '../lib/raffles.mjs';
import {cleanRaffle,raffleIssues,uniformChoice} from '../../shared/raffle.mjs';
const dir=new URL('../migrations/',import.meta.url),schema=(await Promise.all((await readdir(dir)).filter(n=>n.endsWith('.sql')).sort().map(n=>readFile(new URL(n,dir),'utf8')))).join('\n');
const bad=status=>e=>e.status===status;
function action(extra={}){return {id:'evening-prizes',title:'Gemeinsamer Glücksmoment',format:'direct',admission:'profile',minAge:0,publicWinners:false,redeemAfterClose:false,rulesVersion:'rules-v1',rules:'Isolierte Aktion ohne reale Gewinne. Ein Los pro Profil.',privacyUrl:'https://example.test/privacy',issueProcess:'Das Team gibt vor Ort einen Code aus.',ageCheckPolicy:'Altersbeschränkte Preise nur nach Prüfung vor Ort; sonst Alternative.',noShowPolicy:'Nach Ablauf verfällt der Anspruch; eine Neuziehung braucht eine dokumentierte Entscheidung.',entryLimit:20,maxAwards:3,claimMinutes:10,retentionDays:30,prizes:[{id:'first',name:'Lokaler Testpreis',quantity:3,minAge:0,alcohol:false,alternativeId:''}],wheelOutcomes:[],cards:[],...extra};}
async function setup(extra={}){
 const db=sqliteD1();db.connection.exec(schema);const a=action(extra),config={raffle:cleanRaffle({enabled:true,actions:[a]})},ctx={event:{eventId:'evening',title:'Nur isolierte Prüfung',visibility:'public',teamIds:[]},release:{state:'open',versionId:'version',config},people:[],stations:[]};
 db.connection.prepare('INSERT INTO app_release_versions VALUES(?,?,?,?,?,?,?,?)').run('version','evening',JSON.stringify(config),'{}','source','{}',Date.now(),'test');db.connection.prepare('INSERT INTO app_active_releases VALUES(?,?,?,?,?,?)').run('evening','version','open',1,Date.now(),'open');
 const env={LIVE_DB:db,RUDELBAR_CONNECTED_IDENTITY:'1',RUDELBAR_SESSION_SECRET:crypto.randomUUID()+crypto.randomUUID()},live=createLiveService(env,null,{getContext:async()=>ctx}),guests=[];
 for(const name of ['Gleicher Name','Gleicher Name','Dritte Person','Vierte Person']){const session=await live.session({eventId:'evening',name});guests.push(await live.internalVisitor('evening',session.sessionToken));}
 const service=createRaffles(env,{context:live.internalContext,visitor:live.internalVisitor,randomFill:b=>{b[0]=0;}}),admin={name:'Redaktion'},station={accountId:'station',roles:[{role:'station',eventId:'evening'}]};
 const mutate=async(input,kind)=>{const owner=db.connection.prepare('SELECT e.profile_id FROM raffle_entries e JOIN raffle_draws d ON d.entry_id=e.id WHERE d.id=?').get(input.drawId),person=guests.find(g=>g.profile_id===owner?.profile_id),own=person?await service.mine(person):null,draw=own?.actions.flatMap(a=>a.draws).find(d=>d.id===input.drawId);return service.mutation(admin,'evening',a.id,{...input,...(input.claimCode===undefined&&draw?{claimCode:draw.claimCode}:{})},kind);};
 const staff=()=>service.staff(admin,'evening',a.id),enter=(i,input={})=>service.enter(guests[i],a.id,{agree:true,rulesVersion:a.rulesVersion,age:18,publicConsent:false,...input}),draw=async(input={})=>service.draw(admin,'evening',a.id,{operationKey:crypto.randomUUID(),revision:(await staff()).revision,prizeId:'first',...input});
 return {db,env,ctx,guests,service,admin,station,staff,enter,draw,mutate,a,close:()=>db.connection.close(),async ready(n=4){await service.start(admin,'evening',a.id);for(let i=0;i<n;i++)await enter(i);await service.freeze(admin,'evening',a.id,{revision:(await staff()).revision});}};
}
test('raffles start off, need explicit rules and bounded physical outcomes; uniform sampling rejects biased tail values',()=>{
 assert.deepEqual(cleanRaffle({}),{enabled:false,actions:[]});assert.equal(raffleIssues({enabled:false}).length,0);assert.ok(raffleIssues({enabled:true}).length);
 assert.equal(raffleIssues({enabled:true,actions:[action()]}).length,0);
 assert.ok(raffleIssues({enabled:true,actions:[action({format:'wheel'})]}).length);
 assert.ok(raffleIssues({enabled:true,actions:[action({format:'cards',cards:[{id:'card',mark:'01',prizeId:'missing'}]})]}).length);
 let samples=0;const chosen=uniformChoice(3,bytes=>{bytes[0]=samples++?3:4294967295;});assert.equal(samples,2);assert.equal(chosen.index,0);assert.throws(()=>uniformChoice(0));
});
test('draws freeze real eligible entries, keep equal-name ownership separate, replay one result and do not create concurrent extra slots',async()=>{
 const s=await setup();try{
  await s.service.start(s.admin,'evening',s.a.id);await s.enter(0);assert.equal((await s.enter(0)).replayed,true);await s.enter(1);assert.equal((await s.staff()).entries.length,2);
  await assert.rejects(()=>s.draw(),bad(409));await s.service.freeze(s.admin,'evening',s.a.id,{revision:(await s.staff()).revision});await assert.rejects(()=>s.enter(2),bad(409));
  const input={operationKey:crypto.randomUUID(),revision:(await s.staff()).revision,prizeId:'first'},inputs=[input,{...input,operationKey:crypto.randomUUID()}],results=await Promise.allSettled(inputs.map(value=>s.service.draw(s.admin,'evening',s.a.id,value)));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(s.db.connection.prepare('SELECT COUNT(*) AS n FROM raffle_slots').get().n,1);
  const wonIndex=results.findIndex(r=>r.status==='fulfilled'),winningInput=inputs[wonIndex],won=results[wonIndex].value;assert.equal(won.draw.state,'awarded');assert.equal(won.proof.poolSize,2);assert.equal((await s.service.draw(s.admin,'evening',s.a.id,winningInput)).draw.id,won.draw.id);
  await assert.rejects(()=>s.service.draw(s.admin,'evening',s.a.id,{...winningInput,prizeId:'different'}),bad(409));assert.equal((await s.staff()).stock[0].held,1);
  await assert.rejects(()=>s.service.staff(s.station,'evening',s.a.id),bad(403));await assert.rejects(()=>s.service.draw({accountId:'other',roles:[{role:'raffle',eventId:'another'}]},'evening',s.a.id,input),bad(403));
 }finally{s.close();}
});
test('redemption is atomic, single-use and cannot be replayed into another prize or extra inventory',async()=>{
 const s=await setup();try{await s.ready();const {draw}=await s.draw(),input={drawId:draw.id,revision:draw.revision,operationKey:crypto.randomUUID(),prizeId:'first'};
  const inputs=[input,{...input,operationKey:crypto.randomUUID()}],results=await Promise.allSettled(inputs.map(value=>s.mutate(value,'redeem'))),winningInput=inputs[results.findIndex(r=>r.status==='fulfilled')];assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await s.mutate(winningInput,'redeem')).replayed,true);
  const stock=(await s.staff()).stock[0];assert.equal(stock.issued,1);assert.equal(stock.held,0);assert.equal(s.db.connection.prepare('SELECT COUNT(*) AS n FROM raffle_redemptions').get().n,1);
  await assert.rejects(()=>s.mutate({...winningInput,prizeId:'other'},'redeem'),bad(409));await assert.rejects(()=>s.mutate({drawId:draw.id,revision:2,operationKey:crypto.randomUUID(),reason:'Correction'},'cancel'),bad(409));
 }finally{s.close();}
});
test('an unknown physical-wheel result reserves every possible prize, not an average, and failed reservations roll the whole draw back',async()=>{
 const prizes=[{id:'first',name:'Ergebnis A',quantity:2,minAge:0,alcohol:false,alternativeId:''},{id:'second',name:'Ergebnis B',quantity:1,minAge:0,alcohol:false,alternativeId:''}],s=await setup({format:'wheel',prizes,wheelOutcomes:['first','second','none']});
 try{await s.ready();const a=(await s.draw()).draw,before=(await s.staff()).revision;await assert.rejects(()=>s.draw(),bad(409));assert.equal((await s.staff()).revision,before);assert.equal(s.db.connection.prepare('SELECT COUNT(*) AS n FROM raffle_slots').get().n,1);
  assert.deepEqual((await s.staff()).stock.map(p=>p.held),[1,1]);await s.mutate({drawId:a.id,revision:1,prizeId:'first',operationKey:crypto.randomUUID()},'settle');assert.equal((await s.staff()).stock.find(p=>p.id==='second').held,0);
  const b=(await s.draw()).draw;await s.mutate({drawId:b.id,revision:1,prizeId:'none',operationKey:crypto.randomUUID()},'settle');assert.equal((await s.staff()).stock.find(p=>p.id==='second').held,0);assert.equal((await s.staff()).stock.find(p=>p.id==='first').held,1);
 }finally{s.close();}
});
test('physical cards have a fixed finite mapping, cannot be issued twice, and accept only their recorded result',async()=>{
 const s=await setup({format:'cards',maxAwards:1,cards:[{id:'card-01',mark:'Karte 01',prizeId:'first'}]});try{await s.ready();const d=(await s.draw({cardId:'card-01'})).draw;
  await assert.rejects(()=>s.draw({cardId:'card-01'}),bad(409));await assert.rejects(()=>s.mutate({drawId:d.id,revision:1,operationKey:crypto.randomUUID(),prizeId:'other'},'settle'),bad(400));
  assert.equal((await s.mutate({drawId:d.id,revision:1,operationKey:crypto.randomUUID(),prizeId:'first'},'settle')).draw.state,'awarded');
  const owner=s.db.connection.prepare('SELECT participation_id FROM raffle_entries WHERE id=(SELECT entry_id FROM raffle_draws WHERE id=?)').get(d.id).participation_id;assert.equal((await s.service.mine(s.guests.find(g=>g.id===owner))).actions[0].draws[0].cardMark,'Karte 01');
 }finally{s.close();}
});
test('on-site codes are stable on retry, one-use and bound to the real profile rather than its alias',async()=>{
 const s=await setup({admission:'issued-code'});try{await s.service.start(s.admin,'evening',s.a.id);const operationKey=crypto.randomUUID(),issued=await s.service.issue(s.admin,'evening',s.a.id,{operationKey});assert.equal((await s.service.issue(s.admin,'evening',s.a.id,{operationKey})).code,issued.code);
  await assert.rejects(()=>s.enter(0),bad(400));await s.enter(0,{code:issued.code});await assert.rejects(()=>s.enter(1,{code:issued.code}),bad(409));s.guests[0].name='Umbenannt';assert.equal((await s.enter(0,{code:issued.code})).replayed,true);assert.equal((await s.staff()).entries.length,1);assert.ok(!JSON.stringify(s.db.connection.prepare('SELECT * FROM raffle_codes').all()).includes(issued.code));
 }finally{s.close();}
});
test('cancellation and redraw retain one budget slot and never select earlier recipients again',async()=>{
 const s=await setup({maxAwards:1});try{await s.ready();const a=(await s.draw()).draw;await assert.rejects(()=>s.draw(),bad(409));await s.mutate({drawId:a.id,revision:1,operationKey:crypto.randomUUID(),reason:'Nicht erschienen laut festgelegter Regel'},'cancel');
  const b=(await s.draw({replace:a.id,reason:'Dokumentierte Neuziehung'})).draw;assert.equal(a.slotId,b.slotId);assert.equal(b.generation,2);assert.equal(s.db.connection.prepare('SELECT COUNT(*) AS n FROM raffle_slots').get().n,1);
  const recipients=s.db.connection.prepare('SELECT entry_id FROM raffle_draws').all();assert.notEqual(recipients[0].entry_id,recipients[1].entry_id);await assert.rejects(()=>s.draw({replace:a.id,reason:'Alte Stornierung erneut verwenden'}),bad(409));
 }finally{s.close();}
});
test('restricted prizes reserve a suitable alternative; issuance checks age at the desk and closure blocks unapproved later issuance',async()=>{
 const prizes=[{id:'first',name:'Altersbeschränkter Testpreis',quantity:1,minAge:18,alcohol:true,alternativeId:'alternative'},{id:'alternative',name:'Alkoholfreie Alternative',quantity:1,minAge:0,alcohol:false,alternativeId:''}],s=await setup({prizes});
 try{await s.ready();const d=(await s.draw()).draw;assert.equal((await s.staff()).stock.find(p=>p.id==='alternative').held,1);
  await assert.rejects(()=>s.mutate({drawId:d.id,revision:1,operationKey:crypto.randomUUID(),prizeId:'first'},'redeem'),bad(400));s.ctx.release.state='closed';await assert.rejects(()=>s.mutate({drawId:d.id,revision:1,operationKey:crypto.randomUUID(),prizeId:'alternative'},'redeem'),bad(409));s.ctx.release.state='open';await s.mutate({drawId:d.id,revision:1,operationKey:crypto.randomUUID(),prizeId:'alternative'},'redeem');assert.equal((await s.staff()).stock.find(p=>p.id==='first').held,0);assert.equal((await s.staff()).stock.find(p=>p.id==='alternative').issued,1);
 }finally{s.close();}
});
test('a real session revocation prevents admission and withdrawal invalidates frozen selection without inventing another entry',async()=>{
 const s=await setup();try{await s.service.start(s.admin,'evening',s.a.id);s.db.connection.prepare('UPDATE guest_sessions SET revoked_at=? WHERE participation_id=?').run(Date.now(),s.guests[0].id);await assert.rejects(()=>s.enter(0),bad(409));await s.enter(1);await s.enter(2);await s.service.freeze(s.admin,'evening',s.a.id,{revision:(await s.staff()).revision});const revision=(await s.staff()).revision;
  await s.service.withdraw(s.guests[1],s.a.id);await assert.rejects(()=>s.draw({revision}),bad(409));const d=(await s.draw()).draw;const entry=s.db.connection.prepare('SELECT participation_id FROM raffle_entries WHERE id=(SELECT entry_id FROM raffle_draws WHERE id=?)').get(d.id);assert.equal(entry.participation_id,s.guests[2].id);
 }finally{s.close();}
});

test('simultaneous exact retries share the recorded draw and redemption rather than using a stale transaction marker',async()=>{
 const s=await setup();try{await s.ready();const input={operationKey:crypto.randomUUID(),revision:(await s.staff()).revision,prizeId:'first'},draws=await Promise.all([s.service.draw(s.admin,'evening',s.a.id,input),s.service.draw(s.admin,'evening',s.a.id,input)]);assert.equal(draws[0].draw.id,draws[1].draw.id);assert.equal(s.db.connection.prepare('SELECT COUNT(*) AS n FROM raffle_slots').get().n,1);
  const mutation={operationKey:crypto.randomUUID(),drawId:draws[0].draw.id,revision:1,prizeId:'first'},results=await Promise.all([s.mutate(mutation,'redeem'),s.mutate(mutation,'redeem')]);assert.equal(results[0].draw.id,results[1].draw.id);assert.equal(s.db.connection.prepare('SELECT COUNT(*) AS n FROM raffle_redemptions').get().n,1);assert.equal((await s.staff()).stock[0].issued,1);
 }finally{s.close();}
});

test('proof records the chosen index and pool; publication needs separate winner consent, and expiry cleanup preserves existing guests',async()=>{
 const s=await setup({publicWinners:true});try{await s.ready();const d=(await s.draw()).draw,proof=await s.service.proof(s.admin,'evening',s.a.id,d.id);assert.equal(proof.pool[proof.index],proof.selectedEntryId);assert.equal((await s.service.results(s.guests[0],s.a.id)).results[0].name,'Ein Gast aus dem Rudel');
  const profile=s.db.connection.prepare('SELECT profile_id FROM raffle_entries WHERE id=?').get(proof.selectedEntryId).profile_id;s.db.connection.prepare('UPDATE raffle_entries SET public_consent=1 WHERE profile_id=?').run(profile);assert.equal((await s.service.results(s.guests[0],s.a.id)).results[0].name,s.guests.find(g=>g.profile_id===profile).name);
  s.db.connection.prepare('UPDATE raffle_draws SET expires_at=? WHERE id=?').run(Date.now()-1,d.id);const current=await s.staff();assert.equal(current.draws[0].state,'expired');assert.equal(current.stock[0].held,0);assert.equal(s.db.connection.prepare("SELECT COUNT(*) AS n FROM raffle_audit WHERE action='expired'").get().n,1);await s.staff();assert.equal(s.db.connection.prepare("SELECT COUNT(*) AS n FROM raffle_audit WHERE action='expired'").get().n,1);
  const guestsBefore=s.db.connection.prepare('SELECT * FROM guest_participations ORDER BY id').all();assert.equal((await s.service.retention(Date.now()+31*86400000)).removed,1);for(const table of ['raffle_campaigns','raffle_entries','raffle_slots','raffle_draws','raffle_reservations','raffle_codes','raffle_audit'])assert.equal(s.db.connection.prepare('SELECT COUNT(*) AS n FROM '+table).get().n,0);assert.deepEqual(s.db.connection.prepare('SELECT * FROM guest_participations ORDER BY id').all(),guestsBefore);assert.equal(s.db.connection.prepare('PRAGMA foreign_key_check').all().length,0);
 }finally{s.close();}
});

test('a public draw identifier is no redemption credential; only the recipient gets the personal claim proof',async()=>{
 const s=await setup();try{await s.ready();const d=(await s.draw()).draw;
  await assert.rejects(()=>s.service.mutation(s.admin,'evening',s.a.id,{drawId:d.id,revision:1,operationKey:crypto.randomUUID(),prizeId:'first'},'redeem'),bad(403));
  await assert.rejects(()=>s.service.mutation(s.admin,'evening',s.a.id,{drawId:d.id,revision:1,operationKey:crypto.randomUUID(),prizeId:'first',claimCode:'0'.repeat(64)},'redeem'),bad(403));
  const proof=await s.service.proof(s.admin,'evening',s.a.id,d.id),entry=s.db.connection.prepare('SELECT profile_id FROM raffle_entries WHERE id=?').get(proof.selectedEntryId),owner=s.guests.find(g=>g.profile_id===entry.profile_id),other=s.guests.find(g=>g.profile_id!==entry.profile_id),own=await s.service.mine(owner),claimCode=own.actions[0].draws[0].claimCode;assert.match(claimCode,/^[a-f0-9]{64}$/);assert.ok(!JSON.stringify(await s.service.mine(other)).includes(claimCode));assert.ok(!JSON.stringify(await s.service.results(owner,s.a.id)).includes(claimCode));assert.ok(!JSON.stringify(await s.staff()).includes(claimCode));
  assert.equal((await s.service.mutation(s.admin,'evening',s.a.id,{drawId:d.id,revision:1,operationKey:crypto.randomUUID(),prizeId:'first',claimCode},'redeem')).draw.state,'redeemed');
 }finally{s.close();}
});

test('raffle context notices share one guest clock, scope ownership and read markers, and stop generic push after session revocation',async()=>{
 const s=await setup();try{const {createContextNotices}=await import('../lib/context-notices.mjs');s.db.connection.prepare('UPDATE reporting_settings SET enabled=1 WHERE id=1').run();await s.ready();const d=(await s.draw()).draw,proof=await s.service.proof(s.admin,'evening',s.a.id,d.id),profile=s.db.connection.prepare('SELECT profile_id FROM raffle_entries WHERE id=?').get(proof.selectedEntryId).profile_id,person=s.guests.find(g=>g.profile_id===profile),other=s.guests.find(g=>g.id!==person.id),payloads=[];
  const engine=createContextNotices({...s.env,RUDELBAR_CONNECTED_SOCIAL:'1',VAPID_PUBLIC_KEY:crypto.randomUUID(),VAPID_PRIVATE_KEY:crypto.randomUUID(),VAPID_SUBJECT:'https://example.test'},{resolve:(p,n)=>s.service.resolveNotice(p,n),pushAllowed:(p,n)=>s.service.pushAllowed(p,n),deliver:async(_e,_s,p)=>{payloads.push(p);return new Response(null,{status:201});}});
  const now=Date.now();s.db.connection.prepare("INSERT INTO live_push_subscriptions(id,event_id,recipient,audience,person_id,grant_id,auth_version,endpoint_hash,subscription_json,return_path,expires_at,active,cursor,created_at,updated_at) VALUES('context-device','evening',?,'guest','','','','device','{}','/?abend=evening&postfach=1',?,1,0,?,?)").run('v:'+person.id,now+86400000,now,now);s.db.connection.prepare("INSERT INTO guest_context_push_cursors(subscription_id) VALUES('context-device')").run();
  const unread=await engine.list(person);assert.equal(unread.count,1);assert.ok(unread.items[0].alertSeq>0);assert.equal((await engine.list(other)).count,0);await Promise.all([engine.flush(),engine.flush()]);assert.equal(payloads.length,1);assert.ok(!JSON.stringify(payloads).includes('Gleicher'));assert.ok(!JSON.stringify(payloads).includes('Testpreis'));assert.ok(payloads[0].url.endsWith('kontext=raffle'));assert.equal(s.db.connection.prepare("SELECT COUNT(*) AS n FROM domain_events WHERE type='push.accepted'").get().n,1);
  await engine.mark(other,{id:unread.items[0].id,seq:999999});assert.equal((await engine.list(person)).count,1);await engine.mark(person,{id:unread.items[0].id,seq:999999});await engine.mark(person,{id:unread.items[0].id,seq:999999});assert.equal((await engine.list(person)).count,0);assert.equal(s.db.connection.prepare("SELECT COUNT(*) AS n FROM domain_events WHERE type='inbox.read'").get().n,1);
  await s.mutate({drawId:d.id,revision:1,operationKey:crypto.randomUUID(),prizeId:'first'},'redeem');assert.equal((await engine.list(person)).count,1);s.db.connection.prepare('UPDATE guest_sessions SET revoked_at=? WHERE participation_id=?').run(Date.now(),person.id);await engine.flush();assert.equal(payloads.length,1);assert.equal(s.db.connection.prepare("SELECT active FROM live_push_subscriptions WHERE id='context-device'").get().active,0);
 }finally{s.close();}
});

test('public-name permission can be withdrawn independently after closure without losing the prize or creating another entry',async()=>{
 const s=await setup({publicWinners:true});try{await s.service.start(s.admin,'evening',s.a.id);await s.enter(0,{publicConsent:true});await s.service.freeze(s.admin,'evening',s.a.id,{revision:(await s.staff()).revision});const d=(await s.draw()).draw;assert.equal((await s.service.results(s.guests[0],s.a.id)).results[0].name,'Gleicher Name');s.ctx.release.state='closed';await s.service.publicConsent(s.guests[0],s.a.id,{enabled:false});s.ctx.release.state='open';assert.equal((await s.service.results(s.guests[0],s.a.id)).results[0].name,'Ein Gast aus dem Rudel');assert.equal((await s.service.mine(s.guests[0])).actions[0].draws[0].state,'awarded');assert.equal((await s.staff()).entries.length,1);await assert.rejects(()=>s.service.publicConsent(s.guests[0],s.a.id,{enabled:true}),bad(400));await s.service.withdraw(s.guests[0],s.a.id);assert.equal((await s.service.mine(s.guests[0])).actions[0].draws[0].state,'cancelled');assert.equal(d.generation,1);
 }finally{s.close();}
});

test('a configured whole-evening limit also prevents participation through another action; a policy change cannot strand an active campaign',async()=>{
 const s=await setup();try{const {releaseContinuity}=await import('../lib/release-continuity.mjs');const other={...s.a,id:'another-action'};s.ctx.release.config.raffle=cleanRaffle({enabled:true,actions:[s.a,other]});s.ctx.release.versionId='version-two';s.db.connection.prepare('INSERT INTO app_release_versions VALUES(?,?,?,?,?,?,?,?)').run('version-two','evening',JSON.stringify(s.ctx.release.config),'{}','source-two','{}',Date.now(),'test');s.db.connection.prepare("UPDATE app_active_releases SET version_id='version-two',revision=revision+1 WHERE event_id='evening'").run();await s.service.start(s.admin,'evening',s.a.id);await s.service.start(s.admin,'evening',other.id);await s.enter(0);await assert.rejects(()=>s.service.enter(s.guests[0],other.id,{agree:true,rulesVersion:'rules-v1',age:0,publicConsent:false}),bad(409));
  const unchanged=await releaseContinuity(s.db,'evening',s.ctx.release.config);assert.equal(unchanged.length,0);const modified=structuredClone(s.ctx.release.config);modified.raffle.actions[0].prizes[0].quantity++;assert.ok((await releaseContinuity(s.db,'evening',modified)).some(i=>i.includes('laufende Gewinnaktion')));modified.raffle={enabled:false,actions:[]};assert.ok((await releaseContinuity(s.db,'evening',modified)).length);await s.service.end(s.admin,'evening',s.a.id,{revision:(await s.staff()).revision,reason:'Aktion ohne offene Gewinne beendet'});await s.service.end(s.admin,'evening',other.id,{revision:(await s.service.staff(s.admin,'evening',other.id)).revision,reason:'Aktion beendet'});assert.equal((await releaseContinuity(s.db,'evening',modified)).length,0);
 }finally{s.close();}
});

test('raffle reports separate original rights, redraws, reservations and actual issue without aliases or private claim proofs',async()=>{
 const s=await setup();try{const {createReporting}=await import('../lib/reporting.mjs');s.db.connection.prepare('UPDATE reporting_settings SET enabled=1 WHERE id=1').run();await s.ready();const d=(await s.draw()).draw;await s.mutate({drawId:d.id,revision:1,operationKey:crypto.randomUUID(),prizeId:'first'},'redeem');const report=await createReporting(s.db).report({eventId:'evening',title:'Nur lokale Prüfung',date:'2026-11-03',app:{state:'open'}},{from:'2026-11-03',to:'2026-11-03',start:Date.now()-60000,end:Date.now()+60000}),r=report.metrics.raffle,events=Object.fromEntries(r.events.map(e=>[e.type,e.count]));assert.equal(events['raffle.entered'],4);assert.equal(events['raffle.drawn'],1);assert.equal(events['prize.redeemed'],1);assert.equal(r.draws[0].originalSlots,1);assert.equal(r.stock[0].issued,1);assert.equal(r.stock[0].reserved,0);assert.ok(!JSON.stringify(report).includes('Gleicher Name'));assert.ok(!JSON.stringify(report).includes('claimCode'));
 }finally{s.close();}
});
test('closed-evening receipts expose their actual late-redemption policy and only explicitly allowed issues succeed',async()=>{
 for(const redeemAfterClose of [false,true]){
  const s=await setup({redeemAfterClose});try{
   await s.ready(1);const draw=(await s.draw()).draw;s.ctx.release.state='closed';s.db.connection.prepare("UPDATE app_active_releases SET state='closed' WHERE event_id='evening'").run();
   const receipt=await s.service.mine(s.guests[0]);assert.equal(receipt.actions[0].redeemAfterClose,redeemAfterClose);assert.equal(receipt.actions[0].draws[0].id,draw.id);
   const issue=()=>s.mutate({drawId:draw.id,revision:draw.revision,operationKey:crypto.randomUUID(),prizeId:'first'},'redeem');
   if(redeemAfterClose){await issue();assert.equal((await s.staff()).stock[0].issued,1);}else{await assert.rejects(issue,bad(409));assert.equal((await s.staff()).stock[0].issued,0);}
  }finally{s.close();}
 }
});
