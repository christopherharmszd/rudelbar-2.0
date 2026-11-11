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

test('checking a cookie verifies the existing profile without creating a guest from a saved name',async()=>{
 let connected=0,verified=0;const profile={name:'Alex',revision:3};
 const session=createGuestSession({getName:()=> '',connect:async()=>{connected++;},verify:async()=>{verified++;return profile;}});
 assert.equal(await session.check(),profile);assert.equal(verified,1);assert.equal(connected,0);
});
test('an expired cookie stays expired until explicit sign-in, even with a saved name',async()=>{
 let connected=0,valid=false;const profile={name:'Alex'};
 const session=createGuestSession({getName:()=> 'Alex',connect:async()=>{connected++;valid=true;},verify:async()=>{if(!valid)throw Object.assign(new Error('expired'),{status:401});return profile;}});
 await assert.rejects(session.check(),{status:401});assert.equal(connected,0);
 assert.equal(await session.signIn('Alex'),profile);assert.equal(connected,1);
 assert.equal(await session.check(),profile);assert.equal(connected,1);
});
test('failed explicit verification never marks the guest session ready',async()=>{
 let verified=0;const session=createGuestSession({getName:()=> 'Alex',connect:async()=>{},verify:async()=>{verified++;throw new Error('unreachable');}});
 await assert.rejects(session.signIn('Alex'),/unreachable/);await assert.rejects(session.ensure(),/unreachable/);assert.equal(verified,2);
});
