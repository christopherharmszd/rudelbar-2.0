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

export function cleanCatalog(input){
  return {
    equipment:unique(array(input.equipment).map(r=>{const id=validId(r.id);if(!['kicker','table','other'].includes(r.kind))fail('Ungültige Ausstattung.');return {_key:id,id,name:text(r.name,100,true),category:text(r.category||'Ausstattung',80,true),kind:r.kind,capacity:r.capacity===null||r.capacity===''?null:integer(r.capacity,1,30),description:text(r.description,800),archived:r.archived===true};})),
    games:unique(array(input.games).map(r=>{const id=validId(r.id);return {_key:id,id,name:text(r.name,100,true),category:text(r.category||'Spiele',80,true),capacity:integer(r.capacity,1,30),minutes:integer(r.minutes,0,300),description:text(r.description,800),rules:text(r.rules,2000),archived:r.archived===true};})),
    program:unique(array(input.program??DEFAULT_CATALOG.program).map(r=>{const id=validId(r.id);if(!['dj','karaoke','other'].includes(r.kind||'other'))fail('Ungültige Angebotsart.');return {_key:id,id,name:text(r.name,100,true),category:text(r.category||'Programm',80,true),kind:r.kind||'other',description:text(r.description,1000),archived:r.archived===true};})),
    drinks:unique(array(input.drinks).map(r=>{const id=validId(r.id);return {_key:id,id,name:text(r.name,100,true),category:text(r.category,80,true),unit:text(r.unit,40,true),priceCents:integer(r.priceCents,0,100000),imageUrl:image(r.imageUrl),archived:r.archived===true};}))
  };
}

export function defaultExperience(eventId){return {eventId,enabled:true,welcomeTitle:'',welcomeText:'Schön, dass du da bist! Entdecke, was heute angeboten wird, und komm dazu.',equipment:[],games:[],program:[],menu:[],modules:{dj:{enabled:false,title:'DJ & Wunschmusik',time:'',host:'',description:''},karaoke:{enabled:false,title:'Karaoke',time:'',host:'',description:''},band:{enabled:false,title:'Live-Musik',time:'',host:'',description:''},encounters:{enabled:false},help:{enabled:true}}};}

export function cleanExperience(input,catalog,eventId,people=[],teamIds=[]){
  validId(eventId);
  const result={eventId,enabled:input.enabled!==false,welcomeTitle:text(input.welcomeTitle,160),welcomeText:text(input.welcomeText,1200),equipment:[],games:[],program:[],menu:[],modules:{}};
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
  result.modules.encounters={enabled:input.modules?.encounters?.enabled===true};
  result.modules.help={enabled:input.modules?.help?.enabled!==false};
  return result;
}

// Read the first development format without changing existing published evenings.
export function programFor(doc){
  if(Array.isArray(doc.program))return doc.program;
  return ['dj','karaoke','band'].filter(id=>doc.modules?.[id]?.enabled).map(id=>({id,_key:id,name:doc.modules[id].title,category:'Musik & Bühne',kind:id==='band'?'other':id,time:doc.modules[id].time,host:doc.modules[id].host,place:'Am Musikbereich',description:doc.modules[id].description||''}));
}

export function publicExperience(doc,event){
  if(!doc||doc._id?.startsWith('drafts.')||doc.enabled!==true||!event||event.archived||event._id?.startsWith('drafts.')||doc.eventId!==event._id)return null;
  return {schemaVersion:2,eventId:event._id,revision:doc._rev||'',event:{title:event.title,date:event.date,time:event.time,venue:event.venue,address:event.address||'',description:event.description||''},welcomeTitle:doc.welcomeTitle||`Herzlich willkommen\nin ${event.venue}.`,welcomeText:doc.welcomeText||'Schön, dass du da bist!',equipment:doc.equipment||[],games:doc.games||[],program:programFor(doc),menu:doc.menu||[],modules:doc.modules||{}};
}
