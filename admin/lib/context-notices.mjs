import {recordContextPush} from './push-receipts.mjs';
import {sendPush} from './notifications.mjs';
// A shared source for feature feedback. Resolvers re-check the actual context;
// neither an event id nor a notification id grants private access.
export function createContextNotices(env,{resolve,pushAllowed,defer,transport,deliver=sendPush}){
 const db=env.LIVE_DB,first=(sql,args=[])=>db.prepare(sql).bind(...args).first(),run=(sql,args=[])=>db.prepare(sql).bind(...args).run(),all=async(sql,args=[])=>((await db.prepare(sql).bind(...args).all()).results||[]);
 async function list(person,{after=0,before=Number.MAX_SAFE_INTEGER}={}){
  const rows=await all(`SELECT n.* FROM guest_context_events n LEFT JOIN guest_context_reads r ON r.participation_id=n.participation_id AND r.kind=n.kind AND r.object_id=n.object_id WHERE n.participation_id=? AND n.event_id=? AND n.expires_at>? AND n.seq>MAX(COALESCE(r.seen_seq,0),?) AND n.seq<=? AND n.seq=(SELECT MAX(x.seq) FROM guest_context_events x WHERE x.participation_id=n.participation_id AND x.kind=n.kind AND x.object_id=n.object_id AND x.seq<=?) ORDER BY n.seq DESC LIMIT 100`,[person.id,person.event_id,Date.now(),after,before,before]);
  const items=[];for(const row of rows){const item=await resolve(person,row);if(!item)continue;const clock=await first("SELECT seq FROM guest_notice_clock WHERE source='context' AND source_seq=?",[row.seq]);items.push({...item,seq:row.seq,alertSeq:clock?.seq||0,createdAt:row.created_at});}return {items,count:items.length};
 }
 async function mark(person,{id,seq}){
  if(typeof id!=='string'||!Number.isSafeInteger(seq)||seq<0)throw Object.assign(Error('Ungültiger Lesestand.'),{status:400});
  const kind=id.slice(0,id.indexOf('-')),objectId=id.slice(id.indexOf('-')+1),row=await first('SELECT * FROM guest_context_events WHERE participation_id=? AND event_id=? AND kind=? AND object_id=? ORDER BY seq DESC LIMIT 1',[person.id,person.event_id,kind,objectId]);
  if(row&&await resolve(person,row))await run('INSERT INTO guest_context_reads(participation_id,kind,object_id,seen_seq) VALUES(?,?,?,?) ON CONFLICT(participation_id,kind,object_id) DO UPDATE SET seen_seq=MAX(guest_context_reads.seen_seq,excluded.seen_seq)',[person.id,kind,objectId,Math.min(seq,row.seq)]);return {ok:true};
 }
 async function active(row){return first(`SELECT p.*,s.id AS session_id FROM guest_participations p JOIN guest_profiles g ON g.id=p.profile_id JOIN guest_sessions s ON s.participation_id=p.id JOIN live_push_subscriptions sub ON sub.id=? WHERE p.id=? AND p.event_id=? AND p.closed_at IS NULL AND g.closed_at IS NULL AND s.revoked_at IS NULL AND s.expires_at>? AND sub.active=1 AND sub.expires_at>? LIMIT 1`,[row.id,row.recipient.slice(2),row.event_id,Date.now(),Date.now()]);}
 async function flush(eventId){
  if(env.RUDELBAR_CONNECTED_SOCIAL!=='1'||!db||!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY||!env.VAPID_SUBJECT)return {sent:0};
  const now=Date.now(),rows=await all(`SELECT s.*,c.cursor AS context_cursor,c.attempts AS context_attempts FROM live_push_subscriptions s JOIN guest_context_push_cursors c ON c.subscription_id=s.id WHERE s.audience='guest' AND s.active=1 AND s.expires_at>? AND c.lease_until<=? AND c.next_attempt<=? AND c.cursor<COALESCE((SELECT MAX(n.seq) FROM guest_context_events n WHERE n.event_id=s.event_id),0)`+(eventId?' AND s.event_id=?':'')+' ORDER BY c.next_attempt LIMIT 20',[now,now,now,...(eventId?[eventId]:[])]);let sent=0;
  for(const row of rows){if(!(await run('UPDATE guest_context_push_cursors SET lease_until=? WHERE subscription_id=? AND lease_until<=?',[now+60000,row.id,now])).meta.changes)continue;
   try{const cursor=Number((await first('SELECT MAX(seq) AS seq FROM guest_context_events WHERE event_id=?',[row.event_id]))?.seq||0),person=await active(row);if(!person){await run('UPDATE live_push_subscriptions SET active=0 WHERE id=?',[row.id]);await run('UPDATE guest_context_push_cursors SET lease_until=0 WHERE subscription_id=?',[row.id]);continue;}
    const listing=await list(person,{after:row.context_cursor,before:cursor});let item;for(const candidate of listing.items)if(await pushAllowed(person,candidate)){item=candidate;break;}
    if(item&&await active(row)){const response=await deliver(env,JSON.parse(row.subscription_json),{title:'Neues für dich',body:'In deiner Rudelbar-App wartet eine Rückmeldung.',tag:'rudelbar-context-'+row.event_id,url:row.return_path+'&kontext='+encodeURIComponent(item.kind),id:item.id,icon:'/assets/rudelbar-logo.png',count:listing.count},{transport});if(!response.ok){if([404,410].includes(response.status))await run('UPDATE live_push_subscriptions SET active=0 WHERE id=?',[row.id]);throw Error('Push rejected');}await recordContextPush(db,'context',row,cursor,response.status);sent++;}
    await run('UPDATE guest_context_push_cursors SET cursor=?,lease_until=0,attempts=0,next_attempt=0 WHERE subscription_id=?',[cursor,row.id]);
   }catch{await run('UPDATE guest_context_push_cursors SET lease_until=0,attempts=attempts+1,next_attempt=? WHERE subscription_id=?',[Date.now()+Math.min(900000,30000*2**Math.min(row.context_attempts,5)),row.id]);}
  }return {sent};
 }
 function dispatch(eventId){const work=flush(eventId).catch(()=>{});if(defer)defer(work);return work;}
 return {list,mark,flush,dispatch};
}
