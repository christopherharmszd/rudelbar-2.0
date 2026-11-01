import {ROLE_LABELS,managesUsers,requirePermission} from './permissions.mjs';
import {hash,random,fail,cleanText,cleanEmail,accountCookie,cookieValue} from './account-utils.mjs';
export {hash,random,fail,cleanText,cleanEmail,accountCookie,cookieValue} from './account-utils.mjs';
import {createPasswordAccounts} from './password-accounts.mjs';
export function createAccounts(env,{people=async()=>[],events=async()=>[]}={}){
 const db=env.LIVE_DB,first=(sql,args=[])=>db.prepare(sql).bind(...args).first(),run=(sql,args=[])=>db.prepare(sql).bind(...args).run(),all=async(sql,args=[])=>((await db.prepare(sql).bind(...args).all()).results||[]);
 const dto=row=>({id:row.id,personId:row.person_id,name:row.name,email:row.email,enabled:!!row.enabled,roles:JSON.parse(row.roles_json),revision:row.revision,createdAt:row.created_at,updatedAt:row.updated_at,activated:!!row.activated,activeSessions:row.active_sessions||0,invitationExpires:row.invitation_expires||0});
 const select=`SELECT a.*,EXISTS(SELECT 1 FROM app_credentials i WHERE i.account_id=a.id) AS activated,(SELECT COUNT(*) FROM app_sessions s WHERE s.account_id=a.id AND s.revoked=0 AND s.expires_at>${Date.now()}) AS active_sessions,(SELECT MAX(expires_at) FROM app_password_links v WHERE v.account_id=a.id AND v.revoked=0 AND v.used_at IS NULL) AS invitation_expires FROM app_accounts a`;
 async function audit(actor,action,target,detail={}){await run('INSERT INTO app_audit(actor_id,actor_name,action,target_id,detail_json,created_at) VALUES(?,?,?,?,?,?)',[actor.accountId||'legacy-redaktion',actor.name||'Redaktion',action,target,JSON.stringify(detail),Date.now()]);}
 async function get(id){const row=await first(select+' WHERE a.id=?',[id]);if(!row)fail('Benutzerkonto nicht gefunden.',404);return dto(row);}
 async function list(){return {accounts:(await all(select+' ORDER BY a.name COLLATE NOCASE')).map(dto),roles:ROLE_LABELS,identityConfigured:true,method:"password",mail:await native.mail.settings(),legacyEnabled:true};}
 async function cleanRoles(input,personId){
  if(!Array.isArray(input)||!input.length||input.length>30)fail('Bitte mindestens eine Aufgabe zuweisen.');
  const eventRows=await events(),ids=new Set(),result=[];
  for(const value of input){
   const role=value.role;if(!Object.hasOwn(ROLE_LABELS,role))fail('Unbekannte Aufgabe.');
   const global=['admin','editor'].includes(role),eventId=global?'':cleanText(value.eventId,100,true),event=eventRows.find(e=>e.eventId===eventId);
   if(!global&&!event)fail('Bitte einen vorhandenen Abend wählen.');
   if(!global&&!event.teamIds.includes(personId))fail('Füge die Person zuerst zum Team dieses Abends hinzu.');
   const key=role+':'+eventId;if(ids.has(key))fail('Diese Aufgabe ist bereits zugewiesen.');ids.add(key);
   result.push({role,...(!global?{eventId}:{})});
  }
  return result;
 }
 async function save(actor,input,id){
  requirePermission(managesUsers(actor));const existing=id?await get(id):null;
  const personId=cleanText(input.personId,100,true),profile=(await people()).find(p=>p.personId===personId&&!p.archived);
  if(!profile)fail('Bitte ein aktives Personenprofil zuordnen.');
  if(existing&&personId!==existing.personId)fail('Ein bestehendes Konto kann nicht einer anderen Person zugeordnet werden.');
  const email=cleanEmail(input.email),roles=await cleanRoles(input.roles,personId),enabled=input.enabled!==false;
  if(email==='redaktion@rudelbar.local')fail('Diese Adresse bleibt für den gemeinsamen Zugang Redaktion reserviert.');
  if(existing?.activated&&email!==existing.email)fail('Die Anmeldeadresse eines eingerichteten Kontos kann derzeit nicht geändert werden.');
  if(existing&&actor.accountId===id&&(!enabled||!roles.some(r=>r.role==='admin')))fail('Deine eigene Administration bleibt erhalten. Eine andere Administration kann die Änderung vornehmen.');
  if((await all('SELECT id FROM app_accounts WHERE (email=? OR person_id=?) AND id<>?',[email,personId,id||''])).length)fail('Für diese E-Mail-Adresse oder dieses Profil gibt es bereits ein Konto.',409);
  const now=Date.now();id=id||crypto.randomUUID();
  if(existing){
   if(input.revision!==existing.revision)fail('Das Konto wurde inzwischen geändert. Bitte aktualisieren.',409);
   const results=await db.batch([
    db.prepare('UPDATE app_sessions SET revoked=1 WHERE account_id=? AND EXISTS(SELECT 1 FROM app_accounts WHERE id=? AND revision=?)').bind(id,id,input.revision),
    db.prepare('UPDATE app_password_links SET revoked=1 WHERE account_id=? AND EXISTS(SELECT 1 FROM app_accounts WHERE id=? AND revision=?)').bind(id,id,input.revision),
    db.prepare('UPDATE live_grants SET revoked=1 WHERE person_id=? AND EXISTS(SELECT 1 FROM app_accounts WHERE id=? AND revision=?)').bind(personId,id,input.revision),
    db.prepare('UPDATE app_accounts SET name=?,email=?,roles_json=?,enabled=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(profile.name,email,JSON.stringify(roles),enabled?1:0,now,id,input.revision)
   ]);if(!results[3].meta.changes)fail('Das Konto wurde inzwischen geändert. Bitte aktualisieren.',409);
  }else await run('INSERT INTO app_accounts(id,person_id,name,email,roles_json,enabled,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',[id,personId,profile.name,email,JSON.stringify(roles),enabled?1:0,now,now]);
  await audit(actor,existing?'account.updated':'account.created',id,{roles,enabled});return {account:await get(id)};
 }
 async function revoke(actor,id){requirePermission(managesUsers(actor));const account=await get(id);await db.batch([db.prepare('UPDATE app_sessions SET revoked=1 WHERE account_id=?').bind(id),db.prepare('UPDATE app_password_links SET revoked=1 WHERE account_id=?').bind(id),db.prepare('UPDATE app_invitations SET revoked=1 WHERE account_id=?').bind(id),db.prepare('UPDATE live_grants SET revoked=1 WHERE person_id=?').bind(account.personId)]);await audit(actor,'account.sessions_revoked',id);return {ok:true};}
 async function session(request){
  const token=cookieValue(request,'rb_account');if(!/^[a-f0-9]{64}$/.test(token)||!db)return null;
  const row=await first('SELECT a.*,s.id AS session_id,s.csrf,s.expires_at FROM app_sessions s JOIN app_accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.revoked=0 AND s.expires_at>? AND a.enabled=1',[await hash(token),Date.now()]);if(!row)return null;
  const profile=(await people()).find(p=>p.personId===row.person_id&&!p.archived);if(!profile)return null;
  return {accountId:row.id,sessionId:row.session_id,name:profile.name,email:row.email,sub:row.id,personId:row.person_id,roles:JSON.parse(row.roles_json),csrf:row.csrf,exp:row.expires_at,ver:String(row.revision)};
 }
 async function logout(user){if(user?.sessionId)await run('UPDATE app_sessions SET revoked=1 WHERE id=?',[user.sessionId]);}
 async function history(actor){requirePermission(managesUsers(actor));return {items:await all('SELECT id,actor_name AS actorName,action,target_id AS targetId,created_at AS createdAt FROM app_audit ORDER BY id DESC LIMIT 100')};}
 const native=createPasswordAccounts(env,{get,people,audit});
 return {get,list,save,revoke,session,logout,audit,history,...native};
}
