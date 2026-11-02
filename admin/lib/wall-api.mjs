import {createWallArchive} from './wall-archive.mjs';
import {createLiveService} from './live-service.mjs';
import {createWallService} from './wall-service.mjs';
import {fail,id,json,readJson} from './wall-policy.mjs';
export function wallFor(env,client,options={}){const live=createLiveService(env,client,options);return {wall:createWallService(env,{context:live.internalContext,visitor:live.internalVisitor}),live};}
export async function guestWallFetch(request,env,client,options={}){
 try{const url=new URL(request.url),eventId=id(url.searchParams.get('abend')),accessCode=url.searchParams.get('zugang')||'',{wall,live}=wallFor(env,client,options),token=request.headers.get('x-rudelbar-guest-token')||'';let person=null;if(token)try{person=await live.internalVisitor(eventId,token);}catch(error){if(request.method!=='GET')throw error;}
  const action=url.pathname.replace(/^\/api\/guest\/wall\/?/,'');
  if(request.method!=='GET'&&request.headers.get('origin')!==url.origin)fail('Ungültige Herkunft.',403);
  if(action==='state'&&request.method==='GET')return json(await wall.publicState(eventId,accessCode,person,{before:Number(url.searchParams.get('before')||0),stage:url.searchParams.get('stage')==='1'}));
  if(action==='socket'&&request.method==='GET'){if(request.headers.get('origin')!==url.origin)fail('Ungültige Herkunft.',403);const s=await wall.state(eventId,accessCode,person);if(!s.open)fail('Die Wall ist geschlossen.',410);if(!env.WALL_FEED)fail('Die Live-Verbindung wird noch eingerichtet.',503);const ns=env.LOCAL_PREVIEW?env.WALL_FEED:env.WALL_FEED.jurisdiction('eu'),room=ns.get(ns.idFromName(eventId)),headers=new Headers(request.headers);headers.set('x-wall-viewer',person?.profile_id||'');return await room.fetch(new Request('https://wall.internal/socket',{headers}));}
  const photo=action.match(/^media\/([a-z0-9-]+)\/(preview|original)$/i);if(photo&&request.method==='GET')return await wall.media(eventId,photo[1],photo[2],{person,accessCode});
  if(!person)fail('Bitte melde dich zuerst mit deinem Vornamen an.',401);
  if(action==='mine'&&request.method==='GET')return json(await wall.own(person));
  const upload=action.match(/^upload\/([a-z0-9-]+)\/(original|preview)$/i);if(upload&&request.method==='PUT')return json(await wall.upload(person,upload[1],upload[2],request));
  if(request.method==='POST'){const input=await readJson(request);if(action==='reserve')return json(await wall.reserve(person,input));if(action==='submit')return json(await wall.submit(person,input),201);if(action==='external-consent')return json(await wall.externalConsent(person,input));if(action==='withdraw')return json(await wall.withdraw(person,input));}
  fail('Nicht gefunden.',404);
 }catch(error){return json({error:error.status?error.message:'Die Wall ist gerade nicht erreichbar.'},error.status||503);}
}
export async function wallApi(request,env,{client,session,authorized}){
 const url=new URL(request.url),eventId=id(url.searchParams.get('abend')),user=await session(request,env);if(!user)return json({error:'Bitte anmelden.'},401);if(request.method!=='GET'){const auth=await authorized(request,env);if(auth.error)return auth.error;}const {wall,live}=wallFor(env,client),archive=createWallArchive(env,{context:live.internalContext,mayArchive:wall.mayArchive}),action=url.pathname.replace(/^\/api\/wall\/?/,'');
 if(action==='archive/export'&&request.method==='POST')return json(await archive.create(user,eventId,await readJson(request)));
 if(action==='archive/file'&&request.method==='GET')return archive.download(user,eventId,url.searchParams.get('export'),url.searchParams.get('path')||'');
 if(action==='archive/restore'&&request.method==='POST')return json(await archive.initialize(user,eventId,await readJson(request,1024*1024)));
 if(action==='archive/restore-file'&&request.method==='PUT')return json(await archive.upload(user,eventId,url.searchParams.get('restore'),url.searchParams.get('path')||'',request));
 if(action==='archive/finalize'&&request.method==='POST')return json(await archive.finalize(user,eventId,(await readJson(request)).id));
 if(action==='archive/list'&&request.method==='GET')return json(await archive.list(user,eventId));
 if(action==='archive/view'&&request.method==='GET'){const result=await archive.view(user,eventId,url.searchParams.get('restore'),url.searchParams.get('path')||'');return result instanceof Response?result:json(result);}
 const photo=action.match(/^media\/([a-z0-9-]+)\/(preview|original)$/i);if(photo&&request.method==='GET')return wall.media(eventId,photo[1],photo[2],{user});
 if(action==='moderation'&&['GET','POST'].includes(request.method))return json(await wall.moderate(user,eventId,request.method==='POST'?await readJson(request):{filter:url.searchParams.get('filter')||'all',before:Number(url.searchParams.get('before')||0)}));
 if(action==='controls'&&['GET','POST'].includes(request.method))return json(await wall.controls(user,eventId,request.method==='POST'?await readJson(request):undefined));
 if(action==='favorite'&&request.method==='POST')return json(await wall.favorite(user,eventId,await readJson(request)));
 fail('Nicht gefunden.',404);
}
