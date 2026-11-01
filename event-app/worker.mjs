import {validId} from '../shared/experience.mjs';
const json=(status,data,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...headers}});
const cookieName=id=>'rbv_'+id.replace(/-/g,'');
async function body(request){const bytes=await request.arrayBuffer();if(bytes.byteLength>12000)throw Object.assign(new Error('Die Nachricht ist zu lang.'),{status:413});try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw Object.assign(new Error('Ungültige Eingabe.'),{status:400});}}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
    try{
      if(!env.CONTENT)return json(503,{error:'Die Verbindung zum Abend wird gerade eingerichtet.'});
      if(url.pathname==='/api/experience'){
        if(request.method!=='GET')return json(405,{error:'Nur Lesen ist möglich.'});
        const eventId=url.searchParams.get('abend')||'',accessCode=url.searchParams.get('zugang')||'';
        if(eventId)validId(eventId);if(accessCode.length>100)return json(400,{error:'Ungültiger Gäste-Link.'});
        const {status=200,...result}=await env.CONTENT.getExperience({eventId,accessCode});return json(status,result);
      }
      if(!url.pathname.startsWith('/api/guest/'))return json(404,{error:'Nicht gefunden.'});
      if(!['GET','POST'].includes(request.method))return json(405,{error:'Diese Aktion ist nicht verfügbar.'});
      if(request.method==='POST'&&request.headers.get('origin')!==url.origin)return json(403,{error:'Ungültige Herkunft.'});
      const input=request.method==='POST'?await body(request):{},eventId=validId(input.eventId||url.searchParams.get('abend'));
      const name=cookieName(eventId),cookie=(request.headers.get('cookie')||'').split(';').map(p=>p.trim()).find(p=>p.startsWith(name+'='));
      const sessionToken=cookie?cookie.slice(name.length+1):'';
      if(url.pathname==='/api/guest/logout'&&request.method==='POST')return json(200,{ok:true},{'Set-Cookie':`${name}=; HttpOnly; Secure; SameSite=Strict; Path=/api/guest; Max-Age=0`});
      const args={...input,eventId,sessionToken};
      let action;
      if(url.pathname==='/api/guest/session'&&request.method==='POST')action='session';
      if(url.pathname==='/api/guest/requests')action=request.method==='GET'?'mine':'submit';
      const match=url.pathname.match(/^\/api\/guest\/requests\/([a-z0-9-]+)$/i);
      if(match){args.id=validId(match[1]);action=request.method==='GET'?'mine':'guestUpdate';}
      if(!action)return json(404,{error:'Nicht gefunden.'});
      const {status=200,sessionToken:createdToken,expiresAt,...result}=await env.CONTENT.guestAction(action,args);
      const headers=createdToken?{'Set-Cookie':`${name}=${createdToken}; HttpOnly; Secure; SameSite=Strict; Path=/api/guest; Max-Age=${Math.max(1,Math.floor((expiresAt-Date.now())/1000))}`}:{ };
      return json(status,result,headers);
    }catch(error){return json(error.status||503,{error:error.status?error.message:'Der Abend kann gerade nicht geladen werden.'});}
  }
};
