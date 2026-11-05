import {DurableObject} from 'cloudflare:workers';
// Invalidation only. This object never receives guest messages, photos, names,
// consent records or private conversations. Access is checked by the caller.
export class WallFeed extends DurableObject {
 async fetch(request){const url=new URL(request.url);if(url.pathname==='/refresh'&&request.method==='POST'){const message=await request.text()==='invalidate'?'invalidate':'refresh';for(const socket of this.ctx.getWebSockets())try{socket.send(message);}catch{socket.close();}return new Response(null,{status:204});}
  if(url.pathname!=='/socket'||request.headers.get('upgrade')?.toLowerCase()!=='websocket')return new Response('Not found',{status:404});const sockets=this.ctx.getWebSockets(),viewer=request.headers.get('x-wall-viewer')||'';if(sockets.length>=250||viewer&&sockets.filter(s=>s.deserializeAttachment()?.viewer===viewer).length>=4)return new Response('Connection limit',{status:429});const pair=new WebSocketPair();this.ctx.acceptWebSocket(pair[1]);pair[1].serializeAttachment({viewer});pair[1].send('refresh');return new Response(null,{status:101,webSocket:pair[0]});
 }
 webSocketMessage(socket,message){if(message==='ping')socket.send('pong');else socket.close(1008,'Unsupported');}
 webSocketClose(socket,code,reason){socket.close(code,reason);}
}
