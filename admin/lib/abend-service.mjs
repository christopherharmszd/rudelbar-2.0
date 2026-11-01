import { CATALOG_ID, EXPERIENCE_TYPE, DEFAULT_CATALOG, cleanCatalog, cleanExperience, defaultExperience, experienceId, validId, publicExperience, programFor, stationsFor } from '../../shared/experience.mjs';

export const APP_EVENT_TYPE='rudelAppEvent';
export const PERSON_TYPE='rudelAppPerson';
export const RELEASE_TYPE='rudelAppRelease';
export const eventDocId=id=>`rudel-app-event-${validId(id)}`;
export const releaseDocId=id=>`rudel-app-release-${validId(id)}`;
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const text=(v,max=160,required=false)=>{const s=String(v??'').trim();if(s.length>max||(required&&!s))fail('Bitte die Pflichtfelder und Textlängen prüfen.');return s;};
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),n=>n.toString(16).padStart(2,'0')).join('');
export const strip=doc=>{if(!doc)return null;const {_id,_rev,_createdAt,_updatedAt,_type,id,published,draft,...fields}=doc;return fields;};
export const catalogFor=async client=>cleanCatalog(await client.getDocument(`drafts.${CATALOG_ID}`)||await client.getDocument(CATALOG_ID)||DEFAULT_CATALOG);
export const peopleFor=async client=>(await client.list(PERSON_TYPE)).map(p=>({...strip(p),revision:p._rev||''}));
export function cleanPerson(input,personId){
  const email=text(input.email,254),phone=text(input.phone,60);
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Bitte eine gültige E-Mail-Adresse eingeben.');
  return {personId:validId(personId),name:text(input.name,100,true),role:text(input.role,100),email,phone,archived:input.archived===true};
}
export function cleanEvent(input,eventId,previous){
  const date=text(input.date,10,true);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(`${date}T12:00:00Z`))||new Date(`${date}T12:00:00Z`).toISOString().slice(0,10)!==date)fail('Bitte ein gültiges Datum eingeben.');
  if(!['public','private'].includes(input.visibility))fail('Bitte öffentlich oder privat wählen.');
  if(!Array.isArray(input.teamIds)||input.teamIds.length>100)fail('Bitte das Team prüfen.');
  return {eventId:validId(eventId),title:text(input.title,120,true),date,time:text(input.time,80),venue:text(input.venue,160,true),address:text(input.address,240),description:text(input.description,1200),visibility:input.visibility,teamIds:[...new Set(input.teamIds.map(validId))],accessCode:previous?.accessCode||token(),source:previous?.source||'app',archived:false};
}
export async function eventList(client){
  const [web,own,configs,releases]=await Promise.all([client.list('rudelEvent'),client.list(APP_EVENT_TYPE),client.list(EXPERIENCE_TYPE),client.list(RELEASE_TYPE)]);
  const entries=new Map(web.filter(e=>!e.archived).map(e=>[e._id,{...strip(e),eventId:e._id,visibility:'public',teamIds:[],source:'website',websitePublished:e.published,revision:''}]));
  for(const e of own.filter(e=>!e.archived))entries.set(e.eventId,{...strip(e),revision:e._rev||''});
  return [...entries.values()].map(e=>{
    const config=configs.find(c=>c.eventId===e.eventId),release=releases.find(r=>r.eventId===e.eventId);
    return {...e,_id:e.eventId,app:{state:release?.state||(config?.published?'open':'closed'),hasRelease:!!release?.config||config?.published===true,hasDraft:config?.draft===true&&(!release?.config||release.sourceRevision!==config._rev),revision:release?._rev||'',updatedAt:release?.changedAt||config?._updatedAt||''}};
  }).sort((a,b)=>String(b.date).localeCompare(String(a.date))||a.title.localeCompare(b.title));
}
export async function loadEvent(client,id){const event=(await eventList(client)).find(e=>e.eventId===id);if(!event)fail('Veranstaltung nicht gefunden.',404);return event;}
export async function configurationFor(client,id){
  const draft=await client.getDocument(`drafts.${experienceId(id)}`),published=await client.getDocument(experienceId(id));
  const config=draft||published;
  return {experience:config?{...strip(config),program:programFor(config),stations:stationsFor(config),revision:draft?._rev||''}: {...defaultExperience(id),revision:''},draft:!!draft,published:!!published};
}
export async function snapshotFor(client,event){
  const [release,published]=await Promise.all([client.getDocument(`drafts.${releaseDocId(event.eventId)}`),client.getDocument(experienceId(event.eventId))]);
  return release||{eventId:event.eventId,state:published?'open':'closed',config:published?strip(published):null};
}
export function guestUrl(base,event){return `${String(base||'').replace(/\/$/,'')}/?abend=${encodeURIComponent(event.eventId)}${event.visibility==='private'?`&zugang=${encodeURIComponent(event.accessCode)}`:''}`;}
export function visitorPayload(config,event,people){
  const safeEvent={_id:event.eventId,title:event.title,date:event.date,time:event.time,venue:event.venue,address:event.address||'',description:event.description||''};
  const resolve=row=>{
    const person=row.hostId?people.find(p=>p.personId===row.hostId&&!p.archived&&event.teamIds.includes(p.personId)):null;
    const {_key,archived,host,...publicRow}=row;
    return {...publicRow,host:person?.name||(!row.hostId?String(host||''):''),hostId:person?.personId||''};
  };
  const payload=publicExperience({...config,_id:'release',enabled:true,eventId:event.eventId},safeEvent);
  if(!payload)return null;
  for(const kind of ['equipment','games'])payload[kind]=payload[kind].map(resolve);
  payload.program=payload.program.map(resolve);
  payload.stations=stationsFor(config).filter(s=>s.enabled!==false).map(({id,name,kind,description,place,offerType,offerId})=>({id,name,kind,description,place,offerType,offerId}));
  payload.schemaVersion=4;
  payload.team=people.filter(p=>!p.archived&&event.teamIds.includes(p.personId)).map(p=>({id:p.personId,name:p.name,role:p.role}));
  return payload;
}
export async function getVisitorExperience(client,{eventId='',accessCode=''}={}){
  try{
    if(eventId)validId(eventId);
    const all=await eventList(client);
    const event=eventId?all.find(e=>e.eventId===eventId):all.find(e=>e.visibility==='public'&&e.app.state==='open'&&e.app.hasRelease)||all.find(e=>e.visibility==='public'&&e.app.hasRelease)||all.find(e=>e.visibility==='public');
    if(!event||(event.visibility==='private'&&(!accessCode||accessCode!==event.accessCode)))return {status:404,error:'Dieser Abend ist nicht verfügbar. Bitte nutze den Gäste-Link deiner Veranstaltung.'};
    const release=await snapshotFor(client,event);
    if(release.state!=='open')return {status:200,state:'closed',event:{id:event.eventId,title:event.title,venue:event.venue},experience:null};
    if(!release.config)return {status:404,error:'Für diesen Abend sind noch keine Inhalte freigegeben.'};
    return {status:200,state:'open',experience:{...visitorPayload(release.config,event,await peopleFor(client)),revision:release._rev||release.sourceRevision||''}};
  }catch(error){return {status:error.status===400?400:503,error:error.status===400?error.message:'Der Abend kann gerade nicht geladen werden.'};}
}
