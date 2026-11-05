export async function passwordApi(request,env,{accounts,json,data,session,authorized,defer}){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/api/auth/config'&&request.method==='GET')return json(200,{configured:true,method:'password',mailReady:(await accounts.mail.settings()).ready,legacyEnabled:true});
 if(request.method!=='POST')return json(404,{error:'Nicht gefunden.'});
 if(request.headers.get('origin')!==url.origin)return json(403,{error:'Ungültige Herkunft.'});
 const input=await data(request);if(!input||typeof input!=='object'||Array.isArray(input))return json(400,{error:'Ungültige Eingabe.'});
 if(path==='/api/auth/change'){
  const auth=await authorized(request,env);if(auth.error)return auth.error;
  const result=await accounts.change(auth.user,input);
  return json(200,result,{'Set-Cookie':'rb_account=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});
 }
 const rate=await env.LOGIN_LIMITER.limit({key:'password:'+path+':'+(request.headers.get('cf-connecting-ip')||'unknown')});
 if(!rate.success)return json(429,{error:'Bitte warte kurz vor einem weiteren Versuch.'});
 if(path==='/api/auth/link')return json(200,await accounts.inspect(input.token));
 if(path==='/api/auth/complete')return json(200,await accounts.complete(input));
 if(path==='/api/auth/forgot'){
  if(!(await accounts.mail.settings()).ready)return json(503,{error:'Der E-Mail-Versand ist noch nicht eingerichtet. Bitte wende dich an die Administration.'});
  const work=accounts.forgot(input.email,url.origin).catch(()=>{console.warn('Passwort-Link konnte nicht bearbeitet werden.');});
  if(defer)defer(work);else await work;
  return json(200,{ok:true,message:'Wenn ein freigegebenes Konto mit dieser Adresse existiert, erhältst du einen Passwort-Link. Bitte prüfe auch deinen Spam-Ordner.'});
 }
 return json(404,{error:'Nicht gefunden.'});
}
