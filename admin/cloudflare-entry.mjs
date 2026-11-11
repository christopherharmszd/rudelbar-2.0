export {WallFeed} from './lib/wall-feed.mjs';
export {LiveFeed} from './lib/live-feed.mjs';
import {liveSignalSocket,expireLiveSignals} from './lib/live-signals.mjs';
import {encounterMediaFetch} from './lib/encounter-api.mjs';
import {guestWallFetch,wallFor} from './lib/wall-api.mjs';
import {createWallArchive} from './lib/wall-archive.mjs';
import {createProviderMetrics} from './lib/provider-metrics.mjs';
import {createReporting} from './lib/reporting.mjs';
import {WorkerEntrypoint} from 'cloudflare:workers';
import {connect} from 'cloudflare:sockets';
import worker from './worker.mjs';
import {createContentClient} from './lib/content-client.mjs';
import {createRuntimeClient,usesRuntimeContent} from './lib/runtime-content.mjs';
import {createLiveService} from './lib/live-service.mjs';
import {getVisitorExperience} from './lib/abend-service.mjs';
import {flushReleaseReceipts} from './lib/release-service.mjs';
const runningContent=env=>usesRuntimeContent(env)?createRuntimeClient(env):createContentClient(env);
export class VisitorContent extends WorkerEntrypoint {
  async fetch(request){
    const url=new URL(request.url);
    if(url.pathname==='/api/contacts/updates'){
      try{const person=await createLiveService(this.env,runningContent(this.env)).guestContacts.identity(request.headers.get('x-rudelbar-contact-token')||'');return liveSignalSocket(this.env,request,{eventId:'contacts-'+person.profile_id,audience:'guest',viewer:'c:'+person.contact_session_id,scopes:['p:'+person.profile_id,'c:'+person.contact_session_id],expiresAt:person.expires_at});}
      catch(error){return Response.json({error:error.status?error.message:'Die Live-Verbindung ist gerade nicht verfügbar.'},{status:error.status||503});}
    }
    if(url.pathname==='/api/guest/updates'){
      try{const eventId=url.searchParams.get('abend'),service=createLiveService(this.env,runningContent(this.env)),person=await service.internalVisitor(eventId,request.headers.get('x-rudelbar-guest-token')||'');return liveSignalSocket(this.env,request,{eventId:person.event_id,audience:'guest',viewer:'g:'+person.id,scopes:['g:'+person.id,'p:'+(person.profile_id||person.id)],expiresAt:person.expires_at});}
      catch(error){return Response.json({error:error.status?error.message:'Die Live-Verbindung ist gerade nicht verfügbar.'},{status:error.status||503});}
    }
    if(url.pathname.startsWith('/api/guest/encounter-media/'))return encounterMediaFetch(request,this.env,runningContent(this.env));return guestWallFetch(request,this.env,runningContent(this.env));
  }
  async getExperience(input){
    const client=runningContent(this.env);
    if(input.eventId&&input.sessionToken&&!input.accessCode){try{const identity=await createLiveService(this.env,client).guestIdentity(input);input={...input,accessCode:identity.accessCode};}catch{}}
    const result=await getVisitorExperience(client,input);
    if(result.experience?.stations.some(s=>s.showImages)&&this.env.LIVE_DB){const photos=await createLiveService(this.env,client).stationPhotos(result.experience.eventId);for(const station of result.experience.stations){const photo=photos.find(p=>p.station_id===station.id);if(station.showImages&&photo?.image_url)station.imageUrl=photo.image_url;}if(photos.length)result.experience.revision+=':'+Math.max(...photos.map(p=>p.updated_at));}
    if(result.experience&&this.env.LIVE_DB){const flags=await createLiveService(this.env,null).availability(result.experience.eventId);result.experience.stations=result.experience.stations.map(s=>({...s,accepting:flags.find(f=>f.station_id===s.id)?.accepting!==0}));}
    return result;
  }
  async guestAction(action,input){
    try{
      const service=createLiveService({...this.env,MAIL_CONNECT:connect},runningContent(this.env),{defer:promise=>this.ctx.waitUntil(promise)});
      if(!['session','mine','submit','guestUpdate','guestNotice','roundAction','guestAnalysis','guestLogout','guestProfile','conversation','raffle','encounter','socialConversation','encounterSession','guestContactsAction'].includes(action))return {status:404,error:'Nicht gefunden.'};
      return {status:200,...await service[action](input)};
    }catch(error){return {status:error.status||503,error:error.status?error.message:'Die Nachricht konnte gerade nicht verarbeitet werden.'};}
  }
}
export default {fetch(request,env,ctx){return worker.fetch(request,{...env,MAIL_CONNECT:connect},ctx);},async scheduled(event,env,ctx){const client=createContentClient(env);const live=createLiveService(env,runningContent(env));ctx.waitUntil(live.notices.flush());ctx.waitUntil(live.raffles.retention());if(env.RUDELBAR_CONNECTED_SOCIAL==='1'){ctx.waitUntil(live.conversationPush.flush());ctx.waitUntil(live.wallNotices.flush());ctx.waitUntil(live.contextNotices.flush());ctx.waitUntil(live.contactNotices.flush());ctx.waitUntil(live.conversations.retention());ctx.waitUntil(live.socialRetention.run());}if(env.GUEST_MEDIA){const {wall,live:wallLive}=wallFor(env,runningContent(env));ctx.waitUntil(createWallArchive(env,{context:wallLive.internalContext,mayArchive:wall.mayArchive}).retention());}ctx.waitUntil(flushReleaseReceipts(client));ctx.waitUntil(createReporting(env.LIVE_DB).retention());ctx.waitUntil(createProviderMetrics(env).sync());ctx.waitUntil(expireLiveSignals(env));}};
