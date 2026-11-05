import {createLiveService,liveCsrf} from './live-service.mjs';
import {validId} from '../../shared/experience.mjs';
import {createAccounts,accountCookie} from './accounts.mjs';
const cookieName=id=>'rb_team_'+String(id||'').replace(/-/g,'');
const cookie=request=>{const id=new URL(request.url).searchParams.get('s')||'';if(!/^[a-f0-9-]{36}$/.test(id))return '';const name=cookieName(id)+'=';return (request.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(name))?.slice(name.length)||'';};
const sameOrigin=request=>request.headers.get('origin')===new URL(request.url).origin;
export async function liveApi(request,env,{client,json,session,data,service:providedService,defer}){
  const url=new URL(request.url),path=url.pathname,service=providedService||createLiveService(env,client,{defer});
  if(path==='/api/live/login'&&request.method==='POST'){
    if(!sameOrigin(request))return json(403,{error:'Ungültige Herkunft.'});
    const input=await data(request),operator=await service.operator(input.code);
    return json(200,{ok:true,sessionId:operator.grantId,expiresAt:operator.expiresAt},{'Set-Cookie':`${cookieName(operator.grantId)}=${input.code}; HttpOnly; Secure; SameSite=Strict; Path=/api/live; Max-Age=43200`});
  }
  const user=await session(request,env),eventId=url.searchParams.get('abend')||'';
  let actor,csrf;
  if(user&&eventId){validId(eventId);actor=user.accountId?await service.accountActor(eventId,user):await service.publisher(eventId);actor.expiresAt=user.exp;actor.authVersion=user.ver;csrf=user.csrf;}
  else {const token=cookie(request);actor=await service.operator(token);csrf=await liveCsrf(token);if(eventId&&eventId!==actor.eventId)return json(403,{error:'Dieser Zugang gehört zu einem anderen Abend.'});}
  if(request.method!=='GET'&&(!sameOrigin(request)||request.headers.get('x-csrf-token')!==csrf))return json(403,{error:'Bitte die Ansicht neu öffnen und erneut versuchen.'});
  if(path==='/api/live/session'&&request.method==='GET')return json(200,{...await service.staffContext(actor),csrf});
  if(path==='/api/live/manifest'&&request.method==='GET')return json(200,{id:'/team',name:'Rudelbar Team',short_name:'Rudelbar Team',start_url:actor.accountId||actor.publisher?'/team?abend='+actor.eventId:'/team?s='+actor.grantId,scope:'/',display:'standalone',background_color:'#10100f',theme_color:'#10100f',icons:[{src:'/abend-preview/assets/rudelbar-logo.png',sizes:'2400x2400',type:'image/png',purpose:'any'}]},{'Content-Type':'application/manifest+json'});
  if(path==='/api/live/notifications'&&request.method==='GET')return json(200,{...await service.notices.list(service.recipient(actor)),...await service.notices.settings(service.recipient(actor))});
  const notice=path.match(/^\/api\/live\/notifications\/(read|settings|subscribe|unsubscribe|test)$/);
  if(notice&&request.method==='POST')return json(200,await service.notices[notice[1]==='read'?'mark':notice[1]](service.recipient(actor),await data(request)));
  if(path==='/api/live/logout'&&request.method==='POST'){const input=await data(request);if(input.endpoint)await service.notices.unsubscribe(service.recipient(actor),{endpoint:input.endpoint});if(actor.accountId){await createAccounts(env).logout(user);return json(200,{ok:true},{'Set-Cookie':accountCookie('',0)});}return json(200,{ok:true},{'Set-Cookie':`${cookieName(new URL(request.url).searchParams.get('s'))}=; HttpOnly; Secure; SameSite=Strict; Path=/api/live; Max-Age=0`});}
  if(path==='/api/live/encounters'&&['GET','POST'].includes(request.method)){const user=actor.user||(actor.publisher?{name:'Redaktion'}:{accountId:'grant',roles:[]}),input=request.method==='POST'?await data(request):null;if(input?.action==='open')return json(200,await service.encounterSessions.open(user,actor.eventId,input));if(input||url.searchParams.has('runde'))return json(200,await service.encounterSessions.staff(user,actor.eventId,input||{sessionId:url.searchParams.get('runde')}));return json(200,await service.encounterSessions.catalog(user,actor.eventId));}
  if(path==='/api/live/reports'&&['GET','POST'].includes(request.method))return json(200,await service.staffReports(actor,request.method==='POST'?await data(request):{}));
  if(path==='/api/live/rounds'&&request.method==='GET')return json(200,await service.staffRounds(actor));
  if(path==='/api/live/rounds'&&request.method==='POST')return json(200,await service.staffRounds(actor,await data(request)));
  if(path==='/api/live/requests'&&request.method==='GET')return json(200,await service.inbox(actor));
  const photo=path.match(/^\/api\/live\/stations\/([a-z0-9-]+)\/photo$/i);
  if(photo&&request.method==='POST'){
    const id=validId(photo[1]);service.requireStationPhoto(actor,id);
    const mime=request.headers.get('content-type');if(!['image/jpeg','image/png','image/webp'].includes(mime))return json(400,{error:'Bitte JPG, PNG oder WebP verwenden.'});
    const declared=Number(request.headers.get('content-length')||0);if(declared>8_000_000)return json(413,{error:'Bitte ein Bild unter 8 MB wählen.'});const bytes=new Uint8Array(await request.arrayBuffer());if(!bytes.length||bytes.length>8_000_000)return json(413,{error:'Bitte ein Bild unter 8 MB wählen.'});
    const revision=Number(request.headers.get('x-photo-revision'));if(!request.headers.has('x-photo-revision')||!Number.isInteger(revision)||revision<0)return json(400,{error:'Bitte die Station erneut öffnen.'});
    const file=String(request.headers.get('x-file-name')||'station.jpg').replace(/[^a-z0-9._-]/gi,'-').slice(0,160),uploaded=await client.uploadImage(bytes,mime,file);
    return json(200,await service.saveStationPhoto(actor,id,{imageUrl:uploaded.url,revision}));
  }
  const match=path.match(/^\/api\/live\/requests\/([a-z0-9-]+)$/i);
  if(match){validId(match[1]);if(request.method==='GET')return json(200,await service.inbox(actor,{id:match[1]}));if(request.method==='POST')return json(200,await service.staffUpdate(actor,match[1],await data(request)));}
  const station=path.match(/^\/api\/live\/stations\/([a-z0-9-]+)$/i);
  if(station&&request.method==='POST'){validId(station[1]);return json(200,await service.stationState(actor,station[1],await data(request)));}
  return json(404,{error:'Nicht gefunden.'});
}
