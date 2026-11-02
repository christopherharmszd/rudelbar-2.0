import {emptyMap,cleanMap,pruneMapPeople} from './village-map.mjs';
import {cleanResourceSelection} from './resources.mjs';
import {attachCategories,sectionsFor,categoryId} from './content-model.mjs';
export {sectionsFor} from './content-model.mjs';
export const CATALOG_ID = 'rudel-app-library-v1';
export const EXPERIENCE_TYPE = 'rudelAppExperience';
export const experienceId = id => `rudel-app-experience-${validId(id)}`;
const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };
export function validId(value) { const id=String(value||''); if(!/^[a-z0-9][a-z0-9-]{0,89}$/i.test(id))fail('Ungültige Kennung.'); return id; }
const text=(value,max=160,required=false)=>{const s=String(value??'').trim();if(s.length>max||(required&&!s))fail('Bitte alle Pflichtfelder ausfüllen und die Textlängen beachten.');return s;};
const integer=(value,min,max)=>{const n=Number(value);if(!Number.isInteger(n)||n<min||n>max)fail(`Bitte eine ganze Zahl zwischen ${min} und ${max} eingeben.`);return n;};
const array=(value,max=100)=>{if(!Array.isArray(value)||value.length>max)fail('Die Liste ist ungültig oder zu lang.');return value;};
const image=value=>{const url=text(value,1000);if(url&&!/^https:\/\/cdn\.sanity\.io\/images\/[a-z0-9-]+\/[a-z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(url))fail('Bitte ein hochgeladenes Sanity-Bild verwenden.');return url;};
function unique(items){const seen=new Set();for(const item of items){if(seen.has(item.id))fail('Kennungen dürfen in einer Liste nicht doppelt vorkommen.');seen.add(item.id);}return items;}

export const DEFAULT_CATALOG={
  equipment:[{id:'kicker-1',name:'Kicker 1',kind:'kicker',capacity:4,description:'Eine entspannte Runde am Kicker.'},{id:'kicker-2',name:'Kicker 2',kind:'kicker',capacity:4,description:'Ein zweiter Tisch zum gemeinsamen Spielen.'}],
  games:[{id:'kniffel',name:'Kniffel',capacity:5,minutes:30,description:'Würfelbecher, Spielblock und Zeit zum Erklären.',rules:'Würfelt gemeinsam und besprecht die Wertungen am Tisch.'},{id:'skat',name:'Skat',capacity:3,minutes:30,description:'Eine gemeinsame Skatrunde.',rules:'Vor dem ersten Blatt besprecht ihr die Regeln und die Wertung.'},{id:'poker',name:'Poker',capacity:6,minutes:45,description:'Eine gemütliche Runde mit Spielchips.',rules:'Die Runde erklärt den Ablauf und die Spielchip-Regeln vor Ort.'}],
  program:[{id:'dj',name:'DJ & Wunschmusik',category:'Musik & Bühne',kind:'dj',description:'Musik, die uns zusammenbringt.'},{id:'karaoke',name:'Karaoke',category:'Musik & Bühne',kind:'karaoke',description:'Allein, als Duett oder mit deiner Gruppe.'},{id:'band',name:'Live-Musik',category:'Musik & Bühne',kind:'other',description:''}],
  drinks:[{id:'wasser',name:'Wasser',category:'Alkoholfrei',unit:'0,33 l',priceCents:200,imageUrl:''},{id:'schorle',name:'Apfelschorle',category:'Alkoholfrei',unit:'0,33 l',priceCents:250,imageUrl:''},{id:'cola',name:'Cola / Orange / Zitrone',category:'Alkoholfrei',unit:'0,33 l',priceCents:250,imageUrl:''},{id:'bier',name:'Bier / Alster',category:'Bier & Wein',unit:'0,33 l',priceCents:300,imageUrl:''},{id:'weinschorle',name:'Weinschorle',category:'Bier & Wein',unit:'0,2 l',priceCents:400,imageUrl:''}]
};

const catalogLifecycle=row=>({archived:!!row.deletedAt||row.archived===true,...(row.deletedAt?{deletedAt:text(row.deletedAt,40)}:{})});
const contentFields=row=>({categoryId:row.categoryId?validId(row.categoryId):'',imageUrl:image(row.imageUrl),imageAlt:text(row.imageAlt,300)});

export function cleanCatalog(input){
  return attachCategories({
    equipment:unique(array(input.equipment).map(r=>{const id=validId(r.id);if(!['kicker','table','other'].includes(r.kind))fail('Ungültige Ausstattung.');return {_key:id,id,name:text(r.name,100,true),category:text(r.category||'Ausstattung',80,true),kind:r.kind,capacity:r.capacity===null||r.capacity===''?null:integer(r.capacity,1,30),description:text(r.description,800),...contentFields(r),...catalogLifecycle(r)};})),
    games:unique(array(input.games).map(r=>{const id=validId(r.id);return {_key:id,id,name:text(r.name,100,true),category:text(r.category||'Spiele',80,true),capacity:integer(r.capacity,1,30),minutes:integer(r.minutes,0,300),description:text(r.description,800),rules:text(r.rules,2000),...contentFields(r),...catalogLifecycle(r)};})),
    program:unique(array(input.program??DEFAULT_CATALOG.program).map(r=>{const id=validId(r.id);if(!['dj','karaoke','other'].includes(r.kind||'other'))fail('Ungültige Angebotsart.');return {_key:id,id,name:text(r.name,100,true),category:text(r.category||'Programm',80,true),kind:r.kind||'other',description:text(r.description,1000),...contentFields(r),...catalogLifecycle(r)};})),
    drinks:unique(array(input.drinks).map(r=>{const id=validId(r.id);return {_key:id,id,name:text(r.name,100,true),category:text(r.category,80,true),unit:text(r.unit,40,true),priceCents:integer(r.priceCents,0,100000),description:text(r.description,1000),...contentFields(r),...catalogLifecycle(r)};}))
  },input.categories);
}

export function defaultExperience(eventId){return {eventId,enabled:true,welcomeTitle:'',welcomeText:'Schön, dass du da bist! Entdecke, was heute angeboten wird, und komm dazu.',equipment:[],games:[],program:[],menu:[],stations:[],sections:[],map:emptyMap(),features:{stationDetails:false},modules:{dj:{enabled:false,title:'DJ & Wunschmusik',time:'',host:'',description:''},karaoke:{enabled:false,title:'Karaoke',time:'',host:'',description:''},band:{enabled:false,title:'Live-Musik',time:'',host:'',description:''},encounters:{enabled:false},help:{enabled:true}}};}

export function cleanExperience(input,catalog,eventId,people=[],teamIds=[]){
  if(!Array.isArray(catalog.categories))catalog=cleanCatalog(catalog);
  validId(eventId);
  input=withoutDeletedPeople(input,people);people=people.filter(p=>!p.deletedAt);
  const result={eventId,enabled:input.enabled!==false,welcomeTitle:text(input.welcomeTitle,160),welcomeText:text(input.welcomeText,1200),equipment:[],games:[],program:[],menu:[],stations:[],modules:{}};
  for(const [key,source] of [['equipment','equipment'],['games','games'],['program','program'],['menu','drinks']]){
    result[key]=unique(array(key==='program'?programFor(input):(input[key]||[])).map(row=>{
      const id=validId(row.id),base=catalog[source].find(item=>item.id===id&&!item.archived);
      if(!base)fail('Ein ausgewählter Eintrag fehlt in den Stammdaten oder wurde archiviert.');
      const hostId=row.hostId?validId(row.hostId):'';
      if(hostId&&(!people.some(p=>p.personId===hostId&&!p.archived)||!teamIds.includes(hostId)))fail('Bitte eine aktive Person aus dem Team dieses Abends auswählen.');
      if(key==='program')return {...base,_key:id,time:text(row.time,80),place:text(row.place,160),hostId,description:text(row.description??base.description,1000)};
      if(key==='menu')return {...base,_key:id,priceCents:integer(row.priceCents??base.priceCents,0,100000),available:row.available!==false};
      return {...base,_key:id,capacity:key==='equipment'&&(row.capacity===null||row.capacity==='')?null:integer(row.capacity??base.capacity,1,30),place:text(row.place,160),hostId};
    }));
  }
  result.stations=unique(array(stationsFor(input),40).map(row=>{
    const id=validId(row.id),kind=row.kind||'message';
    if(!['music','karaoke','message'].includes(kind))fail('Bitte eine gültige Stationsart wählen.');
    const operatorIds=[...new Set(array(row.operatorIds||[],100).map(validId))];
    if(operatorIds.some(pid=>!people.some(p=>p.personId===pid&&!p.archived)||!teamIds.includes(pid)))fail('Stationszuständige müssen zum aktiven Abendteam gehören.');
    const offerType=row.offerType||'',offerId=row.offerId||'';
    if(offerType&&!['equipment','games','program','menu'].includes(offerType))fail('Ungültige Angebotsverknüpfung.');
    if(offerId&&(!offerType||!result[offerType].some(item=>item.id===offerId)))fail('Bitte ein für diesen Abend ausgewähltes Angebot verknüpfen.');
    return {_key:id,id,name:text(row.name,100,true),kind,description:text(row.description,800),place:text(row.place,160),operatorIds,...(!operatorIds.length&&row.assignmentRequired?{assignmentRequired:true}:{}),offerType,offerId:offerId?validId(offerId):'',enabled:row.enabled!==false,detailsEnabled:row.detailsEnabled!==false,showImages:row.showImages!==false,contactEnabled:row.contactEnabled!==false,allowOperatorPhotos:row.allowOperatorPhotos===true,imageUrl:image(row.imageUrl),imageAlt:text(row.imageAlt,300)};
  }));
  result.modules.encounters={enabled:input.modules?.encounters?.enabled===true};
  result.modules.help={enabled:input.modules?.help?.enabled!==false};
  result.features={stationDetails:input.features?.stationDetails===true};
  const selectedCategories=new Set(['equipment','games','program','menu'].flatMap(k=>result[k].map(r=>r.categoryId)));
  const supplied=Array.isArray(input.sections)?input.sections:sectionsFor(result);
  result.sections=unique(array(supplied,100).map(s=>{const cid=validId(s.categoryId||s.id),category=catalog.categories?.find(c=>c.id===cid);if(!category)fail('Ein Bereich verweist auf eine nicht mehr vorhandene Kategorie.');return {id:cid,categoryId:cid,title:text(s.title||category.name,100,true),enabled:s.enabled!==false,showImages:s.showImages!==false,detailsEnabled:s.detailsEnabled!==false};}));
  for(const cid of selectedCategories)if(!result.sections.some(s=>s.categoryId===cid)){const category=catalog.categories.find(c=>c.id===cid);result.sections.push({id:cid,categoryId:cid,title:category.name,enabled:!category.archived,showImages:true,detailsEnabled:true});}
  result.map=cleanMap(input.map,result,people,teamIds);
  if(input.resourceSelection!=null)result.resourceSelection=cleanResourceSelection(input.resourceSelection);
  return result;
}

// Retain historic IDs in storage but never require a deleted profile when preparing an evening.
export function withoutDeletedPeople(config,people){
 const deleted=new Set(people.filter(p=>p.deletedAt).map(p=>p.personId));if(!deleted.size)return config;
 const next={...config};
 for(const kind of ['equipment','games','program'])next[kind]=(kind==='program'?programFor(config):config[kind]||[]).map(row=>deleted.has(row.hostId)?{...row,hostId:'',host:''}:row);
 next.stations=stationsFor(config).map(station=>{
  const previous=station.operatorIds||[],operatorIds=previous.filter(id=>!deleted.has(id));
  return {...station,operatorIds,...(previous.length&&!operatorIds.length?{assignmentRequired:true}:{})};
 });return pruneMapPeople(next,new Set(people.filter(p=>!p.deletedAt).map(p=>p.personId)));
}

// Read the first development format without changing existing published evenings.
export function programFor(doc){
  if(Array.isArray(doc.program))return doc.program;
  return ['dj','karaoke','band'].filter(id=>doc.modules?.[id]?.enabled).map(id=>({id,_key:id,name:doc.modules[id].title,category:'Musik & Bühne',kind:id==='band'?'other':id,time:doc.modules[id].time,host:doc.modules[id].host,place:'Am Musikbereich',description:doc.modules[id].description||''}));
}

export function stationsFor(config){
  if(Array.isArray(config.stations))return config.stations;
  const stations=programFor(config).filter(p=>['dj','karaoke'].includes(p.kind)).map(p=>({id:`station-${p.id.slice(0,70)}`,name:p.name,kind:p.kind==='dj'?'music':'karaoke',description:p.description||'',place:p.place||'',operatorIds:p.hostId?[p.hostId]:[],offerType:'program',offerId:p.id,enabled:true}));
  if(config.modules?.help?.enabled!==false)stations.push({id:'station-team',name:'Rudelbar-Team',kind:'message',description:'Fragen, Unterstützung und ein persönliches Hallo.',place:'Am Rudelbar-Wagen',operatorIds:[],offerType:'',offerId:'',enabled:true});
  return stations;
}

export function publicExperience(doc,event){
  if(!doc||doc._id?.startsWith('drafts.')||doc.enabled!==true||!event||event.archived||event._id?.startsWith('drafts.')||doc.eventId!==event._id)return null;
  const sections=sectionsFor({...doc,program:programFor(doc)}),rows=(key,kind)=>(key==='program'?programFor(doc):doc[key]||[]).flatMap(row=>{const cid=row.categoryId||categoryId(kind,row.category||({equipment:'Ausstattung',games:'Spiele',program:'Programm',drinks:'Karte mit Preisen'}[kind])),s=sections.find(s=>s.categoryId===cid);if(s?.enabled===false)return [];return [{...row,categoryId:cid,category:s?.title||row.category,detailsEnabled:s?.detailsEnabled!==false,imageUrl:s?.showImages===false?'':row.imageUrl||''}];}).sort((a,b)=>sections.findIndex(s=>s.categoryId===a.categoryId)-sections.findIndex(s=>s.categoryId===b.categoryId));
  return {schemaVersion:5,eventId:event._id,revision:doc._rev||'',event:{title:event.title,date:event.date,time:event.time,venue:event.venue,address:event.address||'',description:event.description||''},welcomeTitle:doc.welcomeTitle||`Herzlich willkommen\nin ${event.venue}.`,welcomeText:doc.welcomeText||'Schön, dass du da bist!',equipment:rows('equipment','equipment'),games:rows('games','games'),program:rows('program','program'),menu:rows('menu','drinks'),sections:sections.filter(s=>s.enabled!==false),features:{stationDetails:doc.features?.stationDetails===true},modules:doc.modules||{}};
}
