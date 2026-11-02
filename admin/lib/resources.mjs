import {cleanResources,resolveResources,sourceObjects,resourceKey,RESOURCE_VERSION} from '../../shared/resources.mjs';
import {catalogFor,peopleFor,strip} from './abend-service.mjs';
import {editsContent,requirePermission} from './permissions.mjs';
export const RESOURCE_NODE_TYPE='rudelResource';
export const RESOURCE_RELATION_TYPE='rudelRelationship';
export const RESOURCE_STATE_TYPE='rudelResourceState';
export const RESOURCE_STATE_ID='rudel-resource-state-v1';
export const nodeDocumentId=n=>'rudel-resource-'+n.kind+'-'+n.id;
export const relationDocumentId=r=>'rudel-relation-'+r.id;
const fail=(message,status=409)=>{throw Object.assign(new Error(message),{status});};
const sorted=value=>JSON.stringify(value);
export async function resourcesVersion(sources){
 const text=JSON.stringify(sources.map(n=>[n.key,n.revision,n.archived]).sort((a,b)=>a[0].localeCompare(b[0])));
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),v=>v.toString(16).padStart(2,'0')).join('');
}
export function createResources(client){
 async function load(){
  const [state,nodeDocs,relationDocs,catalog,people]=await Promise.all([
   client.getDocument('drafts.'+RESOURCE_STATE_ID),client.list(RESOURCE_NODE_TYPE),client.list(RESOURCE_RELATION_TYPE),
   catalogFor(client),peopleFor(client,{includeDeleted:true})
  ]);
  const sources=sourceObjects(catalog,people);
  const nodes=nodeDocs.map(d=>({...strip(d),id:d.id,revision:d._rev||''}));
  const relations=relationDocs.map(d=>({...strip(d),id:d.id,revision:d._rev||''}));
  const model=cleanResources({schemaVersion:RESOURCE_VERSION,nodes,relations},sources);
  return {...model,revision:state?._rev||'',sourcesVersion:await resourcesVersion(sources),sources};
 }
 async function save(user,input){
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
  if(changes.length){
   changes.unshift({type:RESOURCE_STATE_TYPE,id:RESOURCE_STATE_ID,fields:{schemaVersion:RESOURCE_VERSION,changedAt:new Date().toISOString()},...(current.revision?{revision:current.revision}:{})});
   await client.commitPrivate(changes);
  }
  return load();
 }
 async function preview(user,input={}){
  requirePermission(editsContent(user));
  const current=await load();
  if(input.sourcesVersion!==undefined&&input.sourcesVersion!==current.sourcesVersion||input.revision!==undefined&&input.revision!==current.revision)fail('Die Grundlage wurde inzwischen geändert. Bitte neu laden.');
  const model=input.model?cleanResources(input.model,current.sources):current;
  return {...resolveResources(model,current.sources,input.selection||{}),revision:current.revision,sourcesVersion:current.sourcesVersion};
 }
 return {load,save,preview};
}
export async function resourcesApi(request,{client,user,json,data}){
 requirePermission(editsContent(user));
 const path=new URL(request.url).pathname,service=createResources(client);
 if(path==='/api/abend/resources'){
  if(request.method==='GET')return json(200,{resources:await service.load()});
  if(request.method==='PUT')return json(200,{resources:await service.save(user,await data(request))});
 }
 if(path==='/api/abend/resources/resolve'&&request.method==='POST')return json(200,await service.preview(user,await data(request)));
 return json(405,{error:'Diese Aktion ist nicht verfügbar.'});
}
