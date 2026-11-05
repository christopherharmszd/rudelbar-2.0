import {createLiveService} from './live-service.mjs';
import {id,json,readJson,fail} from './wall-policy.mjs';
export async function raffleApi(request,env,{client,session,authorized}){
 const url=new URL(request.url),eventId=id(url.searchParams.get('abend')),user=await session(request,env);
 if(!user)return json({error:'Bitte anmelden.'},401);
 if(request.method!=='GET'){const auth=await authorized(request,env);if(auth.error)return auth.error;}
 const live=createLiveService(env,client);await (user.accountId?live.accountActor(eventId,user):live.publisher(eventId));
 const service=live.raffles;if(!service.mayRun(user,eventId))fail('Für diese Gewinnaktionen hast du keine Berechtigung.',403);
 const action=url.pathname.replace(/^\/api\/raffle\//,''),configId=url.searchParams.get('aktion')||'';
 if(action==='actions'&&request.method==='GET')return json(await service.catalog(user,eventId));
 if(action==='show'&&request.method==='GET')return json(await service.results({event_id:eventId},id(configId)));
 if(action==='state'&&request.method==='GET')return json(await service.staff(user,eventId,id(configId)));
 if(action==='proof'&&request.method==='GET')return json(await service.proof(user,eventId,id(configId),url.searchParams.get('ziehung')));
 if(request.method!=='POST')fail('Nicht gefunden.',404);
 const input=await readJson(request);id(configId);
 if(action==='start')return json(await service.start(user,eventId,configId));
 if(action==='issue')return json(await service.issue(user,eventId,configId,input));
 if(action==='freeze')return json(await service.freeze(user,eventId,configId,input));
 if(action==='end')return json(await service.end(user,eventId,configId,input));
 if(action==='draw')return json(await service.draw(user,eventId,configId,input));
 if(['settle','redeem','cancel'].includes(action))return json(await service.mutation(user,eventId,configId,input,action));
 fail('Nicht gefunden.',404);
}
