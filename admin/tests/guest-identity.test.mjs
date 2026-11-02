import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {sqliteD1} from './sqlite-d1.mjs';
import {createGuestIdentity} from '../lib/guest-identity.mjs';
import {createLiveService,digest} from '../lib/live-service.mjs';
const migrations=new URL('../migrations/',import.meta.url),identitySql=await readFile(new URL('0008_guest_identity.sql',migrations),'utf8');
async function fixture(){
 const db=sqliteD1();for(const name of (await readdir(migrations)).filter(n=>n.endsWith('.sql')&&n<'0008').sort())db.connection.exec(await readFile(new URL(name,migrations),'utf8'));
 return {db,identity:createGuestIdentity(db)};
}
test('additive migration preserves IDs, secret hashes, expiry and equal-name separation; re-run is safe',async()=>{
 const {db,identity}=await fixture();
 try{
  for(const id of ['one','two'])db.connection.prepare('INSERT INTO live_visitors VALUES(?,?,?,?,?,?)').run(id,'evening','hash-'+id,'Gleicher Name',100,10000);
  db.connection.exec(identitySql);
  const before=db.connection.prepare('SELECT * FROM live_visitors ORDER BY id').all();
  db.connection.exec(identitySql);assert.deepEqual(db.connection.prepare('SELECT * FROM live_visitors ORDER BY id').all(),before);
  const a=await identity.authenticate('evening','one','hash-one',200),b=await identity.authenticate('evening','two','hash-two',200);
  assert.equal(a.id,'one');assert.equal(a.expires_at,10000);assert.notEqual(a.profile_id,b.profile_id);
  await assert.rejects(()=>identity.authenticate('evening','one','hash-two',200),e=>e.status===401);
  await assert.rejects(()=>identity.authenticate('other','one','hash-one',200),e=>e.status===401);
  await assert.rejects(()=>identity.authenticate('evening','one','hash-one',10000),e=>e.status===401);
  assert.equal(db.connection.prepare('SELECT COUNT(*) AS n FROM guest_profiles').get().n,2);
 }finally{db.connection.close();}
});
test('legacy writes remain atomic and names never change participation identity or revoke-state',async()=>{
 const {db,identity}=await fixture();try{
  db.connection.exec(identitySql);db.connection.prepare('INSERT INTO live_visitors VALUES(?,?,?,?,?,?)').run('one','evening','hash','Alt',100,10000);
  const profile=(await identity.authenticate('evening','one','hash',200)).profile_id;
  db.connection.prepare('UPDATE live_visitors SET name=? WHERE id=?').run('Neu','one');
  assert.equal(db.connection.prepare('SELECT display_name FROM guest_participations WHERE id=?').get('one').display_name,'Neu');
  assert.equal((await identity.authenticate('evening','one','hash',200)).profile_id,profile);
  await identity.revokeSession('one','one',300);
  db.connection.prepare('UPDATE live_visitors SET name=? WHERE id=?').run('Noch neuer','one');
  await assert.rejects(()=>identity.authenticate('evening','one','hash',400),e=>e.status===401);
 }finally{db.connection.close();}
});
test('purposes are separate, disabled by default and exact retries never restore withdrawn consent',async()=>{
 const {db,identity}=await fixture();try{
  db.connection.exec(identitySql);db.connection.prepare('INSERT INTO live_visitors VALUES(?,?,?,?,?,?)').run('one','evening','hash','Name',100,10000);
  assert.equal((await identity.consent('one','analysis')).enabled,0);
  const grant={purpose:'analysis',version:'analysis-v1',enabled:true,operationKey:'grant'};
  await identity.changeConsent('one',grant,200);assert.equal((await identity.consent('one','analysis')).enabled,1);
  assert.equal((await identity.consent('one','dating')).enabled,0);
  await identity.changeConsent('one',{...grant,enabled:false,operationKey:'withdraw'},300);
  assert.equal((await identity.changeConsent('one',grant,400)).enabled,0);
  assert.equal(db.connection.prepare('SELECT COUNT(*) AS n FROM guest_consent_history').get().n,2);
  await assert.rejects(()=>identity.changeConsent('one',{...grant,enabled:false}),e=>e.status===409);
 }finally{db.connection.close();}
});
test('existing guest cookie works through canonical identity and revoked cookie cannot fall back',async()=>{
 const {db,identity}=await fixture();try{
  const secret='a'.repeat(64),expiresAt=Date.now()+60000;
  db.connection.prepare('INSERT INTO live_visitors VALUES(?,?,?,?,?,?)').run('one','evening',await digest(secret),'Alt',Date.now(),expiresAt);
  db.connection.exec(identitySql);
  const ctx={event:{eventId:'evening',visibility:'public'},release:{state:'open'},stations:[],people:[]};
  const service=createLiveService({LIVE_DB:db,RUDELBAR_CONNECTED_IDENTITY:'1'},null,{getContext:async()=>ctx});
  const token='one.'+secret;
  const resumed=await service.session({eventId:'evening',sessionToken:token,name:'Neu'});
  assert.equal(resumed.sessionToken,token);assert.equal(resumed.expiresAt,expiresAt);
  await identity.revokeSession('one','one');
  await assert.rejects(()=>service.mine({eventId:'evening',sessionToken:token}),e=>e.status===401);
  const fresh=await service.session({eventId:'evening',name:'Anderer Gast'});
  const id=fresh.sessionToken.split('.')[0];
  assert.ok(db.connection.prepare('SELECT id FROM guest_participations WHERE id=?').get(id));
 }finally{db.connection.close();}
});
test('concurrent conflicting reuse of a consent operation cannot silently accept different values',async()=>{
 const {db,identity}=await fixture();try{
  db.connection.exec(identitySql);db.connection.prepare('INSERT INTO live_visitors VALUES(?,?,?,?,?,?)').run('one','evening','hash','Name',100,10000);
  const base={purpose:'analysis',version:'v1',operationKey:'same-operation'};
  const results=await Promise.allSettled([identity.changeConsent('one',{...base,enabled:true},200),identity.changeConsent('one',{...base,enabled:false},300)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
  assert.equal(db.connection.prepare('SELECT COUNT(*) AS n FROM guest_consent_history').get().n,1);
 }finally{db.connection.close();}
});
