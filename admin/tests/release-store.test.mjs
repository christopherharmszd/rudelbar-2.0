import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sqliteD1} from './sqlite-d1.mjs';
import {createReleaseStore,releaseMetadata} from '../lib/release-store.mjs';
const schema=await readFile(new URL('../migrations/0009_runtime_releases.sql',import.meta.url),'utf8');
function fixture(){const db=sqliteD1();db.connection.exec(schema);return {db,store:createReleaseStore(db)};}
const initial={eventId:'evening',action:'open',operationKey:'operation-one',expectedRevision:0,state:'open',config:{games:[{id:'g',name:'Erste Fassung'}],_staffIds:['person-one']},eventSnapshot:{title:'Abend'},sourceRevision:'r1'};
test('immutable release packages and one atomic active pointer survive later publications',async()=>{
 const {db,store}=fixture();try{
  const first=await store.publish(initial);
  const second=await store.publish({...initial,action:'publish',operationKey:'operation-two',expectedRevision:1,config:{games:[]},sourceRevision:'r2'});
  assert.notEqual(first.versionId,second.versionId);assert.equal(second.runtimeRevision,2);
  const old=db.connection.prepare('SELECT config_json FROM app_release_versions WHERE version_id=?').get(first.versionId);
  assert.equal(JSON.parse(old.config_json).games[0].name,'Erste Fassung');
  assert.equal((await store.read('evening')).versionId,second.versionId);
  assert.equal((await store.read('other')),null);
 }finally{db.connection.close();}
});
test('concurrent publications choose one complete revision and leave no orphan packages',async()=>{
 const {db,store}=fixture();try{
  const result=await Promise.allSettled([store.publish(initial),store.publish({...initial,operationKey:'competing',config:{games:[{id:'x'}]}})]);
  assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(result.find(r=>r.status==='rejected').reason.status,409);
  assert.equal(db.connection.prepare('SELECT COUNT(*) AS n FROM app_release_versions').get().n,1);
  assert.equal(db.connection.prepare('SELECT COUNT(*) AS n FROM app_active_releases').get().n,1);
  assert.equal(db.connection.prepare('PRAGMA foreign_key_check').all().length,0);
 }finally{db.connection.close();}
});
test('exact retries cannot replace a newer package or reopen a subsequently closed evening',async()=>{
 const {db,store}=fixture();try{
  const first=await store.publish(initial);
  await store.state({eventId:'evening',action:'close',operationKey:'close-one',expectedRevision:1,targetState:'closed'});
  const retry=await store.publish(initial);assert.equal(retry.state,'closed');assert.equal(retry.replayed,true);
  assert.equal(retry.versionId,first.versionId);assert.equal(retry.runtimeRevision,2);
  await assert.rejects(()=>store.publish({...initial,action:'publish'}),e=>e.status===409);
  assert.equal(db.connection.prepare('SELECT COUNT(*) AS n FROM app_release_versions').get().n,1);
 }finally{db.connection.close();}
});
test('closing an already closed app consumes its operation without duplicating a version',async()=>{
 const {db,store}=fixture();try{
  await store.publish({...initial,state:'closed'});
  const closed=await store.state({eventId:'evening',action:'close',operationKey:'already-closed',expectedRevision:1,targetState:'closed'});
  assert.equal(closed.runtimeRevision,1);
  await store.publish({...initial,operationKey:'open-again',expectedRevision:1});
  const retry=await store.state({eventId:'evening',action:'close',operationKey:'already-closed',expectedRevision:1,targetState:'closed'});
  assert.equal(retry.state,'open');assert.equal(retry.replayed,true);
 }finally{db.connection.close();}
});
test('metadata contains bounded release and staffing facts, not full configuration bodies',async()=>{
 const {db,store}=fixture();try{
  await store.publish(initial);const rows=await releaseMetadata(db);
  assert.equal(rows[0].hasConfig,true);assert.deepEqual(rows[0].staffIds,['person-one']);
  assert.equal('config'in rows[0],false);assert.equal('config_json'in rows[0],false);
  assert.equal(rows[0].sourceResourcesVersion,null);
 }finally{db.connection.close();}
});
test('concurrent reuse of an operation for different snapshots rejects the conflicting payload',async()=>{
 const {db,store}=fixture();try{
  const results=await Promise.allSettled([store.publish(initial),store.publish({...initial,config:{games:[]}})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
  assert.equal(db.connection.prepare('SELECT COUNT(*) AS n FROM app_release_versions').get().n,1);
 }finally{db.connection.close();}
});
