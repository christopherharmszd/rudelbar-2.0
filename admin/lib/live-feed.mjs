import {DurableObject} from 'cloudflare:workers';
import {LIVE_SIGNAL_INTERVAL,LIVE_SIGNAL_TOPICS,readLiveSignals,topicsForSignals} from './live-signals.mjs';
// One event-wide watchdog; only the indexed change markers are read. Messages,
// names, photos, event codes and session secrets never enter this object.
export class LiveFeed extends DurableObject {
 async fetch(request){
  if(new URL(request.url).pathname!=='/socket'||request.headers.get('upgrade')?.toLowerCase()!=='websocket')return new Response('Not found',{status:404});
  const eventId=request.headers.get('x-live-event'),audience=request.headers.get('x-live-audience'),viewer=request.headers.get('x-live-viewer'),expiresAt=Number(request.headers.get('x-live-expiry'));
  let scopes;try{scopes=JSON.parse(request.headers.get('x-live-scopes'));}catch{return new Response('Forbidden',{status:403});}
  if(!/^[a-z0-9-]{1,120}$/i.test(eventId||'')||!['guest','team','public'].includes(audience)||!viewer||viewer.length>150||!Number.isFinite(expiresAt)||expiresAt<=Date.now()||!Array.isArray(scopes)||scopes.length>4||scopes.some(s=>typeof s!=='string'||s.length>150))return new Response('Forbidden',{status:403});
  const sockets=this.ctx.getWebSockets();if(sockets.length>=2000||sockets.filter(s=>s.deserializeAttachment()?.viewer===viewer).length>=8)return new Response('Connection limit',{status:429});
  const cursor=Number((await this.env.LIVE_DB.prepare('SELECT MAX(revision) AS revision FROM app_live_signals WHERE event_id=?').bind(eventId).first())?.revision||0);
  const pair=new WebSocketPair();this.ctx.acceptWebSocket(pair[1]);pair[1].serializeAttachment({eventId,audience,viewer,scopes,expiresAt,cursor,heartbeat:Date.now()});
  // The first refresh closes the gap between the caller's initial read and connect.
  pair[1].send(JSON.stringify({type:'ready',topics:[...LIVE_SIGNAL_TOPICS].filter(t=>t!=='security'),revision:cursor}));
  if(await this.ctx.storage.getAlarm()===null)await this.ctx.storage.setAlarm(Date.now()+LIVE_SIGNAL_INTERVAL);
  return new Response(null,{status:101,webSocket:pair[0]});
 }
 async alarm(){
  const sockets=this.ctx.getWebSockets();if(!sockets.length)return;
  const now=Date.now(),active=[];
  for(const socket of sockets){const viewer=socket.deserializeAttachment();if(!viewer||viewer.expiresAt<=now){try{socket.close(1008,'Session expired');}catch{}continue;}active.push({socket,viewer});}
  if(!active.length)return;
  try{
   const eventId=active[0].viewer.eventId,cursor=Math.min(...active.map(s=>s.viewer.cursor)),batch=await readLiveSignals(this.env.LIVE_DB,eventId,cursor);
   for(const {socket,viewer} of active){
    const topics=topicsForSignals(viewer,batch.rows);if(topics.includes('security')){try{socket.send(JSON.stringify({type:'change',topics:['security'],revision:batch.revision}));socket.close(1008,'Access changed');}catch{}continue;}
    const heartbeat=now-viewer.heartbeat>=60000;
    try{if(topics.length||heartbeat)socket.send(JSON.stringify({type:topics.length?'change':'heartbeat',topics,revision:batch.revision}));socket.serializeAttachment({...viewer,cursor:batch.revision,heartbeat:topics.length||heartbeat?now:viewer.heartbeat});}catch{try{socket.close();}catch{}}
   }
  }finally{if(this.ctx.getWebSockets().length)await this.ctx.storage.setAlarm(Date.now()+LIVE_SIGNAL_INTERVAL);}
 }
 webSocketMessage(socket,message){if(message==='ping')socket.send('pong');else socket.close(1008,'Unsupported');}
 webSocketClose(socket,code,reason){try{socket.close(code,reason);}catch{}}
}
