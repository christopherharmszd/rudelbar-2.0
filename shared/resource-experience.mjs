import {resolveResources,sourceObjects} from './resources.mjs';
import {cleanMap} from './village-map.mjs';
const distinct=values=>[...new Set(values)].sort();
export async function runtimeResourceId(prefix,id){
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id)));
 return prefix+'-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('').slice(0,32);
}
// Compile at preview/publication time. The returned values are frozen into the
// release; public read paths do not reach back into mutable central definitions.
export async function compileResourceExperience({base,model,catalog,people,eventId,teamIds=[],sourcesVersion=''}){
 if(!base.resourceSelection)return {config:structuredClone(base),teamIds:[...teamIds],issues:[],warnings:[],ok:true,resolution:null};
 const resolution=resolveResources(model,sourceObjects(catalog,people),base.resourceSelection);
 const config=structuredClone(base),issues=[...resolution.issues],warnings=[...resolution.warnings],runtime=[];
 const allStaff=new Set(teamIds),publicPeople=new Set();
 const tasksFor=occurrence=>[...occurrence.tasks,...occurrence.functions.flatMap(f=>f.tasks)];
 for(const o of resolution.occurrences)for(const task of tasksFor(o))for(const pid of task.personIds){allStaff.add(pid);if(task.publicContact)publicPeople.add(pid);}
 for(const o of resolution.occurrences){
  const [type,sourceId]=o.contentKey.split('/'),content=catalog[type==='menu'?'drinks':type].find(r=>r.id===sourceId);
  const alias=await runtimeResourceId('offer',o.id),publicTasks=tasksFor(o).filter(t=>t.publicContact);
  const row={...content,id:alias,_key:alias,sourceId,occurrenceId:o.id,standId:o.standId,name:o.name,description:o.description??content.description,place:o.place||o.standName,hostId:publicTasks.flatMap(t=>t.personIds)[0]||'',...(o.capacity!==undefined?{capacity:o.capacity}:{}),...(o.minutes!==undefined?{minutes:o.minutes}:{})};
  const stations=[];
  for(const f of o.functions.filter(f=>f.implemented)){
   const stationId=await runtimeResourceId('station',o.id+'/'+f.id),operatorIds=distinct([...o.tasks,...f.tasks].flatMap(t=>t.personIds));
   const kind=['music','karaoke'].includes(f.id)?f.id:'message';
   const station={id:stationId,name:o.name+' · '+f.name,kind,description:row.description||'',place:o.standName,operatorIds,assignmentRequired:operatorIds.length===0,offerType:type,offerId:alias,occurrenceId:o.id,functionId:f.id,enabled:true,contactEnabled:['music','karaoke','message'].includes(f.id),detailsEnabled:true,showImages:true,allowOperatorPhotos:false,imageUrl:content.imageUrl||'',imageAlt:content.imageAlt||''};
   stations.push(station);config.stations.push(station);
  }
  config[type].push(row);runtime.push({...o,runtimeOfferId:alias,type,stations});
 }
 const known=new Map(model.nodes.filter(n=>n.kind==='stand').map(n=>[n.id,n]));
 const map=structuredClone(config.map);
 if(map?.layout)map.layout.booths=map.layout.booths.flatMap(b=>{
  if(!b.standId)return [b];
  if(!resolution.selection.standIds.includes(b.standId))return [];
  const stand=known.get(b.standId),entries=runtime.filter(o=>o.standId===b.standId);
  if(!stand||stand.archived)return [];
  const contactIds=distinct(entries.flatMap(o=>tasksFor(o).filter(t=>t.publicContact).flatMap(t=>t.personIds)));
  return [{...b,...(!b.overrideStandDetails?{title:stand.name,description:stand.description,imageUrl:stand.imageUrl,imageAlt:stand.imageAlt}:{}),personIds:contactIds,offers:entries.map(o=>({type:o.type,id:o.runtimeOfferId,stationIds:o.stations.map(s=>s.id),matching:o.functions.some(f=>f.id==='game')&&o.capacity>=2}))}];
 });
 config.map=cleanMap(map,config,people,[...allStaff]);
 const placed=config.map.layout.booths.filter(b=>b.visible!==false&&b.standId).map(b=>b.standId);
 for(const standId of distinct(placed))if(placed.filter(id=>id===standId).length>1)issues.push({code:'duplicate-stand-placement',message:'Der Stand '+known.get(standId)?.name+' ist mehrfach auf demselben Ortsplan platziert.',refs:[standId]});
 for(const o of runtime)if(o.functions.some(f=>f.id==='wall')&&!config.wall?.enabled)issues.push({code:'wall-not-enabled',message:o.name+': Die Memory Wall in dieser Vorlage bewusst einschalten und ihre Freigaben einrichten oder die Funktion abwählen.',refs:[o.id,'wall']});
 for(const o of runtime)if(o.functions.some(f=>f.id==='game')&&(!config.map.enabled||!config.map.layout.booths.some(b=>b.visible!==false&&b.standId===o.standId))){
  issues.push({code:'missing-map-placement',message:o.name+': Für Spielrunden muss der Stand auf der eingeschalteten Karte sichtbar sein.',refs:[o.id,o.standId]});
 }
 config.eventId=eventId;
 config._staffIds=distinct([...allStaff]);
 config._publicContactIds=distinct([...publicPeople]);
 config._resourceSnapshot={schemaVersion:1,resourceRevision:model.revision||'',sourcesVersion,sourceRevisions:resolution.sourceRevisions,occurrences:runtime.map(o=>({id:o.id,standId:o.standId,contentKey:o.contentKey,runtimeOfferId:o.runtimeOfferId,functions:o.functions.map(f=>f.id)}))};
 const selectedCategories=new Set(['equipment','games','program','menu'].flatMap(k=>config[k].map(r=>r.categoryId)));
 for(const cid of selectedCategories)if(!config.sections.some(s=>s.categoryId===cid)){
  const category=catalog.categories.find(c=>c.id===cid);
  if(category)config.sections.push({id:cid,categoryId:cid,title:category.name,enabled:!category.archived,showImages:true,detailsEnabled:true});
 }
 return {config,teamIds:config._staffIds,resolution,issues,warnings,ok:issues.length===0};
}
