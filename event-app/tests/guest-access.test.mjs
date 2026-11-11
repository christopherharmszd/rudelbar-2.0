import test from 'node:test';
import assert from 'node:assert/strict';
import {guestError,guestAccessError,normalizeGuestError,GUEST_SIGN_IN_REQUIRED,createGuestAccount} from '../public/guest-access.js';

test('expired guest access has an explicit sign-in action; ordinary errors do not',()=>{
 const expired=normalizeGuestError(Object.assign(new Error('unauthorized'),{status:401}));
 assert.equal(expired.message,GUEST_SIGN_IN_REQUIRED);assert.ok(guestAccessError(expired));
 assert.match(guestError(expired),/data-guest-signin/);assert.match(guestError(expired),/role="alert"/);
 const network=guestError(new Error('<offline>'));assert.doesNotMatch(network,/data-guest-signin/);assert.match(network,/&lt;offline&gt;/);
});
test('profile discovery never signs a visitor in or grants a new identity',async()=>{
 const old=globalThis.document;globalThis.document={addEventListener(){}};
 try{
  let signIns=0,names=[];const account=createGuestAccount({readProfile:async()=>{throw Object.assign(new Error('unauthorized'),{status:401});},signIn:async()=>{signIns++;},getName:()=> 'Saved name',onName:name=>names.push(name),isOpen:()=>true,features:()=>({}),actions:{}});
  await account.check();assert.equal(account.state.status,'missing');assert.equal(signIns,0);assert.deepEqual(names,[]);
 }finally{globalThis.document=old;}
});
test('the profile hub restores verified names and separates connection errors from missing access',async()=>{
 const old=globalThis.document;globalThis.document={addEventListener(){}};
 try{
  let failure=false,names=[];const account=createGuestAccount({readProfile:async()=>{if(failure)throw new Error('offline');return {name:'Alex',revision:2};},signIn:async()=>{},getName:()=> '',onName:name=>names.push(name),isOpen:()=>true,features:()=>({}),actions:{}});
  await account.check();assert.equal(account.state.status,'active');assert.deepEqual(names,['Alex']);
  failure=true;await account.check();assert.equal(account.state.status,'unavailable');assert.equal(account.state.error,'offline');
 }finally{globalThis.document=old;}
});

test('editorial preview entry remains local and never calls guest sign-in',async()=>{
 const old=globalThis.document;globalThis.document={addEventListener(){}};
 try{
  let calls=0,name='';const account=createGuestAccount({readProfile:async()=>{calls++;},signIn:async()=>{calls++;},getName:()=> '',onName:value=>name=value,isOpen:()=>true,features:()=>({}),actions:{},preview:true});
  await account.login('Vorschau');assert.equal(name,'Vorschau');assert.equal(calls,0);assert.equal(account.state.status,'preview');
 }finally{globalThis.document=old;}
});
