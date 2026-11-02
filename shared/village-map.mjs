const fail=message=>{throw Object.assign(new Error(message),{status:400});};
const id=v=>{if(typeof v!=='string'||!/^[a-z0-9][a-z0-9-]{0,89}$/i.test(v))fail('Bitte die Kennungen im Ortsplan prüfen.');return v;};
const text=(v,n=160)=>{if(typeof v!=='string'&&v!=null)fail('Bitte gültige Kartentexte verwenden.');const s=String(v||'').trim();if(s.length>n)fail('Ein Kartentext ist zu lang.');return s;};
const number=(v,min,max,defaultValue)=>{const n=v==null?defaultValue:v;if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)fail('Eine Kartenposition oder Größe liegt außerhalb der Zeichenfläche.');return Math.round(n*10000)/10000;};
const rows=(v,max)=>{if(!Array.isArray(v)||v.length>max)fail('Der Ortsplan enthält zu viele oder ungültige Elemente.');return v;};
const unique=values=>{const set=new Set();for(const row of values){if(set.has(row.id))fail('Ein Kartenelement ist doppelt vorhanden.');set.add(row.id);}return values;};
const photo=v=>{const url=text(v,1000);if(url&&!/^https:\/\/cdn\.sanity\.io\/images\/[a-z0-9-]+\/[a-z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(url))fail('Bitte ein Bild aus der Bildauswahl verwenden.');return url;};
export const MAP_THEMES=['meadow','dusk','village','night'];
export const MAP_OBJECTS=['path','area','tree','house','church','barn','bench','beanbag','pond','landmark'];
export const BOOTH_STYLES=['bar','food','music','games','welcome','market','lounge'];
export const emptyLayout=()=>({version:1,width:1200,height:900,theme:'meadow',backgroundImage:'',elements:[],booths:[]});
export const emptyMap=()=>({enabled:false,asHome:true,title:'Entdecke euren Abend.',planId:'',planRevision:'',layout:emptyLayout()});
function geometry(row){return {x:number(row.x,-2400,4800,600),y:number(row.y,-2400,4800,450),width:number(row.width,8,3600,120),height:number(row.height,8,3600,100),rotation:number(row.rotation,-360,360,0),locked:row.locked===true};}
function point(row){const handle=h=>h?{x:number(h.x,-4,4,0),y:number(h.y,-4,4,0)}:null;return {x:number(row.x,-2,3,0),y:number(row.y,-2,3,0),in:handle(row.in),out:handle(row.out)};}
export function cleanLayout(input=emptyLayout(),{base=false,config,people=[],teamIds=[]}={}){
 if(!input||typeof input!=='object')fail('Bitte einen gültigen Ortsplan verwenden.');
 const layout={version:1,width:number(input.width,400,2400,1200),height:number(input.height,400,2400,900),theme:MAP_THEMES.includes(input.theme)?input.theme:'meadow',backgroundImage:photo(input.backgroundImage),elements:unique(rows(input.elements||[],160).map(e=>{
  if(!MAP_OBJECTS.includes(e.type))fail('Unbekanntes Dorfobjekt.');const type=e.type,points=['path','area'].includes(type)?rows(e.points||[],120).map(point):[];if(points.length&&points.length<(type==='area'?3:2)||['path','area'].includes(type)&&!points.length)fail('Ein Weg braucht mindestens zwei Punkte, eine Fläche drei.');
  const color=e.color||'gold';if(!['gold','sand','grass','stone','water','rose'].includes(color))fail('Bitte eine Farbe aus der Palette verwenden.');return {id:id(e.id),type,name:text(e.name,100),...geometry(e),points,lineWidth:number(e.lineWidth,2,100,22),color,showLabel:e.showLabel===true};
 })),booths:unique(rows(input.booths||[],50).map(b=>{
  if(!BOOTH_STYLES.includes(b.style||'market'))fail('Bitte eine Standdarstellung auswählen.');const personIds=base?[]:[...new Set(rows(b.personIds||[],12).map(id))];if(personIds.some(pid=>!people.some(p=>p.personId===pid&&!p.archived&&!p.deletedAt)||!teamIds.includes(pid)))fail('Wähle am Kartenstand aktive Personen aus dem Abendteam.');
  const offers=base?[]:rows(b.offers||[],30).map(ref=>{const type=ref.type;if(!['equipment','games','program','menu'].includes(type))fail('Bitte einen gültigen Inhalt am Stand auswählen.');const offerId=id(ref.id),offer=config?.[type]?.find(r=>r.id===offerId);if(config&&!offer)fail('Ein Kartenstand verweist auf einen Inhalt, der für diesen Abend nicht ausgewählt ist.');const stationIds=[...new Set(rows(ref.stationIds||[],10).map(id))];if(config&&stationIds.some(sid=>!config.stations?.some(s=>s.id===sid)))fail('Ein Kartenstand verweist auf einen nicht vorhandenen Live-Eingang.');if(ref.matching&&(!['equipment','games'].includes(type)||!offer?.capacity||offer.capacity<2))fail('Spielrunden brauchen eine Aktivität mit mindestens zwei Plätzen.');return {type,id:offerId,stationIds,matching:ref.matching===true};});
  if(new Set(offers.map(o=>o.type+'/'+o.id)).size!==offers.length)fail('Ein Inhalt ist am selben Stand doppelt zugeordnet.');
  const title=text(b.title,100);if(!title)fail('Gib jedem Kartenstand einen Namen.');return {id:id(b.id),title,description:text(b.description,1000),style:b.style||'market',...geometry(b),visible:b.visible!==false,showAvatars:b.showAvatars!==false,imageUrl:photo(b.imageUrl),imageAlt:text(b.imageAlt,300),personIds,offers};
 }))};
 if(layout.elements.reduce((n,e)=>n+e.points.length,0)>2000)fail('Bitte den Ortsplan auf höchstens 2.000 Weg- und Flächenpunkte begrenzen.');
 unique([...layout.elements,...layout.booths]);return layout;
}
export function cleanMap(input,config,people=[],teamIds=[]){if(!input)return emptyMap();return {enabled:input.enabled===true,asHome:input.asHome!==false,title:text(input.title||'Entdecke euren Abend.',160),planId:input.planId?id(input.planId):'',planRevision:text(input.planRevision,160),layout:cleanLayout(input.layout,{config,people,teamIds})};}
export function publicMap(map,payload){
 if(!map?.enabled||!map.layout)return null;const layout=map.layout,team=new Map(payload.team.map(p=>[p.id,p]));
 const booths=layout.booths.filter(b=>b.visible!==false).map(b=>{
  const offers=b.offers.flatMap(ref=>{const row=payload[ref.type]?.find(r=>r.id===ref.id);if(!row)return [];const stationIds=[...new Set([...(ref.stationIds||[]),...payload.stations.filter(s=>s.offerType===ref.type&&s.offerId===ref.id).map(s=>s.id)])];const actions=stationIds.flatMap(sid=>{const s=payload.stations.find(s=>s.id===sid&&s.contactEnabled!==false);return s?[{stationId:s.id,kind:s.kind,name:s.name}]:[];});return [{type:ref.type,id:ref.id,name:row.name,category:row.category,detailsEnabled:row.detailsEnabled!==false,description:row.description||'',imageUrl:row.imageUrl||'',imageAlt:row.imageAlt||'',capacity:row.capacity,minutes:row.minutes,priceCents:row.priceCents,unit:row.unit,available:row.available!==false,host:team.get(row.hostId)||null,actions,matching:ref.matching===true}];});
  const persons=[...new Set([...b.personIds,...offers.flatMap(o=>o.host?[o.host.id]:[])])].flatMap(id=>team.has(id)?[team.get(id)]:[]);
  const {id,title,description,style,x,y,width,height,rotation,showAvatars,imageUrl,imageAlt}=b;return {id,title,description,style,x,y,width,height,rotation,showAvatars,imageUrl,imageAlt,people:persons,offers};
 });
 return {title:map.title,asHome:map.asHome,layout:{version:1,width:layout.width,height:layout.height,theme:layout.theme,backgroundImage:layout.backgroundImage,elements:layout.elements.map(({locked,...e})=>e),booths}};
}
export function pruneMapPeople(config,allowed){if(!config.map?.layout)return config;return {...config,map:{...config.map,layout:{...config.map.layout,booths:(config.map.layout.booths||[]).map(b=>({...b,personIds:(b.personIds||[]).filter(id=>allowed.has(id))}))}}};}
