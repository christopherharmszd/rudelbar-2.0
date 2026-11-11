import {publicMap} from '../../shared/village-map.mjs';
import { CATALOG_ID, EXPERIENCE_TYPE, DEFAULT_CATALOG, cleanCatalog, cleanExperience, defaultExperience, experienceId, validId, publicExperience, programFor, stationsFor, withoutDeletedPeople } from '../../shared/experience.mjs';
import {PARTNER_TYPE,affiliationFields,affiliationFor} from './profile-fields.mjs';
import {sectionAllowsStation} from '../../shared/content-model.mjs';

export const APP_EVENT_TYPE='rudelAppEvent';
export const PERSON_TYPE='rudelAppPerson';
export const RELEASE_TYPE='rudelAppRelease';
export const eventDocId=id=>`rudel-app-event-${validId(id)}`;
export const releaseDocId=id=>`rudel-app-release-${validId(id)}`;
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const text=(v,max=160,required=false)=>{const s=String(v??'').trim();if(s.length>max||(required&&!s))fail('Bitte die Pflichtfelder und Textlängen prüfen.');return s;};
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),n=>n.toString(16).padStart(2,'0')).join('');
export const strip=doc=>{if(!doc)return null;const {_id,_rev,_createdAt,_updatedAt,_type,id,published,draft,...fields}=doc;return fields;};
export const catalogFor=async client=>{const doc=await client.getDocument(`drafts.${CATALOG_ID}`)||await client.getDocument(CATALOG_ID);return {...cleanCatalog(doc||{equipment:[],games:[],program:[],drinks:[]}),revision:doc?._rev||''};};
export const peopleFor=async(client,{includeDeleted=false}={})=>(await client.list(PERSON_TYPE)).filter(p=>includeDeleted||!p.deletedAt).map(p=>({...strip(p),membershipType:p.membershipType||'rudelbar',partnerId:p.partnerId||'',avatarUrl:p.avatarUrl||'',revision:p._rev||''}));
export const partnersFor=async client=>(await client.list(PARTNER_TYPE)).map(p=>({...strip(p),revision:p._rev||''}));
export function cleanPerson(input,personId,partners=[]){
  const email=text(input.email,254),phone=text(input.phone,60);
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Bitte eine gültige E-Mail-Adresse eingeben.');
  return {personId:validId(personId),name:text(input.name,100,true),role:text(input.role,100),email,phone,archived:input.archived===true,...affiliationFields(input,partners)};
}
export function cleanEvent(input,eventId,previous){
  const date=text(input.date,10);
  if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(`${date}T12:00:00Z`))||new Date(`${date}T12:00:00Z`).toISOString().slice(0,10)!==date))fail('Bitte ein gültiges Datum eingeben.');
  if(!['public','private'].includes(input.visibility))fail('Bitte öffentlich oder privat wählen.');
  if(!Array.isArray(input.teamIds)||input.teamIds.length>100)fail('Bitte das Team prüfen.');
  return {eventId:validId(eventId),title:text(input.title,120,true),date,time:text(input.time,80),venue:text(input.venue,160),address:text(input.address,240),description:text(input.description,1200),visibility:input.visibility,teamIds:[...new Set(input.teamIds.map(validId))],linkedEventId:input.linkedEventId?validId(input.linkedEventId):'',sourceTemplateId:previous?.sourceTemplateId||'',sourceTemplateRevision:previous?.sourceTemplateRevision||'',accessCode:previous?.accessCode||token(),source:previous?.source||'app',archived:false};
}
export async function eventList(client){
  const [web,own,configs,releases,people,runtime]=await Promise.all([(client.website||client).list('rudelEvent'),client.list(APP_EVENT_TYPE),client.list(EXPERIENCE_TYPE),client.list(RELEASE_TYPE),client.list(PERSON_TYPE),client.runtimeDb?releaseMetadata(client.runtimeDb):[]]);
  let currentResourcesVersion=null;
  if(!client.runtimeOnly&&runtime.some(r=>r.sourceResourcesVersion)){
   const [state,catalog]=await Promise.all([client.getDocument('drafts.'+RESOURCE_STATE_ID),catalogFor(client)]);
   currentResourcesVersion={resourceRevision:state?._rev||'',sourcesVersion:await resourceSourcesVersion(sourceObjects(catalog,people.map(p=>({...p,revision:p._rev||''}))))};
  }
  const deletedIds=new Set(people.filter(p=>p.deletedAt).map(p=>p.personId));
  const websiteEntries=new Map(web.filter(e=>!e.archived).map(e=>[e._id,{...strip(e),eventId:e._id,visibility:'public',teamIds:[],source:'website',websitePublished:e.published,revision:''}]));
  const entries=new Map(websiteEntries);
  for(const e of own.filter(e=>!e.archived)){const linked=e.linkedEventId?websiteEntries.get(e.linkedEventId):null;if(linked&&e.linkedEventId!==e.eventId)entries.delete(e.linkedEventId);entries.set(e.eventId,{...strip(e),linkedWebsitePublished:linked?.websitePublished??false,revision:e._rev||''});}
  return [...entries.values()].map(e=>{
    const config=configs.find(c=>c.eventId===e.eventId),release=releases.find(r=>r.eventId===e.eventId),active=runtime.find(r=>r.eventId===e.eventId);
    const hasRelease=active?active.hasConfig:!!release?.config||config?.published===true;
    const operatingTeamIds=[...new Set([...(e.teamIds||[]),...(active?active.staffIds:release?.config?._staffIds||[])])].filter(id=>people.some(p=>p.personId===id&&!p.archived&&!p.deletedAt));
    return {...e,teamIds:(e.teamIds||[]).filter(id=>!deletedIds.has(id)),operatingTeamIds,_id:e.eventId,app:{state:active?.state||release?.state||(config?.published?'open':'closed'),hasRelease,hasDraft:config?.draft===true&&(!hasRelease||(active?.sourceRevision??release?.sourceRevision)!==config._rev),hasSourceChanges:!!active?.sourceResourcesVersion&&JSON.stringify(active.sourceResourcesVersion)!==JSON.stringify(currentResourcesVersion),revision:active?'runtime-'+active.revision:release?._rev||'',versionId:active?.versionId||'',updatedAt:active?.changedAt||release?.changedAt||config?._updatedAt||''}};
  }).sort((a,b)=>String(b.date).localeCompare(String(a.date))||a.title.localeCompare(b.title));
}
export async function loadEvent(client,id){
 if(client.runtimeOnly){
  const own=await client.event(id);
  if(own){if(own.archived)fail('Veranstaltung nicht gefunden.',404);return {...strip(own),revision:own._rev||'',source:own.source||'app'};}
  const published=await client.website.getDocument(id),draft=await client.website.getDocument('drafts.'+id),doc=draft||published;
  if(!doc||doc._type!=='rudelEvent'||doc.archived)fail('Veranstaltung nicht gefunden.',404);
  return {...strip(doc),eventId:id,visibility:'public',teamIds:[],source:'website',websitePublished:!!published,revision:''};
 }
 const event=(await eventList(client)).find(e=>e.eventId===id);if(!event)fail('Veranstaltung nicht gefunden.',404);return event;
}
export async function configurationFor(client,id){
  const draft=await client.getDocument(`drafts.${experienceId(id)}`),published=await client.getDocument(experienceId(id));
  const source=draft||published,config=source?withoutDeletedPeople(source,await peopleFor(client,{includeDeleted:true})):null;
  return {experience:config?{...strip(config),program:programFor(config),stations:stationsFor(config),revision:draft?._rev||''}: {...defaultExperience(id),revision:''},draft:!!draft,published:!!published};
}
export async function snapshotFor(client,event){
  if(client.runtimeOnly)return await createReleaseStore(client.runtimeDb).read(event.eventId)||{eventId:event.eventId,state:'closed',config:null};
  const [release,published]=await Promise.all([client.getDocument(`drafts.${releaseDocId(event.eventId)}`),client.getDocument(experienceId(event.eventId))]);
  const active=client.runtimeDb?await createReleaseStore(client.runtimeDb).read(event.eventId):null;
  return active?{...release,...active,_rev:release?._rev}:release||{eventId:event.eventId,state:published?'open':'closed',config:published?strip(published):null};
}
export function guestUrl(base,event){return `${String(base||'').replace(/\/$/,'')}/?abend=${encodeURIComponent(event.eventId)}${event.visibility==='private'?`&zugang=${encodeURIComponent(event.accessCode)}`:''}`;}
export function visitorPayload(config,event,people,partners=[]){
  const visibleTeamIds=config._resourceSnapshot?config._publicContactIds||[]:event.teamIds;
  const safeEvent={_id:event.eventId,title:event.title,date:event.date,time:event.time,venue:event.venue,address:event.address||'',description:event.description||''};
  const resolve=row=>{
    const person=row.hostId?people.find(p=>p.personId===row.hostId&&!p.archived&&!p.deletedAt&&visibleTeamIds.includes(p.personId)):null;
    const {_key,archived,host,...publicRow}=row;
    if(row.detailsEnabled===false){const {description,rules,hostId,place,time,...compact}=publicRow;return {...compact,host:'',hostId:''};}
    return {...publicRow,host:person?.name||(!row.hostId?String(host||''):''),hostId:person?.personId||''};
  };
  const payload=publicExperience({...config,_id:'release',enabled:true,eventId:event.eventId},safeEvent);
  if(!payload)return null;
  for(const kind of ['equipment','games'])payload[kind]=payload[kind].map(resolve);
  payload.program=payload.program.map(resolve);payload.menu=payload.menu.map(resolve);
  payload.stations=stationsFor(config).filter(s=>s.enabled!==false&&sectionAllowsStation(config,s)).map(s=>{const detailsEnabled=config.features?.stationDetails===true&&s.detailsEnabled!==false;return {id:s.id,name:s.name,kind:s.kind,functionId:s.functionId||'',description:detailsEnabled?s.description||'':'',place:detailsEnabled?s.place||'':'',offerType:s.offerType,offerId:s.offerId,contactEnabled:s.contactEnabled!==false,detailsEnabled,showImages:detailsEnabled&&s.showImages!==false,imageUrl:detailsEnabled&&s.showImages!==false?s.imageUrl||'':'',imageAlt:detailsEnabled?s.imageAlt||'':''};});
  payload.schemaVersion=config._resourceSnapshot?6:5;
  payload.team=people.filter(p=>!p.archived&&!p.deletedAt&&visibleTeamIds.includes(p.personId)).map(p=>({id:p.personId,name:p.name,role:p.role,avatarUrl:p.avatarUrl||'',affiliation:affiliationFor(p,partners)}));
  payload.map=publicMap(config.map,payload);
  return payload;
}
export async function getVisitorExperience(client,{eventId='',accessCode=''}={}){
  try{
    if(eventId)validId(eventId);
    const all=eventId&&client.runtimeOnly?[]:await eventList(client);
    const event=eventId?(client.runtimeOnly?await loadEvent(client,eventId):all.find(e=>e.eventId===eventId)):all.find(e=>e.visibility==='public'&&e.app.state==='open'&&e.app.hasRelease)||all.find(e=>e.visibility==='public'&&e.app.hasRelease)||all.find(e=>e.visibility==='public');
    if(!event||(event.visibility==='private'&&(!accessCode||accessCode!==event.accessCode)))return {status:404,error:'Dieser Abend ist nicht verfügbar. Bitte nutze den Gäste-Link deiner Veranstaltung.'};
    const release=await snapshotFor(client,event);
    if(release.state!=='open')return {status:200,state:'closed',event:{id:event.eventId,title:event.title,venue:event.venue,wallEnabled:release.config?.wall?.enabled===true,raffleEnabled:release.config?.raffle?.enabled===true,contactsEnabled:release.config?.encounters?.contactsEnabled===true},experience:null};
    if(!release.config)return {status:404,error:'Für diesen Abend sind noch keine Inhalte freigegeben.'};
    return {status:200,state:'open',experience:{...visitorPayload(release.config,{...event,...release.eventSnapshot},await peopleFor(client),await partnersFor(client)),revision:release.versionId||release._rev||release.sourceRevision||'',...(release.versionId?{releaseId:release.versionId}:{})}};
  }catch(error){return {status:[400,404].includes(error.status)?error.status:503,error:error.status===400?error.message:error.status===404?'Dieser Abend ist nicht verfügbar. Bitte nutze den Gäste-Link deiner Veranstaltung.':'Der Abend kann gerade nicht geladen werden.'};}
}
import {createReleaseStore,releaseMetadata} from './release-store.mjs';
import {RESOURCE_STATE_ID,sourceObjects,resourceSourcesVersion} from '../../shared/resources.mjs';
