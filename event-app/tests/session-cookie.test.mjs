import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.mjs';
const origin='https://guest.test',eventId='12345678-1234-1234-1234-123456789abc',name='rbv_'+eventId.replaceAll('-',''),token='test-guest.test-secret';
const request=path=>new Request(origin+path,{method:'POST',headers:{Origin:origin,Cookie:name+'='+token,'Content-Type':'application/json'},body:JSON.stringify({eventId,id:'wall-post',seq:1})});
test('reading a Wall notice without expiry metadata leaves the existing guest cookie untouched',async()=>{
 const r=await worker.fetch(request('/api/guest/notifications/read'),{CONTENT:{guestAction:async()=>({status:200,ok:true})}});
 assert.equal(r.status,200);assert.deepEqual(r.headers.getSetCookie(),[]);
});
test('notice refresh keeps the authenticated expiry and migrates the old cookie path',async()=>{
 const expiresAt=Date.now()+3600000,r=await worker.fetch(new Request(origin+'/api/guest/notifications?abend='+eventId,{headers:{Cookie:name+'='+token}}),{CONTENT:{guestAction:async()=>({status:200,expiresAt,items:[],count:0})}});
 const cookies=r.headers.getSetCookie();assert.equal(cookies.length,2);assert.match(cookies[0],/Path=\/; Max-Age=\d+/);assert.ok(!cookies[0].includes('NaN'));assert.match(cookies[1],/Path=\/api\/guest; Max-Age=0/);
});
