const fail=(message,status=401)=>{throw Object.assign(new Error(message),{status});};
export function createGuestIdentity(db){
 async function authenticate(eventId,sessionId,secretHash,now=Date.now()){
  const row=await db.prepare(
   'SELECT v.*,p.profile_id,s.id AS session_id,s.expires_at AS session_expires_at '+
   'FROM guest_sessions s JOIN guest_participations p ON p.id=s.participation_id '+
   'JOIN guest_profiles g ON g.id=p.profile_id JOIN live_visitors v ON v.id=p.id '+
   'WHERE s.id=? AND p.event_id=? AND v.event_id=p.event_id AND s.secret_hash=? AND s.expires_at>? '+
   'AND s.revoked_at IS NULL AND p.closed_at IS NULL AND g.closed_at IS NULL'
  ).bind(sessionId,eventId,secretHash,now).first();
  if(!row)fail('Deine Anmeldung ist abgelaufen oder beendet. Bitte melde dich erneut an.');
  return {...row,expires_at:row.session_expires_at};
 }
 async function consent(participationId,purpose){
  if(!['analysis','wall-display','wall-external','dating','contacts'].includes(purpose))fail('Unbekannter Zweck.',400);
  return await db.prepare('SELECT version,enabled,changed_at AS changedAt FROM guest_consents WHERE participation_id=? AND purpose=?').bind(participationId,purpose).first()||{enabled:0,version:'',changedAt:null};
 }
 // Called only after authenticating the participation. A name is never proof.
 async function changeConsent(participationId,{purpose,version,enabled,operationKey},now=Date.now()){
  if(!['analysis','wall-display','wall-external','dating','contacts'].includes(purpose)||typeof version!=='string'||!version||version.length>80||typeof enabled!=='boolean'||typeof operationKey!=='string'||!/^[a-z0-9-]{1,100}$/i.test(operationKey))fail('Bitte die Zustimmung eindeutig auswählen.',400);
  const current=await db.prepare('SELECT 1 AS yes FROM guest_participations WHERE id=?').bind(participationId).first();
  if(!current)fail('Teilnahme nicht gefunden.',404);
  const recorded=await db.prepare('SELECT version,enabled FROM guest_consent_history WHERE participation_id=? AND purpose=? AND operation_key=?').bind(participationId,purpose,operationKey).first();
  if(recorded){
   if(recorded.version!==version||recorded.enabled!==Number(enabled))fail('Dieser Auftrag wurde bereits mit einer anderen Auswahl verwendet.',409);
   return consent(participationId,purpose);
  }
  const recordId=crypto.randomUUID();
  await db.batch([
   db.prepare('INSERT OR IGNORE INTO guest_consent_history(id,participation_id,purpose,version,enabled,changed_at,operation_key) VALUES(?,?,?,?,?,?,?)').bind(recordId,participationId,purpose,version,Number(enabled),now,operationKey),
   db.prepare('INSERT INTO guest_consents(participation_id,purpose,version,enabled,changed_at) SELECT participation_id,purpose,version,enabled,changed_at FROM guest_consent_history WHERE id=? ON CONFLICT(participation_id,purpose) DO UPDATE SET version=excluded.version,enabled=excluded.enabled,changed_at=excluded.changed_at').bind(recordId)
  ]);
  const applied=await db.prepare('SELECT version,enabled FROM guest_consent_history WHERE participation_id=? AND purpose=? AND operation_key=?').bind(participationId,purpose,operationKey).first();
  if(!applied||applied.version!==version||applied.enabled!==Number(enabled))fail('Dieser Auftrag wurde bereits mit einer anderen Auswahl verwendet.',409);
  return consent(participationId,purpose);
 }
 async function revokeSession(sessionId,participationId,now=Date.now()){
  await db.prepare('UPDATE guest_sessions SET revoked_at=? WHERE id=? AND participation_id=? AND revoked_at IS NULL').bind(now,sessionId,participationId).run();
  return {ok:true};
 }
 return {authenticate,consent,changeConsent,revokeSession};
}
