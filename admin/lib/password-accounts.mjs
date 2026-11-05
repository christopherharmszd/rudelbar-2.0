import {hash,random,fail,cleanEmail} from './account-utils.mjs';
import {passwordRecord,verifyPassword} from './passwords.mjs';
import {managesUsers,requirePermission} from './permissions.mjs';
import {createAccountMail} from './account-mail.mjs';
const denied='E-Mail oder Passwort stimmt nicht.';
export function createPasswordAccounts(env,{get,people,audit}){
 const db=env.LIVE_DB,mail=createAccountMail(env,{audit});
 const active=async account=>account.enabled&&(await people()).some(p=>p.personId===account.personId&&!p.archived);
 async function limit(key,maximum=8,period=600000){
  const now=Date.now(),bucket=await hash(key),start=now-period;
  const result=await db.prepare(`INSERT INTO app_auth_limits(bucket,window_start,attempts) VALUES(?,?,1) ON CONFLICT(bucket) DO UPDATE SET
   attempts=CASE WHEN window_start<=? THEN 1 ELSE attempts+1 END,window_start=CASE WHEN window_start<=? THEN ? ELSE window_start END
   WHERE window_start<=? OR attempts<?`).bind(bucket,now,start,start,now,start,maximum).run();
  if(!result.meta.changes)fail('Zu viele Versuche. Bitte später erneut versuchen.',429);
  await db.prepare('DELETE FROM app_auth_limits WHERE window_start<?').bind(now-86400000).run();
 }
 async function signIn(email,password){
  email=String(email||'').trim().toLowerCase().slice(0,254);await limit('login:'+email);
  const row=await db.prepare('SELECT a.*,c.password_json FROM app_accounts a LEFT JOIN app_credentials c ON c.account_id=a.id WHERE a.email=?').bind(email).first();
  const valid=await verifyPassword(env.RUDELBAR_SESSION_SECRET,password,row?.password_json);
  if(!valid||!row?.enabled||!await active({enabled:!!row.enabled,personId:row.person_id}))fail(denied,401);
  const token=random(),id=crypto.randomUUID(),csrf=random(),now=Date.now(),expiresAt=now+8*3600000;
  const inserted=await db.prepare(`INSERT INTO app_sessions(id,account_id,token_hash,csrf,created_at,expires_at)
   SELECT ?,?,?,?,?,? FROM app_accounts WHERE id=? AND enabled=1 AND revision=?`).bind(id,row.id,await hash(token),csrf,now,expiresAt,row.id,row.revision).run();
  if(!inserted.meta.changes)fail(denied,401);
  await audit({accountId:row.id,name:row.name},'session.created',row.id);return {token,expiresAt};
 }
 async function issue(account,purpose){
  if(!await active(account))fail('Dieses Konto ist derzeit nicht freigegeben.',409);
  if(purpose==='invite'&&account.activated)fail('Das Konto ist bereits eingerichtet. Nutze einen Passwort-Link.');
  if(purpose==='reset'&&!account.activated)fail('Das Konto ist noch nicht eingerichtet. Nutze eine Einladung.');
  const token=random(),id=crypto.randomUUID(),now=Date.now(),expiresAt=now+(purpose==='invite'?86400000:1800000);
  const result=await db.prepare(`INSERT INTO app_password_links(id,account_id,token_hash,purpose,email,account_revision,created_at,expires_at)
   SELECT ?,?,?,?,?,?,?,? FROM app_accounts WHERE id=? AND enabled=1 AND revision=?`).bind(id,account.id,await hash(token),purpose,account.email,account.revision,now,expiresAt,account.id,account.revision).run();
  if(!result.meta.changes)fail('Das Konto wurde inzwischen geändert. Bitte aktualisieren.',409);
  // Preserve already sent links until used or expired, so uncertain SMTP results never invalidate them.
  await db.prepare('UPDATE app_password_links SET revoked=1 WHERE account_id=? AND expires_at<? AND used_at IS NULL').bind(account.id,now).run();
  return {token,expiresAt,id};
 }
 async function invite(actor,id,{purpose='invite',delivery='link',origin}={}){
  requirePermission(managesUsers(actor));if(!['invite','reset'].includes(purpose)||!['link','email'].includes(delivery))fail('Ungültige Einladung.');
  const account=await get(id);let attempt;
  if(delivery==='email'){if(!(await mail.settings()).ready)fail('Bitte zuerst den E-Mail-Versand einrichten.',503);attempt=await mail.reserve(account.email,purpose);}
  const result=await issue(account,purpose);await audit(actor,purpose==='invite'?'invitation.created':'password.reset_requested',id,{delivery});
  if(delivery==='link')return result;
  const sent=await mail.send({to:account.email,name:account.name,purpose,link:origin+'/einladung#'+result.token,id:attempt});
  return {expiresAt:result.expiresAt,...sent};
 }
 async function forgot(email,origin){
  if(!(await mail.settings()).ready)fail('Der E-Mail-Versand ist noch nicht eingerichtet. Bitte wende dich an die Administration.',503);
  try{email=cleanEmail(email);}catch{return {ok:true};}
  // Identical externally visible response for unknown, blocked and throttled addresses.
  let attempt;try{attempt=await mail.reserve(email,'reset');}catch(error){if(error.status===429)return {ok:true};throw error;}
  const row=await db.prepare('SELECT id FROM app_accounts WHERE email=?').bind(email).first();
  if(!row){await db.prepare("UPDATE app_mail_attempts SET state='ignored' WHERE id=?").bind(attempt).run();return {ok:true};}
  const account=await get(row.id);if(!account.activated||!await active(account)){await db.prepare("UPDATE app_mail_attempts SET state='ignored' WHERE id=?").bind(attempt).run();return {ok:true};}
  const result=await issue(account,'reset');await mail.send({to:account.email,name:account.name,purpose:'reset',link:origin+'/einladung#'+result.token,id:attempt});
  await audit({accountId:account.id,name:account.name},'password.reset_requested',account.id,{delivery:'email'});return {ok:true};
 }
 async function linkRecord(token){
  if(!/^[a-f0-9]{64}$/.test(token||''))fail('Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.',410);
  const row=await db.prepare(`SELECT l.*,a.person_id,a.name,a.enabled FROM app_password_links l JOIN app_accounts a ON a.id=l.account_id
   WHERE l.token_hash=? AND l.revoked=0 AND l.used_at IS NULL AND l.expires_at>? AND a.enabled=1 AND a.revision=l.account_revision AND a.email=l.email`).bind(await hash(token),Date.now()).first();
  if(!row||!await active({enabled:!!row.enabled,personId:row.person_id}))fail('Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.',410);return row;
 }
 async function inspect(token){const row=await linkRecord(token);return {name:row.name,email:row.email,purpose:row.purpose,expiresAt:row.expires_at};}
 async function complete({token,password}){
  const row=await linkRecord(token),credential=await passwordRecord(env.RUDELBAR_SESSION_SECRET,password),now=Date.now(),completion=random();
  const owned='EXISTS(SELECT 1 FROM app_password_links WHERE id=? AND completion_id=?)';
  const results=await db.batch([
   db.prepare(`UPDATE app_password_links SET used_at=?,completion_id=? WHERE id=? AND used_at IS NULL AND revoked=0 AND expires_at>? AND EXISTS(SELECT 1 FROM app_accounts WHERE id=? AND enabled=1 AND revision=?)`).bind(now,completion,row.id,now,row.account_id,row.account_revision),
   db.prepare(`INSERT INTO app_credentials(account_id,password_json,updated_at) SELECT ?,?,? WHERE ${owned} ON CONFLICT(account_id) DO UPDATE SET password_json=excluded.password_json,updated_at=excluded.updated_at`).bind(row.account_id,credential,now,row.id,completion),
   db.prepare(`UPDATE app_sessions SET revoked=1 WHERE account_id=? AND ${owned}`).bind(row.account_id,row.id,completion),
   db.prepare(`UPDATE live_grants SET revoked=1 WHERE person_id=? AND ${owned}`).bind(row.person_id,row.id,completion),
   db.prepare(`UPDATE app_accounts SET revision=revision+1,updated_at=? WHERE id=? AND ${owned}`).bind(now,row.account_id,row.id,completion),
   db.prepare(`UPDATE app_password_links SET revoked=1 WHERE account_id=? AND ${owned}`).bind(row.account_id,row.id,completion)
  ]);
  if(!results[0].meta.changes)fail('Der Link wurde inzwischen verwendet oder das Konto geändert. Bitte fordere einen neuen Link an.',410);
  await audit({accountId:row.account_id,name:row.name},row.purpose==='invite'?'account.activated':'password.changed',row.account_id);return {ok:true};
 }
 async function change(actor,{currentPassword,password}){
  if(!actor?.accountId)fail('Für den gemeinsamen Zugang wird das Passwort weiterhin zentral verwaltet.',403);
  const row=await db.prepare('SELECT a.revision,c.password_json FROM app_accounts a JOIN app_credentials c ON c.account_id=a.id WHERE a.id=? AND a.enabled=1').bind(actor.accountId).first();
  await limit('change:'+actor.accountId);
  if(!row||!await verifyPassword(env.RUDELBAR_SESSION_SECRET,currentPassword,row.password_json))fail('Das bisherige Passwort stimmt nicht.',403);
  const account=await get(actor.accountId),now=Date.now();
  const condition='EXISTS(SELECT 1 FROM app_accounts WHERE id=? AND enabled=1 AND revision=? AND EXISTS(SELECT 1 FROM app_sessions WHERE id=? AND account_id=? AND revoked=0 AND expires_at>?))';
  const args=[account.id,row.revision,actor.sessionId,account.id,now];
  // First claim the active session/revision using a one-off link, then reuse the atomic completion path.
  const token=random();const issued=await db.prepare(`INSERT INTO app_password_links(id,account_id,token_hash,purpose,email,account_revision,created_at,expires_at) SELECT ?,?,?,'reset',?,?,?,? WHERE ${condition}`).bind(crypto.randomUUID(),account.id,await hash(token),account.email,row.revision,now,now+60000,...args).run();
  if(!issued.meta.changes)fail('Dein Zugang wurde inzwischen geändert. Bitte melde dich erneut an.',401);
  // complete performs a final revision check after hashing; concurrent admin changes cannot be overwritten.
  return complete({token,password});
 }
 return {signIn,invite,forgot,inspect,complete,change,mail};
}
