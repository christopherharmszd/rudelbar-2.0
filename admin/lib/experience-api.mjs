import { CATALOG_ID, EXPERIENCE_TYPE, cleanCatalog, cleanExperience, experienceId, validId } from '../../shared/experience.mjs';
import { APP_EVENT_TYPE, PERSON_TYPE, RELEASE_TYPE, catalogFor, peopleFor, partnersFor, cleanPerson, cleanEvent, eventList, loadEvent, configurationFor, snapshotFor, visitorPayload, eventDocId, releaseDocId, guestUrl, strip } from './abend-service.mjs';
import {PARTNER_TYPE,cleanPartner} from './profile-fields.mjs';
export {catalogFor};
import {createLiveService} from './live-service.mjs';
import {changePersonLifecycle} from './people-lifecycle.mjs';
import {changeCatalogLifecycle} from './catalog-lifecycle.mjs';
import {createMemberOnboarding} from './member-onboarding.mjs';
import {editsContent,readsEvents,managesEvent,seesEvent,requirePermission} from './permissions.mjs';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export async function experienceApi(request,env,{client,json,session,authorized,data}){
  const path=new URL(request.url).pathname,user=await session(request,env);
  if(!user)return json(401,{error:'Bitte anmelden.'});
  if(request.method!=='GET'){const auth=await authorized(request,env);if(auth.error)return auth.error;}
  if(path==='/api/abend/members'&&request.method==='POST')return json(201,await createMemberOnboarding(env,client).submit(user,await data(request),new URL(request.url).origin));
  const onboardingMatch=path.match(/^\/api\/abend\/members\/([a-f0-9-]{36})$/);
  if(onboardingMatch&&request.method==='GET')return json(200,await createMemberOnboarding(env,client).get(user,onboardingMatch[1]));
  requirePermission(readsEvents(user));
  if(path==='/api/abend/catalog'){
    if(request.method!=='GET')requirePermission(editsContent(user));
    if(request.method==='GET'){requirePermission(editsContent(user)||(user.roles||[]).some(r=>r.role==='manager'));return json(200,{catalog:await catalogFor(client)});}
    if(request.method==='PUT'){
      const input=await data(request),current=await catalogFor(client);
      if(current.revision&&input.revision!==current.revision)fail('Die Angebote wurden inzwischen geändert. Bitte aktualisieren.',409);
      await client.savePrivate('rudelAppCatalog',CATALOG_ID,cleanCatalog(input),current.revision||undefined);
      return json(200,{catalog:await catalogFor(client)});
    }
  }
  if(path==='/api/abend/partners'){
    requirePermission(editsContent(user));
    if(request.method==='GET')return json(200,{partners:await partnersFor(client)});
    if(request.method==='POST'){const id='partner-'+crypto.randomUUID(),doc=await client.savePrivate(PARTNER_TYPE,id,cleanPartner(await data(request),id));return json(201,{partner:{...strip(doc),revision:doc._rev||''}});}
  }
  const partnerMatch=path.match(/^\/api\/abend\/partners\/([a-z0-9-]+)$/i);
  if(partnerMatch&&request.method==='PUT'){
    requirePermission(editsContent(user));const id=validId(partnerMatch[1]),input=await data(request),existing=await client.getDocument('drafts.'+id);
    if(!existing||existing._type!==PARTNER_TYPE)return json(404,{error:'Partner nicht gefunden.'});
    if(!input.revision||input.revision!==existing._rev)return json(409,{error:'Der Partner wurde inzwischen geändert. Bitte aktualisieren.'});
    const doc=await client.savePrivate(PARTNER_TYPE,id,cleanPartner(input,id),input.revision);return json(200,{partner:{...strip(doc),revision:doc._rev||''}});
  }
  const catalogAction=path.match(/^\/api\/abend\/catalog\/(equipment|games|program|drinks)\/([a-z0-9-]+)\/(delete|restore)$/i);
  if(catalogAction&&request.method==='POST')return json(200,await changeCatalogLifecycle(client,user,catalogAction[1],validId(catalogAction[2]),await data(request),catalogAction[3]));
  if(path==='/api/abend/people'){
    if(request.method==='GET'){
      const allPeople=await peopleFor(client,{includeDeleted:true}),people=allPeople.filter(p=>!p.deletedAt);if(editsContent(user))return json(200,{people,trash:allPeople.filter(p=>p.deletedAt)});
      const events=(await eventList(client)).filter(e=>seesEvent(user,e.eventId)&&e.teamIds.includes(user.personId)),ids=new Set(events.flatMap(e=>e.teamIds));
      return json(200,{people:people.filter(p=>ids.has(p.personId)).map(({personId,name,role,archived})=>({personId,name,role,archived}))});
    }
    requirePermission(editsContent(user));
    if(request.method==='POST'){const input=await data(request),id=`person-${crypto.randomUUID()}`;const doc=await client.savePrivate(PERSON_TYPE,id,cleanPerson(input,id,await partnersFor(client)));return json(201,{person:{...strip(doc),revision:doc._rev||''}});}
  }
  const lifecycle=path.match(/^\/api\/abend\/people\/([a-z0-9-]+)\/(delete|restore)$/i);
  if(lifecycle&&request.method==='POST')return json(200,await changePersonLifecycle(env,client,user,validId(lifecycle[1]),await data(request),lifecycle[2]));
  const personMatch=path.match(/^\/api\/abend\/people\/([a-z0-9-]+)$/i);
  if(personMatch&&request.method==='PUT'){
    requirePermission(editsContent(user));
    const id=validId(personMatch[1]),input=await data(request),existing=await client.getDocument(`drafts.${id}`);
    if(!existing||existing._type!==PERSON_TYPE)return json(404,{error:'Person nicht gefunden.'});
    if(existing.deletedAt)return json(409,{error:'Bitte das Profil zuerst aus dem Papierkorb wiederherstellen.'});
    const doc=await client.savePrivate(PERSON_TYPE,id,cleanPerson(input,id,await partnersFor(client)),input.revision);
    return json(200,{person:{...strip(doc),revision:doc._rev||''}});
  }
  if(path==='/api/abend/events'){
    if(request.method==='GET')return json(200,{events:(await eventList(client)).filter(e=>seesEvent(user,e.eventId)&&(editsContent(user)||e.teamIds.includes(user.personId))).map(e=>managesEvent(user,e.eventId)?({...e,canManage:true,guestUrl:guestUrl(env.VISITOR_APP_URL,e)}):({eventId:e.eventId,title:e.title,date:e.date,time:e.time,venue:e.venue,visibility:e.visibility,app:e.app,canManage:false})),visitorAppUrl:env.VISITOR_APP_URL||''});
    if(request.method==='POST'){
      requirePermission(editsContent(user));
      const input=await data(request),id=`app-${crypto.randomUUID()}`,fields=cleanEvent({...input,teamIds:input.teamIds||[]},id);
      await client.savePrivate(APP_EVENT_TYPE,eventDocId(id),fields);
      return json(201,{id,event:await loadEvent(client,id)});
    }
  }
  const access=path.match(/^\/api\/abend\/events\/([a-z0-9-]+)\/access(?:\/([a-z0-9-]+)\/revoke)?$/i);
  if(access){
    const eventId=validId(access[1]),service=createLiveService(env,client);
    const event=await loadEvent(client,eventId);requirePermission(managesEvent(user,eventId)&&(editsContent(user)||event.teamIds.includes(user.personId)));
    if(request.method==='GET'&&!access[2])return json(200,await service.grants(eventId));
    if(request.method==='POST'&&access[2])return json(200,await service.revoke(eventId,validId(access[2])));
    if(request.method==='POST'){const input=await data(request),grant=await service.issueGrant(eventId,validId(input.personId));return json(201,{id:grant.id,expiresAt:grant.expiresAt,url:`${new URL(request.url).origin}/team?zugang=${grant.code}`});}
  }
  const match=path.match(/^\/api\/abend\/events\/([a-z0-9-]+)(?:\/(details|publish|unpublish|preview|open|close))?$/i);
  if(!match)return json(404,{error:'Nicht gefunden.'});
  const [,id,action]=match;validId(id);
  const event=await loadEvent(client,id),current=await configurationFor(client,id);
  requirePermission(managesEvent(user,id)&&(editsContent(user)||event.teamIds.includes(user.personId)));
  if(request.method==='GET'){
    if(action==='preview')return json(200,{state:'open',experience:visitorPayload(current.experience,event,await peopleFor(client),await partnersFor(client))});
    if(action)return json(404,{error:'Nicht gefunden.'});
    return json(200,{...current,event:{...event,guestUrl:guestUrl(env.VISITOR_APP_URL,event)}});
  }
  if(request.method==='PUT'&&action==='details'){
    const input=await data(request),previous=await client.getDocument(`drafts.${eventDocId(id)}`);
    const fields=cleanEvent({...event,...input},id,previous||event),people=await peopleFor(client);
    if(fields.teamIds.some(pid=>!people.some(p=>p.personId===pid&&!p.archived)))fail('Bitte nur aktive Personen zum Team hinzufügen.');
    await client.savePrivate(APP_EVENT_TYPE,eventDocId(id),fields,input.revision);
    return json(200,{event:{...await loadEvent(client,id),guestUrl:guestUrl(env.VISITOR_APP_URL,fields)}});
  }
  if(request.method==='PUT'&&!action){
    const input=await data(request),fields=cleanExperience(input,await catalogFor(client),id,await peopleFor(client,{includeDeleted:true}),event.teamIds);
    const doc=await client.savePrivate(EXPERIENCE_TYPE,experienceId(id),fields,input.revision);
    return json(200,{ok:true,experience:{...strip(doc),revision:doc._rev||''}});
  }
  if(request.method==='POST'&&['publish','open','close','unpublish'].includes(action)){
    const release=await snapshotFor(client,event),config=action==='close'||action==='unpublish'?release.config:current.experience;
    if(action==='publish'||action==='open'){
      if(event.source==='website'&&!event.websitePublished&&!event.revision)fail('Bitte zuerst den Webseiten-Termin veröffentlichen oder einen eigenen Abend anlegen.',409);
      if(!current.draft&&!release.config)fail('Bitte zuerst den Abend vorbereiten und speichern.',409);
      // Re-check people and catalog references at release time as well.
      const validated=cleanExperience(config,await catalogFor(client),id,await peopleFor(client),event.teamIds);
      const fields={eventId:id,state:action==='open'?'open':release.state,config:validated,changedAt:new Date().toISOString(),sourceRevision:config.revision||''};
      await client.savePrivate(RELEASE_TYPE,releaseDocId(id),fields,release._rev);
    }else await client.savePrivate(RELEASE_TYPE,releaseDocId(id),{eventId:id,state:'closed',config:release.config||null,changedAt:new Date().toISOString(),sourceRevision:release.sourceRevision||''},release._rev);
    return json(200,{ok:true,event:await loadEvent(client,id),url:guestUrl(env.VISITOR_APP_URL,event)});
  }
  return json(405,{error:'Diese Aktion ist nicht verfügbar.'});
}
