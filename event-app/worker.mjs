import { publicExperience, validId } from '../shared/experience.mjs';

const json=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
    if(url.pathname!=='/api/experience')return json(404,{error:'Nicht gefunden.'});
    if(request.method!=='GET')return json(405,{error:'Nur Lesen ist möglich.'});
    try{
      const id=url.searchParams.get('abend');
      if(id)validId(id);
      // Only published documents are queried. No editorial credential reaches the browser.
      const filter=id?' && eventId == $id':'';
      const query=`*[_type == "rudelAppExperience" && enabled == true${filter} && !(_id in path("drafts.**"))] | order(_updatedAt desc){..., "event": *[_id == ^.eventId && _type == "rudelEvent" && archived != true][0]}`;
      const upstream=new URL(`https://${env.SANITY_PROJECT_ID}.api.sanity.io/v2025-02-19/data/query/${env.SANITY_DATASET}`);
      upstream.searchParams.set('perspective','published');
      upstream.searchParams.set('query',query);
      if(id)upstream.searchParams.set('$id',JSON.stringify(id));
      const response=await fetch(upstream,{headers:env.SANITY_READ_TOKEN?{Authorization:`Bearer ${env.SANITY_READ_TOKEN}`}:{}});
      if(!response.ok)return json(503,{error:'Der Abend kann gerade nicht geladen werden. Bitte versuche es gleich noch einmal.'});
      const {result}=await response.json();
      const experience=(result||[]).map(doc=>publicExperience(doc,doc.event)).find(Boolean);
      return experience?json(200,{experience}):json(404,{error:'Für diesen Abend ist noch kein Programm veröffentlicht.'});
    }catch(error){return json(error.status===400?400:503,{error:error.status===400?error.message:'Der Abend kann gerade nicht geladen werden.'});}
  }
};
