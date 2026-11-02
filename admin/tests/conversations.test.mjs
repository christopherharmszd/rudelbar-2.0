import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {sqliteD1} from './sqlite-d1.mjs';
import {createLiveService} from '../lib/live-service.mjs';
import {createConversationPush} from '../lib/conversation-push.mjs';
import {createGuestIdentity} from '../lib/guest-identity.mjs';
const dir=new URL('../migrations/',import.meta.url),schema=(await Promise.all((await readdir(dir)).filter(n=>n.endsWith('.sql')).sort().map(n=>readFile(new URL(n,dir),'utf8')))).join('\n');
const bad=status=>error=>error.status===status;
async function setup(){
 const db=sqliteD1();db.connection.exec(schema);const config={features:{roundChat:true},communication:{privacyUrl:'https://rudelbar.de/datenschutz',retentionDays:7},games:[{id:'cards',name:'Karten',capacity:4,categoryId:'games'}],sections:[{categoryId:'games',enabled:true}],map:{enabled:true,layout:{booths:[{id:'stand',title:'Spiele',visible:true,offers:[{type:'games',id:'cards',matching:true,stationIds:['games']}]}]}}};
 const ctx={event:{eventId:'evening',title:'Isolierte Prüfung',teamIds:['team'],visibility:'public'},release:{state:'open',versionId:'version-one',config},stations:[{id:'games',name:'Spiele',kind:'message',enabled:true,operatorIds:['team']}],people:[{personId:'team',name:'Betreuung'}]};
 db.connection.prepare('INSERT INTO app_release_versions VALUES(?,?,?,?,?,?,?,?)').run('version-one','evening',JSON.stringify(config),'{}','source','{}',Date.now(),'test');db.connection.prepare('INSERT INTO app_active_releases VALUES(?,?,?,?,?,?)').run('evening','version-one','open',1,Date.now(),'operation');
 const env={LIVE_DB:db,RUDELBAR_CONNECTED_IDENTITY:'1',RUDELBAR_CONNECTED_SOCIAL:'1'},service=createLiveService(env,null,{getContext:async()=>ctx}),guests=[];
 for(const name of ['Alex','Alex','Dritte Person'])guests.push(await service.session({eventId:'evening',name}));
 const call=(who,operation,extra={})=>service.conversation({eventId:'evening',sessionToken:guests[who].sessionToken,operation,...extra});
 const round=(who,operation,extra={})=>service.roundAction({eventId:'evening',sessionToken:guests[who].sessionToken,offerType:'games',offerId:'cards',boothId:'stand',operation,...extra});
 const profile=(who,operation='read',input={})=>service.guestProfile({eventId:'evening',sessionToken:guests[who].sessionToken,operation,input});
 const r=(await round(0,'create',{capacity:4,clientKey:crypto.randomUUID()})).rounds[0];await round(1,'join',{roundId:r.id});return {db,env,ctx,service,guests,call,round,profile,id:r.id,close:()=>db.connection.close()};
}
test('guest profile CAS changes the alias without merging equal-name people or ownership',async()=>{
 const s=await setup();try{const a=await s.profile(0),b=await s.profile(1);assert.equal(a.name,b.name);const before=s.db.connection.prepare('SELECT id,profile_id FROM guest_participations ORDER BY id').all();
 const value={name:'Neuer Name',about:'Ein Abend vor Ort',interests:['Karten','Musik'],revision:0,operationKey:'profile-save'};assert.equal((await s.profile(0,'save',value)).name,'Neuer Name');assert.equal((await s.profile(0,'save',value)).replayed,true);assert.deepEqual(s.db.connection.prepare('SELECT id,profile_id FROM guest_participations ORDER BY id').all(),before);assert.equal((await s.profile(1)).name,'Alex');
 await assert.rejects(()=>s.profile(0,'save',{...value,operationKey:'stale'}),bad(409));await assert.rejects(()=>s.profile(0,'save',{...value,name:'Different'}),bad(409));
 const current=await s.profile(0),results=await Promise.allSettled(['a','b'].map(key=>s.profile(0,'save',{...value,name:key,revision:current.revision,operationKey:key})));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 await createGuestIdentity(s.db).revokeSession(s.guests[0].sessionToken.split('.')[0],s.guests[0].sessionToken.split('.')[0]);await assert.rejects(()=>s.profile(0),bad(401));
 }finally{s.close();}
});
test('round conversations require actual membership, keep aliases as sent and deduplicate messages',async()=>{
 const s=await setup();try{await assert.rejects(()=>s.call(2,'read',{kind:'round',referenceId:s.id}),bad(403));const clientKey=crypto.randomUUID(),input={kind:'round',referenceId:s.id,body:'Treffen am Tisch',clientKey};
 const sent=await s.call(0,'send',input);assert.equal(sent.messages[0].mine,true);const room=sent.conversation.id;assert.equal((await s.call(0,'send',input)).replayed,true);await assert.rejects(()=>s.call(0,'send',{...input,body:'Anders'}),bad(409));
 await s.profile(0,'save',{name:'Neu',about:'',interests:[],revision:0,operationKey:'rename'});const read=await s.call(1,'read',{conversationId:room});assert.equal(read.messages[0].name,'Alex');assert.equal(read.messages[0].mine,false);
 assert.equal((await s.call(0,'list')).items.length,1);assert.equal((await s.service.guestNotice({eventId:'evening',sessionToken:s.guests[1].sessionToken,action:'list'})).items[0].kind,'conversation');await s.call(1,'mark',{conversationId:room,seq:read.activitySeq});assert.equal((await s.service.guestNotice({eventId:'evening',sessionToken:s.guests[1].sessionToken,action:'list'})).count,0);
 }finally{s.close();}
});
test('join/leave boundaries use sequence watermarks even when timestamps are equal',async()=>{
 const s=await setup();try{const sent=await s.call(0,'send',{referenceId:s.id,body:'Vorher',clientKey:crypto.randomUUID()});await s.round(2,'join',{roundId:s.id});assert.equal((await s.call(2,'read',{referenceId:s.id})).messages.length,0);
 await s.call(1,'send',{referenceId:s.id,body:'Danach',clientKey:crypto.randomUUID()});const beforeLeave=await s.call(2,'read',{referenceId:s.id});assert.equal(beforeLeave.messages.length,1);await s.round(2,'leave',{roundId:s.id});await assert.rejects(()=>s.call(2,'read',{referenceId:s.id}),bad(403));
 const report=await s.call(2,'report',{referenceId:s.id,messageId:beforeLeave.messages[0].id,clientKey:crypto.randomUUID(),reason:'unfriendly',comment:''});assert.equal(report.report.status,'new');await assert.rejects(()=>s.call(2,'report',{referenceId:s.id,messageId:sent.messages[0].id,clientKey:crypto.randomUUID(),reason:'other'}),bad(404));
 }finally{s.close();}
});
test('blocking removes read, send, inbox and rejoin access; reports remain possible',async()=>{
 const s=await setup();try{const sent=await s.call(0,'send',{referenceId:s.id,body:'Meldbarer Text',clientKey:crypto.randomUUID()}),messageId=sent.messages[0].id;await s.call(1,'block',{referenceId:s.id,messageId});
 await assert.rejects(()=>s.call(0,'read',{referenceId:s.id}),bad(403));await assert.rejects(()=>s.call(0,'send',{referenceId:s.id,body:'Noch einmal',clientKey:crypto.randomUUID()}),bad(403));assert.equal((await s.call(1,'list')).count,0);
 await s.call(1,'report',{referenceId:s.id,messageId,clientKey:crypto.randomUUID(),reason:'harassment',comment:'Bitte prüfen'});
 await s.round(0,'leave',{roundId:s.id});await assert.rejects(()=>s.round(0,'join',{roundId:s.id}),bad(409));
 const profiles=await s.profile(1);assert.equal(profiles.blocks.length,1);await s.profile(0,'unblock',{id:profiles.blocks[0].id});assert.equal((await s.profile(1)).blocks.length,1);await s.profile(1,'unblock',{id:profiles.blocks[0].id});assert.equal((await s.profile(1)).blocks.length,0);
 }finally{s.close();}
});
test('closed or superseded releases cannot send; readonly history and bounded retention remain',async()=>{
 const s=await setup();try{await s.call(0,'send',{referenceId:s.id,body:'Erhalten',clientKey:crypto.randomUUID()});s.db.connection.prepare("UPDATE app_active_releases SET state='closed' WHERE event_id='evening'").run();await assert.rejects(()=>s.call(0,'send',{referenceId:s.id,body:'Sperre',clientKey:crypto.randomUUID()}),bad(409));s.ctx.release.state='closed';assert.equal((await s.call(1,'read',{referenceId:s.id})).conversation.writable,false);assert.equal((await s.call(1,'read',{referenceId:s.id})).messages.length,1);
 s.db.connection.prepare('UPDATE guest_conversation_messages SET expires_at=?').run(Date.now()-1);assert.equal((await s.call(1,'read',{referenceId:s.id})).messages.length,0);await s.service.conversations.retention();assert.equal(s.db.connection.prepare('SELECT count(*) n FROM guest_conversation_messages').get().n,0);
 }finally{s.close();}
});
test('only administration and assigned protection staff can inspect reported excerpts',async()=>{
 const s=await setup();try{const a=await s.call(0,'send',{referenceId:s.id,body:'Nur gemeldeter Ausschnitt',clientKey:crypto.randomUUID()});await s.call(0,'send',{referenceId:s.id,body:'Bleibt privat',clientKey:crypto.randomUUID()});await s.call(1,'report',{referenceId:s.id,messageId:a.messages[0].id,clientKey:crypto.randomUUID(),reason:'other'});
 const station=await s.service.accountActor('evening',{accountId:'station',personId:'team',roles:[{role:'station',eventId:'evening'}]});await assert.rejects(()=>s.service.staffReports(station,{}),bad(403));const moderator=await s.service.accountActor('evening',{accountId:'moderator',personId:'team',roles:[{role:'moderator',eventId:'evening'}]});assert.equal((await s.service.inbox(moderator)).requests.length,0);const list=await s.service.staffReports(moderator,{});assert.equal(list.reports.length,1);assert.equal(list.reports[0].reported.body,'Nur gemeldeter Ausschnitt');assert.ok(!JSON.stringify(list).includes('Bleibt privat'));const r=list.reports[0];await s.service.staffReports(moderator,{id:r.id,status:'closed',revision:r.revision});await assert.rejects(()=>s.service.staffReports(moderator,{id:r.id,status:'reviewing',revision:r.revision}),bad(409));
 }finally{s.close();}
});

test('chat push obeys current membership, blocks, session revocation and a separate idempotent cursor',async()=>{
 const s=await setup();try{
  const payloads=[],env={...s.env,VAPID_PUBLIC_KEY:'test',VAPID_PRIVATE_KEY:'test',VAPID_SUBJECT:'https://rudelbar.de'},push=createConversationPush(env,{conversations:s.service.conversations,deliver:async(_env,_subscription,payload)=>{payloads.push(payload);return new Response(null,{status:201});}});
  const id=s.guests[1].sessionToken.split('.')[0];s.db.connection.prepare("INSERT INTO live_push_subscriptions(id,event_id,recipient,audience,person_id,grant_id,auth_version,endpoint_hash,subscription_json,return_path,expires_at,active,cursor,created_at,updated_at) VALUES(?,?,?,'guest','','','','device','{}','/?abend=evening&postfach=1',?,1,0,?,?)").run('device','evening','v:'+id,Date.now()+86400000,Date.now(),Date.now());s.db.connection.prepare('INSERT INTO guest_chat_push_cursors(subscription_id) VALUES(?)').run('device');
  let sent=await s.call(0,'send',{referenceId:s.id,body:'Private Nachricht mit persönlichem Inhalt',clientKey:crypto.randomUUID()});await Promise.all([push.flush(),push.flush()]);assert.equal(payloads.length,1);assert.ok(!JSON.stringify(payloads).includes('Private'));assert.ok(!JSON.stringify(payloads).includes('Alex'));assert.equal((await push.flush()).sent,0);
  await s.call(0,'send',{referenceId:s.id,body:'Nicht mehr zustellen',clientKey:crypto.randomUUID()});await s.call(1,'block',{referenceId:s.id,messageId:sent.messages[0].id});assert.equal((await push.flush()).sent,0);assert.equal(payloads.length,1);
  const profile=await s.profile(1);await s.profile(1,'unblock',{id:profile.blocks[0].id});await s.call(0,'send',{referenceId:s.id,body:'Nach Abmeldung unsichtbar',clientKey:crypto.randomUUID()});await s.service.guestLogout({eventId:'evening',sessionToken:s.guests[1].sessionToken});s.db.connection.prepare('UPDATE live_push_subscriptions SET active=1').run();assert.equal((await push.flush()).sent,0);assert.equal(payloads.length,1);
 }finally{s.close();}
});
