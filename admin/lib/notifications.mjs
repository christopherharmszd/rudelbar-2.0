import {buildPushPayload} from '@block65/webcrypto-web-push';

const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
export async function sendPush(env,subscription,payload,{transport=fetch}={}){
 let request;
 try{request=await buildPushPayload({data:JSON.stringify(payload),options:{ttl:3600}},subscription,{subject:env.VAPID_SUBJECT,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY});}
 catch(error){console.warn('Rudelbar push preparation failed',{name:error.name});fail('Die Mitteilung konnte nicht für den Versand vorbereitet werden. Bitte versuche den Test später erneut.',502);}
 let response;
 try{response=await transport(subscription.endpoint,{...request,redirect:'manual',signal:AbortSignal.timeout(8000)});}
 catch(error){console.warn('Rudelbar push transport failed',{name:error.name});fail('Der Mitteilungsdienst ist gerade nicht erreichbar. Deine Erlaubnis bleibt erhalten. Bitte versuche den Test erneut.',502);}
 if(response.status>=300&&response.status<400)fail('Der Mitteilungsdienst hat eine unerwartete Weiterleitung gemeldet. Bitte versuche den Test später erneut.',502);
 return response;
}
export function cleanSubscription(input){
 let endpoint;try{endpoint=new URL(input?.endpoint);}catch{fail('Der Browser hat keinen gültigen Mitteilungszugang geliefert.');}
 const host=endpoint.hostname;
 if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.port||endpoint.hash||endpoint.href.length>4096||!(host==='fcm.googleapis.com'||host==='updates.push.services.mozilla.com'||host==='web.push.apple.com'||host.endsWith('.push.apple.com')||host.endsWith('.notify.windows.com')))fail('Dieser Mitteilungsdienst wird nicht unterstützt.');
 const keys=input.keys||{};
 for(const [key,length] of [['p256dh',65],['auth',16]]){if(typeof keys[key]!=='string'||!/^[A-Za-z0-9_-]+={0,2}$/.test(keys[key]))fail('Ungültiger Mitteilungsschlüssel.');try{if(atob(keys[key].replace(/-/g,'+').replace(/_/g,'/')).length!==length)fail('Ungültiger Mitteilungsschlüssel.');}catch{fail('Ungültiger Mitteilungsschlüssel.');}}
 return {endpoint:endpoint.href,expirationTime:null,keys:{p256dh:keys.p256dh,auth:keys.auth}};
}
export function createNotifications(env,{context,defer,transport=fetch}={}){
 const db=env.LIVE_DB,first=(sql,args=[])=>db.prepare(sql).bind(...args).first(),run=(sql,args=[])=>db.prepare(sql).bind(...args).run(),all=async(sql,args=[])=>((await db.prepare(sql).bind(...args).all()).results||[]);
 const configured=()=>!!(env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_KEY&&env.VAPID_SUBJECT);
 function scope(recipient){
  if(recipient.audience==='guest')return {sql:' AND r.visitor_id=?',args:[recipient.id.slice(2)]};
  if(recipient.publisher)return {sql:'',args:[]};
  const ids=recipient.stations||[];return {sql:ids.length?` AND r.station_id IN(${ids.map(()=>'?').join(',')})`:' AND 0',args:ids};
 }
 async function list(recipient,{after=0,before=Number.MAX_SAFE_INTEGER}={}){
  const access=scope(recipient);
  const items=await all(`SELECT r.id,r.subject,r.station_name AS stationName,r.kind,r.status,MAX(a.seq) AS seq,MAX(a.created_at) AS createdAt,COUNT(*) AS changes FROM live_activity a JOIN live_requests r ON r.id=a.request_id LEFT JOIN live_reads seen ON seen.event_id=a.event_id AND seen.recipient=? AND seen.request_id=r.id WHERE a.event_id=? AND a.audience=? AND a.actor<>? AND a.seq>MAX(COALESCE(seen.seen_seq,0),?) AND a.seq<=?${access.sql} GROUP BY r.id ORDER BY seq DESC LIMIT 100`,[recipient.id,recipient.eventId,recipient.audience,recipient.id,after,before,...access.args]);
  return {count:items.length,items};
 }
 async function mark(recipient,{id,seq}){
  if(!Number.isSafeInteger(seq)||seq<0)fail('Ungültiger Lesestand.');
  const access=scope(recipient),visible=await first(`SELECT MAX(a.seq) AS seq FROM live_activity a JOIN live_requests r ON r.id=a.request_id WHERE a.event_id=? AND r.id=? AND a.audience=?${access.sql}`,[recipient.eventId,id,recipient.audience,...access.args]);
  if(!visible?.seq)return {ok:true};
  await run('INSERT INTO live_reads(event_id,recipient,request_id,seen_seq) VALUES(?,?,?,?) ON CONFLICT(event_id,recipient,request_id) DO UPDATE SET seen_seq=MAX(live_reads.seen_seq,excluded.seen_seq)',[recipient.eventId,recipient.id,id,Math.min(seq,visible.seq)]);return {ok:true};
 }
 async function sequence(requestId,audience){return Number((await first('SELECT MAX(seq) AS seq FROM live_activity WHERE request_id=? AND audience=?',[requestId,audience]))?.seq||0);}
 async function settings(recipient,{endpoint}={}){
  const row=endpoint?await first('SELECT active,last_status,expires_at FROM live_push_subscriptions WHERE event_id=? AND recipient=? AND endpoint_hash=?',[recipient.eventId,recipient.id,await hash(endpoint)]):null;
  return {configured:configured(),publicKey:env.VAPID_PUBLIC_KEY||'',enabled:!!(row?.active&&row.expires_at>Date.now()),lastStatus:row?.last_status||0};
 }
 async function subscribe(recipient,input){
  if(!configured())fail('Mitteilungen werden gerade eingerichtet. Neue Nachrichten siehst du weiterhin im Postfach.',503);
  const subscription=cleanSubscription(input.subscription),endpointHash=await hash(subscription.endpoint),now=Date.now(),id=await hash(recipient.eventId+'|'+recipient.id+'|'+endpointHash);
  const existing=await first('SELECT id FROM live_push_subscriptions WHERE id=?',[id]);if(!existing){const count=await first('SELECT COUNT(*) AS n FROM live_push_subscriptions WHERE event_id=? AND recipient=? AND active=1 AND expires_at>?',[recipient.eventId,recipient.id,now]);if(count.n>=10)fail('Es sind bereits zehn Geräte für diesen Abend angemeldet.',409);}
  const cursor=Number((await first('SELECT MAX(seq) AS seq FROM live_activity WHERE event_id=?',[recipient.eventId]))?.seq||0);
  const expiresAt=Math.min(recipient.expiresAt||now+8*3600000,now+7*86400000);
  let path=recipient.audience==='guest'?`/?abend=${encodeURIComponent(recipient.eventId)}&postfach=1`:recipient.publisher?`/team?abend=${encodeURIComponent(recipient.eventId)}`:`/team?s=${encodeURIComponent(recipient.grantId)}`;
  await run(`INSERT INTO live_push_subscriptions(id,event_id,recipient,audience,person_id,grant_id,auth_version,endpoint_hash,subscription_json,return_path,expires_at,active,cursor,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,1,?,?,?) ON CONFLICT(event_id,recipient,endpoint_hash) DO UPDATE SET subscription_json=excluded.subscription_json,expires_at=excluded.expires_at,grant_id=excluded.grant_id,auth_version=excluded.auth_version,return_path=excluded.return_path,active=1,cursor=CASE WHEN live_push_subscriptions.active=1 THEN live_push_subscriptions.cursor ELSE excluded.cursor END,next_attempt=0,attempts=0,updated_at=excluded.updated_at`,[id,recipient.eventId,recipient.id,recipient.audience,recipient.personId||'',recipient.grantId||'',recipient.authVersion||'',endpointHash,JSON.stringify(subscription),path,expiresAt,cursor,now,now]);
  return {ok:true,...await settings(recipient,{endpoint:subscription.endpoint})};
 }
 async function unsubscribe(recipient,{endpoint}={}){
  if(endpoint)await run('UPDATE live_push_subscriptions SET active=0,updated_at=? WHERE event_id=? AND recipient=? AND endpoint_hash=?',[Date.now(),recipient.eventId,recipient.id,await hash(endpoint)]);
  else await run('UPDATE live_push_subscriptions SET active=0,updated_at=? WHERE event_id=? AND recipient=?',[Date.now(),recipient.eventId,recipient.id]);
  return {ok:true};
 }
 async function actorFor(row,cache){
  if(row.audience==='guest'){
   const visitor=await first('SELECT id FROM live_visitors WHERE id=? AND event_id=? AND expires_at>?',[row.recipient.slice(2),row.event_id,Date.now()]);return visitor?{id:row.recipient,eventId:row.event_id,audience:'guest'}:null;
  }
  if(row.recipient==='publisher')return row.auth_version===env.RUDELBAR_PASSWORD_VERIFIER?{id:'publisher',eventId:row.event_id,audience:'team',publisher:true}:null;
  const grant=await first('SELECT person_id FROM live_grants WHERE id=? AND event_id=? AND revoked=0 AND expires_at>?',[row.grant_id,row.event_id,Date.now()]);if(!grant||grant.person_id!==row.person_id)return null;
  if(!cache.has(row.event_id))cache.set(row.event_id,context(row.event_id));const ctx=await cache.get(row.event_id);
  if(!ctx.event.teamIds.includes(row.person_id)||!ctx.people.some(p=>p.personId===row.person_id&&!p.archived))return null;
  return {id:row.recipient,eventId:row.event_id,audience:'team',stations:ctx.stations.filter(s=>!s.operatorIds?.length||s.operatorIds.includes(row.person_id)).map(s=>s.id)};
 }
 function message(recipient,items,path){
  const item=items[0],guest=recipient.audience==='guest';
  const title=guest?(item.kind==='karaoke'&&item.status==='in_progress'?'Du bist dran!':'Neues vom Rudelbar-Team'): 'Neues an deiner Station';
  const body=items.length>1?`${items.length} Gespräche haben neue Nachrichten oder Änderungen.`:guest?(item.kind==='karaoke'&&item.status==='in_progress'?'Dein Karaoke-Auftritt kann losgehen. Schau in dein Postfach.':'Eine Antwort oder ein neuer Status wartet in deinem Postfach.'):'Eine neue Anfrage oder Nachricht wartet im Live-Bereich.';
  return {title,body,tag:'rudelbar-'+recipient.eventId+'-'+recipient.id.replace(':','-'),url:path+'&anfrage='+encodeURIComponent(item.id),icon:guest?'/assets/rudelbar-logo.png':'/abend-preview/assets/rudelbar-logo.png',id:item.id,seq:item.seq,count:items.length};
 }
 async function send(subscription,payload){
  return sendPush(env,subscription,payload,{transport});
 }
 async function test(recipient,{endpoint}){
  if(!configured())fail('Mitteilungen werden gerade eingerichtet.',503);
  const row=await first('SELECT * FROM live_push_subscriptions WHERE event_id=? AND recipient=? AND endpoint_hash=? AND active=1 AND expires_at>?',[recipient.eventId,recipient.id,await hash(endpoint||''),Date.now()]);if(!row)fail('Aktiviere Mitteilungen zuerst auf diesem Gerät.',409);
  if(row.updated_at>Date.now()-15000&&row.last_status===201)fail('Bitte warte kurz vor einer weiteren Testmitteilung.',429);
  let response;
  try{response=await send(JSON.parse(row.subscription_json),{title:'Rudelbar · Testmitteilung',body:'Der Versand funktioniert. So erfährst du von neuen Nachrichten und Änderungen an deinem Abend.',tag:'rudelbar-test',url:row.return_path,count:0});}
  catch(error){await run('UPDATE live_push_subscriptions SET last_status=?,updated_at=? WHERE id=?',[error.status||502,Date.now(),row.id]);throw error;}
  await run('UPDATE live_push_subscriptions SET last_status=?,updated_at=?,active=CASE WHEN ? IN(404,410) THEN 0 ELSE active END WHERE id=?',[response.status,Date.now(),response.status,row.id]);if(!response.ok)fail('Der Mitteilungsdienst hat den Test gerade nicht angenommen. Bitte erneut aktivieren oder später versuchen.',502);
  return {ok:true,accepted:true,providerStatus:response.status};
 }
 async function flush(eventId){
  if(!configured()||!db)return {sent:0};const now=Date.now(),cache=new Map();
  const rows=await all(`SELECT s.* FROM live_push_subscriptions s WHERE active=1 AND expires_at>? AND next_attempt<=? AND lease_until<=? AND cursor<COALESCE((SELECT MAX(seq) FROM live_activity WHERE event_id=s.event_id),0)${eventId?' AND event_id=?':''} ORDER BY next_attempt,updated_at LIMIT 20`,[now,now,now,...(eventId?[eventId]:[])]);
  let sent=0;
  for(let start=0;start<rows.length;start+=4)await Promise.all(rows.slice(start,start+4).map(async row=>{
   const lease=await run('UPDATE live_push_subscriptions SET lease_until=? WHERE id=? AND lease_until<=?',[now+30000,row.id,now]);if(!lease.meta.changes)return;
   try{
    const recipient=await actorFor(row,cache);if(!recipient){await run('UPDATE live_push_subscriptions SET active=0,lease_until=0 WHERE id=?',[row.id]);return;}
    const cursor=Number((await first('SELECT MAX(seq) AS seq FROM live_activity WHERE event_id=?',[row.event_id]))?.seq||row.cursor),listing=await list(recipient,{after:row.cursor,before:cursor});
    if(!listing.count){await run('UPDATE live_push_subscriptions SET cursor=?,lease_until=0,updated_at=? WHERE id=?',[cursor,Date.now(),row.id]);return;}
    const response=await send(JSON.parse(row.subscription_json),message(recipient,listing.items,row.return_path));
    if(response.ok){sent++;await run('UPDATE live_push_subscriptions SET cursor=?,attempts=0,next_attempt=0,last_status=?,lease_until=0,updated_at=? WHERE id=?',[cursor,response.status,Date.now(),row.id]);}
    else if([404,410].includes(response.status))await run('UPDATE live_push_subscriptions SET active=0,lease_until=0,last_status=? WHERE id=?',[response.status,row.id]);
    else throw Object.assign(new Error('push rejected'),{status:response.status});
   }catch(error){await run('UPDATE live_push_subscriptions SET attempts=attempts+1,next_attempt=?,lease_until=0,last_status=?,updated_at=? WHERE id=?',[Date.now()+Math.min(900000,30000*2**Math.min(row.attempts,5)),error.status||0,Date.now(),row.id]);}
  }));return {sent};
 }
 function dispatch(eventId){const work=flush(eventId).catch(()=>{});if(defer)defer(work);return work;}
 return {list,mark,sequence,settings,subscribe,unsubscribe,test,flush,dispatch};
}
