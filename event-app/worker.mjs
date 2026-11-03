import {validId} from '../shared/experience.mjs';
const json=(status,data,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...headers}});
const idForWall=value=>validId(value);
const cookieName=id=>'rbv_'+id.replace(/-/g,'');
const tokenFor=(request,eventId)=>{const name=cookieName(eventId)+'=';return (request.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(name))?.slice(name.length)||'';};
async function body(request){const bytes=await request.arrayBuffer();if(bytes.byteLength>12000)throw Object.assign(new Error('Die Nachricht ist zu lang.'),{status:413});try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw Object.assign(new Error('Ungültige Eingabe.'),{status:400});}}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
    try{
      if(!env.CONTENT)return json(503,{error:'Die Verbindung zum Abend wird gerade eingerichtet.'});
      if(url.pathname==='/api/experience'||url.pathname==='/api/manifest'){
        if(request.method!=='GET')return json(405,{error:'Nur Lesen ist möglich.'});
        const eventId=url.searchParams.get('abend')||'',accessCode=url.searchParams.get('zugang')||'';
        if(eventId)validId(eventId);if(accessCode.length>100)return json(400,{error:'Ungültiger Gäste-Link.'});
        const {status=200,...result}=await env.CONTENT.getExperience({eventId,accessCode,sessionToken:eventId?tokenFor(request,eventId):''});
        if(url.pathname==='/api/manifest'&&status===200){const id=eventId||result.experience?.eventId||'',start='/?abend='+encodeURIComponent(id)+(accessCode?'&zugang='+encodeURIComponent(accessCode):'');return json(200,{id:'/?abend='+encodeURIComponent(id),name:'Rudelbar · Dein Abend',short_name:'Rudelbar',start_url:start,scope:'/',display:'standalone',background_color:'#0d0d0d',theme_color:'#0d0d0d',icons:[{src:'/assets/rudelbar-logo.png',sizes:'2400x2400',type:'image/png',purpose:'any'}]},{'Content-Type':'application/manifest+json'});}
        return json(status,result);
      }
      if(url.pathname.startsWith('/api/guest/wall/')){
       if(!['GET','POST','PUT'].includes(request.method))return json(405,{error:'Diese Aktion ist nicht verfügbar.'});
       if(request.method!=='GET'&&request.headers.get('origin')!==url.origin)return json(403,{error:'Ungültige Herkunft.'});
       const wallEvent=idForWall(url.searchParams.get('abend')),headers=new Headers(request.headers);headers.delete('cookie');headers.delete('authorization');headers.set('x-rudelbar-guest-token',tokenFor(request,wallEvent));
       return await env.CONTENT.fetch(new Request(request,{headers}));
      }
      if(!url.pathname.startsWith('/api/guest/'))return json(404,{error:'Nicht gefunden.'});
      if(!['GET','POST'].includes(request.method))return json(405,{error:'Diese Aktion ist nicht verfügbar.'});
      if(request.method==='POST'&&request.headers.get('origin')!==url.origin)return json(403,{error:'Ungültige Herkunft.'});
      const input=request.method==='POST'?await body(request):{},eventId=validId(input.eventId||url.searchParams.get('abend'));
      const name=cookieName(eventId),sessionToken=tokenFor(request,eventId);
      if(url.pathname==='/api/guest/logout'&&request.method==='POST'){if(sessionToken){const revoked=await env.CONTENT.guestAction('guestLogout',{eventId,sessionToken});if(revoked.status&&![200,401].includes(revoked.status))return json(503,{error:'Die Abmeldung konnte gerade nicht bestätigt werden. Bitte erneut versuchen.'});}const response=json(200,{ok:true});for(const path of ['/','/api/guest'])response.headers.append('Set-Cookie',`${name}=; HttpOnly; Secure; SameSite=Strict; Path=${path}; Max-Age=0`);return response;}
      const args={...input,eventId,sessionToken};
      if(url.pathname==='/api/guest/rounds'){args.operation=input.operation||'list';for(const key of ['offerType','offerId','boothId'])if(!args[key])args[key]=url.searchParams.get(key);if(!args.accessCode)args.accessCode=url.searchParams.get('zugang')||'';}
      let action;
      if(url.pathname==='/api/guest/encounters'){action='encounter';args.operation=request.method==='GET'?(url.searchParams.get('operation')||'mine'):input.operation;if(url.searchParams.has('mode'))args.mode=url.searchParams.get('mode');}
      if(url.pathname==='/api/guest/encounter-sessions'){action='encounterSession';args.operation=request.method==='GET'?'list':input.operation;}
      if(url.pathname==='/api/guest/social'){action='socialConversation';args.operation=request.method==='GET'?(url.searchParams.has('contextId')?'read':'list'):input.operation;for(const key of ['contextId','before'])if(url.searchParams.has(key))args[key]=key==='before'?Number(url.searchParams.get(key)):url.searchParams.get(key);}
      if(url.pathname==='/api/guest/raffles'){action='raffle';args.operation=request.method==='GET'?(url.searchParams.get('operation')||'list'):input.operation;if(url.searchParams.has('aktion'))args.configId=url.searchParams.get('aktion');}
      if(url.pathname==='/api/guest/rounds')action='roundAction';
      if(url.pathname==='/api/guest/session'&&request.method==='POST')action='session';
      if(url.pathname==='/api/guest/requests')action=request.method==='GET'?'mine':'submit';
      const match=url.pathname.match(/^\/api\/guest\/requests\/([a-z0-9-]+)$/i);
      if(match){args.id=validId(match[1]);action=request.method==='GET'?'mine':'guestUpdate';}
      if(url.pathname==='/api/guest/notifications'&&request.method==='GET'){action='guestNotice';args.action='list';}
      const notice=url.pathname.match(/^\/api\/guest\/notifications\/(read|settings|subscribe|unsubscribe|test)$/);
      if(notice&&request.method==='POST'){action='guestNotice';args.action=notice[1]==='read'?'mark':notice[1];args.input=input;}
      if(url.pathname==='/api/guest/analysis'){action='guestAnalysis';args.operation=request.method==='GET'?'settings':input.operation;args.input=input;}
      if(url.pathname==='/api/guest/profile'){action='guestProfile';args.operation=request.method==='GET'?'read':input.operation;args.input=input;}
      if(url.pathname==='/api/guest/conversations'){action='conversation';args.operation=request.method==='GET'?(url.searchParams.get('conversationId')||url.searchParams.get('referenceId')?'read':'list'):input.operation;for(const key of ['conversationId','referenceId','kind','before'])if(url.searchParams.has(key))args[key]=url.searchParams.get(key);}
      if(!action)return json(404,{error:'Nicht gefunden.'});
      const {status=200,sessionToken:createdToken,expiresAt,...result}=await env.CONTENT.guestAction(action,args);
      const rootToken=createdToken||(action==='guestNotice'&&status===200?sessionToken:'');
      const headers=rootToken?{'Set-Cookie':`${name}=${rootToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${Math.max(1,Math.floor((expiresAt-Date.now())/1000))}`}:{ };
      const response=json(status,result,headers);if(rootToken)response.headers.append('Set-Cookie',`${name}=; HttpOnly; Secure; SameSite=Strict; Path=/api/guest; Max-Age=0`);return response;
    }catch(error){return json(error.status||503,{error:error.status?error.message:'Der Abend kann gerade nicht geladen werden.'});}
  }
};
