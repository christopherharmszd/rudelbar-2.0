import {releaseRequestHash} from './release-store.mjs';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export function cleanGuestProfile(input){
 const name=String(input.name??'').trim(),about=String(input.about??'').trim();
 if(typeof input.name!=='string'||!name||name.length>32||typeof input.about!=='string'||about.length>500||!Array.isArray(input.interests)||input.interests.length>12||input.interests.some(v=>typeof v!=='string'||!v.trim()||v.trim().length>40))fail('Bitte Vorname, Kurzbeschreibung und höchstens zwölf Interessen prüfen.');
 if(!Number.isInteger(input.revision)||input.revision<0||!/^[a-z0-9-]{1,90}$/i.test(input.operationKey||''))fail('Bitte das Profil erneut öffnen.');
 return {name,about,interests:[...new Set(input.interests.map(v=>v.trim()))],revision:input.revision,operationKey:input.operationKey};
}
export function createGuestProfiles(db){
 async function read(person){const details=await db.prepare('SELECT * FROM guest_profile_details WHERE participation_id=?').bind(person.id).first(),name=await db.prepare('SELECT name FROM live_visitors WHERE id=?').bind(person.id).first();const blocks=(await db.prepare("SELECT b.id,(SELECT p.display_name FROM guest_participations p WHERE p.profile_id=b.blocked_profile AND p.event_id=? ORDER BY p.created_at DESC LIMIT 1) AS name,b.created_at AS createdAt FROM guest_blocks b WHERE b.blocker_profile=? ORDER BY b.created_at DESC LIMIT 100").bind(person.event_id,person.profile_id).all()).results||[];
 return {name:name.name,about:details?.about||'',interests:JSON.parse(details?.interests_json||'[]'),revision:details?.revision||0,blocks:blocks.map(b=>({...b,name:b.name||'Gesperrtes Profil'})),note:'Diese Angaben gehören zu deinem Gastzugang dieses Abends. Deine Interessen werden nicht automatisch öffentlich angezeigt.'};}
 async function save(person,input){
  const value=cleanGuestProfile(input),hash=await releaseRequestHash({name:value.name,about:value.about,interests:value.interests}),old=await db.prepare('SELECT * FROM guest_profile_details WHERE participation_id=?').bind(person.id).first();
  if(old?.last_operation===value.operationKey){if(old.request_hash!==hash)fail('Dieser Profilauftrag gehört zu einer anderen Änderung.',409);return {...await read(person),replayed:true};}
  if((old?.revision||0)!==value.revision)fail('Dein Profil wurde inzwischen geändert. Bitte erneut öffnen.',409);
  const now=Date.now();await db.batch([
   db.prepare('INSERT INTO guest_profile_details(participation_id,about,interests_json,updated_at,last_operation,request_hash) SELECT ?,?,?,?,?,? WHERE ?=0 AND EXISTS(SELECT 1 FROM guest_sessions s JOIN guest_participations p ON p.id=s.participation_id JOIN guest_profiles g ON g.id=p.profile_id WHERE s.id=? AND s.revoked_at IS NULL AND s.expires_at>? AND p.closed_at IS NULL AND g.closed_at IS NULL) ON CONFLICT(participation_id) DO UPDATE SET about=excluded.about,interests_json=excluded.interests_json,updated_at=excluded.updated_at,last_operation=excluded.last_operation,request_hash=excluded.request_hash,revision=guest_profile_details.revision+1 WHERE guest_profile_details.revision=?').bind(person.id,value.about,JSON.stringify(value.interests),now,value.operationKey,hash,value.revision,person.session_id||person.id,now,value.revision),
   db.prepare('UPDATE guest_profile_details SET about=?,interests_json=?,updated_at=?,last_operation=?,request_hash=?,revision=revision+1 WHERE participation_id=? AND revision=? AND ?>0 AND EXISTS(SELECT 1 FROM guest_sessions s JOIN guest_participations p ON p.id=s.participation_id JOIN guest_profiles g ON g.id=p.profile_id WHERE s.id=? AND s.revoked_at IS NULL AND s.expires_at>? AND p.closed_at IS NULL AND g.closed_at IS NULL)').bind(value.about,JSON.stringify(value.interests),now,value.operationKey,hash,person.id,value.revision,value.revision,person.session_id||person.id,now),
   db.prepare('UPDATE live_visitors SET name=? WHERE id=? AND EXISTS(SELECT 1 FROM guest_profile_details WHERE participation_id=? AND last_operation=? AND request_hash=?)').bind(value.name,person.id,person.id,value.operationKey,hash)
  ]);
  const saved=await db.prepare('SELECT last_operation,request_hash FROM guest_profile_details WHERE participation_id=?').bind(person.id).first();if(saved?.last_operation!==value.operationKey||saved.request_hash!==hash)fail('Das Profil wurde inzwischen geändert oder die Anmeldung ist abgelaufen.',409);return read(person);
 }
 async function unblock(person,id){if(!/^[a-z0-9-]{1,90}$/i.test(id||''))fail('Ungültige Sperre.');await db.prepare('DELETE FROM guest_blocks WHERE id=? AND blocker_profile=?').bind(id,person.profile_id).run();return read(person);}
 return {read,save,unblock};
}
