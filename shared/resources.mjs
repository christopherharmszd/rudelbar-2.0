// Central definitions are independent of an evening. Resolving them never grants
// account permissions or access to private live data.
export const RESOURCE_VERSION=1;
export const RESOURCE_STATE_ID='rudel-resource-state-v1';
export async function resourceSourcesVersion(sources){
 const serialized=JSON.stringify(sources.map(n=>[n.key,n.revision,n.archived]).sort((a,b)=>a[0].localeCompare(b[0])));
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(serialized))),v=>v.toString(16).padStart(2,'0')).join('');
}
export const RESOURCE_KINDS=['stand','task','asset'];
export const CONTENT_KINDS=['equipment','games','program','menu'];
export const FUNCTIONS=Object.freeze([
 {id:'music',name:'Musikwunsch',implemented:true},
 {id:'karaoke',name:'Karaoke-Anmeldung',implemented:true},
 {id:'game',name:'Spielrunde',implemented:true},
 {id:'message',name:'Fragen & Hilfe',implemented:true},
 {id:'wall',name:'Memory Wall',implemented:true},
 {id:'play',name:'Spielpartnersuche',implemented:true},
 {id:'dating',name:'Kennenlernen',implemented:true},
 {id:'dance',name:'Tanzpartnersuche',implemented:true},
 {id:'raffle',name:'Gewinnaktion',implemented:true}
]);
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const id=value=>{if(typeof value!=='string'||!/^[a-z0-9][a-z0-9-]{0,89}$/i.test(value))fail('Ungültige Kennung.');return value;};
const text=(value,max=1000,required=false)=>{if(value!==undefined&&value!==null&&typeof value!=='string')fail('Bitte einen Text eingeben.');const s=String(value??'').trim();if(s.length>max||required&&!s)fail('Bitte Pflichtfelder und Textlängen prüfen.');return s;};
const list=(value,max=1000)=>{if(!Array.isArray(value)||value.length>max)fail('Die Liste ist ungültig oder zu groß.');return value;};
const integer=(value,min,max)=>{if(!Number.isInteger(value)||value<min||value>max)fail('Bitte eine gültige ganze Zahl eingeben.');return value;};
const boolean=(value,fallback=false)=>{if(value===undefined)return fallback;if(typeof value!=='boolean')fail('Bitte eine eindeutige Auswahl treffen.');return value;};
export const resourceKey=(kind,value)=>kind+'/'+id(value);
export function resourceRef(value){
 const parts=String(value||'').split('/');
 if(parts.length!==2||![...RESOURCE_KINDS,...CONTENT_KINDS,'person','function','occurrence'].includes(parts[0]))fail('Ungültiger Verweis.');
 return resourceKey(parts[0],parts[1]);
}
const kindOf=ref=>ref.split('/')[0];
function unique(rows,key=x=>x.id){const keys=new Set();for(const row of rows){const k=key(row);if(keys.has(k))fail('Eine Kennung wurde doppelt verwendet.');keys.add(k);}return rows;}
function image(value){
 const s=text(value,1000);
 if(s&&!/^https:\/\/cdn\.sanity\.io\/images\/[a-z0-9-]+\/[a-z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(s))fail('Bitte ein hochgeladenes Bild auswählen.');
 return s;
}
export function cleanResource(input){
 const kind=input.kind;if(!RESOURCE_KINDS.includes(kind))fail('Diese Art kann hier nicht angelegt werden.');
 const row={id:id(input.id),kind,name:text(input.name,120,true),description:text(input.description,1200),archived:boolean(input.archived),revision:text(input.revision,100)};
 if(kind==='stand')Object.assign(row,{imageUrl:image(input.imageUrl),imageAlt:text(input.imageAlt,300),detailsEnabled:boolean(input.detailsEnabled,true)});
 if(kind==='task')Object.assign(row,{required:boolean(input.required),publicContact:boolean(input.publicContact),maxPeople:integer(input.maxPeople??1,1,100)});
 if(kind==='asset')Object.assign(row,{quantity:integer(input.quantity??1,1,1000),equipmentRef:input.equipmentRef?resourceRef(input.equipmentRef):''});
 if(row.equipmentRef&&kindOf(row.equipmentRef)!=='equipment')fail('Ausstattung muss auf einen Ausstattungseintrag verweisen.');
 return row;
}
function values(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('Ungültige Abweichungen.');
 const result={};
 for(const name of ['name','description','place'])if(Object.hasOwn(input,name))result[name]=text(input[name],name==='description'?1200:name==='place'?160:120,name==='name');
 for(const name of ['capacity','minutes'])if(Object.hasOwn(input,name))result[name]=integer(input[name],name==='capacity'?1:0,name==='capacity'?30:300);
 return result;
}
const allowed={
 offers:[['stand'],CONTENT_KINDS],supports:[CONTENT_KINDS,['function']],
 needs:[CONTENT_KINDS,['asset','equipment']],
 requires:[[...CONTENT_KINDS,'stand','function','occurrence'],['task']],
 assignment:[['task'],['person']]
};
export function cleanRelation(input){
 const kind=input.kind;if(!Object.hasOwn(allowed,kind))fail('Unbekannte Beziehung.');
 const from=resourceRef(input.from),to=resourceRef(input.to);
 if(!allowed[kind][0].includes(kindOf(from))||!allowed[kind][1].includes(kindOf(to)))fail('Diese Objekte können so nicht verbunden werden.');
 const row={id:id(input.id),kind,from,to,archived:boolean(input.archived),revision:text(input.revision,100)};
 if(kind==='offers')Object.assign(row,{values:values(input.values),window:{start:integer(input.window?.start??0,0,2879),end:integer(input.window?.end??2880,1,2880)}});
 if(row.window&&row.window.end<=row.window.start)fail('Das Ende muss nach dem Beginn liegen.');
 if(kind==='needs')row.quantity=integer(input.quantity??1,1,1000);
 if(kind==='requires'){row.required=boolean(input.required,true);row.unattended=boolean(input.unattended);}
 if(kind==='assignment'){
  row.scope=input.scope?resourceRef(input.scope):'';
  if(row.scope&&!['stand','function','occurrence',...CONTENT_KINDS].includes(kindOf(row.scope)))fail('Ungültiger Geltungsbereich der Zuordnung.');
 }
 return row;
}
// Existing catalog and profile IDs remain authoritative. Names are display only.
export function sourceObjects(catalog,people=[]){
 const result=[];
 for(const kind of CONTENT_KINDS)for(const row of catalog[kind==='menu'?'drinks':kind]||[]){
  result.push({...row,sourceKind:row.kind||'',kind,id:row.id,key:resourceKey(kind,row.id),revision:catalog.revision||'',archived:row.archived===true||!!row.deletedAt});
 }
 for(const p of people)result.push({id:p.personId,key:resourceKey('person',p.personId),kind:'person',name:p.name,revision:p.revision||'',archived:p.archived===true||!!p.deletedAt});
 for(const f of FUNCTIONS)result.push({...f,kind:'function',key:resourceKey('function',f.id),revision:'function-v1-'+(f.implemented?'ready':'pending'),archived:false});
 return result;
}
export function cleanResources(input,sources=[]){
 if(input.schemaVersion!==undefined&&input.schemaVersion!==RESOURCE_VERSION)fail('Diese Fassung wird noch nicht unterstützt.');
 const nodes=unique(list(input.nodes||[],500).map(cleanResource),n=>resourceKey(n.kind,n.id));
 const relations=unique(list(input.relations||[],2000).map(cleanRelation));
 const known=new Set([...sources.map(n=>n.key),...nodes.map(n=>resourceKey(n.kind,n.id)),...relations.filter(r=>r.kind==='offers').map(r=>resourceKey('occurrence',r.id))]);
 for(const node of nodes)if(node.equipmentRef&&!known.has(node.equipmentRef))fail('Die verknüpfte Ausstattung fehlt.');
 for(const r of relations)for(const ref of [r.from,r.to,r.scope].filter(Boolean))if(!known.has(ref))fail('Eine Beziehung verweist auf ein nicht mehr vorhandenes Objekt: '+ref);
 unique(relations.filter(r=>!r.archived&&r.kind!=='offers'),r=>[r.kind,r.from,r.to,r.scope||''].join('|'));
 return {schemaVersion:RESOURCE_VERSION,nodes,relations};
}
export function cleanResourceSelection(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('Ungültige Auswahl der zentralen Inhalte.');
 const standIds=unique(list(input.standIds||[],500).map(id),x=>x);
 const occurrenceIds=input.occurrenceIds==null?null:unique(list(input.occurrenceIds,2000).map(id),x=>x);
 const overrides=unique(list(input.overrides||[],2000).map(row=>{
  const occurrenceId=id(row.occurrenceId);
  const staffing=unique(list(row.staffing||[],100).map(s=>{
   if(!['inherit','assigned','unattended'].includes(s.mode))fail('Bitte die Betreuung auswählen.');
   const taskId=id(s.taskId);
   const personIds=unique(list(s.personIds||[],100).map(id),x=>x);
   if(s.mode!=='assigned'&&personIds.length||s.mode==='assigned'&&!personIds.length)fail('Bitte die Betreuung eindeutig auswählen.');
   return {taskId,mode:s.mode,personIds};
  }),s=>s.taskId);
  return {occurrenceId,values:values(row.values),staffing};
 }),r=>r.occurrenceId);
 const disabledFunctions=unique(list(input.disabledFunctions||[],FUNCTIONS.length).map(id),x=>x);
 if(disabledFunctions.some(v=>!FUNCTIONS.some(f=>f.id===v)))fail('Unbekannte Funktion.');
 return {standIds,occurrenceIds,overrides,disabledFunctions};
}
export function resourceSelection(input={},model){
 const selection=cleanResourceSelection({...input,standIds:input.standIds===undefined?model.nodes.filter(n=>n.kind==='stand'&&!n.archived).map(n=>n.id):input.standIds});
 const stands=new Set(model.nodes.filter(n=>n.kind==='stand').map(n=>n.id));
 const occurrences=new Set(model.relations.filter(r=>r.kind==='offers').map(r=>r.id));
 if(selection.standIds.some(v=>!stands.has(v))||selection.occurrenceIds?.some(v=>!occurrences.has(v)))fail('Ein ausgewählter Stand oder eine Durchführung fehlt.');
 for(const o of selection.overrides){
  if(!occurrences.has(o.occurrenceId))fail('Die abweichende Durchführung fehlt.');
  if(o.staffing.some(s=>!model.nodes.some(n=>n.kind==='task'&&n.id===s.taskId)))fail('Die Aufgabe fehlt.');
 }
 return selection;
}
// Resolve the same task priorities for content occurrences and independent hosted offers.
function resolveStaffing({objects,relations,scopes,override,reference,issue}){
  const requirements=relations.filter(r=>r.kind==='requires'&&scopes.has(r.from));
  const tasks=[...new Set(requirements.map(r=>r.to))];
  return tasks.map(taskKey=>{
   const task=objects.get(taskKey),needs=requirements.filter(r=>r.to===taskKey);
   const topScore=Math.max(...needs.map(r=>scopes.get(r.from))),top=needs.filter(r=>scopes.get(r.from)===topScore);
   const taskIssues=[];
   const conflict=message=>{taskIssues.push(message);issue('staffing-conflict',message,[reference,taskKey]);};
   if(task.archived)conflict('Die Aufgabe '+task.name+' ist archiviert.');
   if(top.some(r=>r.unattended!==top[0].unattended||r.required!==top[0].required))conflict('Widersprüchliche Vorgaben für '+task.name+'.');
   let mode=top[0].unattended?'unattended':'assigned',personIds=[],source=top.map(r=>r.id),provenance=[];
   const manual=override?.staffing.find(s=>s.taskId===task.id&&s.mode!=='inherit');
   if(manual){mode=manual.mode;personIds=manual.personIds;source=['evening'];}
   else if(mode!=='unattended'){
    const assignments=relations.filter(r=>r.kind==='assignment'&&r.from===taskKey&&(!r.scope||scopes.has(r.scope)));
    const priority=assignments.length?Math.max(...assignments.map(r=>r.scope?scopes.get(r.scope):0)):-1;
    const chosen=assignments.filter(r=>(r.scope?scopes.get(r.scope):0)===priority);
    personIds=[...new Set(chosen.map(r=>r.to.slice(7)))];source=chosen.map(r=>r.id);
    provenance=assignments.map(r=>({relationId:r.id,scope:r.scope||'general',personId:r.to.slice(7),effective:chosen.includes(r)}));
   }
   const required=task.required||top.some(r=>r.required);
   if(mode!=='unattended'&&required&&!personIds.length)conflict('Für '+task.name+' fehlt die Betreuung.');
   if(personIds.length>task.maxPeople)conflict('Für '+task.name+' sind mehrere gleichrangige Zuständigkeiten eingetragen.');
   for(const pid of personIds)if(!objects.has('person/'+pid)||objects.get('person/'+pid).archived)conflict('Eine zugeordnete Person ist nicht verfügbar.');
   return {taskId:task.id,name:task.name,mode,required,publicContact:task.publicContact,personIds,source,provenance,issues:taskIssues};
  });
}
export function resolveStandStaffing(input,sources,standId,functionId=''){
 const model=cleanResources(input,sources),objects=new Map([...sources,...model.nodes.map(n=>({...n,key:resourceKey(n.kind,n.id)}))].map(n=>[n.key,n]));
 const issues=[],issue=(code,message,refs)=>issues.push({code,message,refs}),stand=standId?objects.get('stand/'+standId):null;
 if(standId&&(!stand||stand.archived))issue('unavailable-stand','Der verknüpfte Stand fehlt oder ist archiviert.',[standId]);
 const scopes=new Map([...(stand&&!stand.archived?[[stand.key,20]]:[]),...(functionId?[[resourceKey('function',functionId),20]]:[])]);
 const tasks=resolveStaffing({objects,relations:model.relations.filter(r=>!r.archived),scopes,reference:standId||functionId,issue});
 return {stand,tasks,issues};
}
export function resolveResources(input,sources=[],selection={}){
 const model=cleanResources(input,sources),selected=resourceSelection(selection,model);
 const objects=new Map([...sources,...model.nodes.map(n=>({...n,key:resourceKey(n.kind,n.id)}))].map(n=>[n.key,n]));
 const relations=model.relations.filter(r=>!r.archived),issues=[],warnings=[],occurrences=[];
 const issue=(code,message,refs)=>issues.push({code,message,refs});
 function staffing(offer,content,fn,override){
  return resolveStaffing({objects,relations,scopes:new Map([[content.key,10],[offer.from,20],...(fn?[[fn.key,20]]:[]),[resourceKey('occurrence',offer.id),30]]),override,reference:offer.id,issue});
 }
 for(const offer of relations.filter(r=>r.kind==='offers'&&selected.standIds.includes(r.from.slice(6))&&(selected.occurrenceIds===null||selected.occurrenceIds.includes(r.id)))){
  const stand=objects.get(offer.from),content=objects.get(offer.to),override=selected.overrides.find(r=>r.occurrenceId===offer.id);
  if(stand.archived||content.archived){issue('archived-resource','Ein ausgewählter Stand oder Inhalt ist archiviert.',[offer.id,offer.from,offer.to]);continue;}
  const value={},provenance={};
  for(const key of ['name','description','capacity','minutes','place']){
   const tiers=[{source:content.key,revision:content.revision||'',value:content[key]},...(Object.hasOwn(offer.values,key)?[{source:offer.id,revision:offer.revision,value:offer.values[key]}]:[]),...(override&&Object.hasOwn(override.values,key)?[{source:'evening',value:override.values[key]}]:[])].filter(t=>t.value!==undefined);
   if(tiers.length){value[key]=tiers.at(-1).value;provenance[key]=tiers.map((t,i)=>({...t,effective:i===tiers.length-1}));}
  }
  const functions=relations.filter(r=>r.kind==='supports'&&r.from===content.key&&!selected.disabledFunctions.includes(r.to.slice(9))).map(r=>{
   const fn=objects.get(r.to);
   if(!fn.implemented)issue('function-unavailable','Die Funktion '+fn.name+' ist noch nicht verfügbar.',[offer.id,fn.key]);
   return {id:fn.id,name:fn.name,implemented:fn.implemented,tasks:staffing(offer,content,fn,override)};
  });
  const tasks=staffing(offer,content,null,override),needs=relations.filter(r=>r.kind==='needs'&&r.from===content.key).map(r=>({resourceKey:r.to,quantity:r.quantity,relationId:r.id}));
  if(!functions.length)warnings.push({code:'no-function',message:'Für '+content.name+' ist keine interaktive Funktion ausgewählt.',refs:[offer.id]});
  occurrences.push({id:offer.id,standId:stand.id,standName:stand.name,contentKey:content.key,...value,provenance,functions,tasks,needs,window:offer.window});
 }
 // Equal window boundaries don't overlap. Physical inventory is not duplicated.
 const resourceKeys=[...new Set(occurrences.flatMap(o=>o.needs.map(n=>n.resourceKey)))];
 for(const key of resourceKeys){
  const resource=objects.get(key),limit=resource.kind==='asset'?resource.quantity:1;
  if(resource.archived)issue('archived-resource','Benötigte Ausstattung ist archiviert.',[key]);
  const usages=occurrences.flatMap(o=>o.needs.filter(n=>n.resourceKey===key).map(n=>({id:o.id,start:o.window.start,end:o.window.end,quantity:n.quantity})));
  for(const point of [...new Set(usages.map(u=>u.start))]){
   const active=usages.filter(u=>u.start<=point&&u.end>point),count=active.reduce((sum,u)=>sum+u.quantity,0);
   if(count>limit){issue('resource-overbooked','Die Ausstattung '+resource.name+' wird gleichzeitig '+count+'-mal benötigt, verfügbar: '+limit+'.',[key,...active.map(u=>u.id)]);break;}
  }
 }
 const distinctIssues=[...new Map(issues.map(i=>[JSON.stringify(i),i])).values()];
 return {schemaVersion:RESOURCE_VERSION,ok:distinctIssues.length===0,selection:selected,occurrences,issues:distinctIssues,warnings,sourceRevisions:Object.fromEntries([...objects].map(([key,node])=>[key,node.revision||'']))};
}
