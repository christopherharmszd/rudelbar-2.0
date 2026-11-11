export const LIVE_SIGNAL_INTERVAL=5000;
export const LIVE_SIGNAL_TOPICS=new Set(['configuration','inbox','wall','rounds','encounters','raffle','moderation','security']);
export function topicsForSignals(viewer,rows){
 const result=new Set();
 for(const row of rows){
  if(row.revision<=viewer.cursor||!LIVE_SIGNAL_TOPICS.has(row.topic))continue;
  if(row.audience==='public'||row.audience===viewer.audience&&(!row.recipient||viewer.scopes.includes(row.recipient)))result.add(row.topic);
 }
 return [...result];
}
export async function readLiveSignals(db,eventId,cursor=0){
 const rows=(await db.prepare('SELECT audience,recipient,topic,revision FROM app_live_signals WHERE event_id=? AND revision>? ORDER BY revision').bind(eventId,cursor).all()).results||[];
 return {rows,revision:rows.reduce((n,row)=>Math.max(n,row.revision),cursor)};
}
export async function expireLiveSignals(env,now=Date.now()){
 if(env.RUDELBAR_RUNTIME_CONTEXT!=='1'||!env.LIVE_DB)return;
 const lease=await env.LIVE_DB.prepare('UPDATE app_live_signal_maintenance SET last_run=? WHERE id=1 AND last_run<?').bind(now,now-3600000).run();if(!lease.meta.changes)return;
 // A reconnect always requests a fresh snapshot. Old markers are therefore not
 // a history/archive and need not retain participation identifiers indefinitely.
 await env.LIVE_DB.prepare('DELETE FROM app_live_signals WHERE rowid IN(SELECT rowid FROM app_live_signals WHERE changed_at<? ORDER BY changed_at LIMIT 2000)').bind(now-86400000).run();
}
export async function liveSignalSocket(env,request,{eventId,audience,viewer,scopes=[],expiresAt}){
 if(!env.APP_FEED)return Response.json({error:'Die Live-Verbindung ist gerade nicht verfügbar.'},{status:503});
 if(request.headers.get('origin')!==new URL(request.url).origin)return new Response('Forbidden',{status:403});
 if(request.headers.get('upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
 const headers=new Headers({'Upgrade':'websocket','x-live-event':eventId,'x-live-audience':audience,'x-live-viewer':viewer,'x-live-scopes':JSON.stringify(scopes),'x-live-expiry':String(expiresAt)});
 return env.APP_FEED.get(env.APP_FEED.idFromName(eventId)).fetch(new Request('https://app-feed/socket',{headers}));
}
