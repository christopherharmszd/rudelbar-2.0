import { CATALOG_ID, EXPERIENCE_TYPE, DEFAULT_CATALOG, cleanCatalog, cleanExperience, defaultExperience, experienceId, validId, publicExperience, programFor } from '../../shared/experience.mjs';

export async function catalogFor(client){return cleanCatalog(await client.getDocument(`drafts.${CATALOG_ID}`)||await client.getDocument(CATALOG_ID)||DEFAULT_CATALOG);}

export async function experienceApi(request,env,{client,json,session,authorized,data}){
  const path=new URL(request.url).pathname;
  const user=await session(request,env);
  if(!user)return json(401,{error:'Bitte anmelden.'});
  if(request.method!=='GET'){const auth=await authorized(request,env);if(auth.error)return auth.error;}
  if(path==='/api/abend/catalog'){
    if(request.method==='GET')return json(200,{catalog:await catalogFor(client)});
    if(request.method==='PUT'){const catalog=cleanCatalog(await data(request));await client.saveDraft('rudelAppCatalog',CATALOG_ID,catalog);return json(200,{catalog});}
  }
  if(path==='/api/abend/events'&&request.method==='GET'){
    const [events,experiences]=await Promise.all([client.list('rudelEvent'),client.list(EXPERIENCE_TYPE)]);
    return json(200,{events:events.filter(e=>!e.archived).map(event=>({...event,app:experiences.find(x=>x.eventId===event._id)||null})),visitorAppUrl:env.VISITOR_APP_URL||''});
  }
  const match=path.match(/^\/api\/abend\/events\/([a-z0-9-]+)(?:\/(publish|unpublish|preview))?$/i);
  if(!match)return json(404,{error:'Nicht gefunden.'});
  const [,eventId,action]=match;
  validId(eventId);
  const id=experienceId(eventId);
  const [events,items]=await Promise.all([client.list('rudelEvent'),client.list(EXPERIENCE_TYPE)]);
  const event=events.find(e=>e._id===eventId&&!e.archived);
  if(!event)return json(404,{error:'Termin nicht gefunden.'});
  const item=items.find(x=>x.eventId===eventId);
  if(request.method==='GET'){
    if(action==='preview')return json(200,{experience:publicExperience({...item,...(item||defaultExperience(eventId)),_id:id,eventId,enabled:true},{...event,_id:eventId})});
    if(action)return json(404,{error:'Nicht gefunden.'});
    return json(200,{event,experience:item?{...item,program:programFor(item)}:defaultExperience(eventId),published:item?.published===true,draft:item?.draft===true});
  }
  if(request.method==='PUT'&&!action){
    const catalog=cleanCatalog(await catalogFor(client));
    const fields=cleanExperience(await data(request),catalog,eventId);
    await client.saveDraft(EXPERIENCE_TYPE,id,fields);
    return json(200,{ok:true,experience:fields});
  }
  if(request.method==='POST'&&action==='publish'){
    const publishedEvent=await client.getDocument(eventId);
    if(!publishedEvent||publishedEvent._type!=='rudelEvent'||publishedEvent.archived)return json(409,{error:'Bitte zuerst den Termin in der Redaktion veröffentlichen.'});
    if(!item?.draft)return json(409,{error:'Bitte zuerst einen Entwurf speichern.'});
    await client.publish(id);
    return json(200,{ok:true,url:`${String(env.VISITOR_APP_URL||'').replace(/\/$/,'')}/?abend=${encodeURIComponent(eventId)}`});
  }
  if(request.method==='POST'&&action==='unpublish'){
    if(!item?.published)return json(409,{error:'Dieser Abend ist nicht veröffentlicht.'});
    await client.unpublish(id);return json(200,{ok:true});
  }
  return json(405,{error:'Diese Aktion ist nicht verfügbar.'});
}
