import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanCatalog,cleanExperience,defaultExperience,CATALOG_ID} from '../../shared/experience.mjs';
import {exportCatalogCsv,parseCsv,defaultCsvMapping,previewCatalogImport} from '../../shared/catalog-csv.mjs';
import {createPlanning} from '../lib/planning.mjs';
import {reviewEvening} from '../lib/evening-review.mjs';
import {catalogCsvApi} from '../lib/catalog-csv-api.mjs';
import {experienceApi} from '../lib/experience-api.mjs';
import {mediaApi} from '../lib/media-api.mjs';
import {catalogFor,visitorPayload,loadEvent,getVisitorExperience,eventDocId} from '../lib/abend-service.mjs';
const user={legacy:true},json=(status,value)=>Response.json(value,{status}),data=r=>r.json();
const image='https://cdn.sanity.io/images/project/staging/photo-800x600.jpg';
const raw={equipment:[],games:[],program:[],drinks:[],categories:[{id:'food',name:'Speisen',format:'drinks',order:0}]};
const food={id:'soup',name:'Kürbissuppe',category:'Speisen',categoryId:'food',unit:'Portion',priceCents:450,description:'Warm, mit Kräutern',imageUrl:image};
function fixture(){
 const docs=new Map(),websiteDocs=new Map();
 function make(store){return {async getDocument(id){return structuredClone(store.get(id)||null);},async list(type){return [...store.values()].filter(d=>d._type===type).map(d=>({...structuredClone(d),_id:d._id.replace(/^drafts\./,''),draft:d._id.startsWith('drafts.'),published:!d._id.startsWith('drafts.')}));},async savePrivate(type,id,fields,revision){const key='drafts.'+id,old=store.get(key);if(revision&&old?._rev!==revision)throw Object.assign(new Error('conflict'),{status:409});const d={...old,...structuredClone(fields),_id:key,_type:type,_rev:crypto.randomUUID()};store.set(key,d);return d;},async commitPrivate(changes){const next=new Map(store);for(const {type,id,fields,revision}of changes){const key='drafts.'+id,old=next.get(key);if(revision?old?._rev!==revision:!!old)throw Object.assign(new Error('conflict'),{status:409});next.set(key,{...old,...structuredClone(fields),_id:key,_type:type,_rev:crypto.randomUUID()});}store.clear();for(const [key,value]of next)store.set(key,value);},async listImages(){return [{_id:'asset',url:image,originalFilename:'Foto.jpg'}];},async imageUsage(){return [{title:'Inhalt'}];}};}
 const client=make(docs);client.website=make(websiteDocs);return {client,docs,websiteDocs};
}
const req=(path,body)=>new Request('https://local.example'+path,{method:body?'POST':'GET',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
const options=client=>({client,json,data,session:async()=>user,authorized:async()=>({})});
const bad=status=>e=>e.status===status;

test('free categories support food, photos and legacy catalogs without generated contents',()=>{
 const c=cleanCatalog({...raw,drinks:[food]});assert.equal(c.categories[0].name,'Speisen');assert.equal(c.drinks[0].imageUrl,image);assert.equal(cleanCatalog(raw).program.length,0);
 const legacy=cleanCatalog({equipment:[{id:'board',name:'Ankommen',kind:'other',capacity:null,category:'Willkommen'}],games:[],program:[],drinks:[]});assert.equal(legacy.categories[0].name,'Willkommen');assert.equal(legacy.equipment[0].id,'board');assert.throws(()=>cleanCatalog({...raw,categories:[{...raw.categories[0],format:'games'}],drinks:[food]}));
});
test('CSV roundtrip preserves IDs, multiline quotes, umlauts, prices and formula-looking text',()=>{
 const c=cleanCatalog({...raw,drinks:[{...food,name:'=SUM(1;2)',description:'Kräuter, "fein"\nund warm'}]});const csv=exportCatalogCsv(c),parsed=parseCsv(csv),result=previewCatalogImport(c,{csv,mapping:defaultCsvMapping(parsed.headers),requestKey:crypto.randomUUID()});assert.equal(result.errors.length,0);assert.equal(result.counts.unchanged,1);assert.equal(result.catalog.drinks[0].description,c.drinks[0].description);assert.equal(result.catalog.drinks[0].priceCents,450);assert.ok(csv.includes("'=SUM"));
});
test('CSV preview validates every row, preserves unmapped fields and never partially applies errors',()=>{
 const c=cleanCatalog({...raw,drinks:[food]});let result=previewCatalogImport(c,{csv:'Kennung;Name\ndrinks/soup;Neue Suppe',requestKey:crypto.randomUUID()});assert.equal(result.errors.length,0);assert.equal(result.catalog.drinks[0].priceCents,450);assert.equal(result.catalog.drinks[0].imageUrl,image);
 result=previewCatalogImport(c,{csv:'Kennung;Name\ndrinks/soup;Neu\ndrinks/missing;Unbekannt',requestKey:crypto.randomUUID()});assert.equal(result.errors.length,1);assert.equal(result.catalog,null);assert.equal(c.drinks[0].name,'Kürbissuppe');assert.throws(()=>parseCsv('a;b\n"offen;2'));
});
test('CSV imports are revision guarded and an exact retry cannot create duplicates',async()=>{
 const f=fixture();const current=await catalogFor(f.client),input={csv:'Name;Kategorie;Darstellung;Menge;Preis\nSuppe;Speisen;Karte mit Preisen;Portion;4,50',revision:current.revision,requestKey:crypto.randomUUID()};const context={client:f.client,user,json,data};const preview=await (await catalogCsvApi(req('/api/abend/catalog/csv/preview',input),context)).json();assert.deepEqual(preview.errors,[]);
 const saved=await (await catalogCsvApi(req('/api/abend/catalog/csv/apply',{...input,hash:preview.hash}),context)).json();assert.equal(saved.catalog.drinks.length,1);const replay=await (await catalogCsvApi(req('/api/abend/catalog/csv/apply',{...input,hash:preview.hash}),context)).json();assert.equal(replay.replayed,true);assert.equal(replay.catalog.drinks.length,1);
 assert.equal((await catalogCsvApi(req('/api/abend/catalog/csv/preview',{...input,requestKey:crypto.randomUUID()}),context)).status,409);
});
test('category and detail switches affect public payloads and hide linked stations',()=>{
 const c=cleanCatalog({...raw,drinks:[food]}),id='evening',config=cleanExperience({...defaultExperience(id),menu:[{id:'soup'}],features:{stationDetails:true},stations:[{id:'food-station',name:'Küche',kind:'message',operatorIds:[],offerType:'menu',offerId:'soup',description:'Details',imageUrl:image}],sections:[{categoryId:'food',title:'Unsere Küche',showImages:false,detailsEnabled:false}]},c,id);
 let payload=visitorPayload(config,{eventId:id,teamIds:[]},[]);assert.equal(payload.menu[0].category,'Unsere Küche');assert.equal(payload.menu[0].imageUrl,'');assert.equal(payload.stations[0].imageUrl,image);
 config.sections[0].enabled=false;payload=visitorPayload(config,{eventId:id,teamIds:[]},[]);assert.equal(payload.menu.length,0);assert.equal(payload.stations.length,0);config.sections[0].enabled=true;config.features.stationDetails=false;payload=visitorPayload(config,{eventId:id,teamIds:[]},[]);assert.equal(payload.stations[0].imageUrl,'');assert.equal(payload.stations[0].description,'');
});
test('undated preparation is possible but publication requires date and place; linked public dates remain separate',async()=>{
 const f=fixture(),planning=createPlanning(f.client),first=await planning.createEvening(user,{title:'Noch in Planung',date:'',venue:'',visibility:'private'});let review=await reviewEvening(f.client,first.id);assert.equal(review.ok,false);assert.equal(review.issues.length,2);
 f.websiteDocs.set('public-date',{_id:'public-date',_type:'rudelEvent',_rev:'web-1',title:'Sommerfest',date:'2027-06-12',time:'18 Uhr',venue:'Dorfplatz',archived:false});const linked=await planning.createEvening(user,{title:'Unser Abend',linkedEventId:'public-date',visibility:'public'});assert.equal(linked.event.venue,'Dorfplatz');assert.equal(linked.event.date,'2027-06-12');assert.equal(f.websiteDocs.size,1);assert.equal((await reviewEvening(f.client,linked.id)).ok,true);
});
test('templates copy contents and standard team, preserve existing release, and reject stale application',async()=>{
 const f=fixture(),planning=createPlanning(f.client);await f.client.savePrivate('rudelAppCatalog',CATALOG_ID,cleanCatalog({...raw,drinks:[food]}));await f.client.savePrivate('rudelAppPerson','person-real',{personId:'person-real',name:'Lokales Team',archived:false});
 const t=await planning.saveTemplate(user,{name:'Vereinsabend',teamIds:['person-real'],config:{...defaultExperience('tmp'),menu:[{id:'soup'}]}});const a=await planning.createEvening(user,{title:'Erster Abend',date:'2027-06-12',venue:'Dorfplatz',visibility:'private',templateId:t.templateId});assert.deepEqual(a.event.teamIds,['person-real']);
 const releaseRequest=req('/api/abend/events/'+a.id+'/open',{});assert.equal((await experienceApi(releaseRequest,{},options(f.client))).status,200);const before=JSON.stringify([...f.docs.values()].filter(d=>d._type==='rudelAppRelease'));
 const current=(await (await experienceApi(req('/api/abend/events/'+a.id),{},options(f.client))).json());const changed=await planning.saveTemplate(user,{name:'Geändert',revision:t.revision,config:{...t.config,menu:[]}},t.templateId);await planning.applyTemplate(user,a.id,{templateId:t.templateId,revision:current.experience.revision,eventRevision:current.event.revision});assert.equal(JSON.stringify([...f.docs.values()].filter(d=>d._type==='rudelAppRelease')),before);assert.equal(changed.name,'Geändert');
 await assert.rejects(()=>planning.applyTemplate(user,a.id,{templateId:t.templateId,revision:current.experience.revision,eventRevision:current.event.revision}),bad(409));
 const visible=await getVisitorExperience(f.client,{eventId:a.id,accessCode:a.event.accessCode});assert.equal(visible.experience.menu.length,1);
});
test('release check catches changed preparation; released event text stays until another release',async()=>{
 const f=fixture(),planning=createPlanning(f.client),a=await planning.createEvening(user,{title:'Freigegeben',date:'2027-06-12',venue:'Dorfplatz',visibility:'public'}),review=await reviewEvening(f.client,a.id);
 await experienceApi(req('/api/abend/events/'+a.id+'/open',{reviewToken:review.token}),{},options(f.client));const e=await loadEvent(f.client,a.id);await f.client.savePrivate('rudelAppEvent',eventDocId(a.id),{...e,title:'Nur vorbereitet'},e.revision);
 const visible=await getVisitorExperience(f.client,{eventId:a.id});assert.equal(visible.experience.event.title,'Freigegeben');await assert.rejects(()=>experienceApi(req('/api/abend/events/'+a.id+'/publish',{reviewToken:review.token}),{},options(f.client)),bad(409));
});
test('image library respects app versus website scopes and excludes Live-only users',async()=>{
 const f=fixture();f.client.website.listImages=async()=>[{_id:'website-photo',url:image,originalFilename:'Webseite'}];const app=await (await mediaApi(req('/api/media?scope=app'),{},options(f.client))).json(),web=await (await mediaApi(req('/api/media?scope=website'),{},options(f.client))).json();assert.equal(app.images[0].id,'asset');assert.equal(web.images[0].id,'website-photo');await assert.rejects(()=>mediaApi(req('/api/media'),{},{...options(f.client),session:async()=>({accountId:'station-account',roles:[{role:'station',eventId:'x'}]})}),bad(403));
});
