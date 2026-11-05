const fail=message=>{throw Object.assign(new Error(message),{status:400});};
const text=(v,max=120)=>{const s=String(v??'').trim();if(s.length>max)fail('Bitte die Textlänge prüfen.');return s;};
const id=value=>{const s=String(value||'');if(!/^[a-z0-9][a-z0-9-]{0,89}$/i.test(s))fail('Ungültige Kategorie.');return s;};
export const CONTENT_FORMATS={equipment:{label:'Information & Ausstattung',icon:'armchair'},games:{label:'Aktivität mit Plätzen',icon:'dices'},program:{label:'Programmpunkt',icon:'music-2'},drinks:{label:'Karte mit Preisen',icon:'utensils'}};
export const contentRef=(kind,itemId)=>`${kind}/${itemId}`;
export function categoryId(kind,name){let h=2166136261;for(const c of `${kind}:${name}`){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return 'category-'+(h>>>0).toString(16);}
export function attachCategories(catalog,inputCategories){
 const explicit=Array.isArray(inputCategories),categories=explicit?inputCategories.map((c,index)=>({id:id(c.id),name:text(c.name,80),format:String(c.format||''),description:text(c.description,500),order:Number.isInteger(c.order)?c.order:index,archived:c.archived===true})):[];
 if(categories.length>100)fail('Maximal 100 Kategorien sind möglich.');const ids=new Set();for(const c of categories){if(c.order<0||c.order>999||!c.name||!CONTENT_FORMATS[c.format]||ids.has(c.id))fail('Bitte Namen und Eigenschaften der Kategorien prüfen.');ids.add(c.id);}
 for(const kind of Object.keys(CONTENT_FORMATS))for(const row of catalog[kind]){
  let category=row.categoryId?categories.find(c=>c.id===row.categoryId):null;
  if(category&&category.format!==kind)fail('Diese Kategorie hat andere Eigenschaften. Bitte eine passende Kategorie wählen.');
  if(!category){const name=row.category||CONTENT_FORMATS[kind].label;category=categories.find(c=>c.format===kind&&c.name===name);if(!category){if(explicit&&row.categoryId)fail('Die ausgewählte Kategorie ist nicht mehr vorhanden.');category={id:categoryId(kind,name),name,format:kind,description:'',order:categories.length,archived:false};categories.push(category);}}
  row.categoryId=category.id;row.category=category.name;
 }
 if(categories.length>100)fail('Maximal 100 Kategorien sind möglich.');
 return {...catalog,schemaVersion:2,categories:categories.sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name,'de'))};
}
export function catalogEntries(catalog,{trash=false}={}){return Object.keys(CONTENT_FORMATS).flatMap(source=>(catalog?.[source]||[]).filter(r=>trash?!!r.deletedAt:!r.deletedAt).map(item=>({...item,source,ref:contentRef(source,item.id)})));}
export function sectionsFor(config){
 if(Array.isArray(config.sections))return config.sections;
 const groups=new Map();for(const [key,kind] of [['equipment','equipment'],['games','games'],['program','program'],['menu','drinks']])for(const row of config[key]||[]){const cid=row.categoryId||categoryId(kind,row.category||CONTENT_FORMATS[kind].label);if(!groups.has(cid))groups.set(cid,{id:cid,categoryId:cid,title:row.category||CONTENT_FORMATS[kind].label,enabled:true,showImages:true,detailsEnabled:true});}
 return [...groups.values()];
}
export function sectionAllowsStation(config,station){if(!station.offerType||!station.offerId)return true;const row=(config[station.offerType]||[]).find(r=>r.id===station.offerId);if(!row)return false;const kind=station.offerType==='menu'?'drinks':station.offerType,cid=row.categoryId||categoryId(kind,row.category||CONTENT_FORMATS[kind].label);return !sectionsFor(config).some(s=>s.categoryId===cid&&s.enabled===false);}
