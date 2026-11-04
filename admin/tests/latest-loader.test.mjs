import test from 'node:test';
import assert from 'node:assert/strict';
import {createLatestLoader} from '../public/latest-loader.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('a late old campaign response cannot replace the newly selected campaign or enable its controls',async()=>{
 const states=[],commits=[],loader=createLatestLoader(v=>states.push(v)),old=deferred(),next=deferred();
 const first=loader.run(()=>old.promise,v=>commits.push(v));const second=loader.run(()=>next.promise,v=>commits.push(v));
 old.resolve('old campaign');assert.equal(await first,false);assert.equal(loader.loading,true);assert.deepEqual(commits,[]);
 next.resolve('selected campaign');assert.equal(await second,true);assert.equal(loader.loading,false);assert.deepEqual(commits,['selected campaign']);assert.deepEqual(states,[true,true,false]);
});
test('obsolete failures and closed views stay silent while a current failure remains actionable',async()=>{
 const loader=createLatestLoader(),old=deferred();let changes=0;
 const first=loader.run(()=>old.promise,()=>changes++);await loader.run(async()=>42,()=>changes++);old.reject(Error('old failure'));assert.equal(await first,false);assert.equal(changes,1);
 const pending=deferred(),request=loader.run(()=>pending.promise,()=>changes++);loader.invalidate();pending.resolve('closed');assert.equal(await request,false);assert.equal(changes,1);assert.equal(loader.loading,false);
 await assert.rejects(()=>loader.run(async()=>{throw Error('current failure');},()=>changes++),/current failure/);assert.equal(loader.loading,false);
});
