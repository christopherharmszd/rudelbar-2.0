import {validId,cleanExperience,defaultExperience,EXPERIENCE_TYPE,experienceId} from '../../shared/experience.mjs';
import {PERSON_TYPE,APP_EVENT_TYPE,catalogFor,peopleFor,eventList,loadEvent,configurationFor,cleanEvent,eventDocId,strip} from './abend-service.mjs';
import {editsContent,managesEvent,requirePermission} from './permissions.mjs';
export const TEMPLATE_TYPE='rudelAppTemplate';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const text=(v,max=120,required=false)=>{const s=String(v??'').trim();if(s.length>max||required&&!s)fail('Bitte Name und Textlängen prüfen.');return s;};
export function createPlanning(client){
 const templates=async()=> (await client.list(TEMPLATE_TYPE)).map(d=>({...strip(d),revision:d._rev||''}));
 async function getTemplate(id){validId(id);const row=await client.getDocument('drafts.'+id);if(!row||row._type!==TEMPLATE_TYPE)fail('Vorlage nicht gefunden.',404);return {...strip(row),revision:row._rev};}
 async function saveTemplate(user,input,id){
  requirePermission(editsContent(user));const previous=id?await getTemplate(id):null;
  if(previous&&input.revision!==previous.revision)fail('Die Vorlage wurde inzwischen geändert. Bitte aktualisieren.',409);
  id=id||'template-'+crypto.randomUUID();let config=input.config||previous?.config||defaultExperience(id),teamIds=input.teamIds||previous?.teamIds||[];
  if(input.eventId){const event=await loadEvent(client,input.eventId);config=(await configurationFor(client,input.eventId)).experience;teamIds=event.teamIds;}
  const people=await peopleFor(client);if(!Array.isArray(teamIds)||teamIds.length>100||teamIds.some(pid=>!people.some(p=>p.personId===pid&&!p.archived)))fail('Bitte nur aktive Personen als Standardteam auswählen.');
  const fields={templateId:id,name:text(input.name??previous?.name,120,true),description:text(input.description??previous?.description,1000),teamIds:[...new Set(teamIds.map(validId))],config:cleanExperience(config,await catalogFor(client),id,people,teamIds),archived:input.archived??previous?.archived??false};
  const doc=await client.savePrivate(TEMPLATE_TYPE,id,fields,previous?.revision);return {...strip(doc),revision:doc._rev};
 }
 async function source(templateId,eventId){
  const template=await getTemplate(templateId);if(template.archived)fail('Diese Vorlage ist archiviert.');
  const people=await peopleFor(client),active=new Set(people.filter(p=>!p.archived).map(p=>p.personId)),teamIds=template.teamIds.filter(id=>active.has(id)),removed=template.teamIds.length-teamIds.length;
  const config=structuredClone(template.config);for(const k of ['equipment','games','program'])config[k]=(config[k]||[]).map(r=>({...r,hostId:teamIds.includes(r.hostId)?r.hostId:''}));config.stations=(config.stations||[]).map(s=>{const ids=(s.operatorIds||[]).filter(id=>teamIds.includes(id));return {...s,operatorIds:ids,assignmentRequired:s.assignmentRequired||!!s.operatorIds?.length&&!ids.length};});
  return {template,teamIds,config:cleanExperience(config,await catalogFor(client),eventId,people,teamIds),warnings:removed?['Nicht mehr aktive Personen wurden nicht in das Abendteam übernommen.']:[]};
 }
 async function linkedFields(input){
  if(!input.linkedEventId)return input;
  const web=(await (client.website||client).list('rudelEvent')).find(e=>e._id===input.linkedEventId&&!e.archived);if(!web)fail('Dieser öffentliche Termin ist nicht mehr verfügbar.');
  return {...input,title:input.title||web.title,date:input.date||web.date,time:input.time||web.time,venue:input.venue||web.venue,address:input.address||web.address,description:input.description||web.description};
 }
 async function createEvening(user,input){
  requirePermission(editsContent(user));const id='app-'+crypto.randomUUID(),data=await linkedFields(input),selection=input.templateId?await source(input.templateId,id):null;
  const event=cleanEvent({...data,teamIds:selection?.teamIds||data.teamIds||[]},id),config=selection?.config||defaultExperience(id);
  if(selection){event.sourceTemplateId=selection.template.templateId;event.sourceTemplateRevision=selection.template.revision;}
  await client.commitPrivate([{type:APP_EVENT_TYPE,id:eventDocId(id),fields:event},{type:EXPERIENCE_TYPE,id:experienceId(id),fields:config}]);
  return {id,event:await loadEvent(client,id),warnings:selection?.warnings||[]};
 }
 async function applyTemplate(user,eventId,input){
  const event=await loadEvent(client,eventId);requirePermission(managesEvent(user,eventId)&&(editsContent(user)||event.teamIds.includes(user.personId)));
  const current=await configurationFor(client,eventId);if((current.experience.revision||'')!==(input.revision||'')||event.revision!==(input.eventRevision||''))fail('Die Vorbereitung wurde inzwischen geändert. Bitte aktualisieren.',409);
  const selected=await source(validId(input.templateId),eventId),previous=await client.getDocument('drafts.'+eventDocId(eventId));
  const fields=cleanEvent({...event,teamIds:selected.teamIds},eventId,previous||event);fields.sourceTemplateId=selected.template.templateId;fields.sourceTemplateRevision=selected.template.revision;
  await client.commitPrivate([{type:APP_EVENT_TYPE,id:eventDocId(eventId),fields,revision:previous?._rev},{type:EXPERIENCE_TYPE,id:experienceId(eventId),fields:selected.config,revision:current.experience.revision||undefined}]);
  return {ok:true,warnings:selected.warnings};
 }
 return {templates,getTemplate,saveTemplate,createEvening,applyTemplate,linkedFields};
}
