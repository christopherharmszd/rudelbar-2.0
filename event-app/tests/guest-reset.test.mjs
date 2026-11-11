import test from 'node:test';
import assert from 'node:assert/strict';
import {resetGuestApp,noticePreferenceSuffixes} from '../public/guest-reset.js';
test('reset revokes access first and clears only the chosen evening preferences',async()=>{
 const keys=['rudelbar:evening:one:v1',...noticePreferenceSuffixes.map(s=>'rudelbar:notifications:guest:one'+s)];
 const values=new Map([...keys.map(k=>[k,'saved']),['rudelbar:evening:two:v1','keep'],['rudelbar:notifications:team:one:sound','keep'],['contacts','keep']]);let signedOut=false;
 await resetGuestApp({eventId:'one',logout:async()=>{assert.equal(values.size,8);signedOut=true;},storage:{removeItem:key=>{assert.ok(signedOut);values.delete(key);}}});
 assert.deepEqual([...values.keys()],['rudelbar:evening:two:v1','rudelbar:notifications:team:one:sound','contacts']);
});
test('failed sign-out leaves local access and preferences intact for retry',async()=>{
 let removed=0;await assert.rejects(resetGuestApp({eventId:'one',logout:async()=>{throw new Error('offline');},storage:{removeItem:()=>removed++}}),/offline/);assert.equal(removed,0);
});
