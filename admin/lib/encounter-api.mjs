import {createLiveService} from './live-service.mjs';
import {id,json,readJson,fail} from './wall-policy.mjs';
export async function encounterMediaFetch(request,env,client,options={}){
 try{const url=new URL(request.url),eventId=id(url.searchParams.get('abend')),live=createLiveService(env,client,options),person=await live.internalVisitor(eventId,request.headers.get('x-rudelbar-guest-token')||''),action=url.pathname.replace(/^\/api\/guest\/encounter-media\//,'');if(request.method!=='GET'&&request.headers.get('origin')!==url.origin)fail('Ungültige Herkunft.',403);
  if(action==='photo'&&request.method==='GET')return live.encounterMedia.read(person,{profileId:url.searchParams.get('profil')});
  if(action==='upload'&&request.method==='PUT')return json(await live.encounterMedia.upload(person,url.searchParams.get('foto'),request));
  if(action==='reserve'&&request.method==='POST')return json(await live.encounterMedia.reserve(person,await readJson(request)));
  if(action==='report'&&request.method==='POST')return json(await live.encounterMedia.report(person,await readJson(request)));
  fail('Nicht gefunden.',404);
 }catch(e){return json({error:e.status?e.message:'Das private Foto ist gerade nicht verfügbar.'},e.status||503);}
}
export async function encounterApi(request,env,{client,session,authorized}){
 const url=new URL(request.url),eventId=id(url.searchParams.get('abend')),user=await session(request,env);if(!user)return json({error:'Bitte anmelden.'},401);if(request.method!=='GET'){const auth=await authorized(request,env);if(auth.error)return auth.error;}
 const live=createLiveService(env,client);await (user.accountId?live.accountActor(eventId,user):live.publisher(eventId));const action=url.pathname.replace(/^\/api\/encounters\//,'');
 if(action==='reported-photo'&&request.method==='GET')return live.encounterMedia.reported(user,eventId,url.searchParams.get('meldung'));
 if(action==='sessions'&&request.method==='GET')return json(await live.encounterSessions.catalog(user,eventId));
 if(action==='session'&&request.method==='GET')return json(await live.encounterSessions.staff(user,eventId,{sessionId:url.searchParams.get('runde')}));
 if(action==='open'&&request.method==='POST')return json(await live.encounterSessions.open(user,eventId,await readJson(request)));
 if(action==='session'&&request.method==='POST')return json(await live.encounterSessions.staff(user,eventId,await readJson(request)));
 fail('Nicht gefunden.',404);
}
