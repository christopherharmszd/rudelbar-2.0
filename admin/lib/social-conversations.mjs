import {id,text,hash,fail} from './wall-policy.mjs';
import {hasRole,requirePermission} from './permissions.mjs';
const DAY=86400000;
const reasons=['unfriendly','harassment','inappropriate','unsafe','spam','other'];
export function createSocialConversations(env,{context,visitor,dispatch=()=>{},contactAccess=async()=>null,identityGuard=null}){
 const db=env.LIVE_DB,first=(sql,args=[])=>db.prepare(sql).bind(...args).first(),all=async(sql,args=[])=>((await db.prepare(sql).bind(...args).all()).results||[]);
 const blocks='EXISTS(SELECT 1 FROM guest_blocks WHERE (blocker_profile=? AND blocked_profile=?) OR(blocker_profile=? AND blocked_profile=?))';
 const blockArgs=(a,b)=>[a,b,b,a];
 const sessionSql='EXISTS(SELECT 1 FROM guest_sessions s JOIN guest_participations p ON p.id=s.participation_id JOIN guest_profiles g ON g.id=p.profile_id WHERE s.id=? AND p.id=? AND p.profile_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND p.closed_at IS NULL AND g.closed_at IS NULL)';
 const sessionArgs=(p,now)=>[p.session_id||p.id,p.id,p.profile_id,now];
 async function room(person,contextId,{forReport=false}={}){
  const now=Date.now(),r=await first('SELECT * FROM social_contexts WHERE id=? AND expires_at>?',[id(contextId),now]);
  if(!r||![r.profile_a,r.profile_b].includes(person.profile_id)||r.kind!=='contact'&&r.event_id!==person.event_id)fail('Diese Begegnung gehört nicht zu deinem Zugang.',404);
  const other=r.profile_a===person.profile_id?r.profile_b:r.profile_a,policy=JSON.parse(r.policy_json);
  if(!forReport&&await first('SELECT 1 AS yes WHERE '+blocks,blockArgs(person.profile_id,other)))fail('Diese Verbindung ist gesperrt.',403);
  if(r.kind==='contact'){
   const contact=await contactAccess(person,r,{forReport});if(!contact)fail('Für diesen Kontakt fehlt die beidseitige Freigabe.',403);
   return {row:r,other,policy,writable:r.state==='active'&&contact.writable===true,guard:contact.guard,args:contact.args};
  }
  const profiles=await all('SELECT p.* FROM encounter_profiles p JOIN guest_profiles g ON g.id=p.profile_id JOIN guest_participations t ON t.id=p.participation_id WHERE p.event_id=? AND p.mode=? AND p.profile_id IN(?,?) AND p.delete_at>? AND g.closed_at IS NULL AND t.closed_at IS NULL',[r.event_id,r.kind,r.profile_a,r.profile_b,now]);
  if(!forReport&&(r.state!=='active'||profiles.length!==2||profiles.some(p=>p.state==='withdrawn')))fail('Diese Begegnung ist beendet oder zurückgenommen.',403);
  const ctx=await context(r.event_id),c=ctx.release.config?.encounters||{};
  const writable=r.state==='active'&&ctx.release.state==='open'&&c.enabled===true&&c[r.kind+'Enabled']===true&&profiles.length===2&&profiles.every(p=>p.state==='active'&&p.expires_at>now&&p.consent_version===c.policyVersion);
  const guard="EXISTS(SELECT 1 FROM social_contexts WHERE id=? AND state='active' AND revision=? AND expires_at>?) AND "+sessionSql+' AND NOT '+blocks+" AND EXISTS(SELECT 1 FROM app_active_releases WHERE event_id=? AND version_id=? AND state='open') AND (SELECT COUNT(*) FROM encounter_profiles p JOIN guest_profiles g ON g.id=p.profile_id JOIN guest_participations t ON t.id=p.participation_id WHERE p.event_id=? AND p.mode=? AND p.profile_id IN(?,?) AND p.state='active' AND p.expires_at>? AND p.consent_version=? AND g.closed_at IS NULL AND t.closed_at IS NULL)=2";
  return {row:r,other,policy,writable,guard,args:[r.id,r.revision,now,...sessionArgs(person,now),...blockArgs(person.profile_id,other),r.event_id,ctx.release.versionId,r.event_id,r.kind,r.profile_a,r.profile_b,now,c.policyVersion||'']};
 }
 async function read(person,input){
  const r=await room(person,input.contextId),before=input.before||0;if(!Number.isSafeInteger(before)||before<0)fail('Bitte das Gespräch erneut öffnen.');
  const rows=await all('SELECT * FROM social_messages WHERE context_id=? AND expires_at>? AND (?=0 OR seq<?) ORDER BY seq DESC LIMIT 41',[r.row.id,Date.now(),before,before]),messages=rows.slice(0,40).reverse();
  return {conversation:{id:r.row.id,kind:r.row.kind,title:r.policy.aliases?.[r.other]||'Eure Begegnung',writable:r.writable,expiresAt:r.row.expires_at,privacyUrl:r.policy.privacyUrl||'',retentionDays:r.policy.messageDays||7,contactPossible:r.policy.contactsEnabled===true,contactPolicyVersion:r.policy.contactPolicyVersion||'',contactNotice:r.policy.contactNotice||'',contactDays:r.policy.contactDays||0},messages:messages.map(m=>({id:m.id,name:m.alias,body:m.body,seq:m.seq,createdAt:m.created_at,mine:m.sender_profile===person.profile_id})),noticeSeq:r.row.kind==='contact'?Number((await first('SELECT MAX(seq) AS n FROM guest_contact_activity WHERE profile_id=? AND context_id=?',[person.profile_id,r.row.id]))?.n||0):person.id?Number((await first('SELECT MAX(seq) AS n FROM guest_context_events WHERE participation_id=? AND object_id=?',[person.id,r.row.id]))?.n||0):0,activitySeq:messages.at(-1)?.seq||0,more:rows.length>40,before:rows.length>40?messages[0]?.seq:null};
 }
 async function list(person){
  const rows=await all("SELECT c.*,COALESCE((SELECT MAX(seq) FROM social_messages m WHERE m.context_id=c.id),0) AS seq,COALESCE((SELECT COUNT(*) FROM social_messages m WHERE m.context_id=c.id AND m.sender_profile!=? AND m.expires_at>? AND m.seq>COALESCE((SELECT seen_seq FROM social_reads WHERE context_id=c.id AND profile_id=?),0)),0) AS unread FROM social_contexts c WHERE (c.profile_a=? OR c.profile_b=?) AND c.expires_at>? AND c.state='active' AND (c.event_id=? OR c.kind='contact') ORDER BY c.updated_at DESC LIMIT 100",[person.profile_id,Date.now(),person.profile_id,person.profile_id,person.profile_id,Date.now(),person.event_id||'']);
  const items=[];for(const row of rows){try{const r=await room(person,row.id);items.push({id:row.id,kind:row.kind,name:r.policy.aliases?.[r.other]||'Eure Begegnung',unread:row.unread,seq:row.seq,writable:r.writable,updatedAt:row.updated_at});}catch(e){if(![403,404].includes(e.status))throw e;}}
  return {items,count:items.length};
 }
 async function send(person,input){
  const r=await room(person,input.contextId),clientKey=id(input.clientKey),body=text(input.body,2000,true),requestHash=await hash(body),saved=()=>first('SELECT request_hash FROM social_messages WHERE context_id=? AND sender_profile=? AND client_key=?',[r.row.id,person.profile_id,clientKey]),old=await saved();
  if(old){if(old.request_hash!==requestHash)fail('Diese Nachrichtenkennung gehört zu einem anderen Text.',409);return {...await read(person,input),replayed:true};}
  if(!r.writable)fail('Dieses Gespräch pausiert oder der Abend ist geschlossen. Der bisherige Verlauf bleibt bis zum angegebenen Datum lesbar.',409);
  const now=Date.now(),messageId=crypto.randomUUID(),alias=r.policy.aliases?.[person.profile_id]||person.name||'Ein Gast';
  await db.batch([
   db.prepare('INSERT OR IGNORE INTO social_messages(id,context_id,sender_profile,alias,body,client_key,request_hash,created_at,expires_at) SELECT ?,?,?,?,?,?,?,?,? WHERE '+r.guard+' AND (SELECT COUNT(*) FROM social_messages WHERE sender_profile=? AND created_at>?)<10 AND (SELECT COUNT(*) FROM social_messages WHERE sender_profile=? AND created_at>?)<200').bind(messageId,r.row.id,person.profile_id,alias,body,clientKey,requestHash,now,r.row.expires_at,...r.args,person.profile_id,now-10000,person.profile_id,now-3600000),
   db.prepare('UPDATE social_contexts SET revision=revision+1,updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM social_messages WHERE id=?)').bind(now,r.row.id,messageId)
  ]);
  const result=await saved();if(!result)fail('Die Begegnung oder Anmeldung hat sich geändert. Bei vielen Nachrichten bitte kurz warten.',409);if(result.request_hash!==requestHash)fail('Diese Kennung gehört zu einem anderen Text.',409);dispatch(r.row.event_id);return read(person,input);
 }
 async function mark(person,input){const visible=await read(person,input),seq=input.seq;if(!Number.isSafeInteger(seq)||seq<0)fail('Ungültiger Lesestand.');await db.prepare('INSERT INTO social_reads(context_id,profile_id,seen_seq) VALUES(?,?,?) ON CONFLICT(context_id,profile_id) DO UPDATE SET seen_seq=MAX(social_reads.seen_seq,excluded.seen_seq)').bind(visible.conversation.id,person.profile_id,Math.min(seq,visible.activitySeq)).run();if(visible.conversation.kind==='contact'&&Number.isSafeInteger(input.noticeSeq)&&input.noticeSeq>=0)await db.prepare('INSERT INTO guest_contact_reads(profile_id,context_id,seen_seq) VALUES(?,?,?) ON CONFLICT(profile_id,context_id) DO UPDATE SET seen_seq=MAX(guest_contact_reads.seen_seq,excluded.seen_seq)').bind(person.profile_id,visible.conversation.id,Math.min(input.noticeSeq,visible.noticeSeq)).run();return {ok:true};}
 async function end(person,input){
  const r=await room(person,input.contextId,{forReport:true}),now=Date.now();if(input.block!==undefined&&typeof input.block!=='boolean')fail('Bitte eine eindeutige Auswahl treffen.');
  const check=identityGuard?identityGuard(person,now):{sql:sessionSql,args:sessionArgs(person,now)},authorized=check.sql,authArgs=check.args;await db.batch([
   ...(!input.block?[]:[db.prepare('INSERT OR IGNORE INTO guest_blocks(id,blocker_profile,blocked_profile,created_at) SELECT ?,?,?,? WHERE '+authorized).bind(crypto.randomUUID(),person.profile_id,r.other,now,...authArgs)]),
   db.prepare("UPDATE social_contexts SET state='ended',reason=?,revision=revision+1,updated_at=? WHERE "+(input.block?'((profile_a=? AND profile_b=?) OR(profile_a=? AND profile_b=?))':'id=?')+" AND state='active' AND "+authorized).bind(input.block?'blocked':'ended',now,...(input.block?blockArgs(person.profile_id,r.other):[r.row.id]),...authArgs)
  ]);return {ok:true,blocked:input.block===true};
 }
 async function report(person,input){
  const r=await room(person,input.contextId,{forReport:true}),message=await first('SELECT * FROM social_messages WHERE id=? AND context_id=? AND sender_profile!=? AND expires_at>?',[id(input.messageId),r.row.id,person.profile_id,Date.now()]);if(!message)fail('Diese Nachricht gehört nicht zu deiner Begegnung.',404);
  if(!reasons.includes(input.reason))fail('Bitte einen Meldegrund auswählen.');const check=identityGuard?identityGuard(person):{sql:sessionSql,args:sessionArgs(person,Date.now())};const comment=text(input.comment||'',500),operation=id(input.clientKey),requestHash=await hash(JSON.stringify({message:message.id,reason:input.reason,comment})),now=Date.now();
  await db.prepare('INSERT OR IGNORE INTO social_reports(id,event_id,context_id,reporter_profile,message_id,reason,comment,snapshot_json,operation_key,request_hash,created_at,updated_at,expires_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE '+check.sql+' AND (SELECT COUNT(*) FROM social_reports WHERE reporter_profile=? AND created_at>?)<10').bind(crypto.randomUUID(),r.row.event_id,r.row.id,person.profile_id,message.id,input.reason,comment,JSON.stringify({name:message.alias,body:message.body,createdAt:message.created_at}),operation,requestHash,now,now,now+30*DAY,...check.args,person.profile_id,now-3600000).run();
  const saved=await first('SELECT id,state,request_hash FROM social_reports WHERE reporter_profile=? AND operation_key=?',[person.profile_id,operation]);if(!saved)fail('Bitte warte kurz vor einer weiteren Meldung.',429);if(saved.request_hash!==requestHash)fail('Diese Meldungskennung gehört zu einer anderen Meldung.',409);return {report:{id:saved.id,status:saved.state}};
 }
 async function moderation(user,eventId,input={}){
  requirePermission(hasRole(user,'admin')||hasRole(user,'moderator',eventId));
  if(input.id){if(!['reviewing','closed'].includes(input.status)||!Number.isSafeInteger(input.revision))fail('Bitte die Meldung erneut öffnen.');const result=await db.prepare('UPDATE social_reports SET state=?,revision=revision+1,updated_at=? WHERE id=? AND event_id=? AND revision=?').bind(input.status,Date.now(),id(input.id),eventId,input.revision).run();if(!result.meta.changes)fail('Die Meldung wurde inzwischen bearbeitet.',409);}
  const rows=await all('SELECT id,reason,comment,snapshot_json,state AS status,revision,created_at AS createdAt FROM social_reports WHERE event_id=? AND expires_at>? ORDER BY created_at DESC LIMIT 100',[eventId,Date.now()]);return {reports:rows.map(({snapshot_json,...row})=>({...row,kind:'social',reported:JSON.parse(snapshot_json)}))};
 }
 async function resolveNotice(person,row){if(!['play','dance','dating','contact'].includes(row.kind))return null;try{const r=await room(person,row.object_id);if(r.row.state!=='active')return null;return {id:row.kind+'-'+row.object_id,kind:row.kind,subject:'Eure Begegnung',stationName:'Dein Postfach',contextId:row.object_id};}catch(e){if([403,404].includes(e.status))return null;throw e;}}
 async function pushAllowed(person,item){try{return (await room(person,item.contextId)).writable;}catch(e){if([403,404].includes(e.status))return false;throw e;}}
 async function guest(input){const person=await visitor(input.eventId,input.sessionToken);if(input.operation==='list')return list(person);if(input.operation==='read')return read(person,input);if(input.operation==='send')return send(person,input);if(input.operation==='mark')return mark(person,input);if(input.operation==='end')return end(person,input);if(input.operation==='report')return report(person,input);fail('Diese Gesprächsaktion ist nicht verfügbar.',404);}
 return {room,read,list,send,mark,end,report,moderation,resolveNotice,pushAllowed,guest};
}
