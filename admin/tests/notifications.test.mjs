import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sqliteD1} from './sqlite-d1.mjs';
import {createLiveService} from '../lib/live-service.mjs';
import {createNotifications,cleanSubscription} from '../lib/notifications.mjs';
const schema=(await Promise.all(['0001_live_stations.sql','0002_notifications.sql'].map(name=>readFile(new URL('../migrations/'+name,import.meta.url),'utf8')))).join('\n');
const b64=bytes=>Buffer.from(bytes).toString('base64url');
const bytes=value=>new Uint8Array(Buffer.from(value,'base64url'));
const vapidPair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),jwk=await crypto.subtle.exportKey('jwk',vapidPair.privateKey);
const keys={VAPID_PUBLIC_KEY:b64(await crypto.subtle.exportKey('raw',vapidPair.publicKey)),VAPID_PRIVATE_KEY:jwk.d,VAPID_SUBJECT:'https://rudelbar.de'};
async function fixture(){
 const db=sqliteD1();db.connection.exec(schema);
 const context={event:{eventId:'test-evening',visibility:'public',teamIds:['alex','nora']},release:{state:'open'},people:[{personId:'alex',name:'Alex'},{personId:'nora',name:'Nora'}],stations:[{id:'music',name:'Musik',kind:'music',operatorIds:['alex']},{id:'karaoke',name:'Karaoke',kind:'karaoke',operatorIds:['nora']},{id:'team',name:'Team',kind:'message',operatorIds:[]}]};
 const service=createLiveService({LIVE_DB:db},null,{getContext:async()=>context}),guest=await service.session({eventId:'test-evening',name:'Gast'}),other=await service.session({eventId:'test-evening',name:'Anderer Gast'});
 const grantA=await service.issueGrant('test-evening','alex'),grantB=await service.issueGrant('test-evening','nora'),actorA=await service.operator(grantA.code),actorB=await service.operator(grantB.code);
 const deliveries=[],env={LIVE_DB:db,...keys,RUDELBAR_PASSWORD_VERIFIER:'version'},hub=createNotifications(env,{context:async()=>context,transport:async(endpoint,init)=>{deliveries.push({endpoint,init});return new Response(null,{status:201});}});
 const who={id:'v:'+guest.sessionToken.split('.')[0],eventId:'test-evening',audience:'guest',expiresAt:Date.now()+3600000};
 async function submit(stationId='karaoke'){return service.submit({eventId:'test-evening',sessionToken:guest.sessionToken,stationId,clientKey:crypto.randomUUID(),input:stationId==='team'?{text:'Private Frage'}:{song:'Private Liedauswahl',note:'Privater Hinweis',format:'duet'}});}
 return {db,service,guest,other,grantA,grantB,actorA,actorB,hub,env,context,deliveries,who,submit,close:()=>db.connection.close()};
}
async function subscription(label='device'){
 const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']),raw=new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey)),auth=crypto.getRandomValues(new Uint8Array(16));
 return {pair,raw,auth,json:{endpoint:'https://fcm.googleapis.com/fcm/send/'+label,keys:{p256dh:b64(raw),auth:b64(auth)}}};
}
async function decrypt(sub,request){
 const data=new Uint8Array(request.body),salt=data.slice(0,16),serverRaw=data.slice(21,21+data[20]),cipher=data.slice(21+data[20]);
 const server=await crypto.subtle.importKey('raw',serverRaw,{name:'ECDH',namedCurve:'P-256'},false,[]),secret=await crypto.subtle.deriveBits({name:'ECDH',public:server},sub.pair.privateKey,256),enc=new TextEncoder();
 async function hkdf(ikm,salt,info,length){const key=await crypto.subtle.importKey('raw',ikm,'HKDF',false,['deriveBits']);return crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},key,length);}
 const info=new Uint8Array([...enc.encode('WebPush: info\0'),...sub.raw,...serverRaw]),ikm=await hkdf(secret,sub.auth,info,256),cek=await hkdf(ikm,salt,enc.encode('Content-Encoding: aes128gcm\0'),128),nonce=await hkdf(ikm,salt,enc.encode('Content-Encoding: nonce\0'),96),key=await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['decrypt']);
 const plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:nonce},key,cipher));let end=plain.length-1;while(plain[end]===0)end--;assert.equal(plain[end],2);return JSON.parse(new TextDecoder().decode(plain.slice(0,end)));
}

test('unread conversations are recipient-scoped and a read never consumes a later unseen answer',async()=>{
 const s=await fixture();try{
  const {request}=await s.submit();const a=s.service.recipient(s.actorA),b=s.service.recipient(s.actorB);
  assert.equal((await s.hub.list(a)).count,0);assert.equal((await s.hub.list(b)).count,1);assert.equal((await s.hub.list(s.who)).count,0);
  const first=await s.service.staffUpdate(s.actorB,request.id,{reply:'Antwort eins',revision:request.revision});const seen=(await s.hub.list(s.who)).items[0].seq;
  await s.service.staffUpdate(s.actorB,request.id,{reply:'Antwort zwei',revision:first.request.revision});await s.hub.mark(s.who,{id:request.id,seq:seen});assert.equal((await s.hub.list(s.who)).count,1);
  const row=(await s.service.mine({eventId:'test-evening',sessionToken:s.guest.sessionToken,id:request.id}));await s.hub.mark(s.who,{id:request.id,seq:row.activitySeq});assert.equal((await s.hub.list(s.who)).count,0);
  await s.service.staffUpdate(s.actorB,request.id,{reply:'Interne Privatnotiz',internal:true,revision:row.request.revision});assert.equal((await s.hub.list(s.who)).count,0);
  const other=await s.service.guestNotice({eventId:'test-evening',sessionToken:s.other.sessionToken,action:'list'});assert.equal(other.count,0);
 }finally{s.close();}
});

test('duplicate and stale writes create no extra notifications; forwarding follows current station access',async()=>{
 const s=await fixture();try{
  const options={eventId:'test-evening',sessionToken:s.guest.sessionToken,stationId:'karaoke',clientKey:'repeat-key',input:{song:'Lied'}};
  const {request}=await s.service.submit(options);await s.service.submit(options);assert.equal(s.db.connection.prepare('SELECT COUNT(*) n FROM live_activity').get().n,1);
  await s.service.staffUpdate(s.actorB,request.id,{stationId:'music',revision:request.revision});await assert.rejects(()=>s.service.staffUpdate(s.actorB,request.id,{reply:'Stale',revision:request.revision}));
  assert.equal((await s.hub.list(s.service.recipient(s.actorB))).count,0);assert.equal((await s.hub.list(s.service.recipient(s.actorA))).count,1);
 }finally{s.close();}
});

test('actual Web Push payload decrypts and VAPID signature verifies without exposing conversation content',async()=>{
 const s=await fixture();try{
  const device=await subscription();await s.hub.subscribe(s.who,{subscription:device.json});await s.hub.subscribe(s.service.recipient(s.actorA),{subscription:(await subscription('alex')).json});
  const {request}=await s.submit();await s.service.staffUpdate(s.actorB,request.id,{status:'in_progress',revision:request.revision});assert.equal((await s.hub.flush()).sent,1);assert.equal(s.deliveries.length,1);
  const {init}=s.deliveries[0],payload=await decrypt(device,init);assert.equal(payload.title,'Du bist dran!');assert.ok(payload.url.includes('anfrage='+request.id));assert.ok(!JSON.stringify(payload).includes('Private'));assert.ok(!JSON.stringify(payload).includes('Gast'));
  const auth=new Headers(init.headers).get('authorization'),jwt=auth.match(/t=([^, ]+)/)[1],parts=jwt.split('.');assert.equal(JSON.parse(Buffer.from(parts[1],'base64url')).aud,'https://fcm.googleapis.com');
  assert.ok(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},vapidPair.publicKey,bytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])));
  assert.equal((await s.hub.flush()).sent,0);
 }finally{s.close();}
});

test('push retries survive a transient failure and expired endpoints are deactivated',async()=>{
 const s=await fixture();try{
  const device=await subscription();await s.hub.subscribe(s.who,{subscription:device.json});const {request}=await s.submit();await s.service.staffUpdate(s.actorB,request.id,{reply:'Hallo',revision:request.revision});
  let status=503,calls=0;const hub=createNotifications(s.env,{context:async()=>s.context,transport:async()=>{calls++;return new Response(null,{status});}});
  await hub.flush();let row=s.db.connection.prepare('SELECT * FROM live_push_subscriptions').get();assert.equal(row.active,1);assert.equal(row.cursor,0);assert.equal(row.attempts,1);assert.ok(row.next_attempt>Date.now());
  s.db.connection.exec('UPDATE live_push_subscriptions SET next_attempt=0');status=201;await hub.flush();assert.equal(calls,2);assert.ok(s.db.connection.prepare('SELECT cursor FROM live_push_subscriptions').get().cursor>0);
  const thread=await s.service.inbox(s.actorB,{id:request.id});await s.service.staffUpdate(s.actorB,request.id,{reply:'Noch etwas',revision:thread.request.revision});status=410;await hub.flush();assert.equal(s.db.connection.prepare('SELECT active FROM live_push_subscriptions').get().active,0);
 }finally{s.close();}
});

test('revoked operators receive no queued push and hostile subscription endpoints are refused',async()=>{
 const s=await fixture();try{
  const device=await subscription();for(const endpoint of ['https://localhost/push','https://169.254.169.254/','https://fcm.googleapis.com.evil.invalid/test','http://fcm.googleapis.com/fcm/send/x'])assert.throws(()=>cleanSubscription({...device.json,endpoint}));
  await s.hub.subscribe(s.service.recipient(s.actorB),{subscription:device.json});await s.submit();await s.service.revoke('test-evening',s.grantB.id);assert.equal((await s.hub.flush()).sent,0);assert.equal(s.deliveries.length,0);assert.equal(s.db.connection.prepare('SELECT active FROM live_push_subscriptions').get().active,0);
 }finally{s.close();}
});

test('notification HTTP routes require origin and cookies and migrate an old guest cookie without leaking it',async()=>{
 const {default:worker}=await import('../../event-app/worker.mjs');const origin='https://guest.invalid',cookie='rbv_testevening=trusted-secret',calls=[];
 const env={CONTENT:{guestAction:async(action,input)=>{calls.push({action,input});return {status:200,count:0,items:[],expiresAt:Date.now()+60000};},getExperience:async input=>{calls.push(input);return {state:'closed',experience:null};}}};
 const rejected=await worker.fetch(new Request(origin+'/api/guest/notifications/subscribe',{method:'POST',headers:{Origin:'https://other.invalid','Content-Type':'application/json'},body:JSON.stringify({eventId:'test-evening',sessionToken:'forged'})}),env);assert.equal(rejected.status,403);assert.equal(calls.length,0);
 const listing=await worker.fetch(new Request(origin+'/api/guest/notifications?abend=test-evening',{headers:{Cookie:cookie}}),env);assert.equal(listing.status,200);assert.equal(calls[0].input.sessionToken,'trusted-secret');assert.ok(!JSON.stringify(await listing.json()).includes('trusted-secret'));assert.ok(listing.headers.getSetCookie().some(value=>value.includes('Path=/;')));assert.ok(listing.headers.getSetCookie().some(value=>value.includes('Path=/api/guest; Max-Age=0')));
 await worker.fetch(new Request(origin+'/api/experience?abend=test-evening',{headers:{Cookie:cookie}}),env);assert.equal(calls[1].sessionToken,'trusted-secret');
 const logout=await worker.fetch(new Request(origin+'/api/guest/logout',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({eventId:'test-evening',endpoint:'https://fcm.googleapis.com/fcm/send/device'})}),env);assert.equal(calls.at(-1).input.action,'unsubscribe');assert.equal(logout.headers.getSetCookie().length,2);
});

test('failed device tests retain permission and record a useful transport error',async()=>{
 const s=await fixture();try{
  const device=await subscription();await s.hub.subscribe(s.who,{subscription:device.json});
  const hub=createNotifications(s.env,{context:async()=>s.context,transport:async()=>{throw new TypeError('Simulated transport failure');}});
  await assert.rejects(()=>hub.test(s.who,{endpoint:device.json.endpoint}),error=>error.status===502&&error.message.includes('Deine Erlaubnis bleibt erhalten'));
  const row=s.db.connection.prepare('SELECT active,last_status FROM live_push_subscriptions').get();assert.equal(row.active,1);assert.equal(row.last_status,502);
 }finally{s.close();}
});
