import {catalogEntries,CONTENT_FORMATS,categoryId} from './content-model.mjs';
import {cleanCatalog} from './experience.mjs';
export const CSV_FIELDS={ref:'Kennung',categoryId:'Kategorie-Kennung',category:'Kategorie',format:'Darstellung',name:'Name',description:'Beschreibung',interaction:'Mitmachen',unit:'Menge',price:'Preis',capacity:'Plätze',minutes:'Dauer in Minuten',rules:'Kurz erklärt',imageUrl:'Bildadresse',imageAlt:'Bildbeschreibung',archived:'Pausiert'};
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
const safe=value=>{const s=String(value??'');return /^[\s]*[=+\-@\t\r]/.test(s)||s.startsWith("'")?"'"+s:s;};
const unsafed=s=>s.startsWith("'")&&(/^[\s]*[=+\-@\t\r]/.test(s.slice(1))||s.slice(1).startsWith("'"))?s.slice(1):s;
export function exportCatalogCsv(catalog,{category='',template=false}={}){
 const cell=value=>'"'+safe(value).replaceAll('"','""')+'"',keys=Object.keys(CSV_FIELDS),rows=template?[]:catalogEntries(catalog).filter(r=>!category||r.categoryId===category).map(r=>({...r,format:CONTENT_FORMATS[r.source].label,ref:r.ref,interaction:r.source==='program'?({dj:'Musikwünsche',karaoke:'Karaoke',other:'Vor Ort'}[r.kind]||'Vor Ort'):'',price:r.source==='drinks'?(r.priceCents/100).toFixed(2).replace('.',','):'',capacity:r.capacity??'',minutes:r.minutes??'',archived:r.archived?'ja':'nein'}));
 return '\ufeff'+[keys.map(k=>cell(CSV_FIELDS[k])).join(';'),...rows.map(r=>keys.map(k=>cell(r[k])).join(';'))].join('\r\n')+'\r\n';
}
export function parseCsv(source){
 if(typeof source!=='string'||source.length>1_000_000)fail('Bitte eine CSV-Datei unter 1 MB wählen.');source=source.replace(/^\ufeff/,'');
 let quote=false,first='';for(let i=0;i<source.length;i++){const c=source[i];if(c==='"')quote=!quote;if(!quote&&(c==='\r'||c==='\n'))break;first+=c;}
 const delimiter=[';',',','\t'].map(c=>[c,first.split(c).length]).sort((a,b)=>b[1]-a[1])[0][0],rows=[];let row=[],value='',quoted=false,closed=false;
 for(let i=0;i<=source.length;i++){
  const c=source[i];if(quoted){if(c===undefined)fail('Ein Anführungszeichen ist nicht geschlossen.');if(c==='"'){if(source[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else value+=c;continue;}
  if(c==='"'&&!value&&!closed){quoted=true;continue;}
  if(c===delimiter||c==='\r'||c==='\n'||c===undefined){row.push(unsafed(value));value='';closed=false;if(c!==delimiter){if(row.some(v=>v.trim()))rows.push(row);row=[];if(c==='\r'&&source[i+1]==='\n')i++;}continue;}
  if(closed&&c.trim())fail('Nach einem geschlossenen Textfeld steht ein unerwartetes Zeichen.');value+=c;
 }
 if(rows.length>501||rows.some(r=>r.length>40))fail('Bitte höchstens 500 Einträge und 40 Spalten importieren.');
 if(!rows.length)fail('Die CSV-Datei ist leer.');const headers=rows.shift().map(h=>h.trim());if(new Set(headers).size!==headers.length||headers.some(h=>!h))fail('Bitte eindeutige Spaltenüberschriften verwenden.');
 if(rows.some(r=>r.length!==headers.length))fail('Die Zeilen haben unterschiedlich viele Spalten. Bitte Trennzeichen und Anführungszeichen prüfen.');
 return {headers,rows,delimiter};
}
export function defaultCsvMapping(headers){return Object.fromEntries(Object.entries(CSV_FIELDS).map(([key,label])=>[key,headers.findIndex(h=>h.toLocaleLowerCase('de')===label.toLocaleLowerCase('de'))]));}
export function previewCatalogImport(catalog,input){
 const parsed=parseCsv(input.csv),mapping=input.mapping||defaultCsvMapping(parsed.headers);for(const [key,index]of Object.entries(mapping))if(!Object.hasOwn(CSV_FIELDS,key)||!Number.isInteger(index)||index< -1||index>=parsed.headers.length)fail('Bitte die Spaltenzuordnung prüfen.');
 if(mapping.name===undefined||mapping.name<0)fail('Bitte die Spalte für den Namen zuordnen.');
 if(!/^[a-f0-9-]{36}$/.test(input.requestKey||''))fail('Bitte den Import neu beginnen.');
 const next=structuredClone(catalog),existing=new Map(catalogEntries(catalog).map(r=>[r.ref,r])),seen=new Set(),changes=[],errors=[];
 const boolean=value=>{if(/^(ja|true|1)$/i.test(value))return true;if(/^(nein|false|0|)$/i.test(value))return false;fail('Pausiert muss ja oder nein sein.');};
 const number=(value,label,optional=false)=>{if(optional&&!value.trim())return null;if(!/^\d+$/.test(value))fail(label+': bitte eine ganze Zahl eingeben.');return Number(value);};
 for(let i=0;i<parsed.rows.length;i++)try{
  const row=parsed.rows[i],has=k=>Number.isInteger(mapping[k])&&mapping[k]>=0,get=k=>has(k)?row[mapping[k]].trim():'',ref=get('ref'),old=ref?existing.get(ref):null;
  if(ref&&!old)fail('Kennung nicht gefunden. Für einen neuen Eintrag das Feld Kennung leer lassen.');if(old&&seen.has(ref))fail('Diese Kennung steht mehrfach in der Datei.');if(old)seen.add(ref);
  if(old?.deletedAt)fail('Bitte den Inhalt zuerst aus dem Papierkorb wiederherstellen.');
  let category=next.categories.find(c=>c.id===(get('categoryId')||input.defaultCategoryId||old?.categoryId));
  const name=get('category');if(name&&category?.name!==name)category=next.categories.find(c=>c.name===name&&(!old||c.format===old.source));
  const label=get('format'),format=Object.keys(CONTENT_FORMATS).find(k=>k===label||CONTENT_FORMATS[k].label.toLocaleLowerCase('de')===label.toLocaleLowerCase('de'))||category?.format||old?.source||input.defaultFormat;
  if(!CONTENT_FORMATS[format])fail('Bitte eine Kategorie oder Darstellung für den Inhalt auswählen.');
  if(!category){if(!name)fail('Bitte eine Kategorie angeben.');category={id:categoryId(format,name),name,format,description:'',order:next.categories.length,archived:false};if(next.categories.some(c=>c.id===category.id&&c.name!==name))fail('Die Kategorie konnte nicht eindeutig zugeordnet werden.');next.categories.push(category);}
  if(category.archived)fail('Diese Kategorie ist pausiert.');if(category.format!==format||old&&old.source!==format)fail('Bestehende Einträge können nur in Kategorien mit denselben Eigenschaften verschoben werden.');
  const id=old?.id||'import-'+input.requestKey+'-'+(i+1),value={...(old||{id,kind:'other',description:'',rules:'',capacity:format==='equipment'?null:4,minutes:0,unit:'Portion',priceCents:0}),id,categoryId:category.id,category:category.name,name:get('name')};delete value.source;delete value.ref;
  for(const k of ['description','unit','rules','imageUrl','imageAlt'])if(has(k))value[k]=get(k);
  if(has('archived'))value.archived=boolean(get('archived'));
  if(format==='program'&&has('interaction')){const k={'musikwünsche':'dj',karaoke:'karaoke','vor ort':'other','':'other'}[get('interaction').toLocaleLowerCase('de')];if(!k)fail('Mitmachen: Musikwünsche, Karaoke oder Vor Ort auswählen.');value.kind=k;}
  if(format==='drinks'&&has('price')){const p=get('price');if(!/^\d+(?:[.,]\d{1,2})?$/.test(p))fail('Preis: bitte zum Beispiel 4,50 eingeben.');value.priceCents=Math.round(Number(p.replace(',','.'))*100);}
  if(['equipment','games'].includes(format)&&has('capacity'))value.capacity=number(get('capacity'),'Plätze',format==='equipment');
  if(format==='games'&&has('minutes'))value.minutes=number(get('minutes'),'Dauer');
  const check=cleanCatalog({...next,[format]:[value]})[format][0];next[format]=old?next[format].map(v=>v.id===id?check:v):[...next[format],check];
  const before=old?catalog[format].find(v=>v.id===old.id):null;changes.push({row:i+2,ref:format+'/'+id,name:check.name,category:category.name,action:!old?'new':JSON.stringify(before)===JSON.stringify(check)?'unchanged':'updated'});
 }catch(error){errors.push({row:i+2,message:error.message});}
 return {headers:parsed.headers,mapping,changes,errors,counts:{new:changes.filter(c=>c.action==='new').length,updated:changes.filter(c=>c.action==='updated').length,unchanged:changes.filter(c=>c.action==='unchanged').length},catalog:errors.length?null:cleanCatalog(next)};
}
