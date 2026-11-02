import {cleanLayout} from '../../shared/village-map.mjs';
import {editsContent,requirePermission} from './permissions.mjs';
import {validId} from '../../shared/experience.mjs';
import {strip} from './abend-service.mjs';
export const VENUE_PLAN_TYPE='rudelVenuePlan';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export async function venuePlansApi(request,{client,user,json,data}){
 requirePermission(editsContent(user));const match=new URL(request.url).pathname.match(/^\/api\/abend\/venue-plans(?:\/([a-z0-9-]+))?$/i);if(!match)return json(404,{error:'Nicht gefunden.'});
 const plan=doc=>({...strip(doc),revision:doc._rev||''});
 if(!match[1]&&request.method==='GET')return json(200,{plans:(await client.list(VENUE_PLAN_TYPE)).map(d=>{const {layout,...meta}=plan(d);return {...meta,boothCount:layout.booths.length,elementCount:layout.elements.length};})});
 const id=match[1]?validId(match[1]):'plan-'+crypto.randomUUID(),old=match[1]?await client.getDocument('drafts.'+id):null;if(match[1]&&(!old||old._type!==VENUE_PLAN_TYPE))fail('Ortsplan nicht gefunden.',404);
 if(request.method==='GET')return json(200,{plan:plan(old)});
 if(!(!match[1]&&request.method==='POST'||match[1]&&request.method==='PUT'))return json(405,{error:'Diese Aktion ist nicht verfügbar.'});
 const input=await data(request);if(old&&input.revision!==old._rev)fail('Der Ortsplan wurde inzwischen geändert. Bitte neu laden.',409);
 const name=String(input.name??old?.name??'').trim(),description=String(input.description??old?.description??'').trim();if(!name||name.length>120||description.length>1000)fail('Bitte Name und Beschreibung des Ortsplans prüfen.');
 const fields={planId:id,name,description,archived:input.archived??old?.archived??false,layout:cleanLayout(input.layout||old?.layout,{base:true})};
 const doc=await client.savePrivate(VENUE_PLAN_TYPE,id,fields,old?._rev);return json(old?200:201,{plan:plan(doc)});
}
