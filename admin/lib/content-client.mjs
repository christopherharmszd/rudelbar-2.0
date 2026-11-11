import {createSanity} from './sanity.mjs';
import {usesRuntimeContent,createRuntimeProjection,RUNTIME_TYPES} from './runtime-content.mjs';
import {createSanityBudget} from './sanity-budget.mjs';

// Website content is shared with the existing production editor. App data and
// identities stay in their current dataset; this is routing, not a data copy.
export function createContentClient(env){
  const beforeRequest=createSanityBudget(env);
  const client=createSanity({projectId:env.SANITY_PROJECT_ID,dataset:env.SANITY_DATASET,token:env.SANITY_EDITOR_TOKEN,memoizeReads:true,beforeRequest});
  if(env.RUDELBAR_RUNTIME_RELEASES==='1')client.runtimeDb=env.LIVE_DB;
  const websiteDataset=env.SANITY_WEBSITE_DATASET||env.SANITY_DATASET;
  client.website=websiteDataset===env.SANITY_DATASET?client:createSanity({projectId:env.SANITY_PROJECT_ID,dataset:websiteDataset,token:env.SANITY_EDITOR_TOKEN,memoizeReads:true,beforeRequest});
  if(usesRuntimeContent(env)){
    const projection=createRuntimeProjection(env.LIVE_DB,env.SANITY_DATASET),save=client.savePrivate;
    client.savePrivate=async(type,id,fields,revision)=>{
      if(!RUNTIME_TYPES.includes(type))return save(type,id,fields,revision);
      const docId='drafts.'+id,token=await projection.begin(docId);let written=false;
      try{const doc=await save(type,id,fields,revision);written=true;await projection.commit(doc,token);return doc;}
      catch(error){if(!written&&[400,404,409,429].includes(error.status))await projection.cancel(docId,token);throw error;}
    };
    const commitPrivate=client.commitPrivate;
    client.commitPrivate=async changes=>{
      const selected=changes.filter(change=>RUNTIME_TYPES.includes(change.type)),tickets=[];let started=false,written=false;
      try{
        for(const change of selected){const id='drafts.'+change.id;tickets.push({id,token:await projection.begin(id)});}
        started=true;const result=await commitPrivate(changes);written=true;
        const docs=await Promise.all(tickets.map(ticket=>client.getDocument(ticket.id)));
        if(docs.some(doc=>!doc))throw new Error('Die gespeicherten Betriebsdaten konnten nicht abgeglichen werden.');
        if(tickets.length)await env.LIVE_DB.batch([...docs.map(projection.put),...tickets.map(ticket=>env.LIVE_DB.prepare('DELETE FROM app_runtime_pending WHERE dataset=? AND id=? AND token=?').bind(env.SANITY_DATASET,ticket.id,ticket.token))]);
        return result;
      }catch(error){if(!started||!written&&[400,404,409,429].includes(error.status))for(const ticket of tickets)await projection.cancel(ticket.id,ticket.token);throw error;}
    };
    // Website event publication/unpublication changes the app's event metadata.
    // Mirror both forms only after the existing editorial operation succeeds.
    const web=client.website,webProjection=createRuntimeProjection(env.LIVE_DB,websiteDataset);
    for(const method of ['saveDraft','publish','unpublish','archive','restore','deleteForever']){
      const operation=web[method];
      web[method]=async(...args)=>{
        const id=method==='saveDraft'?args[1]:args[0],ids=[id,'drafts.'+id];
        const isEvent=method==='saveDraft'?args[0]==='rudelEvent':(await Promise.all(ids.map(web.getDocument))).some(doc=>doc?._type==='rudelEvent');
        if(!isEvent)return operation(...args);
        const tickets=[];let started=false,written=false;
        try{
          for(const docId of ids)tickets.push({id:docId,token:await webProjection.begin(docId)});
          started=true;const result=await operation(...args);written=true;
          const docs=await Promise.all(ids.map(web.getDocument));
          await env.LIVE_DB.batch([...docs.map((doc,i)=>doc?webProjection.put(doc):env.LIVE_DB.prepare('DELETE FROM app_runtime_documents WHERE dataset=? AND id=?').bind(websiteDataset,ids[i])),...tickets.map(ticket=>env.LIVE_DB.prepare('DELETE FROM app_runtime_pending WHERE dataset=? AND id=? AND token=?').bind(websiteDataset,ticket.id,ticket.token))]);return result;
        }catch(error){if(!started||!written&&[400,404,409,429].includes(error.status))for(const ticket of tickets)await webProjection.cancel(ticket.id,ticket.token);throw error;}
      };
    }
  }
  return client;
}
