import {recordContextPush} from './push-receipts.mjs';
import {sendPush} from './notifications.mjs';
// Separate delivery cursor: existing station deliveries are never replayed or
// renumbered when context conversations are introduced.
export function createConversationPush(env,{conversations,defer,transport,deliver=sendPush}={}){
 const db=env.LIVE_DB,enabled=()=>env.RUDELBAR_CONNECTED_SOCIAL==='1'&&db&&env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_KEY&&env.VAPID_SUBJECT;
 const first=(sql,args=[])=>db.prepare(sql).bind(...args).first(),run=(sql,args=[])=>db.prepare(sql).bind(...args).run();
 async function person(row,now=Date.now()){
  return first('SELECT p.*,v.name,s.id AS session_id FROM guest_participations p JOIN guest_profiles g ON g.id=p.profile_id JOIN guest_sessions s ON s.participation_id=p.id JOIN live_visitors v ON v.id=p.id JOIN live_push_subscriptions sub ON sub.id=? WHERE p.id=? AND p.event_id=? AND p.closed_at IS NULL AND g.closed_at IS NULL AND s.revoked_at IS NULL AND s.expires_at>? AND sub.active=1 AND sub.expires_at>? LIMIT 1',[row.id,row.recipient.slice(2),row.event_id,now,now]);
 }
 async function flush(eventId){
  if(!enabled())return {sent:0};const now=Date.now();
  const rows=(await db.prepare("SELECT s.*,c.cursor AS chat_cursor,c.attempts AS chat_attempts FROM live_push_subscriptions s JOIN guest_chat_push_cursors c ON c.subscription_id=s.id WHERE s.audience='guest' AND s.active=1 AND s.expires_at>? AND c.lease_until<=? AND c.next_attempt<=? AND c.cursor<COALESCE((SELECT MAX(a.seq) FROM guest_conversation_activity a WHERE a.event_id=s.event_id),0)"+(eventId?' AND s.event_id=?':'')+' ORDER BY c.next_attempt LIMIT 20').bind(now,now,now,...(eventId?[eventId]:[])).all()).results||[];
  let sent=0;
  for(const row of rows){
   const lease=await run('UPDATE guest_chat_push_cursors SET lease_until=? WHERE subscription_id=? AND lease_until<=?',[now+60000,row.id,now]);if(!lease.meta.changes)continue;
   try{
    const cursor=Number((await first('SELECT MAX(seq) AS seq FROM guest_conversation_activity WHERE event_id=?',[row.event_id]))?.seq||0),guest=await person(row);
    if(!guest){await run('UPDATE live_push_subscriptions SET active=0 WHERE id=?',[row.id]);await run('UPDATE guest_chat_push_cursors SET lease_until=0 WHERE subscription_id=?',[row.id]);continue;}
    // Re-evaluate membership, blocking, unread state and expiry immediately before
    // preparing each delivery. Private text and aliases never enter lock screens.
    const listing=await conversations.list(guest,{after:row.chat_cursor,before:cursor});
    if(listing.count){const item=listing.items[0];await conversations.room(guest,{conversationId:item.id});if(!await person(row))throw Object.assign(new Error('Session changed'),{status:401});
     const response=await deliver(env,JSON.parse(row.subscription_json),{title:'Neues in deiner Runde',body:'Eine neue Nachricht wartet in deinem Rundengespräch.',tag:'rudelbar-chat-'+row.event_id,url:row.return_path+'&anfrage='+encodeURIComponent(item.id),icon:'/assets/rudelbar-logo.png',id:item.id,count:listing.count},{transport});
     if(!response.ok){if([404,410].includes(response.status))await run('UPDATE live_push_subscriptions SET active=0 WHERE id=?',[row.id]);throw Object.assign(new Error('Push rejected'),{status:response.status});}await recordContextPush(db,'conversation',row,cursor,response.status);sent++;
    }
    await run('UPDATE guest_chat_push_cursors SET cursor=?,lease_until=0,attempts=0,next_attempt=0 WHERE subscription_id=?',[cursor,row.id]);
   }catch(error){await run('UPDATE guest_chat_push_cursors SET lease_until=0,attempts=attempts+1,next_attempt=? WHERE subscription_id=?',[Date.now()+Math.min(900000,30000*2**Math.min(row.chat_attempts,5)),row.id]);}
  }
  return {sent};
 }
 function dispatch(eventId){const work=flush(eventId).catch(()=>{});if(defer)defer(work);return work;}
 return {flush,dispatch};
}
