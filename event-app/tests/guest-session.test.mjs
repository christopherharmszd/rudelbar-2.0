import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuestSession} from '../public/guest-session.js';

test('concurrent first access shares one sign-in and later access preserves it',async()=>{
 let calls=0,release;const session=createGuestSession({getName:()=> 'Alex',connect:async name=>{assert.equal(name,'Alex');calls++;await new Promise(r=>{release=r;});}});
 const first=session.ensure(),second=session.ensure();assert.equal(calls,1);release();await Promise.all([first,second]);await session.ensure();assert.equal(calls,1);
});
test('explicit recovery renews a stale session once; a failed recovery stays retryable',async()=>{
 let calls=0,fail=false;const session=createGuestSession({getName:()=> 'Alex',connect:async()=>{calls++;if(fail)throw new Error('offline');}});
 await session.ensure();await session.ensure({refresh:true});assert.equal(calls,2);fail=true;await assert.rejects(session.ensure({refresh:true}),/offline/);fail=false;await session.ensure();assert.equal(calls,4);
 session.invalidate();await session.ensure();assert.equal(calls,5);
});
test('missing name requests entry without silently creating an identity',async()=>{
 let missing=0,calls=0;const session=createGuestSession({getName:()=> '',connect:async()=>{calls++;},onMissingName:()=>{missing++;}});
 await assert.rejects(session.ensure(),/Vornamen/);assert.equal(missing,1);assert.equal(calls,0);
});
