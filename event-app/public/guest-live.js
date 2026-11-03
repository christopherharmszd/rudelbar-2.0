import {createNotificationCenter} from './notifications.js';
export function createGuestLive({root,screen,getExperience,getEventId,getName,accessCode,preview,navigate,update,onAction,onOpenChat,onOpenWall,getExtraInbox,loadExtraInbox}){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const icon=n=>`<i data-lucide="${n}" aria-hidden="true"></i>`;
 const state={page:'',selected:'',ready:false,requests:[],detail:null,loading:false,sending:false,error:'',drafts:{},replyDraft:'',pendingKeys:{}};
 const activeStatuses=['new','queued','in_progress'];
 let viewVersion=0,conversationLoad=0,refreshing=false;
 const notices=createNotificationCenter({api,initialize:async()=>{if(getExperience())await ensureSession();},openRequest:id=>loadConversation(id),role:'guest',storageKey:'rudelbar:notifications:guest:'+getEventId(),disabled:!!preview});
 const btn=(label,action,extra='',secondary=false)=>`<button type="button" class="re-btn ${secondary?'re-btn-secondary':''}" data-live-action="${action}" ${extra}>${label}</button>`;
 const back=()=>`<button type="button" class="re-back" data-live-action="home">${icon('chevron-left')}Dein Abend</button>`;
 const time=t=>new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'}).format(new Date(t));
 const status=r=>({new:'Beim Team angekommen',queued:r.kind==='karaoke'?'Auf der Karaoke-Liste':'Eingeplant',in_progress:r.kind==='karaoke'?'Du bist dran':'In Bearbeitung',done:r.kind==='music'?'Gespielt':r.kind==='karaoke'?'Gesungen':'Erledigt',declined:'Heute nicht möglich',cancelled:'Zurückgezogen'}[r.status]||r.status);
 const stations=()=>getExperience()?.stations||[];
 async function api(path,method='GET',body){
  if(preview)throw new Error('Die Vorschau zeigt die Formulare. Senden ist in der geöffneten Gäste-App möglich.');
  const [route,...rest]=path.split('&'),url='/api/guest'+route+(method==='GET'?'?abend='+encodeURIComponent(getEventId())+(rest.length?'&'+rest.join('&'):''):'');
  const response=await fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify({...body,eventId:getEventId(),accessCode}):undefined}),data=await response.json();
  if(!response.ok){const error=new Error(data.error||'Gerade nicht erreichbar.');error.status=response.status;throw error;}return data;
 }
 async function ensureSession(){if(state.ready)return;if(!getName()){navigate('name');throw new Error('Verrätst du uns zuerst deinen Vornamen?');}await api('/session','POST',{name:getName()});state.ready=true;}
 function heading(kicker,title,lead=''){return `<div class="re-kicker">${esc(kicker)}</div><h1>${esc(title)}</h1>${lead?`<p class="re-lead">${esc(lead)}</p>`:''}`;}
 function field(name,label,value='',extra=''){return `<div class="re-field"><label for="live-${name}">${label}</label><input id="live-${name}" name="${name}" value="${esc(value)}" ${extra}></div>`;}
 function stationPage(id){
  const station=stations().find(s=>s.id===id);if(!station)return stationList();
  if(station.functionId==='wall'&&getExperience()?.wall?.enabled)return back()+heading('Momente, die bleiben.',station.name,station.description)+`<div class="re-section"><button type="button" class="re-btn" data-action="wall">Eure Memory Wall öffnen</button></div>`;
  const draft=state.drafts[id]||{},kind=station.kind;
  const fields=kind==='message'?field('subject','Worum geht es?',draft.subject||'','maxlength="120" placeholder="z. B. Eine Frage zum Spielen"')+`<div class="re-field"><label for="live-text">Deine Nachricht</label><textarea id="live-text" name="text" maxlength="2000" rows="4" required>${esc(draft.text||'')}</textarea></div>`:field('song',kind==='karaoke'?'Was möchtest du singen?':'Welchen Song wünschst du dir?',draft.song||'','maxlength="160" required placeholder="Songtitel"')+field('artist','Interpret:in · optional',draft.artist||'','maxlength="160"')+(kind==='karaoke'?`<div class="re-field"><label for="live-format">Wie möchtest du singen?</label><select id="live-format" name="format">${[['solo','Allein'],['duet','Als Duett / ich suche jemanden'],['group','Mit einer Gruppe']].map(([key,label])=>`<option value="${key}" ${draft.format===key?'selected':''}>${label}</option>`).join('')}</select></div>`:'')+`<div class="re-field"><label for="live-note">Noch ein Hinweis? · optional</label><textarea id="live-note" name="note" maxlength="1200" rows="3">${esc(draft.note||'')}</textarea></div>`;
  return back()+(station.imageUrl?`<img class="re-detail-photo" src="${esc(station.imageUrl)}" alt="${esc(station.imageAlt||station.name)}">`:'')+heading(kind==='music'?'Dein Song. Unser Abend.':kind==='karaoke'?'Dein Moment am Mikro.':'Das Team ist für dich da.',station.name,station.description||'Deine Anfrage kommt direkt bei dieser Station an.')+(station.place?`<p class="re-small">${icon('map-pin')}${esc(station.place)}</p>`:'')+(station.contactEnabled===false?'<p class="re-small re-section">Sprich das Team direkt vor Ort an.</p>':station.accepting===false?`<div class="re-invite re-section"><h3>Der Eingang macht kurz Pause.</h3><p>Neue Anfragen sind gerade pausiert. Auf bestehende Nachrichten bekommst du weiterhin Antworten.</p>${btn('Meine Nachrichten','messages','',true)}</div>`:`<form id="live-request" class="re-form" data-station="${station.id}">${fields}${field('location','Wo bist du? · optional',draft.location||'','maxlength="160" placeholder="z. B. Tisch A oder am Kicker"')}<p class="re-error" role="alert" hidden></p><button type="submit" class="re-btn">${kind==='music'?'Song wünschen':kind==='karaoke'?'Zum Singen anmelden':'Nachricht senden'} ${icon('send')}</button><p class="re-small">${esc(getName())}, Status und Antworten findest du anschließend in deinem Postfach.</p></form>`);
 }
 function stationList(){return back()+heading('Stationen & Kontakt.','Was hast du vor?','Hier kannst du dich melden, etwas wünschen oder eine Frage stellen.')+`<div class="re-stack re-section">${stations().filter(s=>s.contactEnabled!==false||s.detailsEnabled).map(s=>`<button type="button" class="re-tile" data-action="station" data-id="${s.id}"><span class="re-icon">${icon(s.kind==='music'?'disc-3':s.kind==='karaoke'?'mic-vocal':'messages-square')}</span><span class="re-tile-copy"><span class="re-tile-title">${esc(s.name)}</span><span class="re-tile-sub">${s.accepting===false?'Neue Anfragen gerade pausiert':esc(s.description||'Melde dich bei dieser Station.')}</span></span>${icon('arrow-right')}</button>`).join('')||'<p class="re-lead">Melde dich direkt beim Team am Rudelbar-Wagen.</p>'}</div>`;}
 function requestList(){return back()+heading('Dein Kontakt zum Team.','Dein Postfach.','Hier stehen deine Anfragen, ihr Status und die Antworten des Teams.')+(state.loading?'<p class="re-small">Nachrichten werden geladen …</p>':'')+(state.error?`<p class="re-error" role="status">${esc(state.error)}</p>`:'')+`<div class="re-stack re-section">${state.requests.map(r=>`<button class="re-tile re-request-tile" type="button" data-live-action="conversation" data-id="${r.id}"><span class="re-tile-copy"><span class="re-pill re-status-${r.status}">${esc(status(r))}</span><span class="re-tile-title">${esc(r.subject)}</span><span class="re-tile-sub">${esc(r.stationName)} · ${time(r.updatedAt)}</span>${r.preview?`<span class="re-tile-sub">${esc(r.preview)}</span>`:''}</span>${icon('chevron-right')}</button>`).join('')||(!state.loading?'<div class="re-invite"><h3>Ein direkter Draht zum Rudel.</h3><p>Wenn du eine Anfrage sendest, findest du sie hier wieder.</p></div>':'')}</div>${getExtraInbox?.()||''}${notices.items.filter(item=>item.kind==='wall').map(item=>`<button type="button" class="re-tile re-section" data-live-action="conversation" data-id="${esc(item.id)}"><span class="re-tile-copy"><span class="re-tile-title">${esc(item.subject)}</span><span class="re-tile-sub">Memory Wall · Neu für dich</span></span></button>`).join('')}${getExperience()?`<div class="re-section">${btn('Zu den Stationen','stations','',true)}</div>`:''}`;}
 function conversation(){
  const detail=state.detail;if(!detail)return requestList();const r=detail.request;
  const initial=r.kind==='message'?r.payload.text:[r.payload.artist?'Von '+r.payload.artist:'',r.kind==='karaoke'?({solo:'Du singst allein.',duet:'Du möchtest als Duett singen.',group:'Du singst mit einer Gruppe.'}[r.payload.format]):'',r.payload.note].filter(Boolean).join('\n');
  return `<button type="button" class="re-back" data-live-action="messages">${icon('chevron-left')}Dein Postfach</button>`+heading(r.stationName,r.subject)+`<span class="re-pill re-status-${r.status}">${esc(status(r))}</span>${initial?`<div class="re-invite re-section"><p class="re-message-copy">${esc(initial)}</p>${r.location?`<p class="re-small">${icon('map-pin')}${esc(r.location)}</p>`:''}</div>`:''}<div class="re-conversation" aria-label="Nachrichtenverlauf">${detail.messages.map(m=>`<article class="re-message re-message-${m.direction}">${m.direction!=='system'?`<div class="re-message-meta"><strong>${esc(m.author)}</strong><span>${time(m.createdAt)}</span></div>`:''}<p>${esc(m.body)}</p></article>`).join('')||'<p class="re-small">Deine Anfrage ist angekommen. Das Team meldet sich hier bei dir.</p>'}</div>${getExperience()&&r.status!=='cancelled'?`<form id="live-reply" class="re-form"><div class="re-field"><label for="guest-reply">Deine Antwort ans Team</label><textarea id="guest-reply" name="reply" maxlength="2000" rows="3" required>${esc(state.replyDraft)}</textarea></div><p class="re-error" role="alert" hidden></p><button type="submit" class="re-btn">Antwort senden ${icon('send')}</button></form>`:!getExperience()?'<p class="re-small re-section">Der Abend ist geschlossen. Deine bisherigen Nachrichten bleiben hier lesbar.</p>':''}${activeStatuses.includes(r.status)&&getExperience()?`<button type="button" class="re-text-link" data-live-action="cancel">Anfrage zurückziehen</button>`:''}`;
 }
 function renderPage(page,id){state.page=page;state.selected=id||'';if(page==='stations')return stationList();if(page==='station')return stationPage(id);if(page==='messages')return requestList();if(page==='conversation')return conversation();return '';}
 async function loadList(){state.loading=true;state.error='';update();try{if(getExperience())await ensureSession();const result=await api('/requests');state.requests=result.requests;await loadExtraInbox?.();}catch(error){state.error=error.status===401?'Auf diesem Gerät gibt es noch keine angemeldeten Nachrichten.':error.message;}finally{state.loading=false;update();}}
 async function loadConversation(id){if(id.startsWith('wall-')){onOpenWall?.(id);return;}if(id.startsWith('chat-')){onOpenChat?.(id);return;}const load=++conversationLoad,version=viewVersion;state.error='';try{const detail=await api('/requests/'+id);if(load!==conversationLoad||version!==viewVersion)return;state.detail=detail;state.selected=id;state.replyDraft='';navigate('conversation',id);notices.mark(id,detail.activitySeq);}catch(error){if(load!==conversationLoad||version!==viewVersion)return;state.error=error.message;navigate('messages');}}
 function showError(form,error){const node=form.querySelector('[role=alert]');node.textContent=error.message;node.hidden=false;node.scrollIntoView({block:'nearest'});}
 root.addEventListener('click',event=>{
  const node=event.target.closest('[data-live-action]');if(!node)return;const action=node.dataset.liveAction;
  if(action==='home'){if(getExperience())navigate('home');else location.reload();}
  if(action==='stations')navigate('stations');
  if(action==='messages')navigate('messages');
  if(action==='conversation')loadConversation(node.dataset.id);
  if(action==='cancel'){
    const r=state.detail?.request;if(!r)return;node.disabled=true;
    api('/requests/'+r.id,'POST',{input:{cancel:true,revision:r.revision}}).then(result=>{state.detail=result;update();}).catch(error=>{state.error=error.message;update();});
  }
 });
 root.addEventListener('input',event=>{
  const form=event.target.closest('#live-request');if(form){state.drafts[form.dataset.station]=Object.fromEntries(new FormData(form));}
  if(event.target.closest('#live-reply'))state.replyDraft=event.target.value;
 });
 root.addEventListener('change',event=>{const form=event.target.closest('#live-request');if(form)state.drafts[form.dataset.station]=Object.fromEntries(new FormData(form));});
 root.addEventListener('submit',async event=>{
  const form=event.target;if(!['live-request','live-reply'].includes(form.id))return;
  event.preventDefault();if(state.sending||!form.reportValidity())return;state.sending=true;const submit=form.querySelector('[type=submit]'),version=viewVersion,request=state.detail?.request,reply=state.replyDraft;submit.disabled=true;
  try{
   await ensureSession();
   if(form.id==='live-request'){
    const id=form.dataset.station,clientKey=state.pendingKeys[id]||crypto.randomUUID();state.pendingKeys[id]=clientKey;
    onAction?.({type:'action.started',action:stations().find(s=>s.id===id)?.kind||'message',key:clientKey+'-started'});
    const result=await api('/requests','POST',{stationId:id,clientKey,input:Object.fromEntries(new FormData(form))});delete state.pendingKeys[id];delete state.drafts[id];if(version===viewVersion)await loadConversation(result.request.id);
   }else{
    const result=await api('/requests/'+request.id,'POST',{input:{reply,revision:request.revision}});if(version===viewVersion&&state.selected===request.id){state.detail=result;state.replyDraft='';update();}
   }
  }catch(error){if(form.id==='live-request')onAction?.({type:'action.failed',action:stations().find(s=>s.id===form.dataset.station)?.kind||'message',errorCode:({400:'validation',401:'unauthorized',403:'unauthorized',409:'conflict',429:'rate-limit'})[error.status]||(error.status?'server':'network')});if(form.isConnected)showError(form,error);}finally{state.sending=false;submit.disabled=false;}
 });
 async function refresh(){
  if(preview||!['messages','conversation'].includes(state.page)||state.loading||state.sending||refreshing||document.visibilityState==='hidden')return;
  refreshing=true;const version=viewVersion,id=state.selected;
  try{const listing=await api('/requests');let detail=null;if(state.page==='conversation'&&id)detail=await api('/requests/'+id);
   if(version!==viewVersion||state.sending)return;
   state.requests=listing.requests;if(detail&&(!state.detail||detail.request.revision>=state.detail.request.revision))state.detail=detail;
   if(detail)notices.mark(id,detail.activitySeq);
   const focused=document.activeElement,typing=focused?.name==='reply',caret=typing?focused.selectionStart:null,scroll=window.scrollY;update();if(typing){const input=screen.querySelector('[name=reply]');input?.focus({preventScroll:true});if(input&&caret!==null)input.setSelectionRange(caret,caret);}window.scrollTo({top:scroll,behavior:'instant'});
  }catch{}finally{refreshing=false;}
 }
 setInterval(refresh,8000);document.addEventListener('visibilitychange',refresh);
 return {api,mark:(id,seq)=>notices.mark(id,seq),ensureSession,renderPage,startNotices(){notices.resume();return notices.start();},mountNotices:()=>notices.mount(),openConversation:loadConversation,setView(page,id){if(page!==state.page||(id||'')!==state.selected)viewVersion++;state.page=page;state.selected=id||'';},onEnter(page){if(page==='messages')loadList();},requestCount:()=>state.requests.length,async logout(){await notices.disconnect();await api('/logout','POST',{});state.ready=false;state.requests=[];state.detail=null;state.replyDraft='';}};
}
