export const GUEST_SIGN_IN_REQUIRED='Bitte melde dich mit deinem Vornamen an.';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function guestAccessError(error){return error?.status===401||error?.message===GUEST_SIGN_IN_REQUIRED||error===GUEST_SIGN_IN_REQUIRED;}
export function normalizeGuestError(error){if(error?.status===401)error.message=GUEST_SIGN_IN_REQUIRED;return error;}
export function guestError(error){
 if(guestAccessError(error))return '<section class="re-error re-guest-access-error" role="alert" tabindex="-1"><strong>Dein Gastzugang ist nicht aktiv.</strong><p>Melde dich mit deinem Vornamen an, um hier weiterzumachen.</p><button type="button" class="re-btn re-btn-secondary" data-guest-signin>Erneut anmelden</button></section>';
 return '<p class="re-error" role="alert" tabindex="-1">'+esc(error?.message||error)+'</p>';
}

// The same sign-in is used by the profile hub and by protected guest actions.
// Viewing the hub never creates a new guest identity or grants consent.
export function createGuestAccount({readProfile,signIn,getName,onName,onChange=()=>{},isOpen,features,actions,preview=false}){
 let state={status:'unknown',profile:null,error:''},checking=null,signing=null,node=null,section='overview',loginDraft='',busy=false,formError='',waiters=[],returnFocus=null,waitingForAction=false;
 const labels={unknown:'Gastzugang wird geprüft …',checking:'Gastzugang wird geprüft …',active:'Angemeldet',missing:'Nicht angemeldet',unavailable:'Gastzugang gerade nicht erreichbar',preview:'Profilvorschau'};
 const card=(title,description,action)=>'<button type="button" class="re-profile-card" data-profile-action="'+action+'"><span><strong>'+esc(title)+'</strong><small>'+esc(description)+'</small></span><span aria-hidden="true">›</span></button>';
 function publish(next){state={...state,...next};onChange(state);if(node?.open)draw();}
 function invalidate(){if(state.status!=='missing')publish({status:'missing',profile:null,error:''});}
 async function check(){
  if(preview){publish({status:'preview'});return state;}
  if(checking)return checking;
  publish({status:'checking',error:''});
  checking=(async()=>{try{const profile=await readProfile();publish({status:'active',profile,error:''});onName(profile.name,{restored:true});}catch(error){publish({status:guestAccessError(error)?'missing':'unavailable',profile:null,error:guestAccessError(error)?'':error.message});}return state;})();
  try{return await checking;}finally{checking=null;}
 }
 async function login(name){
  if(preview){const profile={name};publish({status:'preview',profile,error:''});onName(name,{preview:true});return profile;}
  if(signing)return signing;
  signing=(async()=>{await signIn(name);const profile=await readProfile();publish({status:'active',profile,error:''});onName(profile.name,{signedIn:true});return profile;})();
  try{return await signing;}catch(error){publish({status:guestAccessError(error)?'missing':'unavailable',profile:null,error:error.message});throw error;}finally{signing=null;}
 }
 function loginForm(){return '<section class="re-profile-access" aria-label="Dein Gastzugang"><h3>Dein Gastzugang</h3><p>Dein Vorname genügt. Ein Passwort brauchst du für diesen Abend nicht.</p>'+(formError?guestError(formError):'')+'<form data-profile-login class="re-form"><div class="re-field"><label for="profile-login-name">Dein Vorname</label><input id="profile-login-name" name="name" maxlength="32" autocomplete="given-name" autocapitalize="words" value="'+esc(loginDraft)+'" required></div><button type="submit" class="re-btn" '+(busy?'disabled':'')+'>'+(busy?'Du wirst angemeldet …':'Anmelden und weitermachen')+'</button></form></section>';}
 function draw(){
  if(!node?.open)return;
  const body=node.querySelector('.vm-sheet-body'),scroll=body.scrollTop,flags=features()||{};
  const status='<section class="re-profile-status" data-status="'+state.status+'"><span class="re-profile-status-dot" aria-hidden="true"></span><div><strong>'+esc(labels[state.status])+'</strong>'+(state.status==='active'?'<span>'+esc(state.profile.name)+'</span>':state.status==='missing'?'<span>Hier kannst du dich anmelden oder deinen Gastzugang erneuern.</span>':state.error?'<span>'+esc(state.error)+'</span>':'')+'</div></section>';
  let content='';
  if(section==='privacy')content='<button type="button" class="re-back" data-profile-action="overview">‹ Mein Profil</button><h3>Datenschutz & Freigaben</h3><p>Hier findest du deine Entscheidungen und die Bereiche, in denen du sie ändern kannst. Neue Freigaben werden nur nach deiner ausdrücklichen Auswahl erteilt.</p><div class="re-profile-cards">'+card('Freiwillige Messung','Deine Auswahl ansehen oder ändern.','analysis')+(flags.wall?card('Meine Wall-Beiträge & Freigaben','Status ansehen und eigene Beiträge oder zusätzliche Freigaben zurückziehen.','wall'):'')+(flags.encounters?card('Begegnungen verwalten','Deine freiwillige Sichtbarkeit beim Spielen, Tanzen oder Kennenlernen.','encounters'):'')+'</div>';
  else content='<div class="re-profile-cards">'+card('Deine Angaben','Vorname, Interessen und eine freiwillige Beschreibung.','details')+(flags.encounters?card('Begegnungsangaben','Deine Angaben für Spielen, Tanzen und Kennenlernen.','encounters'):'')+card('Mitteilungen','Hinweiston und Mitteilungen im Hintergrund einrichten.','notifications')+card('Datenschutz & Freigaben','Deine Entscheidungen und eigenen Beiträge verwalten.','privacy')+(flags.contacts?card('Meine Kontakte','Beidseitig bestätigte Begegnungen wiederfinden.','contacts'):'')+'</div>';
  const needsLogin=state.status==='missing'||waitingForAction&&state.status!=='active';
  body.innerHTML=status+(preview?'<p>In der geöffneten Rudelbar-App verwaltest du hier deinen Gastzugang und deine Einstellungen.</p>':needsLogin?(isOpen()?loginForm():'<p>Dieser Abend ist geschlossen. Neue Gastzugänge sind gerade nicht möglich.</p>'):state.status==='unavailable'?guestError(new Error(state.error||'Bitte versuche es gleich noch einmal.'))+'<button type="button" class="re-btn re-btn-secondary" data-profile-action="check">Erneut prüfen</button>':'')+content+(state.status==='active'?'<details class="re-profile-reset"><summary>Auf diesem Gerät neu anfangen</summary><p>Du beendest diesen Gastzugang und startest anschließend neu. Bereits eingereichte Beiträge bleiben beim Rudelbar-Team; die Zuordnung zu diesem Gastzugang wird auf diesem Gerät beendet.</p><button type="button" class="re-text-link" data-profile-action="restart">Gastzugang beenden</button></details>':'');
  body.scrollTop=scroll;
 }
 function open({loginOnly=false,section:initialSection='overview'}={}){
  if(node?.open){waitingForAction||=loginOnly;section=initialSection;draw();return node;}
  returnFocus=document.activeElement;section=initialSection;waitingForAction=loginOnly;loginDraft=getName()||state.profile?.name||'';formError='';
  node=document.createElement('dialog');const currentNode=node;currentNode.className='vm-stand-sheet gr-dialog re-profile-dialog';node.setAttribute('aria-label','Mein Profil');node.innerHTML='<header class="vm-sheet-head"><div><small>Dein Abend. Deine Entscheidungen.</small><h2>Mein Profil</h2></div><button type="button" data-profile-close aria-label="Mein Profil schließen">×</button></header><div class="vm-sheet-body"></div>';
  node.addEventListener('input',event=>{if(event.target.name==='name')loginDraft=event.target.value;});
  node.addEventListener('submit',async event=>{
   if(!event.target.matches('[data-profile-login]'))return;event.preventDefault();if(busy||!event.target.reportValidity())return;
   loginDraft=event.target.elements.name.value.trim();busy=true;formError='';draw();
   try{const profile=await login(loginDraft);const resume=waiters.splice(0);if(resume.length){currentNode.close();for(const waiter of resume)waiter.resolve(profile);}else{waitingForAction=false;draw();}}
   catch(error){formError=error.message;}finally{busy=false;draw();node?.querySelector('[role=alert]')?.focus();}
  });
  node.addEventListener('click',async event=>{
   if(event.target.closest('[data-profile-close]')){node.close();return;}
   const target=event.target.closest('[data-profile-action]');if(!target||busy)return;const action=target.dataset.profileAction;
   if(['privacy','overview'].includes(action)){section=action;draw();bodyTop();return;}
   if(action==='check'){await check();return;}
   if(preview)return;
   if(action==='restart'){try{await actions.restart();currentNode.close();publish({status:'missing',profile:null,error:''});}catch(error){formError=error.message;const body=currentNode.querySelector('.vm-sheet-body');body.insertAdjacentHTML('afterbegin',guestError(error));body.querySelector('[role=alert]')?.focus();}return;}
   if(action==='contacts'){location.href='/kontakte.html';return;}
   try{await ensure();await actions[action]?.();}catch(error){formError=error.message;draw();}
  });
  node.addEventListener('close',()=>{currentNode.remove();if(node!==currentNode)return;node=null;waitingForAction=false;const pending=waiters.splice(0);for(const waiter of pending)waiter.reject(Object.assign(new Error(GUEST_SIGN_IN_REQUIRED),{status:401,cancelled:true}));if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});});
  document.body.append(node);node.showModal();draw();if(!loginOnly)check();return node;
 }
 function bodyTop(){const body=node?.querySelector('.vm-sheet-body');if(body)body.scrollTop=0;}
 async function requestSignIn(){
  if(!isOpen())throw Object.assign(new Error('Dieser Abend ist geschlossen. Neue Gastzugänge sind gerade nicht möglich.'),{status:409});
  publish({status:'missing',profile:null});
  const promise=new Promise((resolve,reject)=>waiters.push({resolve,reject}));open({loginOnly:true});bodyTop();node.querySelector('[name=name]')?.focus();return promise;
 }
 async function ensure(options={}){if(preview)return;if(options.refresh)return requestSignIn();if(state.status!=='active')await check();if(state.status==='active')return state.profile;if(state.status==='unavailable')throw new Error(state.error||'Der Gastzugang ist gerade nicht erreichbar.');return requestSignIn();}
 document.addEventListener('click',async event=>{
  const target=event.target.closest('[data-guest-signin]');if(!target)return;event.preventDefault();const context=target.closest('dialog')||target.closest('.re-app');
  try{await requestSignIn();if(context?.isConnected)context.dispatchEvent(new CustomEvent('rudelbar-access-restored'));}catch{}
 });
 return {open,ensure,check,login,invalidate,get state(){return state;}};
}
