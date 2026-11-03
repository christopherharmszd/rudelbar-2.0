import {recordContextPush} from './push-receipts.mjs';
import {sendPush} from './notifications.mjs';
// Wall notices share the guest clock and existing device permission. Their
// delivery cursor is separate, so station and chat deliveries never replay.
export function createWallNotices(env,{context,defer,transport,deliver=sendPush}={}){
 const db=env.LIVE_DB;
 const first=(sql,args=[])=>db.prepare(sql).bind(...args).first();
 const run=(sql,args=[])=>db.prepare(sql).bind(...args).run();
 const all=async(sql,args=[])=>((await db.prepare(sql).bind(...args).all()).results||[]);
 async function list(person,{after=0,before=Number.MAX_SAFE_INTEGER}={}){
  const rows=await all(`SELECT p.id,p.status,MAX(a.seq) AS seq,MAX(a.recorded_at) AS createdAt
   FROM wall_audit a JOIN wall_posts p ON p.id=a.post_id
   LEFT JOIN wall_notice_reads r ON r.post_id=p.id AND r.participation_id=?
   WHERE p.participation_id=? AND p.event_id=? AND p.expires_at>?
   AND p.status IN('approved','hidden') AND a.action=p.status
   AND a.seq>MAX(COALESCE(r.seen_seq,0),?) AND a.seq<=?
   GROUP BY p.id ORDER BY seq DESC LIMIT 100`,[person.id,person.id,person.event_id,Date.now(),after,before]);
  const items=[];for(const row of rows){const clock=await first("SELECT seq FROM guest_notice_clock WHERE source='wall' AND source_seq=?",[row.seq]);items.push({id:'wall-'+row.id,kind:'wall',subject:row.status==='approved'?'Dein Moment ist freigegeben':'Rückmeldung zu deinem Moment',stationName:'Memory Wall',seq:row.seq,alertSeq:clock?.seq||0,createdAt:row.createdAt});}
  return {items,count:items.length};
 }
 async function mark(person,{id,seq}){
  if(typeof id!=='string'||!id.startsWith('wall-')||!Number.isSafeInteger(seq)||seq<0)throw Object.assign(new Error('Ungültiger Lesestand.'),{status:400});
  const postId=id.slice(5),row=await first("SELECT MAX(a.seq) AS seq FROM wall_audit a JOIN wall_posts p ON p.id=a.post_id WHERE p.id=? AND p.participation_id=? AND p.event_id=? AND a.action IN('approved','hidden')",[postId,person.id,person.event_id]);
  if(row?.seq)await run('INSERT INTO wall_notice_reads(post_id,participation_id,seen_seq) VALUES(?,?,?) ON CONFLICT(post_id,participation_id) DO UPDATE SET seen_seq=MAX(wall_notice_reads.seen_seq,excluded.seen_seq)',[postId,person.id,Math.min(seq,row.seq)]);return {ok:true};
 }
 async function active(row){return first(`SELECT p.*,s.id AS session_id FROM guest_participations p
  JOIN guest_profiles g ON g.id=p.profile_id JOIN guest_sessions s ON s.participation_id=p.id
  JOIN live_push_subscriptions sub ON sub.id=? WHERE p.id=? AND p.event_id=?
  AND p.closed_at IS NULL AND g.closed_at IS NULL AND s.revoked_at IS NULL
  AND s.expires_at>? AND sub.active=1 AND sub.expires_at>? LIMIT 1`,[row.id,row.recipient.slice(2),row.event_id,Date.now(),Date.now()]);}
 async function flush(eventId){
  if(env.RUDELBAR_CONNECTED_SOCIAL!=='1'||!db||!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY||!env.VAPID_SUBJECT)return {sent:0};
  const now=Date.now(),rows=await all(`SELECT s.*,c.cursor AS wall_cursor,c.attempts AS wall_attempts FROM live_push_subscriptions s JOIN guest_wall_push_cursors c ON c.subscription_id=s.id WHERE s.audience='guest' AND s.active=1 AND s.expires_at>? AND c.lease_until<=? AND c.next_attempt<=? AND c.cursor<COALESCE((SELECT MAX(a.seq) FROM wall_audit a WHERE a.event_id=s.event_id),0)`+(eventId?' AND s.event_id=?':'')+' ORDER BY c.next_attempt LIMIT 20',[now,now,now,...(eventId?[eventId]:[])]);
  let sent=0;for(const row of rows){
   if(!(await run('UPDATE guest_wall_push_cursors SET lease_until=? WHERE subscription_id=? AND lease_until<=?',[now+60000,row.id,now])).meta.changes)continue;
   try{
    const cursor=Number((await first('SELECT MAX(seq) AS seq FROM wall_audit WHERE event_id=?',[row.event_id]))?.seq||0),person=await active(row);
    if(!person){await run('UPDATE live_push_subscriptions SET active=0 WHERE id=?',[row.id]);await run('UPDATE guest_wall_push_cursors SET lease_until=0 WHERE subscription_id=?',[row.id]);continue;}
    const listing=await list(person,{after:row.wall_cursor,before:cursor}),ctx=await context(row.event_id);
    if(listing.count&&ctx.release.state==='open'&&ctx.release.config?.wall?.enabled&&await active(row)){
     const item=listing.items[0],response=await deliver(env,JSON.parse(row.subscription_json),{title:'Neues von deinem Abend',body:'Eine Rückmeldung wartet in deiner Memory Wall.',tag:'rudelbar-wall-'+row.event_id,url:row.return_path+'&wall=1',icon:'/assets/rudelbar-logo.png',id:item.id,count:listing.count},{transport});
     if(!response.ok){if([404,410].includes(response.status))await run('UPDATE live_push_subscriptions SET active=0 WHERE id=?',[row.id]);throw new Error('Push rejected');}await recordContextPush(db,'wall',row,cursor,response.status);sent++;
    }
    await run('UPDATE guest_wall_push_cursors SET cursor=?,lease_until=0,attempts=0,next_attempt=0 WHERE subscription_id=?',[cursor,row.id]);
   }catch{await run('UPDATE guest_wall_push_cursors SET lease_until=0,attempts=attempts+1,next_attempt=? WHERE subscription_id=?',[Date.now()+Math.min(900000,30000*2**Math.min(row.wall_attempts,5)),row.id]);}
  }return {sent};
 }
 function dispatch(eventId){const work=flush(eventId).catch(()=>{});if(defer)defer(work);return work;}
 return {list,mark,flush,dispatch};
}
