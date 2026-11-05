// Provider acceptance is a delivery fact, not evidence that a person saw or
// read the notification. A stable receipt key avoids counting retries twice.
export async function recordContextPush(db,source,row,cursor,status){
 if(status<200||status>=300)return;
 const encoded=new TextEncoder().encode(source+'|'+row.id+'|'+cursor),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoded)),n=>n.toString(16).padStart(2,'0')).join(''),key='push-'+digest,now=Date.now();
 await db.batch([
  db.prepare('UPDATE live_push_subscriptions SET last_status=?,updated_at=? WHERE id=?').bind(status,now,row.id),
  db.prepare("INSERT OR IGNORE INTO domain_events(id,event_id,type,operation_key,recorded_at) SELECT ?,?,'push.accepted',?,? WHERE (SELECT enabled FROM reporting_settings WHERE id=1)=1").bind(key,row.event_id,key,now)
 ]);
}
