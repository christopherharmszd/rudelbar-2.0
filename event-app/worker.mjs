import {validId} from '../shared/experience.mjs';
const json=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
    if(url.pathname!=='/api/experience')return json(404,{error:'Nicht gefunden.'});
    if(request.method!=='GET')return json(405,{error:'Nur Lesen ist möglich.'});
    try{
      const eventId=url.searchParams.get('abend')||'',accessCode=url.searchParams.get('zugang')||'';
      if(eventId)validId(eventId);
      if(accessCode.length>100)return json(400,{error:'Ungültiger Gäste-Link.'});
      if(!env.CONTENT)return json(503,{error:'Die Verbindung zum Abend wird gerade eingerichtet.'});
      const {status=200,...result}=await env.CONTENT.getExperience({eventId,accessCode});
      return json(status,result);
    }catch(error){return json(error.status===400?400:503,{error:error.status===400?error.message:'Der Abend kann gerade nicht geladen werden.'});}
  }
};
