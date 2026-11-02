import {parseCsv} from './catalog-csv.mjs';
import {cleanResources,cleanResource,cleanRelation} from './resources.mjs';
export const RESOURCE_CSV_FIELDS={record:'Eintrag',kind:'Art',id:'Kennung',name:'Name',description:'Beschreibung',archived:'Pausiert',imageUrl:'Bildadresse',imageAlt:'Bildbeschreibung',detailsEnabled:'Details anzeigen',required:'Betreuung erforderlich',publicContact:'Öffentliche Ansprechperson',maxPeople:'Maximale Besetzung',quantity:'Menge',equipmentRef:'Ausstattungskennung',from:'Von',to:'Zu',scope:'Gilt für',unattended:'Bewusst unbetreut',capacity:'Plätze',minutes:'Dauer in Minuten',place:'Ortshinweis',customName:'Abweichender Name',customDescription:'Abweichende Beschreibung',overrideName:'Name überschreiben',overrideDescription:'Beschreibung überschreiben',overridePlace:'Ort überschreiben',start:'Beginn in Minuten',end:'Ende in Minuten'};
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
const safe=value=>{const s=String(value??'');return /^[\s]*[=+\-@\t\r]/.test(s)||s.startsWith("'")?"'"+s:s;};
export function exportResourcesCsv(model,{template=false}={}){
 const cell=v=>'"'+safe(v).replaceAll('"','""')+'"',keys=Object.keys(RESOURCE_CSV_FIELDS);
 const rows=template?[]:[...model.nodes.map(n=>({...n,record:'Objekt'})),...model.relations.map(r=>({...r,record:'Zuordnung',capacity:r.values?.capacity,minutes:r.values?.minutes,place:r.values?.place,customName:r.values?.name,customDescription:r.values?.description,overrideName:Object.hasOwn(r.values||{},'name'),overrideDescription:Object.hasOwn(r.values||{},'description'),overridePlace:Object.hasOwn(r.values||{},'place'),start:r.window?.start,end:r.window?.end}))];
 return '\ufeff'+[keys.map(k=>cell(RESOURCE_CSV_FIELDS[k])).join(';'),...rows.map(r=>keys.map(k=>cell(typeof r[k]==='boolean'?(r[k]?'ja':'nein'):r[k])).join(';'))].join('\r\n')+'\r\n';
}
export function previewResourcesImport(current,{csv,requestKey}){
 if(!/^[a-f0-9-]{36}$/.test(requestKey||''))fail('Bitte den Import neu beginnen.');
 const {headers,rows}=parseCsv(csv,{maxRows:2500}),columns=Object.fromEntries(Object.entries(RESOURCE_CSV_FIELDS).map(([k,v])=>[k,headers.indexOf(v)]));
 for(const k of ['record','kind','id'])if(columns[k]<0)fail('Die Spalte „'+RESOURCE_CSV_FIELDS[k]+'“ fehlt. Bitte unsere CSV-Vorlage verwenden.');
 const model=structuredClone(current),changes=[],errors=[],seen=new Set();
 for(let index=0;index<rows.length;index++)try{
  const cells=rows[index],get=k=>columns[k]>=0?cells[columns[k]]:'',has=k=>columns[k]>=0&&get(k)!=='',record=get('record'),kind=get('kind');
  if(!['Objekt','Zuordnung'].includes(record))fail('Eintrag muss Objekt oder Zuordnung sein.');
  const collection=record==='Objekt'?'nodes':'relations',id=get('id')||'import-'+requestKey+'-'+(index+1),identity=collection+'/'+(collection==='nodes'?kind+'/':'')+id;
  if(seen.has(identity))fail('Diese Kennung steht mehrfach in der Datei.');seen.add(identity);
  const old=model[collection].find(n=>n.id===id&&(collection==='relations'||n.kind===kind));
  const row={...(old||{}),id,kind};
  const bool=k=>{const s=get(k).trim().toLowerCase();if(!['ja','nein','true','false','1','0'].includes(s))fail(RESOURCE_CSV_FIELDS[k]+': bitte ja oder nein eingeben.');return ['ja','true','1'].includes(s);};
  const number=k=>{if(!/^\d+$/.test(get(k)))fail(RESOURCE_CSV_FIELDS[k]+': bitte eine ganze Zahl eingeben.');return Number(get(k));};
  for(const k of collection==='nodes'?['name','description','imageUrl','imageAlt','equipmentRef']:['from','to','scope'])if(columns[k]>=0)row[k]=get(k);
  for(const k of ['archived',...(collection==='nodes'?(kind==='stand'?['detailsEnabled']:kind==='task'?['required','publicContact']:[]):kind==='requires'?['required','unattended']:[])])if(has(k))row[k]=bool(k);
  for(const k of collection==='nodes'?(kind==='task'?['maxPeople']:kind==='asset'?['quantity']:[]):kind==='needs'?['quantity']:[])if(has(k))row[k]=number(k);
  if(collection==='relations'&&kind==='offers'){
   row.values={};for(const [field,csvKey,flag]of [['name','customName','overrideName'],['description','customDescription','overrideDescription'],['place','place','overridePlace']])if(has(flag)?bool(flag):has(csvKey))row.values[field]=get(csvKey);
   for(const k of ['capacity','minutes'])if(has(k))row.values[k]=number(k);
   row.window={start:has('start')?number('start'):0,end:has('end')?number('end'):2880};
  }
  const cleaned=collection==='nodes'?cleanResource(row):cleanRelation(row);
  if(old)model[collection]=model[collection].map(n=>n===old?cleaned:n);else model[collection].push(cleaned);
  changes.push({row:index+2,id,name:cleaned.name||[cleaned.from,cleaned.to].join(' → '),action:old?(JSON.stringify(old)===JSON.stringify(cleaned)?'unchanged':'updated'):'new'});
 }catch(error){errors.push({row:index+2,message:error.message});}
 if(!errors.length)try{Object.assign(model,cleanResources(model,current.sources));}catch(error){errors.push({row:0,message:error.message});}
 return {model:errors.length?null:model,changes,errors,counts:{new:changes.filter(r=>r.action==='new').length,updated:changes.filter(r=>r.action==='updated').length,unchanged:changes.filter(r=>r.action==='unchanged').length}};
}
