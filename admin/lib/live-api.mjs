import {createLiveService,liveCsrf} from './live-service.mjs';
import {validId} from '../../shared/experience.mjs';
const cookieName=id=>'rb_team_'+String(id||'').replace(/-/g,'');
const cookie=request=>{const id=new URL(request.url).searchParams.get('s')||'';if(!/^[a-f0-9-]{36}$/.test(id))return '';const name=cookieName(id)+'=';return (request.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(name))?.slice(name.length)||'';};
const sameOrigin=request=>request.headers.get('origin')===new URL(request.url).origin;
export async function liveApi(request,env,{client,json,session,data,service:providedService}){
  const url=new URL(request.url),path=url.pathname,service=providedService||createLiveService(env,client);
  if(path==='/api/live/login'&&request.method==='POST'){
    if(!sameOrigin(request))return json(403,{error:'Ungültige Herkunft.'});
    const input=await data(request),operator=await service.operator(input.code);
    return json(200,{ok:true,sessionId:operator.grantId,expiresAt:operator.expiresAt},{'Set-Cookie':`${cookieName(operator.grantId)}=${input.code}; HttpOnly; Secure; SameSite=Strict; Path=/api/live; Max-Age=43200`});
  }
  const user=await session(request,env),eventId=url.searchParams.get('abend')||'';
  let actor,csrf;
  if(user&&eventId){validId(eventId);actor=await service.publisher(eventId);csrf=user.csrf;}
  else {const token=cookie(request);actor=await service.operator(token);csrf=await liveCsrf(token);if(eventId&&eventId!==actor.eventId)return json(403,{error:'Dieser Zugang gehört zu einem anderen Abend.'});}
  if(request.method!=='GET'&&(!sameOrigin(request)||request.headers.get('x-csrf-token')!==csrf))return json(403,{error:'Bitte die Ansicht neu öffnen und erneut versuchen.'});
  if(path==='/api/live/session'&&request.method==='GET')return json(200,{...await service.staffContext(actor),csrf});
  if(path==='/api/live/logout'&&request.method==='POST')return json(200,{ok:true},{'Set-Cookie':`${cookieName(new URL(request.url).searchParams.get('s'))}=; HttpOnly; Secure; SameSite=Strict; Path=/api/live; Max-Age=0`});
  if(path==='/api/live/requests'&&request.method==='GET')return json(200,await service.inbox(actor));
  const match=path.match(/^\/api\/live\/requests\/([a-z0-9-]+)$/i);
  if(match){validId(match[1]);if(request.method==='GET')return json(200,await service.inbox(actor,{id:match[1]}));if(request.method==='POST')return json(200,await service.staffUpdate(actor,match[1],await data(request)));}
  const station=path.match(/^\/api\/live\/stations\/([a-z0-9-]+)$/i);
  if(station&&request.method==='POST'){validId(station[1]);return json(200,await service.stationState(actor,station[1],await data(request)));}
  return json(404,{error:'Nicht gefunden.'});
}
