import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as oauth from 'oauth4webapi';
import {sqliteD1} from './sqlite-d1.mjs';
import {createAccounts,hash,accountCookie} from '../lib/accounts.mjs';
import {identityApi} from '../lib/identity.mjs';
import {editsContent,managesEvent,managesUsers} from '../lib/permissions.mjs';
import {createLiveService} from '../lib/live-service.mjs';
import {experienceApi} from '../lib/experience-api.mjs';
import {liveApi} from '../lib/live-api.mjs';
const schema=(await Promise.all(['0001_live_stations','0002_notifications','0003_accounts'].map(name=>readFile(new URL('../migrations/'+name+'.sql',import.meta.url),'utf8')))).join('\n');
const legacy={sub:'redaktion@rudelbar.local',name:'Redaktion',csrf:'legacy-csrf'},origin='https://cms.example.test';
const json=(status,body,headers={})=>Response.json(body,{status,headers}),status=expected=>error=>error.status===expected;
function setup(){
 const db=sqliteD1();db.connection.exec(schema);
 const profiles=[{personId:'person-a',name:'Alex',email:'alex@example.invalid'},{personId:'person-b',name:'Nora',email:'nora@example.invalid'}];
 const event={eventId:'evening-a',teamIds:['person-a','person-b'],title:'Unser Abend',venue:'Dorf',visibility:'private',accessCode:'never-public'};
 const ctx={event,release:{state:'open'},people:profiles,stations:[{id:'dj',name:'DJ',kind:'music',operatorIds:['person-a'],enabled:true},{id:'karaoke',name:'Karaoke',kind:'karaoke',operatorIds:['person-b'],enabled:true},{id:'team',name:'Team',kind:'message',operatorIds:[],enabled:true}]};
 const env={LIVE_DB:db,OIDC_ISSUER:'https://identity.example.test/',OIDC_CLIENT_ID:'rudelbar-test-client',OIDC_CLIENT_SECRET:'test-only-client-secret',LOGIN_LIMITER:{limit:async()=>({success:true})}};
 const service=createAccounts(env,{people:async()=>profiles,events:async()=>[event,{eventId:'evening-b',teamIds:[]}]});
 const live=createLiveService(env,null,{getContext:async id=>{if(id!==event.eventId)throw Object.assign(new Error('Unknown evening'),{status:404});return ctx;}});
 const create=async(roles=[{role:'station',eventId:'evening-a'}],personId='person-a')=>(await service.save(legacy,{personId,email:profiles.find(p=>p.personId===personId).email,roles})).account;
 const signIn=async account=>{const invite=await service.invite(legacy,account.id);return service.authenticate({issuer:env.OIDC_ISSUER,subject:'identity-'+account.id,email:account.email,emailVerified:true,invitationHash:await hash(invite.token)});};
 const user=async login=>service.session(new Request(origin,{headers:{cookie:accountCookie(login.token)}}));
 return {db,env,service,create,signIn,user,profiles,event,ctx,live,close:()=>db.connection.close()};
}
test('personal accounts bind a verified identity once; invitation tokens and sessions are stored hashed',async()=>{
 const s=setup();try{
  const account=await s.create(),invite=await s.service.invite(legacy,account.id),input={issuer:s.env.OIDC_ISSUER,subject:'provider-user',email:account.email,emailVerified:true,invitationHash:await hash(invite.token)};
  await assert.rejects(()=>s.service.authenticate({...input,emailVerified:false}),status(403));
  await assert.rejects(()=>s.service.authenticate({...input,email:'nora@example.invalid'}),status(403));
  const login=await s.service.authenticate(input),user=await s.user(login);assert.equal(user.accountId,account.id);assert.equal(user.personId,'person-a');assert.equal(user.name,'Alex');
  await assert.rejects(()=>s.service.authenticate({...input,subject:'other-identity'}),status(403));
  assert.ok((await s.service.authenticate({...input,invitationHash:''})).token,'known subject signs in without invitation');
  const stored=JSON.stringify(s.db.connection.prepare('SELECT * FROM app_sessions').all())+JSON.stringify(s.db.connection.prepare('SELECT * FROM app_invitations').all());assert.ok(!stored.includes(login.token));assert.ok(!stored.includes(invite.token));
  const list=JSON.stringify(await s.service.list());assert.ok(!list.includes('token_hash'));assert.ok(!list.includes(login.token));assert.ok(!list.includes('provider-user'));
 }finally{s.close();}
});
test('account changes also revoke old station links; disabled profiles cannot receive a fresh link',async()=>{
 const s=setup();try{
  const account=await s.create(),grant=await s.live.issueGrant('evening-a','person-a');assert.equal((await s.live.operator(grant.code)).personId,'person-a');
  const updated=await s.service.save(legacy,{...account,enabled:false},account.id);await assert.rejects(()=>s.live.operator(grant.code),status(401));await assert.rejects(()=>s.live.issueGrant('evening-a','person-a'),status(403));
  await s.service.save(legacy,{...updated.account,enabled:true},account.id);await assert.rejects(()=>s.live.operator(grant.code),status(401));
 }finally{s.close();}
});
test('rights changes revoke sessions, stale edits do not revoke a new session, and disabling blocks new sign-in',async()=>{
 const s=setup();try{
  const account=await s.create(),first=await s.signIn(account),before=await s.user(first);
  const updated=(await s.service.save(legacy,{...account,enabled:true,roles:[{role:'manager',eventId:'evening-a'}]},account.id)).account;
  assert.equal(await s.user(first),null);
  const input={issuer:s.env.OIDC_ISSUER,subject:'identity-'+account.id,email:account.email,emailVerified:true};
  const second=await s.service.authenticate(input);assert.ok(managesEvent(await s.user(second),'evening-a'));
  await assert.rejects(()=>s.service.save(legacy,{...account,enabled:true},account.id),status(409));assert.ok(await s.user(second));
  await s.service.save(legacy,{...updated,enabled:false},account.id);assert.equal(await s.user(second),null);await assert.rejects(()=>s.service.authenticate(input),status(403));
  assert.ok(!managesUsers(before));assert.ok(!editsContent(before));
 }finally{s.close();}
});
test('accounts require active, unique profiles and scoped roles; a session cannot promote itself',async()=>{
 const s=setup();try{
  const account=await s.create(),user=await s.user(await s.signIn(account));
  await assert.rejects(()=>s.service.save(user,{...account,roles:[{role:'admin'}]},account.id),status(403));
  await assert.rejects(()=>s.create(),status(409));
  await assert.rejects(()=>s.service.save(legacy,{personId:'person-b',email:'other@example.invalid',roles:[{role:'station',eventId:'evening-b'}]}),status(400));
  s.profiles[0].archived=true;assert.equal(await s.user(await s.service.authenticate({issuer:s.env.OIDC_ISSUER,subject:'identity-'+account.id,email:account.email,emailVerified:true}).catch(()=>({token:''}))),null);
 }finally{s.close();}
});
test('event and station authorization is applied to live data and notification recipients',async()=>{
 const s=setup();try{
  const account=await s.create(),user=await s.user(await s.signIn(account));
  const actor=await s.live.accountActor('evening-a',user),ctx=await s.live.staffContext(actor);assert.deepEqual(ctx.stations.map(v=>v.id),['dj','team']);assert.equal(ctx.publisher,false);assert.equal(ctx.personalAccount,true);
  assert.equal(s.live.recipient(actor).id,'u:'+account.id);
  await assert.rejects(()=>s.live.stationState(actor,'karaoke',{accepting:false,revision:0}),status(403));
  const visitor=await s.live.session({eventId:'evening-a',accessCode:'never-public',name:'Gast'}),request=await s.live.submit({eventId:'evening-a',accessCode:'never-public',sessionToken:visitor.sessionToken,stationId:'karaoke',clientKey:'request-a',input:{song:'Song',artist:'Artist',singers:'Gast'}});
  assert.equal((await s.live.inbox(actor)).requests.length,0);await assert.rejects(()=>s.live.inbox(actor,{id:request.request.id}),status(404));
  const manager={...user,roles:[{role:'manager',eventId:'evening-a'}]},host={...user,roles:[{role:'host',eventId:'evening-a'}]};
  assert.equal((await s.live.staffContext(await s.live.accountActor('evening-a',manager))).canManage,true);assert.equal((await s.live.staffContext(await s.live.accountActor('evening-a',host))).canManage,false);
  assert.equal((await s.live.inbox(await s.live.accountActor('evening-a',host))).requests.length,1);
  s.event.teamIds=[];await assert.rejects(()=>s.live.accountActor('evening-a',user),status(403));
 }finally{s.close();}
});
test('HTTP editorial routes filter events and contact fields for restricted accounts',async()=>{
 const s=setup();try{
  const user=await s.user(await s.signIn(await s.create())),docs=[{_type:'rudelAppPerson',...s.profiles[0],_id:'drafts.person-a'},{_type:'rudelAppPerson',...s.profiles[1],_id:'drafts.person-b'},{_type:'rudelAppEvent',...s.event,_id:'drafts.rudel-app-event-evening-a'}];
  const client={list:async type=>docs.filter(d=>d._type===type).map(d=>({...d,draft:true})),getDocument:async id=>docs.find(d=>d._id===id)};
  const args={client,json,session:async()=>user,authorized:async()=>({user}),data:r=>r.json()};
  const people=await(await experienceApi(new Request(origin+'/api/abend/people'),s.env,args)).json();assert.equal(people.people.length,2);assert.ok(!JSON.stringify(people).includes('@'));
  docs.push({_type:'rudelAppEvent',...s.event,eventId:'other-event',teamIds:['person-b'],title:'Anderer Abend',_id:'drafts.other-event'});
  const events=await(await experienceApi(new Request(origin+'/api/abend/events'),s.env,args)).json();assert.equal(events.events.length,1);assert.equal(events.events[0].canManage,false);assert.ok(!JSON.stringify(events).includes('never-public'));assert.ok(!JSON.stringify(events).includes('other-event'));assert.ok(!JSON.stringify(events).includes('guestUrl'));
  await assert.rejects(()=>experienceApi(new Request(origin+'/api/abend/catalog',{method:'PUT',body:'{}'}),s.env,args),status(403));
  await assert.rejects(()=>experienceApi(new Request(origin+'/api/abend/events',{method:'POST',body:'{}'}),s.env,args),status(403));
 }finally{s.close();}
});
test('personal live logout revokes the backend session rather than only hiding the UI',async()=>{
 const s=setup();try{
  const login=await s.signIn(await s.create()),user=await s.user(login);
  const response=await liveApi(new Request(origin+'/api/live/logout?abend=evening-a',{method:'POST',headers:{Origin:origin,'X-CSRF-Token':user.csrf},body:'{}'}),s.env,{service:s.live,session:async()=>user,json,data:r=>r.json()});
  assert.equal(response.status,200);assert.ok(response.headers.get('set-cookie').includes('rb_account=;'));assert.equal(await s.user(login),null);
 }finally{s.close();}
});
test('OIDC login validates browser state, PKCE, nonce, audience and a signed identity token before account activation',async()=>{
 const s=setup();try{
  const account=await s.create(),invite=await s.service.invite(legacy,account.id),pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']),jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test-key',alg:'RS256',use:'sig'};
  let nonce='',challenge='',attempts=0,claimChange={},corruptSignature=false;
  const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const options={[oauth.customFetch]:async(url,init)=>{
   if(String(url).endsWith('openid-configuration'))return Response.json({issuer:s.env.OIDC_ISSUER,authorization_endpoint:s.env.OIDC_ISSUER+'authorize',token_endpoint:s.env.OIDC_ISSUER+'token',jwks_uri:s.env.OIDC_ISSUER+'jwks',response_types_supported:['code'],id_token_signing_alg_values_supported:['RS256'],code_challenge_methods_supported:['S256']});
   if(String(url).endsWith('jwks'))return Response.json({keys:[jwk]});
   if(String(url).endsWith('token')){
    attempts++;assert.equal(await oauth.calculatePKCECodeChallenge(init.body.get('code_verifier')),challenge);assert.equal(init.body.get('client_secret'),s.env.OIDC_CLIENT_SECRET);
    const content=b64({alg:'RS256',kid:'test-key'})+'.'+b64({iss:s.env.OIDC_ISSUER,aud:s.env.OIDC_CLIENT_ID,sub:'verified-account',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300,nonce,email:account.email,email_verified:true,...claimChange});
    const signature=Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(content))).toString('base64url');return Response.json({access_token:'test-only-access-token',token_type:'Bearer',id_token:content+'.'+(corruptSignature?(signature[0]==='a'?'b':'a')+signature.slice(1):signature)});
   }throw new Error('Unexpected identity endpoint');
  }};
  const args={accounts:s.service,json,data:r=>r.json(),options};
  for(const invalid of [{aud:'someone-else'},{nonce:'wrong-nonce'},{iss:'https://wrong-issuer.test/'},{email_verified:false},{badSignature:true}]){
   claimChange={...invalid};corruptSignature=invalid.badSignature===true;
   const attempt=await identityApi(new Request(origin+'/api/auth/start',{method:'POST',headers:{Origin:origin},body:JSON.stringify({invitation:invite.token})}),s.env,args),authorization=new URL((await attempt.json()).url),flowCookie=attempt.headers.get('set-cookie').split(';')[0];
   nonce=authorization.searchParams.get('nonce');challenge=authorization.searchParams.get('code_challenge');
   const denied=await identityApi(new Request(origin+'/api/auth/callback?code=code&state='+authorization.searchParams.get('state'),{headers:{Cookie:flowCookie}}),s.env,args);assert.ok(denied.headers.get('location').includes('loginError'));assert.equal((await s.service.get(account.id)).activated,false);assert.equal(s.db.connection.prepare('SELECT COUNT(*) AS n FROM app_sessions').get().n,0);
  }
  claimChange={};corruptSignature=false;attempts=0;
  const start=await identityApi(new Request(origin+'/api/auth/start',{method:'POST',headers:{Origin:origin},body:JSON.stringify({invitation:invite.token})}),s.env,args),target=new URL((await start.json()).url),cookie=start.headers.get('set-cookie').split(';')[0];nonce=target.searchParams.get('nonce');challenge=target.searchParams.get('code_challenge');
  const bad=await identityApi(new Request(origin+'/api/auth/callback?code=code&state=wrong',{headers:{Cookie:cookie}}),s.env,args);assert.ok(bad.headers.get('location').includes('loginError'));assert.equal(attempts,0);
  const url=origin+'/api/auth/callback?code=code&state='+target.searchParams.get('state'),result=await identityApi(new Request(url,{headers:{Cookie:cookie}}),s.env,args);
  assert.equal(result.headers.get('location'),'/abendplan');assert.equal(attempts,1);assert.equal((await s.service.get(account.id)).activated,true);
  const sessionCookie=result.headers.getSetCookie().find(v=>v.startsWith('rb_account='));assert.ok(await s.service.session(new Request(origin,{headers:{Cookie:sessionCookie}})));
  const replay=await identityApi(new Request(url,{headers:{Cookie:cookie}}),s.env,args);assert.ok(replay.headers.get('location').includes('loginError'));assert.equal(attempts,1);
 }finally{s.close();}
});
