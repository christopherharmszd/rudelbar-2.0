import {createAccounts} from './accounts.mjs';
import {hash,cleanEmail,cleanText,fail} from './account-utils.mjs';
import {ROLE_LABELS,editsContent,managesUsers,requirePermission} from './permissions.mjs';
import {PERSON_TYPE,APP_EVENT_TYPE,peopleFor,partnersFor,cleanPerson,cleanEvent,eventList,eventDocId,strip} from './abend-service.mjs';
import {PARTNER_TYPE,cleanPartner} from './profile-fields.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function createMemberOnboarding(env,client){
 const db=env.LIVE_DB;
 const accounts=()=>createAccounts(env,{people:()=>peopleFor(client),events:()=>eventList(client)});
 async function get(user,key){
  requirePermission(editsContent(user));if(!uuid.test(key))fail('Ungültiger Vorgang.');
  const row=await db.prepare('SELECT * FROM app_member_onboarding WHERE id=?').bind(key).first();
  if(!row||row.actor_id!==(user.accountId||'legacy-redaktion')&&!managesUsers(user))fail('Vorgang nicht gefunden.',404);
  return {input:JSON.parse(row.input_json),personId:row.person_id,state:row.state};
 }
 async function normalize(user,input){
  requirePermission(editsContent(user));const key=String(input.clientKey||'');if(!uuid.test(key))fail('Bitte den Assistenten neu öffnen.');
  const createAccount=input.createAccount===true;if(createAccount)requirePermission(managesUsers(user));
  const personId=input.personId?cleanText(input.personId,90,true):'person-'+key;
  if(!/^person-[a-f0-9-]{36}$/.test(personId))fail('Ungültiges Personenprofil.');
  const partners=await partnersFor(client),newPartner=input.newPartner?cleanPartner(input.newPartner,'partner-'+key):null;
  if(newPartner&&partners.some(p=>p.partnerId!==newPartner.partnerId&&p.name.toLocaleLowerCase('de')===newPartner.name.toLocaleLowerCase('de')))fail('Diesen Partner gibt es bereits. Bitte wähle ihn aus.',409);
  const profile=cleanPerson({...input.profile,partnerId:newPartner?.partnerId||input.profile?.partnerId,archived:false},personId,newPartner?[...partners,newPartner]:partners);
  const roles=[];
  if(createAccount){
   profile.email=cleanEmail(profile.email);if(profile.email==='redaktion@rudelbar.local')fail('Diese Adresse bleibt für den bisherigen Zugang Redaktion reserviert.');
   if(!Array.isArray(input.roles)||!input.roles.length||input.roles.length>30)fail('Bitte mindestens eine Berechtigung wählen.');
   const events=await eventList(client),seen=new Set();
   for(const value of input.roles){
    if(!Object.hasOwn(ROLE_LABELS,value.role))fail('Unbekannte Berechtigung.');
    const global=['admin','editor','author'].includes(value.role),eventId=global?'':cleanText(value.eventId,90,true);
    if(!global&&!events.some(e=>e.eventId===eventId))fail('Bitte einen vorhandenen Abend für diese Aufgabe wählen.');
    const roleKey=value.role+':'+eventId;if(seen.has(roleKey))fail('Diese Aufgabe ist bereits ausgewählt.');seen.add(roleKey);roles.push({role:value.role,...(global?{}:{eventId})});
   }
   if(!['email','link'].includes(input.delivery))fail('Bitte wählen, wie die Einladung übergeben werden soll.');
  }
  return {clientKey:key,personId:input.personId||'',profileRevision:input.profileRevision||'',profile,newPartner,createAccount,roles,delivery:createAccount?input.delivery:'none'};
 }
 async function submit(user,input,origin){
  const normalized=await normalize(user,input),key=normalized.clientKey,personId=normalized.profile.personId,actor=user.accountId||'legacy-redaktion',payloadHash=await hash(JSON.stringify(normalized)),now=Date.now();
  let op=await db.prepare('SELECT * FROM app_member_onboarding WHERE id=?').bind(key).first();
  if(op&&(op.actor_id!==actor&&!managesUsers(user)||op.payload_hash!==payloadHash))fail('Dieser Vorgang gehört zu einem anderen Entwurf. Bitte den Assistenten neu öffnen.',409);
  if(normalized.createAccount&&normalized.delivery==='email'&&op?.state!=='complete'&&!(await accounts().mail.settings()).ready)fail('Der E-Mail-Versand ist noch nicht eingerichtet. Richte ihn zuerst ein oder wähle ausdrücklich einen Einladungslink.',503);
  let person=await client.getDocument('drafts.'+personId);
  if(!op){
   if(normalized.personId){
    if(!person||person._type!==PERSON_TYPE||person.deletedAt)fail('Das Personenprofil ist nicht verfügbar.',404);
    if(!normalized.profileRevision||normalized.profileRevision!==person._rev)fail('Das Profil wurde inzwischen geändert. Bitte aktualisieren.',409);
   }else if(person)fail('Dieser Vorgang wurde bereits begonnen. Bitte aktualisieren.',409);
   if(normalized.createAccount){
    const collision=await db.prepare('SELECT id,person_id FROM app_accounts WHERE email=? OR person_id=?').bind(normalized.profile.email,personId).first();
    if(collision)fail('Für diese E-Mail-Adresse oder Person gibt es bereits ein Konto. Bearbeite den bestehenden Zugang.',409);
   }
   await db.prepare('INSERT OR IGNORE INTO app_member_onboarding(id,actor_id,person_id,payload_hash,input_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(key,actor,personId,payloadHash,JSON.stringify(normalized),now,now).run();
   op=await db.prepare('SELECT * FROM app_member_onboarding WHERE id=?').bind(key).first();
   if(op.actor_id!==actor&&!managesUsers(user)||op.payload_hash!==payloadHash)fail('Der Vorgang wurde inzwischen geändert.',409);
  }
  const claimed=await db.prepare('UPDATE app_member_onboarding SET lease_until=?,updated_at=? WHERE id=? AND lease_until<=?').bind(now+90000,now,key,now).run();
  if(!claimed.meta.changes)fail('Die Einrichtung läuft bereits. Bitte warte kurz und versuche es erneut.',409);
  try{
   const completed=JSON.parse(op.result_json||'{}');
   if(op.state==='complete'){
    if(person?.onboardingKey===key&&person.onboardingPending){person=await client.savePrivate(PERSON_TYPE,personId,{onboardingPending:false},person._rev);await db.prepare('UPDATE app_member_onboarding SET profile_revision=? WHERE id=?').bind(person._rev,key).run();}
    // Email retries only return the recorded result. A lost manual link may be reissued for the same account.
    if(completed.accountId&&normalized.delivery==='link'){
     const account=await accounts().get(completed.accountId);if(!account.activated){const invitation=await accounts().invite(user,account.id,{delivery:'link'});return {...completed,invitation:{url:origin+'/einladung#'+invitation.token,expiresAt:invitation.expiresAt,delivery:'link'}};}
    }
    return completed;
   }
   if(normalized.newPartner){
    const p=await client.getDocument('drafts.'+normalized.newPartner.partnerId);
    if(!p)await client.savePrivate(PARTNER_TYPE,normalized.newPartner.partnerId,normalized.newPartner);
    else if(p.name!==normalized.newPartner.name||p.logoUrl!==normalized.newPartner.logoUrl)fail('Der Partner wurde inzwischen geändert. Bitte prüfe die Zuordnung.',409);
   }
   person=await client.getDocument('drafts.'+personId);
   if(op.profile_revision&&person?._rev!==op.profile_revision)fail('Das Profil wurde während der Einrichtung geändert. Bitte prüfe den bestehenden Eintrag.',409);
   if(!person?.onboardingKey||person.onboardingKey!==key&&!person.onboardingPending&&normalized.personId){
    const fields={...normalized.profile,archived:normalized.personId?person.archived===true:true,onboardingKey:key,onboardingPending:true};
    person=await client.savePrivate(PERSON_TYPE,personId,fields,person?._rev);
    await db.prepare('UPDATE app_member_onboarding SET profile_revision=? WHERE id=?').bind(person._rev,key).run();
   }else if(person.onboardingKey!==key)fail('Für dieses Profil läuft eine andere Einrichtung.',409);
   let account=null;
   if(normalized.createAccount){
    // The selected evening roles include membership in those evening teams, shown in the review step.
    for(const eventId of new Set(normalized.roles.filter(r=>r.eventId).map(r=>r.eventId))){
     const event=(await eventList(client)).find(e=>e.eventId===eventId);if(!event)fail('Ein ausgewählter Abend ist nicht mehr verfügbar.',409);
     if(!event.teamIds.includes(personId)){
      const previous=await client.getDocument('drafts.'+eventDocId(eventId));
      await client.savePrivate(APP_EVENT_TYPE,eventDocId(eventId),cleanEvent({...event,teamIds:[...event.teamIds,personId]},eventId,previous||event),previous?._rev);
     }
    }
    const existing=await db.prepare('SELECT id FROM app_accounts WHERE person_id=?').bind(personId).first();
    // Pending new profiles are invisible to authentication. Only this provisioning operation may validate them.
    const provisionAccounts=createAccounts(env,{people:async()=>(await peopleFor(client)).map(p=>p.personId===personId&&p.onboardingKey===key?{...p,archived:false}:p),events:()=>eventList(client)});
    account=existing?await provisionAccounts.get(existing.id):(await provisionAccounts.save(user,{personId,email:normalized.profile.email,roles:normalized.roles,enabled:false})).account;
    await db.prepare('UPDATE app_member_onboarding SET account_id=? WHERE id=?').bind(account.id,key).run();
    if(account.email!==normalized.profile.email||JSON.stringify(account.roles)!==JSON.stringify(normalized.roles))fail('Das Konto wurde während der Einrichtung geändert. Bitte prüfe den Zugang.',409);
   }
   if(person.archived){
    person=await client.savePrivate(PERSON_TYPE,personId,{archived:false},person._rev);
    await db.prepare('UPDATE app_member_onboarding SET profile_revision=? WHERE id=?').bind(person._rev,key).run();
   }
   let invitation=null;
   if(account){
    if(!account.enabled)account=(await accounts().save(user,{...account,enabled:true},account.id)).account;
    if(!account.activated){
     // Accepted or uncertain mail from this operation is never resent automatically after a lost response.
     const prior=normalized.delivery==='email'?await db.prepare("SELECT state FROM app_mail_attempts WHERE email_hash=? AND purpose='invite' AND created_at>=? AND state IN ('accepted','uncertain') ORDER BY created_at DESC LIMIT 1").bind(await hash(account.email),op.created_at).first():null;
     if(prior)invitation={delivery:prior.state};
     else{const result=await accounts().invite(user,account.id,{delivery:normalized.delivery,origin});invitation={delivery:normalized.delivery==='link'?'link':result.delivery,expiresAt:result.expiresAt,...(result.token?{url:origin+'/einladung#'+result.token}:{})};}
    }
   }
   const result={ok:true,personId,accountId:account?.id||'',createAccount:normalized.createAccount,invitation};
   const stored={...result,invitation:invitation?{delivery:invitation.delivery,expiresAt:invitation.expiresAt||0}:null};
   await db.prepare("UPDATE app_member_onboarding SET state='complete',result_json=?,updated_at=? WHERE id=?").bind(JSON.stringify(stored),Date.now(),key).run();
   if(person.onboardingPending){person=await client.savePrivate(PERSON_TYPE,personId,{onboardingPending:false},person._rev);await db.prepare('UPDATE app_member_onboarding SET profile_revision=? WHERE id=?').bind(person._rev,key).run();}
   return result;
  }finally{await db.prepare('UPDATE app_member_onboarding SET lease_until=0 WHERE id=?').bind(key).run();}
 }
 return {submit,get};
}
