import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
const source=`import {sendPush} from './lib/notifications.mjs';
export default {async fetch(request){try{
 const vapid=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),jwk=await crypto.subtle.exportKey('jwk',vapid.privateKey),client=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 const base=value=>btoa(String.fromCharCode(...new Uint8Array(value))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
 const path=new URL(request.url).searchParams.get('path')||'accepted';
 const subscription={endpoint:'https://web.push.apple.com/'+path,keys:{p256dh:base(await crypto.subtle.exportKey('raw',client.publicKey)),auth:base(crypto.getRandomValues(new Uint8Array(16)))}};
 const response=await sendPush({VAPID_SUBJECT:'https://rudelbar.de',VAPID_PUBLIC_KEY:base(await crypto.subtle.exportKey('raw',vapid.publicKey)),VAPID_PRIVATE_KEY:jwk.d},subscription,{title:'Runtime test'});
 return Response.json({ok:true,status:response.status});
 }catch(error){return Response.json({ok:false,status:error.status,message:error.message});}}};`;
const bundled=await build({stdin:{contents:source,resolveDir:new URL('../',import.meta.url).pathname,sourcefile:'push-runtime.mjs'},bundle:true,write:false,format:'esm',platform:'browser'});
const requests=[];
const mf=new Miniflare({workers:[{config:{name:'push-runtime',compatibilityDate:'2026-09-28',manifest:{mainModule:'index.mjs',modules:{'index.mjs':{type:'esm',contents:bundled.outputFiles[0].text}}}},dev:{outboundService:{type:'fetcher',handler:async request=>{
 requests.push({url:request.url,method:request.method,length:(await request.arrayBuffer()).byteLength,hasVapid:request.headers.get('authorization')?.startsWith('vapid t=')});
 return new URL(request.url).pathname==='/redirect'?new Response(null,{status:302,headers:{Location:'https://redirect.invalid/'}}):new Response(null,{status:201});
}}}}]});
try{
 const accepted=await(await mf.dispatchFetch('https://runtime.test/?path=accepted')).json();assert.deepEqual(accepted,{ok:true,status:201});assert.equal(requests.length,1);assert.equal(requests[0].method,'POST');assert.equal(requests[0].length,4096);assert.equal(requests[0].hasVapid,true);
 const redirected=await(await mf.dispatchFetch('https://runtime.test/?path=redirect')).json();assert.equal(redirected.ok,false);assert.equal(redirected.status,502);assert.equal(requests.length,2);assert.ok(!requests.some(request=>request.url.includes('redirect.invalid')));
 console.log('Cloudflare runtime: encrypted push reaches the outbound service; redirects are rejected without forwarding credentials.');
}finally{await mf.dispose();}
