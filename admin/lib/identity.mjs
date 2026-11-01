import * as oauth from 'oauth4webapi';
import {createAccounts,identityConfigured,cookieValue,accountCookie,random,hash,fail} from './accounts.mjs';
const flowCookie=(token,age=600)=>`rb_auth_flow=${token}; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=${age}`;
const redirect=(location,cookies=[])=>{const headers=new Headers({'Location':location,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});for(const cookie of cookies)headers.append('Set-Cookie',cookie);return new Response(null,{status:303,headers});};
export async function identityApi(request,env,{accounts=createAccounts(env),json,data,options={}}){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/api/auth/config'&&request.method==='GET')return json(200,{configured:identityConfigured(env),legacyEnabled:true});
 if(!identityConfigured(env))return json(503,{error:'Der persönliche Anmeldedienst ist noch nicht verbunden. Der Zugang Redaktion bleibt verfügbar.'});
 const issuer=new URL(env.OIDC_ISSUER),client={client_id:env.OIDC_CLIENT_ID},callback=url.origin+'/api/auth/callback',db=env.LIVE_DB;
 if(path==='/api/auth/start'&&['GET','POST'].includes(request.method)){
  if(request.method==='POST'&&request.headers.get('origin')!==url.origin)return json(403,{error:'Ungültige Herkunft.'});
  const rate=await env.LOGIN_LIMITER.limit({key:'oidc:'+(request.headers.get('cf-connecting-ip')||'unknown')});if(!rate.success)return json(429,{error:'Bitte warte kurz vor einer weiteren Anmeldung.'});
  const input=request.method==='POST'?await data(request):{},invitation=input.invitation||'';
  if(invitation&&!/^[a-f0-9]{64}$/.test(invitation))fail('Die Einladung ist ungültig.');
  const as=await oauth.discoveryRequest(issuer,options).then(r=>oauth.processDiscoveryResponse(issuer,r));
  const verifier=oauth.generateRandomCodeVerifier(),state=oauth.generateRandomState(),nonce=oauth.generateRandomNonce(),token=random(),now=Date.now();
  await db.prepare('DELETE FROM app_auth_flows WHERE expires_at<?').bind(now).run();
  await db.prepare('INSERT INTO app_auth_flows(id,token_hash,state,verifier,nonce,invitation_hash,return_path,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),await hash(token),state,verifier,nonce,invitation?await hash(invitation):'','/abendplan',now,now+600000).run();
  const target=new URL(as.authorization_endpoint);target.searchParams.set('client_id',client.client_id);target.searchParams.set('redirect_uri',callback);target.searchParams.set('response_type','code');target.searchParams.set('scope','openid email profile');target.searchParams.set('state',state);target.searchParams.set('nonce',nonce);target.searchParams.set('code_challenge',await oauth.calculatePKCECodeChallenge(verifier));target.searchParams.set('code_challenge_method','S256');
  if(request.method==='POST')return json(200,{url:target.href},{'Set-Cookie':flowCookie(token)});
  return redirect(target.href,[flowCookie(token)]);
 }
 if(path==='/api/auth/callback'&&request.method==='GET'){
  try{
   const token=cookieValue(request,'rb_auth_flow');if(!/^[a-f0-9]{64}$/.test(token))fail('Die Anmeldung ist abgelaufen. Bitte starte sie erneut.',401);
   const flow=await db.prepare('SELECT * FROM app_auth_flows WHERE token_hash=? AND used=0 AND expires_at>?').bind(await hash(token),Date.now()).first();if(!flow)fail('Die Anmeldung ist abgelaufen. Bitte starte sie erneut.',401);
   const as=await oauth.discoveryRequest(issuer,options).then(r=>oauth.processDiscoveryResponse(issuer,r));
   const params=oauth.validateAuthResponse(as,client,url,flow.state);
   const consumed=await db.prepare('UPDATE app_auth_flows SET used=1 WHERE id=? AND used=0 AND expires_at>?').bind(flow.id,Date.now()).run();if(!consumed.meta.changes)fail('Diese Anmeldung wurde bereits verwendet.',401);
   const response=await oauth.authorizationCodeGrantRequest(as,client,oauth.ClientSecretPost(env.OIDC_CLIENT_SECRET),params,callback,flow.verifier,options);
   const result=await oauth.processAuthorizationCodeResponse(as,client,response,{expectedNonce:flow.nonce,requireIdToken:true});
   await oauth.validateApplicationLevelSignature(as,response,options);
   const claims=oauth.getValidatedIdTokenClaims(result);
   const login=await accounts.authenticate({issuer:as.issuer,subject:claims.sub,email:claims.email,emailVerified:claims.email_verified,invitationHash:flow.invitation_hash});
   return redirect(flow.return_path,[accountCookie(login.token),flowCookie('',0),'rb_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0']);
  }catch(error){
   // Provider errors can contain credentials or response bodies. Never log them.
   console.warn('Rudelbar personal sign-in rejected',{name:error.name,status:error.status||401});
   return redirect('/abendplan?loginError='+encodeURIComponent(error.status?error.message:'Die persönliche Anmeldung konnte nicht abgeschlossen werden. Bitte erneut versuchen.'),[flowCookie('',0)]);
  }
 }
 return json(404,{error:'Nicht gefunden.'});
}
