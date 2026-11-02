import {exportResourcesCsv,previewResourcesImport} from '../../shared/resources-csv.mjs';
import {revisionToken} from './evening-review.mjs';
import {cleanResources,resolveResources,sourceObjects,resourceKey,RESOURCE_VERSION,RESOURCE_STATE_ID,resourceSourcesVersion} from '../../shared/resources.mjs';
export {RESOURCE_STATE_ID} from '../../shared/resources.mjs';
import {compileResourceExperience} from '../../shared/resource-experience.mjs';
import {catalogFor,peopleFor,strip} from './abend-service.mjs';
import {editsContent,requirePermission} from './permissions.mjs';
export const RESOURCE_NODE_TYPE='rudelResource';
export const RESOURCE_RELATION_TYPE='rudelRelationship';
export const RESOURCE_STATE_TYPE='rudelResourceState';
export const nodeDocumentId=n=>'rudel-resource-'+n.kind+'-'+n.id;
export const relationDocumentId=r=>'rudel-relation-'+r.id;
const fail=(message,status=409)=>{throw Object.assign(new Error(message),{status});};
const sorted=value=>JSON.stringify(value);
export const resourcesVersion=resourceSourcesVersion;
export function createResources(client){
 async function read(){
  const [state,nodeDocs,relationDocs,catalog,people]=await Promise.all([
   client.getDocument('drafts.'+RESOURCE_STATE_ID),client.list(RESOURCE_NODE_TYPE),client.list(RESOURCE_RELATION_TYPE),
   catalogFor(client),peopleFor(client,{includeDeleted:true})
  ]);
  const sources=sourceObjects(catalog,people);
  const nodes=nodeDocs.map(d=>({...strip(d),id:d.id,revision:d._rev||''}));
  const relations=relationDocs.map(d=>({...strip(d),id:d.id,revision:d._rev||''}));
  const model=cleanResources({schemaVersion:RESOURCE_VERSION,nodes,relations},sources);
  return {resources:{...model,revision:state?._rev||'',sourcesVersion:await resourcesVersion(sources),sources},catalog,people};
 }
 async function load(){return (await read()).resources;}
 async function compile(base,event){
  if(!base.resourceSelection)return compileResourceExperience({base,eventId:event.eventId,teamIds:event.teamIds||[]});
  const {resources,catalog,people}=await read();
  return compileResourceExperience({base,model:resources,catalog,people,eventId:event.eventId,teamIds:event.teamIds||[],sourcesVersion:resources.sourcesVersion});
 }
 async function describe(base,event){
  try{
   const result=await compile(base,event);
   return {ok:result.ok,issues:result.issues,warnings:result.warnings,resolution:result.resolution,teamIds:result.teamIds,contentsCount:['equipment','games','program','menu'].reduce((sum,key)=>sum+(result.config[key]||[]).length,0),stations:(result.config.stations||[]).filter(s=>s.occurrenceId).map(({id,name,kind,operatorIds,occurrenceId,functionId})=>({id,name,kind,operatorIds,occurrenceId,functionId})),version:result.config._resourceSnapshot?{resourceRevision:result.config._resourceSnapshot.resourceRevision,sourcesVersion:result.config._resourceSnapshot.sourcesVersion}:null};
  }catch(error){
   if(![400,409].includes(error.status))throw error;
   return {ok:false,issues:[{code:'invalid-resource-reference',message:error.message,refs:[]}],warnings:[],resolution:null,teamIds:event.teamIds||[],version:null};
  }
 }
 async function save(user,input,{extraChanges=[]}={}){
  requirePermission(editsContent(user));
  const current=await load();
  if(input.revision!==current.revision||input.sourcesVersion!==current.sourcesVersion)fail('Inhalte oder Zuordnungen wurden inzwischen geändert. Bitte neu laden.');
  const next=cleanResources(input,current.sources),changes=[];
  for(const [rows,oldRows,type,key,documentId]of [
   [next.nodes,current.nodes,RESOURCE_NODE_TYPE,n=>resourceKey(n.kind,n.id),nodeDocumentId],
   [next.relations,current.relations,RESOURCE_RELATION_TYPE,n=>n.id,relationDocumentId]
  ]){
   const oldByKey=new Map(oldRows.map(row=>[key(row),row]));
   for(const old of oldRows)if(!rows.some(row=>key(row)===key(old)))fail('Verwendete Einträge bleiben erhalten. Bitte zuerst archivieren, statt sie aus der Liste zu entfernen.');
   for(const row of rows){
    const old=oldByKey.get(key(row));
    if(old&&row.revision!==old.revision||!old&&row.revision)fail('Ein Eintrag wurde inzwischen geändert. Bitte neu laden.');
    const {revision,...fields}=row;
    const oldFields=old?Object.fromEntries(Object.entries(old).filter(([k])=>k!=='revision')):null;
    if(!old||sorted(fields)!==sorted(oldFields))changes.push({type,id:documentId(row),fields,...(old?{revision:old.revision}:{})});
   }
  }
  if(changes.length)changes.unshift({type:RESOURCE_STATE_TYPE,id:RESOURCE_STATE_ID,fields:{schemaVersion:RESOURCE_VERSION,changedAt:new Date().toISOString()},...(current.revision?{revision:current.revision}:{})});
  if(changes.length||extraChanges.length)await client.commitPrivate([...changes,...extraChanges]);
  return load();
 }
 async function preview(user,input={}){
  requirePermission(editsContent(user)||(user.roles||[]).some(r=>r.role==='manager')&&!input.model);
  const current=await load();
  if(input.sourcesVersion!==undefined&&input.sourcesVersion!==current.sourcesVersion||input.revision!==undefined&&input.revision!==current.revision)fail('Die Grundlage wurde inzwischen geändert. Bitte neu laden.');
  const model=input.model?cleanResources(input.model,current.sources):current;
  return {...resolveResources(model,current.sources,input.selection||{}),revision:current.revision,sourcesVersion:current.sourcesVersion};
 }
 return {load,save,preview,compile,describe};
}
export async function resourcesApi(request,{client,user,json,data}){
 requirePermission(editsContent(user)||request.method==='GET'&&(user.roles||[]).some(r=>r.role==='manager'));
 const url=new URL(request.url),path=url.pathname,service=createResources(client);
 if(path.startsWith('/api/abend/resources/csv')){
  const current=await service.load();
  if(request.method==='GET')return new Response(exportResourcesCsv(current,{template:url.searchParams.has('template')}),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="rudelbar-zuordnungen.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  const input=await data(request);
  if(!/^[a-f0-9-]{36}$/.test(input.requestKey||''))return json(400,{error:'Bitte den Import neu beginnen.'});
  const hash=await revisionToken({csv:input.csv,requestKey:input.requestKey}),receiptId='rudel-resource-import-'+input.requestKey;
  if(path.endsWith('/apply')){const old=await client.getDocument('drafts.'+receiptId);if(old){if(old.hash!==hash)return json(409,{error:'Die Importkennung gehört zu einer anderen Datei.'});return json(200,{ok:true,replayed:true,resources:current,counts:old.counts});}}
  if(input.revision!==current.revision||input.sourcesVersion!==current.sourcesVersion)return json(409,{error:'Die Grundlage wurde geändert. Bitte die Vorschau neu prüfen.'});
  const {model,...preview}=previewResourcesImport(current,input);
  if(path.endsWith('/preview'))return json(200,{...preview,hash});
  if(!path.endsWith('/apply'))return json(404,{error:'Nicht gefunden.'});
  if(preview.errors.length||hash!==input.hash)return json(400,{error:'Bitte Datei und Vorschau zuerst prüfen.',errors:preview.errors});
  const resources=await service.save(user,model,{extraChanges:[{type:'rudelResourceImport',id:receiptId,fields:{hash,counts:preview.counts,createdAt:new Date().toISOString(),actor:user.accountId||'legacy-redaktion'}}]});
  return json(200,{ok:true,resources,counts:preview.counts});
 }
 if(path==='/api/abend/resources'){
  if(request.method==='GET')return json(200,{resources:await service.load()});
  if(request.method==='PUT')return json(200,{resources:await service.save(user,await data(request))});
 }
 if(path==='/api/abend/resources/resolve'&&request.method==='POST')return json(200,await service.preview(user,await data(request)));
 return json(405,{error:'Diese Aktion ist nicht verfügbar.'});
}
