import {guestError} from './guest-access.js';
import {notificationPlatform,notificationSetupContent} from './notification-setup.js?v=2';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bell='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>';
const read=(key,fallback='')=>{try{return localStorage.getItem(key)||fallback;}catch{return fallback;}};
const store=(key,value)=>{try{localStorage.setItem(key,String(value));}catch{}};
export function createNotificationCenter({api,initialize=async()=>{},openRequest,role='guest',storageKey,disabled=false,scope='evening'}){
 const key=suffix=>(typeof storageKey==='function'?storageKey():storageKey)+suffix;
 const state={started:false,starting:false,ready:false,count:0,items:[],configured:false,enabled:false,lastStatus:0,endpoint:'',publicKey:'',busy:false,error:'',info:'',mode:'inbox',step:0,sound:read(key(':sound'))==='1'};
 let registration,dialog,toast,toastTimer,polling=false,baseline=null,stopped=false,audio,opening=false,badgeCount=-1;
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const installNeeded=()=>platform().installNeeded;
 const supported=()=>isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
 const permission=()=>('Notification' in window?Notification.permission:'unavailable');
 const platform=()=>notificationPlatform({userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,standalone:standalone(),supported:supported(),permission:permission()});
 const button=(label,action,secondary=false)=>`<button type="button" class="rb-n-btn${secondary?' rb-n-secondary':''}" data-notice="${action}"${state.busy?' disabled':''}>${label}</button>`;
 async function worker(){if(!registration)registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});return navigator.serviceWorker.ready;}
 async function settings(){if(!supported())return;const reg=await worker(),subscription=await reg.pushManager.getSubscription();state.endpoint=subscription?.endpoint||'';if(state.endpoint){const result=await api('/notifications/settings','POST',{endpoint:state.endpoint});state.enabled=result.enabled&&permission()==='granted';state.lastStatus=result.lastStatus||0;state.configured=result.configured;state.publicKey=result.publicKey;}}
 function mount(){
  if(disabled||!state.started||stopped)return;
  for(const slot of document.querySelectorAll('[data-notice-slot]'))slot.innerHTML=`<button type="button" class="rb-n-bell" data-notice="open" aria-label="Mitteilungen${state.count?', '+state.count+(state.count===1?' ungelesene Neuigkeit':' ungelesene Neuigkeiten'):''}">${bell}${state.count?`<span class="rb-n-count">${state.count>99?'99+':state.count}</span>`:''}</button>`;
  for(const slot of document.querySelectorAll('[data-notice-banner]'))slot.innerHTML=!read(key(':prompt'))&&!state.enabled?`<section class="rb-n-welcome"><span class="rb-n-welcome-icon">${bell}</span><div><strong>Bleib mit deinem Rudel verbunden.</strong><p>${role==='team'?'Erfahre, wenn Gäste an deiner Station etwas brauchen.':'Erfahre, wenn es eine neue Rückmeldung für dich gibt.'}</p><div class="rb-n-actions">${button('Mitteilungen einrichten','setup')}${button('Später','later',true)}</div></div></section>`:'';
  const ids=new Set(state.items.map(item=>item.id));
  for(const element of document.querySelectorAll('[data-request],[data-live-action="conversation"]')){const unread=ids.has(element.dataset.request||element.dataset.id);element.classList.toggle('rb-n-unread',unread);element.querySelector('.rb-n-new')?.remove();if(unread){const tag=document.createElement('span');tag.className='rb-n-new';tag.textContent='Ungelesen';element.append(tag);}}
  const mailbox=document.querySelector('nav button[data-action="messages"]');if(mailbox){mailbox.classList.toggle('rb-n-has-unread',state.count>0);mailbox.setAttribute('aria-label','Postfach'+(state.count?', '+state.count+(state.count===1?' ungelesene Neuigkeit':' ungelesene Neuigkeiten'):''));}
  if(badgeCount!==state.count&&'setAppBadge' in navigator){badgeCount=state.count;try{(state.count?navigator.setAppBadge(state.count):navigator.clearAppBadge()).catch(()=>{});}catch{}}
  document.title=document.title.replace(/^\(\d+ neu\) /,'');if(state.count)document.title=`(${state.count} neu) `+document.title;
 }
 function content(){
  const setup=state.mode==='setup',wizard=setup?notificationSetupContent(state,platform(),{button,scope,role}):null;
  const messages='<h3>Neu für dich'+(state.count?' · '+state.count:'')+'</h3>'+(state.items.length?'<div class="rb-n-items">'+state.items.map(item=>'<button type="button" class="rb-n-item" data-notice="request" data-id="'+esc(item.id)+'"><span class="rb-n-dot"></span><span><strong>'+esc(item.subject)+'</strong><small>'+esc(item.stationName)+' · Neue Rückmeldung</small></span><span aria-hidden="true">›</span></button>').join('')+'</div>':'<p>Du bist auf dem neuesten Stand. Neue Antworten und Anfragen erscheinen hier.</p>');
  const settings='<section class="rb-n-setup"><h3>Deine Einstellungen</h3><dl class="rb-n-summary"><div><dt>Hinweiston in der App</dt><dd>'+(state.sound?'Eingeschaltet':'Ausgeschaltet')+'</dd></div><div><dt>Mitteilungen im Hintergrund</dt><dd>'+(state.enabled?'Aktiv':'Nicht aktiviert')+'</dd></div></dl>'+button('Einstellungen ändern','setup',true)+'</section>';
  return '<div class="rb-n-dialog-head"><div><span class="rb-n-eyebrow">Dein direkter Draht.</span><h2 id="rb-notice-title">'+(setup?'Mitteilungen einrichten':'Mitteilungen')+'</h2></div><button type="button" class="rb-n-close" data-notice="close" aria-label="Mitteilungen schließen">×</button></div><div class="rb-n-dialog-body">'+(state.error?(role==='guest'?guestError(state.error):'<p class="rb-n-error" role="alert">'+esc(state.error)+'</p>'):'')+(state.info?'<p class="rb-n-info" role="status">'+esc(state.info)+'</p>':'')+(setup?wizard.body:messages+settings)+'</div>'+(setup?'<footer class="rb-n-dialog-foot">'+wizard.footer+'</footer>':'');
 }
 function renderDialog(){if(!dialog?.open)return;const focus=document.activeElement,action=focus?.dataset?.notice,soundFocused=focus?.matches('[data-notice-sound]'),scroll=dialog.querySelector('.rb-n-dialog-body')?.scrollTop||0;dialog.innerHTML=content();dialog.querySelector('.rb-n-dialog-body').scrollTop=scroll;if(soundFocused)dialog.querySelector('[data-notice-sound]')?.focus({preventScroll:true});if(action)dialog.querySelector(`[data-notice="${action}"]`)?.focus({preventScroll:true});}
 async function open({setup=false}={}){
  if(opening)return;opening=true;
  try{await start();state.error='';state.info='';state.mode=setup?'setup':'inbox';state.step=0;if(dialog?.open){renderDialog();dialog.querySelector('.rb-n-step-title')?.focus();return;}dialog=document.createElement('dialog');dialog.className='rb-n-dialog';dialog.setAttribute('aria-labelledby','rb-notice-title');dialog.innerHTML=content();dialog.addEventListener('close',()=>{dialog.remove();dialog=null;store(key(':prompt'),'later');mount();});dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});dialog.addEventListener('rudelbar-access-restored',async()=>{state.error='';await poll();renderDialog();});document.body.append(dialog);dialog.showModal();if(setup)dialog.querySelector('.rb-n-step-title')?.focus({preventScroll:true});if(supported())settings().then(renderDialog).catch(()=>{});}finally{opening=false;}
 }
 function play(force=false){if(!state.sound&&!force)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type='sine';oscillator.frequency.value=660;gain.gain.setValueAtTime(.08,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.22);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+.22);}catch{}}
 function announce(item){
  if(document.visibilityState==='hidden')return;toast?.remove();clearTimeout(toastTimer);toast=document.createElement('div');toast.className='rb-n-toast';toast.setAttribute('role','status');toast.innerHTML=`<span>${bell}</span><button type="button" data-notice="request" data-id="${item.id}"><strong>Neues für dich</strong><span>${esc(item.stationName)} · ${esc(item.subject)}</span></button><button type="button" class="rb-n-close" data-notice="dismiss" aria-label="Hinweis schließen">×</button>`;document.body.append(toast);play();toastTimer=setTimeout(()=>{toast?.remove();toast=null;},10000);
 }
 async function poll(){
  if(stopped||disabled||polling||document.visibilityState==='hidden')return;polling=true;
  try{const result=await api('/notifications');if(stopped)return;state.count=result.count;state.items=result.items;state.configured=result.configured;state.publicKey=result.publicKey;const latest=state.items[0]?.alertSeq||state.items[0]?.seq||0,already=Number(read(key(':last-alert-clock-v2'),'0'));
   if(baseline!==null&&latest>baseline&&latest>already){store(key(':last-alert-clock-v2'),latest);announce(state.items[0]);}baseline=Math.max(baseline||0,latest);mount();renderDialog();
  }catch{}finally{polling=false;}
 }
 async function start(){if(disabled||state.started||state.starting||stopped)return;state.starting=true;try{await initialize();state.started=true;await poll();if(supported())await settings();state.ready=true;mount();}catch{}finally{state.starting=false;}}
 async function mark(id,seq){if(document.visibilityState==='hidden'||dialog?.open)return;if(!id||!Number.isSafeInteger(seq))return;try{await api('/notifications/read','POST',{id,seq});await poll();}catch{}}
 async function action(name){
  if(name==='setup'){await open({setup:true});return;}
  if(name==='setup-next'||name==='setup-back'){if(state.busy)return;state.step=Math.max(0,Math.min(2,state.step+(name==='setup-next'?1:-1)));state.error='';state.info='';renderDialog();if(dialog){dialog.querySelector('.rb-n-dialog-body').scrollTop=0;dialog.querySelector('.rb-n-step-title')?.focus({preventScroll:true});}return;}
  if(name==='setup-finish'){store(key(':setup-complete'),'1');dialog?.close();return;}
  if(name==='sound-test'){play(true);state.info='Das war der Hinweiston. Deine Auswahl bleibt unverändert.';renderDialog();return;}
  if(name==='close'){dialog?.close();return;}
  if(name==='later'){store(key(':prompt'),'later');mount();return;}
  if(name==='open'){await open();return;}
  if(name==='dismiss'){toast?.remove();return;}
  if(state.busy)return;state.busy=true;state.error='';state.info='';renderDialog();
  try{
   if(name==='enable'){
    if(installNeeded()||!supported())return;
    if(!state.configured||!state.publicKey)throw new Error('Mitteilungen sind gerade nicht verfügbar. Bitte versuche es später erneut.');
    const result=await Notification.requestPermission();if(result!=='granted'){state.info=result==='denied'?'Mitteilungen wurden nicht erlaubt. Neue Nachrichten bleiben in deinem Postfach.':'Du kannst Mitteilungen später jederzeit aktivieren.';return;}
    const reg=await worker();let subscription=await reg.pushManager.getSubscription();
    if(!subscription){const key=Uint8Array.from(atob(state.publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});}
    await api('/notifications/subscribe','POST',{subscription:subscription.toJSON()});state.endpoint=subscription.endpoint;state.enabled=true;state.lastStatus=0;store(key(':prompt'),'enabled');state.info='Mitteilungen sind aktiv. Du kannst sie mit einer Testmitteilung prüfen.';
   }
   if(name==='disable'){await api('/notifications/unsubscribe','POST',{endpoint:state.endpoint});state.enabled=false;store(key(':prompt'),'off');state.info=(scope==='contacts'?'Für deinen Kontaktzugang':'Für diesen Abend')+' ausgeschaltet. Dein Postfach bleibt erreichbar.';}
   if(name==='test'){const result=await api('/notifications/test','POST',{endpoint:state.endpoint});state.lastStatus=result.providerStatus||201;state.info='Die Testmitteilung wurde an den Mitteilungsdienst übergeben. Schau nach, ob sie auf deinem Gerät erscheint.';}
  }catch(error){if(name==='test')state.lastStatus=502;state.error=error.message||'Das hat gerade nicht geklappt. Bitte versuche es erneut.';}finally{state.busy=false;mount();renderDialog();}
 }
 document.addEventListener('click',event=>{const node=event.target.closest('[data-notice]');if(!node)return;event.preventDefault();const name=node.dataset.notice;if(name==='request'){dialog?.close();toast?.remove();openRequest(node.dataset.id);return;}action(name);});
 document.addEventListener('change',event=>{if(event.target.matches('[data-notice-sound]')){state.sound=event.target.checked;store(key(':sound'),state.sound?'1':'0');if(state.sound)play();renderDialog();}});
 navigator.serviceWorker?.addEventListener('message',event=>{if(event.data?.type==='rudelbar-push')poll();if(event.data?.type==='rudelbar-open-request'&&event.data.id)openRequest(event.data.id);});
 setInterval(()=>{if(state.started)poll();},role==='team'?5000:8000);document.addEventListener('visibilitychange',()=>{if(state.started)poll();});
 return {start,mount,mark,open,poll,async disconnect(){if(state.endpoint)try{await api('/notifications/unsubscribe','POST',{endpoint:state.endpoint});}catch{}this.stop();},stop(){stopped=true;state.started=false;state.items=[];state.count=0;dialog?.close();toast?.remove();document.querySelectorAll('[data-notice-slot],[data-notice-banner]').forEach(node=>node.replaceChildren());},resume(){stopped=false;state.sound=read(key(':sound'))==='1';},get items(){return state.items;}};
}
