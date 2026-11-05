import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {sqliteD1} from './sqlite-d1.mjs';import {createReleaseStore} from '../lib/release-store.mjs';import {writeRelease,releaseOperation,flushReleaseReceipts} from '../lib/release-service.mjs';
const schema=await readFile(new URL('../migrations/0009_runtime_releases.sql',import.meta.url),'utf8');
test('failed editorial receipt never rolls back the active package and later flush acknowledges the newest state',async()=>{
 const db=sqliteD1();db.connection.exec(schema);let unavailable=true,mirror;
 const client={runtimeDb:db,async getDocument(){return mirror||null;},async savePrivate(type,id,value){if(unavailable)throw Object.assign(new Error('not available'),{status:503});mirror={...value,_rev:'r1'};}};
 try{
  const input={event:{eventId:'evening'},previous:{state:'closed'},action:'open',operation:await releaseOperation({reviewToken:'review',operationKey:'publish-one'},'open'),config:{stations:[]},eventSnapshot:{title:'Abend'},sourceRevision:'s1',actor:'admin'};
  const result=await writeRelease(client,input);assert.equal(result.receiptPending,true);
  const store=createReleaseStore(db);assert.equal((await store.read('evening')).state,'open');
  assert.throws(()=>db.connection.prepare('UPDATE app_release_versions SET config_json=?').run('{}'),/immutable/);
  await store.state({eventId:'evening',action:'close',operationKey:'close-one',expectedRevision:1,targetState:'closed'});
  unavailable=false;await flushReleaseReceipts(client);assert.equal(mirror.state,'closed');assert.equal(mirror.runtimeRevision,2);
  const receipt=db.connection.prepare('SELECT * FROM app_release_receipts').get();assert.equal(receipt.acknowledged_revision,2);assert.equal(receipt.target_revision,2);
 }finally{db.connection.close();}
});
