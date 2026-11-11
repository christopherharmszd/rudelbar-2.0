import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
const source=await readFile(new URL('../public/live-updates.js',import.meta.url),'utf8');
function fixture(){
 let time=100000,id=0;const timers=new Map(),listeners={},sockets=[];
 const document={visibilityState:'visible',addEventListener:(n,fn)=>listeners[n]=fn};
 class Socket{constructor(url){this.url=url;this.readyState=0;sockets.push(this);}close(){this.readyState=3;this.onclose?.();}receive(data){this.readyState=1;this.onmessage?.({data:JSON.stringify(data)});}}
 const interval=(fn,delay,repeat)=>{timers.set(++id,{fn,at:time+delay,delay,repeat});return id;};
 const context=vm.createContext({document,window:{addEventListener:(n,fn)=>listeners[n]=fn},location:{href:'https://app.test/',origin:'https://app.test'},URL,WebSocket:Socket,Date:{now:()=>time},Math,Promise,setInterval:(fn,ms)=>interval(fn,ms,true),setTimeout:(fn,ms)=>interval(fn,ms,false),clearInterval:key=>timers.delete(key),clearTimeout:key=>timers.delete(key)});
 vm.runInContext(source.replaceAll('export function','function')+'\nglobalThis.api={connectLiveUpdates,watchLiveUpdates,stopLiveUpdates,liveUpdatesHealthy};',context);
 async function advance(ms){const target=time+ms;while(true){const next=[...timers].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;time=next[1].at;if(next[1].repeat)next[1].at+=next[1].delay;else timers.delete(next[0]);next[1].fn();await Promise.resolve();}time=target;await Promise.resolve();}
 return {...context.api,document,listeners,sockets,advance,timers};
}
test('a healthy shared connection causes no periodic feature fetches across 30 idle minutes',async()=>{
 const s=fixture();let callbacks=0;for(let i=0;i<12;i++)s.watchLiveUpdates(()=>callbacks++,{topics:['inbox']});s.connectLiveUpdates('/api/guest/updates?abend=evening');s.connectLiveUpdates('/api/guest/updates?abend=evening');assert.equal(s.sockets.length,1);
 s.sockets[0].receive({type:'ready',topics:['inbox']});await s.advance(0);assert.equal(callbacks,12);const baseline=callbacks;
 for(let i=0;i<30;i++){s.sockets[0].receive({type:'heartbeat',topics:[]});await s.advance(60000);}assert.equal(callbacks,baseline);assert.equal(s.sockets.length,1);
 s.sockets[0].receive({type:'change',topics:['wall']});await s.advance(0);assert.equal(callbacks,baseline);
 s.sockets[0].receive({type:'change',topics:['inbox']});await s.advance(0);assert.equal(callbacks,baseline+12);
});
test('hidden pages stop connections and fallback; return refreshes once and reconnects once',async()=>{
 const s=fixture();let calls=0;s.watchLiveUpdates(()=>calls++);s.connectLiveUpdates('/api/guest/updates');s.sockets[0].receive({type:'ready',topics:[]});s.document.visibilityState='hidden';s.listeners.visibilitychange();await s.advance(3600000);assert.equal(calls,0);assert.equal(s.sockets.length,1);assert.equal(s.sockets[0].readyState,3);
 s.document.visibilityState='visible';s.listeners.visibilitychange();await s.advance(0);assert.equal(calls,1);assert.equal(s.sockets.length,2);
});
test('unavailable connections use a minimum 30-second fallback and bounded reconnects; disposal stops callbacks',async()=>{
 const s=fixture();let calls=0,unavailable=0;const dispose=s.watchLiveUpdates(()=>calls++,{fallbackMs:5000,onUnavailable:()=>unavailable++});s.connectLiveUpdates('/api/guest/updates');s.sockets[0].close();assert.equal(unavailable,1);await s.advance(29000);assert.equal(calls,0);await s.advance(1000);assert.equal(calls,1);assert.ok(s.sockets.length<=2);dispose();s.stopLiveUpdates();await s.advance(120000);assert.equal(calls,1);
});
test('a security change clears protected views, closes the connection and rechecks access once',async()=>{
 const s=fixture();let refresh=0,cleared=0;s.watchLiveUpdates(()=>refresh++,{topics:['wall'],onUnavailable:()=>cleared++});s.connectLiveUpdates('/api/guest/updates');const socket=s.sockets[0];socket.receive({type:'ready',topics:[]});socket.receive({type:'change',topics:['security']});await s.advance(0);assert.equal(cleared,1);assert.equal(socket.readyState,3);assert.equal(refresh,1);assert.equal(s.sockets.length,1);
});
