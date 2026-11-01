import {CATALOG_ID,EXPERIENCE_TYPE,programFor} from '../../shared/experience.mjs';
import {catalogFor,eventList,RELEASE_TYPE} from './abend-service.mjs';
import {editsContent,requirePermission} from './permissions.mjs';
const fail=(message,status)=>{throw Object.assign(new Error(message),{status});};
export async function changeCatalogLifecycle(client,user,kind,id,input,action){
 requirePermission(editsContent(user));
 if(!['equipment','games','program','drinks'].includes(kind))fail('Angebotsart nicht gefunden.',404);
 const catalog=await catalogFor(client),item=catalog[kind].find(r=>r.id===id);
 if(!item)fail('Angebot nicht gefunden.',404);
 if(!input.revision||input.revision!==catalog.revision)fail('Die Angebote wurden inzwischen geändert. Bitte aktualisieren.',409);
 const deleting=action==='delete';
 if(deleting&&item.deletedAt)fail('Das Angebot liegt bereits im Papierkorb.',409);
 if(!deleting&&!item.deletedAt)fail('Das Angebot liegt nicht im Papierkorb.',409);
 if(deleting){
  const [events,configs,releases]=await Promise.all([eventList(client),client.list(EXPERIENCE_TYPE),client.list(RELEASE_TYPE)]),key=kind==='drinks'?'menu':kind;
  const includes=config=>(key==='program'?programFor(config):config[key]||[]).some(r=>r.id===id);
  const used=events.filter(event=>configs.some(c=>c.eventId===event.eventId&&includes(c))||releases.some(r=>r.eventId===event.eventId&&r.config&&includes(r.config)));
  if(used.length)fail('Das Angebot ist noch zugeordnet: '+used.map(e=>e.title).join(', ')+'. Entferne es dort zuerst und übernimm die Änderung für Gäste.',409);
 }
 const rows=catalog[kind].map(row=>row.id===id?{...row,archived:true,deletedAt:deleting?new Date().toISOString():null}:row);
 await client.savePrivate('rudelAppCatalog',CATALOG_ID,{[kind]:rows},catalog.revision);
 return {ok:true,catalog:await catalogFor(client)};
}
