import {managesUsers,requirePermission} from './permissions.mjs';
export async function accountsApi(request,env,{accounts,json,session,authorized,data}){
 const user=await session(request,env);if(!user)return json(401,{error:'Bitte anmelden.'});requirePermission(managesUsers(user));
 if(request.method!=='GET'){const auth=await authorized(request,env);if(auth.error)return auth.error;}
 const path=new URL(request.url).pathname;
 if(path==='/api/accounts'){
  if(request.method==='GET')return json(200,await accounts.list());
  if(request.method==='POST')return json(201,await accounts.save(user,await data(request)));
 }
 if(path==='/api/accounts/audit'&&request.method==='GET')return json(200,await accounts.history(user));
 if(path==='/api/accounts/mail'){
  if(request.method==='GET')return json(200,await accounts.mail.settings());
  if(request.method==='PUT')return json(200,await accounts.mail.save(user,await data(request)));
 }
 const match=path.match(/^\/api\/accounts\/([a-f0-9-]{36})(?:\/(invite|revoke))?$/);if(!match)return json(404,{error:'Nicht gefunden.'});
 if(request.method==='PUT'&&!match[2])return json(200,await accounts.save(user,await data(request),match[1]));
 if(request.method==='POST'&&match[2]==='invite'){
  const result=await accounts.invite(user,match[1],{...await data(request),origin:new URL(request.url).origin});
  return json(201,{expiresAt:result.expiresAt,...(result.token?{url:new URL(request.url).origin+'/einladung#'+result.token}:{delivery:result.delivery})});
 }
 if(request.method==='POST'&&match[2]==='revoke')return json(200,await accounts.revoke(user,match[1]));
 return json(405,{error:'Diese Aktion ist nicht verfügbar.'});
}
