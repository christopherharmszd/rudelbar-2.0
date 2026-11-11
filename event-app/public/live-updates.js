// One change connection and one slow fallback clock per document. All feature
// views subscribe here instead of creating their own background HTTP intervals.
const watchers=new Set();
let endpoint='',socket=null,retry=null,clock=null,attempt=0,lastMessage=0,visible=true;
const now=()=>Date.now();
const isVisible=()=>document.visibilityState!=='hidden';
function announce(topics){for(const item of watchers)if(!item.stopped&&(!item.enabled||item.enabled())&&(!topics||item.topics.some(t=>topics.includes(t))))Promise.resolve().then(item.callback).catch(()=>{});}
function unavailable(){for(const item of watchers)if(!item.stopped)item.onUnavailable?.();}
function schedule(){clearTimeout(retry);if(!endpoint||!isVisible())return;const delay=Math.min(60000,[1000,3000,5000,15000,30000,60000][Math.min(attempt++,5)]);retry=setTimeout(open,delay+Math.floor(Math.random()*Math.min(1000,delay/5)));}
function open(){
 clearTimeout(retry);retry=null;if(!endpoint||!isVisible()||socket&&socket.readyState<2)return;
 try{const url=new URL(endpoint,location.href);if(url.origin!==location.origin||!url.pathname.startsWith('/api/'))return;url.protocol=url.protocol==='https:'?'wss:':'ws:';const current=new WebSocket(url.href);socket=current;
  current.onmessage=event=>{if(socket!==current)return;let data;try{data=JSON.parse(event.data);}catch{return;}if(!['ready','change','heartbeat'].includes(data.type)||!Array.isArray(data.topics))return;lastMessage=now();attempt=0;if(data.topics.includes('security')){unavailable();close();announce(null);schedule();return;}if(data.type!=='heartbeat')announce(data.topics);};
  current.onclose=()=>{if(socket!==current)return;socket=null;unavailable();schedule();};current.onerror=()=>current.close();
 }catch{socket=null;schedule();}
}
function close(){clearTimeout(retry);retry=null;const old=socket;socket=null;if(old){old.onclose=null;old.close();}}
function tick(){
 if(!isVisible())return;
 const healthy=socket?.readyState===1&&now()-lastMessage<90000;
 if(socket?.readyState===1&&!healthy){close();unavailable();schedule();}
 if(healthy)return;
 for(const item of watchers)if(!item.stopped&&(!item.enabled||item.enabled())&&now()-item.lastFallback>=item.fallbackMs){item.lastFallback=now();Promise.resolve().then(item.callback).catch(()=>{});}
}
export function connectLiveUpdates(url){if(url!==endpoint){close();endpoint=url||'';attempt=0;lastMessage=0;}if(endpoint){clock??=setInterval(tick,10000);open();}}
export function stopLiveUpdates(){endpoint='';close();}
export function hasLiveUpdates(){return !!endpoint;}
export function liveUpdatesHealthy(){return socket?.readyState===1&&now()-lastMessage<90000;}
export function cancelLiveUpdates(timer){if(typeof timer==='function')timer();else clearInterval(timer);}
export function watchLiveUpdates(callback,{topics=['inbox'],fallbackMs=30000,enabled,onUnavailable}={}){
 const item={callback,topics,fallbackMs:Math.max(30000,fallbackMs),enabled,onUnavailable,lastFallback:now(),stopped:false};watchers.add(item);clock??=setInterval(tick,10000);
 return ()=>{item.stopped=true;watchers.delete(item);if(!watchers.size&&!endpoint){clearInterval(clock);clock=null;}};
}
document.addEventListener('visibilitychange',()=>{visible=isVisible();if(!visible)close();else{announce(null);open();}});
window.addEventListener('online',()=>{if(isVisible()){announce(null);close();attempt=0;open();}});
