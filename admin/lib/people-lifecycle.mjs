import {PERSON_TYPE,strip} from './abend-service.mjs';
import {editsContent,managesUsers,requirePermission} from './permissions.mjs';
const fail=(message,status)=>{throw Object.assign(new Error(message),{status});};
export async function changePersonLifecycle(env,client,user,id,input,action){
 requirePermission(editsContent(user));
 const existing=await client.getDocument('drafts.'+id);
 if(!existing||existing._type!==PERSON_TYPE)fail('Person nicht gefunden.',404);
 if(!input.revision||input.revision!==existing._rev)fail('Das Profil wurde inzwischen geändert. Bitte aktualisieren.',409);
 if(user.personId===id)fail('Dein eigenes Personenprofil bleibt erhalten. Eine andere Administration kann es entfernen.',409);
 const account=env.LIVE_DB?await env.LIVE_DB.prepare('SELECT id FROM app_accounts WHERE person_id=?').bind(id).first():null;
 if(account)requirePermission(managesUsers(user));
 const deleting=action==='delete';
 if(deleting&&existing.deletedAt)fail('Das Profil liegt bereits im Papierkorb.',409);
 if(!deleting&&!existing.deletedAt)fail('Das Profil liegt nicht im Papierkorb.',409);
 // Hide immediately through the shared profile resolver; no conversation or event is deleted.
 const doc=await client.savePrivate(PERSON_TYPE,id,{archived:true,deletedAt:deleting?new Date().toISOString():null},input.revision);
 if(env.LIVE_DB){
  await env.LIVE_DB.batch([
   env.LIVE_DB.prepare('UPDATE app_sessions SET revoked=1 WHERE account_id IN (SELECT id FROM app_accounts WHERE person_id=?)').bind(id),
   env.LIVE_DB.prepare('UPDATE app_password_links SET revoked=1 WHERE account_id IN (SELECT id FROM app_accounts WHERE person_id=?)').bind(id),
   env.LIVE_DB.prepare('UPDATE app_invitations SET revoked=1 WHERE account_id IN (SELECT id FROM app_accounts WHERE person_id=?)').bind(id),
   env.LIVE_DB.prepare('UPDATE live_grants SET revoked=1 WHERE person_id=?').bind(id),
   env.LIVE_DB.prepare("UPDATE live_push_subscriptions SET active=0 WHERE person_id=? OR recipient IN (SELECT 'u:'||id FROM app_accounts WHERE person_id=?)").bind(id,id),
   env.LIVE_DB.prepare('UPDATE app_accounts SET enabled=0,revision=revision+1,updated_at=? WHERE person_id=?').bind(Date.now(),id),
   env.LIVE_DB.prepare('INSERT INTO app_audit(actor_id,actor_name,action,target_id,created_at) VALUES(?,?,?,?,?)').bind(user.accountId||'legacy-redaktion',user.name||'Redaktion',deleting?'person.deleted':'person.restored',id,Date.now())
  ]);
 }
 return {ok:true,person:{...strip(doc),revision:doc._rev||''}};
}
