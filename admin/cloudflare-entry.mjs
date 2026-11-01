import {WorkerEntrypoint} from 'cloudflare:workers';
import worker from './worker.mjs';
import {createSanity} from './lib/sanity.mjs';
import {createLiveService} from './lib/live-service.mjs';
import {getVisitorExperience} from './lib/abend-service.mjs';
export class VisitorContent extends WorkerEntrypoint {
  async getExperience(input){
    const client=createSanity({projectId:this.env.SANITY_PROJECT_ID,dataset:this.env.SANITY_DATASET,token:this.env.SANITY_EDITOR_TOKEN});
    if(input.eventId&&input.sessionToken&&!input.accessCode){try{const identity=await createLiveService(this.env,client).guestIdentity(input);input={...input,accessCode:identity.accessCode};}catch{}}
    const result=await getVisitorExperience(client,input);
    if(result.experience&&this.env.LIVE_DB){const flags=await createLiveService(this.env,null).availability(result.experience.eventId);result.experience.stations=result.experience.stations.map(s=>({...s,accepting:flags.find(f=>f.station_id===s.id)?.accepting!==0}));}
    return result;
  }
  async guestAction(action,input){
    try{
      const service=createLiveService(this.env,createSanity({projectId:this.env.SANITY_PROJECT_ID,dataset:this.env.SANITY_DATASET,token:this.env.SANITY_EDITOR_TOKEN}),{defer:promise=>this.ctx.waitUntil(promise)});
      if(!['session','mine','submit','guestUpdate','guestNotice'].includes(action))return {status:404,error:'Nicht gefunden.'};
      return {status:200,...await service[action](input)};
    }catch(error){return {status:error.status||503,error:error.status?error.message:'Die Nachricht konnte gerade nicht verarbeitet werden.'};}
  }
}
export default {fetch:worker.fetch,async scheduled(event,env,ctx){const client=createSanity({projectId:env.SANITY_PROJECT_ID,dataset:env.SANITY_DATASET,token:env.SANITY_EDITOR_TOKEN});ctx.waitUntil(createLiveService(env,client).notices.flush());}};
