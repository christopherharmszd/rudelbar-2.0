import {createMemberWizard,uploadMemberImage} from './member-wizard.js?v=1';
import {createAccountsUI} from './accounts-ui.js?v=8';
import {createWebsiteEditor} from './website-editor.js?v=8';
import {signInPath} from './session-paths.js';
const root=document.querySelector('#planner'),integrated=root.dataset.integrated==='true';
let websiteEditor=null,lastRoute=location.hash,routeVersion=0,websiteChanged=false;
const activeEvent=()=>state.current?.event?.eventId||sessionStorage.getItem('rudelbar:backstage:event')||'';
const livePath=()=>state.events.some(e=>e.eventId===activeEvent()&&e.app.hasRelease)?'/team?abend='+encodeURIComponent(activeEvent())+'&backstage=1':'/live';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
const types={equipment:{name:'Ausstattung',icon:'armchair'},games:{name:'Spiele',icon:'dices'},program:{name:'Programm',icon:'music-2'},drinks:{name:'Getränke',icon:'glass-water'}};
const state={user:null,identityConfigured:false,events:[],people:[],partners:[],trash:[],peopleView:'active',catalog:null,catalogView:'active',current:null,page:'events',tab:'overview',kind:'equipment',filter:'all',eventFilter:'all',search:'',busy:false};
let toastTimer;
const money=value=>(Number(value||0)/100).toFixed(2).replace('.',',');
const euros=value=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(value||0)/100);
const dateText=value=>{try{return new Intl.DateTimeFormat('de-DE',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value+'T12:00:00'));}catch{return value;}};
const initial=name=>String(name||'').split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
const button=(label,action,variant='',extra='')=>`<button type="button" class="btn ${variant}" data-action="${action}" ${extra}>${label}</button>`;
const chip=(text,variant='',ic='')=>`<span class="chip ${variant}">${ic?icon(ic):''}${esc(text)}</span>`;
const field=(name,label,value='',extra='',help='')=>`<label class="field"><span>${label}</span><input name="${name}" value="${esc(value)}" ${extra}>${help?`<small>${esc(help)}</small>`:''}</label>`;
const area=(name,label,value='',max=1000)=>`<label class="field"><span>${label}</span><textarea name="${name}" maxlength="${max}" rows="3">${esc(value)}</textarea></label>`;
function toast(message,error=false){const node=document.querySelector('#toast');node.textContent=message;node.className='visible'+(error?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>{node.className='';},error?9000:3800);}
function icons(){globalThis.lucide?.createIcons({attrs:{'aria-hidden':'true'}});}
async function api(path,method='GET',body){
  const response=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:{...(state.user?{'X-CSRF-Token':state.user.csrf}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body!==undefined?JSON.stringify(body):undefined});
  const value=await response.json();
  if(response.status===401&&path!=='/api/login'){state.user=null;renderLogin();throw new Error('Bitte erneut anmelden.');}
  if(!response.ok)throw Object.assign(new Error(value.error||'Die Aktion konnte nicht abgeschlossen werden.'),{status:response.status});
  return value;
}
const isAdmin=()=>state.user?.legacy||state.user?.roles?.some(r=>r.role==='admin');
const isEditor=()=>isAdmin()||state.user?.roles?.some(r=>r.role==='editor');
const isAuthor=()=>state.user?.roles?.some(r=>r.role==='author');
const hasEventAccess=()=>isEditor()||state.user?.roles?.some(r=>['manager','station','host'].includes(r.role));
const accountsUI=createAccountsUI({state,api,esc,icon,button,chip,field,dialog,toast,render,icons});
const memberWizard=createMemberWizard({state,api,esc,icon,field,dialog,toast,icons,isAdmin,onSaved:async()=>{await loadData();render();},onConfigureMail:callback=>accountsUI.mailSettings(callback)});
async function loadData(){if(!hasEventAccess()){state.events=[];state.people=[];state.trash=[];state.partners=[];state.catalog={equipment:[],games:[],program:[],drinks:[]};return;}const [a,b,c,d]=await Promise.all([api('/api/abend/events'),(isEditor()||state.user.roles.some(r=>r.role==='manager'))?api('/api/abend/catalog'):Promise.resolve({catalog:{equipment:[],games:[],program:[],drinks:[]}}),api('/api/abend/people'),isEditor()?api('/api/abend/partners'):Promise.resolve({partners:[]})]);state.events=a.events;state.catalog=b.catalog;state.people=c.people;state.trash=c.trash||[];state.partners=d.partners;if(isAdmin())await accountsUI.load();}
async function loadCurrent(id,version){const value=await api(`/api/abend/events/${encodeURIComponent(id)}`);if(version===undefined||version===routeVersion)state.current=value;return value;}
function eventPath(tab='overview'){return `#event/${state.current.event.eventId}/${tab}`;}
async function route(){
  if(!state.user)return;
  const version=++routeVersion,requested=location.hash;
  if(integrated&&(state.busy||document.querySelector('dialog[open]'))){history.replaceState(null,'',location.pathname+lastRoute);toast('Bitte schließe zuerst den aktuellen Vorgang ab.');return;}
  if(websiteEditor?.busy){history.replaceState(null,'',location.pathname+lastRoute);toast('Bitte warte, bis der aktuelle Vorgang abgeschlossen ist.');return;}
  if(websiteEditor?.dirty&&!await confirmDiscard()){history.replaceState(null,'',location.pathname+lastRoute);return;}
  if(version!==routeVersion)return;
  websiteEditor?.destroy();websiteEditor=null;
  if(integrated)root.querySelector('#workspace')?.setAttribute('aria-busy','true');
  if(websiteChanged){await loadData();websiteChanged=false;}
  if(version!==routeVersion)return;
  const hash=!hasEventAccess()&&isAuthor()?'website/posts':location.hash.slice(1),parts=hash.split('/');
  state.filter='all';state.search='';
  if(parts[0]==='event'&&parts[1]){state.page='event';state.tab=['overview','offers','drinks','team','stations'].includes(parts[2])?parts[2]:'overview';if(state.current?.event.eventId!==parts[1])await loadCurrent(parts[1],version);}
  else {state.page=['library','people','live','accounts',...(integrated?['website']:[])].includes(parts[0])?parts[0]:'events';state.current=null;}
  if(!hasEventAccess()&&isAuthor()&&state.page!=='website'){state.page='website';state.websiteSection='posts';}
  if(integrated&&state.page==='live'){location.replace('/live');return;}
  if(state.page==='website'){state.websiteSection=['posts','events','team'].includes(parts[1])?parts[1]:'posts';if(!isEditor()&&!isAuthor())state.page='denied';if(isAuthor()&&!isEditor())state.websiteSection='posts';}
  if(integrated&&state.current?.event)sessionStorage.setItem('rudelbar:backstage:event',state.current.event.eventId);
  if(state.page==='accounts'){if(!isAdmin())state.page='events';else await accountsUI.load();}
  if(['library','people'].includes(state.page)&&!isEditor())state.page='events';
  if(version!==routeVersion)return;lastRoute=requested;render();window.scrollTo({top:0,behavior:'instant'});
}
function navLinks(){return [['events','calendar-days','Veranstaltungen'],...(isEditor()?[['library','layout-grid','Angebote'],['people','users-round','Personen']]:[]),['live','radio','Live'],...(isAdmin()?[['accounts','user-round-cog','Benutzer']]:[])].map(([page,ic,label])=>`<a href="#${page}" ${state.page===page||(page==='events'&&state.page==='event')?'aria-current="page"':''}>${icon(ic)}<span>${label}</span></a>`).join('');}
function integratedNav(){
 const pages=[...(isEditor()||isAuthor()?[['website','globe-2',isAuthor()&&!isEditor()?'Beiträge':'Website']]:[]),...(hasEventAccess()?[['events','calendar-days','Veranstaltungen']]:[]),...(isEditor()?[['library','layout-grid','Angebote'],['people','users-round','Personen & Benutzer']]:[])];
 return pages.map(([page,ic,label])=>`<a href="#${page}" ${state.page===page||(page==='events'&&state.page==='event')||(page==='people'&&state.page==='accounts')?'aria-current="page"':''}>${icon(ic)}<span>${label}</span></a>`).join('');
}
function peopleTabs(){return `<nav class="workspace-tabs" aria-label="Personen und Benutzer"><a href="#people" ${state.page==='people'?'aria-current="page"':''}>${icon('contact-round')}Personenprofile</a>${isAdmin()?`<a href="#accounts" ${state.page==='accounts'?'aria-current="page"':''}>${icon('shield-check')}Benutzer & Rechte</a>`:''}</nav>`;}
function websitePage(){return `<nav class="workspace-tabs" aria-label="Website bearbeiten">${[['posts','Aktuelles','notebook-pen'],...(isEditor()?[['events','Öffentliche Termine','calendar-days'],['team','Das Rudel','users-round']]:[])].map(([id,label,ic])=>`<a href="#website/${id}" ${state.websiteSection===id?'aria-current="page"':''}>${icon(ic)}${label}</a>`).join('')}</nav><div class="website-editor" data-website-editor><p class="loading">Deine Inhalte werden geladen …</p></div>`;}
function renderIntegrated(){
 websiteEditor?.destroy();websiteEditor=null;
 const content=state.page==='website'?websitePage():state.page==='events'?eventsPage():state.page==='event'?eventPage():state.page==='people'?peopleTabs()+peoplePage():state.page==='accounts'?peopleTabs()+accountsUI.page():state.page==='denied'?empty('lock-keyhole','Dieser Bereich gehört nicht zu deinen Aufgaben.','Öffne deinen Live-Bereich oder einen Abend, für den du berechtigt bist.','<a class="btn" href="/live">Zum Live-Bereich</a>'):libraryPage();
 root.innerHTML=`<header class="app-header"><a class="brand" href="#events"><img src="/abend-preview/assets/rudelbar-logo.png" alt="Rudelbar" width="30" height="46"><strong>RUDEL BAR<span class="brand-sub">Backstage</span></strong></a><div class="header-actions">${hasEventAccess()?`<a class="btn secondary small live-exit" aria-label="Live öffnen" href="${livePath()}" target="_blank" rel="noopener">${icon('headphones')}<span>Live öffnen</span>${icon('arrow-up-right')}</a>`:''}<button type="button" class="account-control" data-action="account" aria-label="Mein Konto">${icon('user-round')}<span>${esc(state.user.name||'Redaktion')}</span></button><button type="button" class="icon-btn" data-action="logout" aria-label="Abmelden">${icon('log-out')}</button><button type="button" class="icon-btn" data-action="refresh" aria-label="Ansicht aktualisieren">${icon('refresh-cw')}</button></div></header><aside class="app-sidebar"><nav class="global-nav" aria-label="Backstage">${integratedNav()}</nav><div class="sidebar-foot">${hasEventAccess()?`<a href="${livePath()}" target="_blank" rel="noopener">${icon('headphones')}Zum eigenen Live-Bereich ↗</a>`:''}${isEditor()?'<a href="/">Bisherige Redaktion ↗</a>':''}<small>Gemeinsam. Überall. Rudelbar.</small></div></aside><main class="workspace integrated-workspace" id="workspace">${content}</main><nav class="mobile-nav" aria-label="Backstage mobil">${integratedNav()}</nav>`;
 // Keep the selected evening when opening the separate Live interface.
 root.querySelectorAll('a[href^="/team?abend="]').forEach(link=>{const url=new URL(link.href);url.searchParams.set('backstage','1');link.href=url.pathname+url.search;});
 icons();
 if(state.page==='website'){
  const mount=root.querySelector('[data-website-editor]');
  websiteEditor=createWebsiteEditor({root:mount,integrated:true,user:state.user,section:state.websiteSection,onUnauthorized:()=>renderLogin(),onSaved:()=>{websiteChanged=true;},onDiscard:confirmDiscard,onDialogChange:open=>root.querySelectorAll('.app-header,.app-sidebar,.mobile-nav,#workspace>.workspace-tabs').forEach(node=>node.inert=open)});
  websiteEditor.start();
 }
}
function confirmDiscard(){
 return new Promise(resolve=>{
  let accepted=false;
  const node=dialog('Änderungen noch nicht gespeichert','<p>Du hast diesen Entwurf verändert. Möchtest du ihn verlassen und die ungespeicherten Änderungen verwerfen?</p>',async()=>{accepted=true;},{saveLabel:'Änderungen verwerfen'});
  node.addEventListener('close',()=>resolve(accepted),{once:true});
 });
}
function showAccount(){
 const user=state.user,labels={admin:'Administration',editor:'Backstage-Verwaltung',author:'Redaktion · Beiträge verfassen',manager:'Abendleitung',station:'Stationsbetreuung',host:'Gastgeber & Moderation'};
 dialog('Dein Zugang',`<div class="account-profile"><span class="avatar">${esc(initial(user.name))}</span><div><h3>${esc(user.name)}</h3><p>${esc(user.email)}</p></div></div><h3>Deine Aufgaben</h3><div class="chips">${(user.roles||[]).map(r=>chip(labels[r.role]+(r.eventId?' · '+(state.events.find(e=>e.eventId===r.eventId)?.title||'Zugeordneter Abend'):''))).join('')}</div><p class="help-copy">${user.legacy?'Du nutzt den bisherigen gemeinsamen Zugang Redaktion. Er bleibt während der Umstellung erhalten.':'Dein persönlicher Zugang gilt für Backstage und Live. Die Administration verwaltet deine Aufgaben und Berechtigungen.'}</p>${!user.legacy?'<a class="btn secondary" href="/anmelden?aktion=passwort">Passwort ändern</a>':''}<p><a class="back-link" href="/anmelden?wechsel=1">Mit anderem Konto anmelden</a></p>`,async()=>{},{saveLabel:'Fertig'});
}
function render(){
  if(!state.user)return renderLogin();
  if(integrated)return renderIntegrated();
  root.innerHTML=`<header class="app-header"><a class="brand" href="#events"><img src="/abend-preview/assets/rudelbar-logo.png" alt="Rudelbar" width="30" height="46"><strong>RUDEL BAR<span class="brand-sub">Backstage</span></strong></a><div class="header-actions"><span class="session-name">${esc(state.user.name||'Redaktion')}</span><button type="button" class="icon-btn" data-action="logout" aria-label="Abmelden">${icon('log-out')}</button><button type="button" class="icon-btn" data-action="refresh" aria-label="Ansicht aktualisieren">${icon('refresh-cw')}</button></div></header><aside class="app-sidebar"><nav class="global-nav" aria-label="Backstage">${navLinks()}</nav><div class="sidebar-foot">${isEditor()?'<a href="/">← Webseitenredaktion</a>':''}Gemeinsam. Überall. Rudelbar.</div></aside><main class="workspace" id="workspace">${state.page==='events'?eventsPage():state.page==='event'?eventPage():state.page==='people'?peoplePage():state.page==='live'?liveLanding():state.page==='accounts'?accountsUI.page():libraryPage()}</main><nav class="mobile-nav" aria-label="Backstage mobil">${navLinks()}</nav>`;
  icons();root.querySelector('.workspace-tabs [aria-current=page]')?.scrollIntoView({block:'nearest',inline:'nearest'});
}
function renderLogin(error=''){
  if(integrated){websiteEditor?.destroy();websiteEditor=null;location.replace(signInPath(location.pathname+location.search+location.hash)+(error?'&loginError='+encodeURIComponent(error):''));return;}
  root.innerHTML=`<main class="login-wrap"><section class="login-card"><div class="brand"><img src="/abend-preview/assets/rudelbar-logo.png" alt="Rudelbar" width="30" height="46"><strong>RUDEL BAR</strong></div><span class="eyebrow">Dein Backstage</span><h1>Gute Abende beginnen hier.</h1><p>Plane Veranstaltungen und bereite die App für eure Gäste vor.</p>${state.identityConfigured?'<a class="btn personal-login" href="/anmelden?weiter=%2Fabendplan">Mit persönlichem Konto anmelden</a>':''}<details ${state.identityConfigured?'':'open'}><summary>Zugang Redaktion</summary><form id="login-form">${field('password','Redaktionspasswort','','type="password" autocomplete="current-password" required')}<p class="dialog-error" role="alert" ${error?'':'hidden'}>${esc(error)}</p><button class="btn" type="submit">Anmelden ${icon('arrow-right')}</button></form></details></section></main>`;icons();
}
function eventState(event){return chip(event.app.state==='open'?'App offen':'App geschlossen',event.app.state==='open'?'open':'closed',event.app.state==='open'?'radio':'moon');}
function eventsPage(){
  const events=state.events.filter(e=>state.eventFilter==='all'||(state.eventFilter==='open'?e.app.state==='open':e.visibility==='private'));
  return `<div class="page-head"><div><span class="eyebrow">Veranstaltungen</span><h1>Deine Abende im Überblick.</h1><p>${state.events.length} Veranstaltungen · ${state.events.filter(e=>e.app.state==='open').length} ${state.events.filter(e=>e.app.state==='open').length===1?'App geöffnet':'Apps geöffnet'}</p></div>${isEditor()?button(icon('plus')+' Abend anlegen','new-event'):''}</div><div class="filters" aria-label="Veranstaltungen filtern">${[['all','Alle Abende'],['open','App offen'],['private','Privat']].map(([id,label])=>`<button class="filter" type="button" data-event-filter="${id}" aria-pressed="${state.eventFilter===id}">${label}</button>`).join('')}</div>${events.length?`<div class="card-grid">${events.map(e=>{const date=new Date(e.date+'T12:00:00'),month=new Intl.DateTimeFormat('de-DE',{month:'short'}).format(date);return `<a class="event-card" href="${e.canManage===false?'/team?abend='+e.eventId:'#event/'+e.eventId+'/overview'}"><div class="event-card-top"><span class="date-stamp"><strong>${date.getDate()}</strong><small>${esc(month)}</small></span><div class="chips">${chip(e.visibility==='private'?'Privat':'Öffentlich',e.visibility==='private'?'private':'',e.visibility==='private'?'lock-keyhole':'globe-2')}</div></div><h2>${esc(e.title)}</h2><p>${esc(e.venue)} · ${esc(e.time||'Zeit noch offen')}</p><div class="event-card-foot">${eventState(e)}<span>${e.canManage===false?'Live-Bereich öffnen':e.app.hasDraft?'In Vorbereitung':'Vorbereiten'} ${icon('arrow-up-right')}</span></div></a>`;}).join('')}</div>`:empty('calendar-plus','Platz für euren nächsten Abend.','Lege eine Veranstaltung an und bereite sie ganz unabhängig vom Webseitenkalender vor.',button('Abend anlegen','new-event'))}`;
}
function empty(ic,title,copy,action=''){return `<div class="empty-state">${icon(ic)}<h2>${title}</h2><p>${copy}</p>${action}</div>`;}
function eventPage(){
  const {event}=state.current;
  const tabs=[['overview','house','Übersicht'],['offers','layout-grid','Angebote'],['drinks','glass-water','Getränke'],['team','users-round','Team'],['stations','radio','Stationen']];
  return `<a class="back-link" href="#events">${icon('chevron-left')}Alle Veranstaltungen</a><div class="event-context"><div><div class="chips">${chip(event.visibility==='private'?'Privater Abend':'Öffentlicher Abend',event.visibility==='private'?'private':'',event.visibility==='private'?'lock-keyhole':'globe-2')}${eventState(event)}</div><h1>${esc(event.title)}</h1><p>${esc(dateText(event.date))} · ${esc(event.time||'Zeit noch offen')} · ${esc(event.venue)}</p></div><div class="context-actions"><div class="page-actions">${button(icon(event.app.state==='open'?'moon':'radio')+(event.app.state==='open'?' App schließen':' App öffnen'),event.app.state==='open'?'close-app':'open-app',event.app.state==='open'?'secondary':'')}<a class="btn secondary" href="/team?abend=${event.eventId}" target="_blank" rel="noopener">${icon('headphones')}Live-Bereich</a>${button(icon('settings-2'),'event-details','secondary','aria-label="Veranstaltung bearbeiten"')}</div><span class="saved-indicator">${icon('cloud-check')}Änderungen werden als Entwurf gespeichert</span></div></div><nav class="workspace-tabs" aria-label="Abend vorbereiten">${tabs.map(([id,ic,label])=>`<a href="${eventPath(id)}" ${state.tab===id?'aria-current="page"':''}>${icon(ic)}${label}</a>`).join('')}</nav>${event.app.hasDraft&&event.app.state==='open'?`<div class="notice"><span>Du hast Änderungen vorbereitet. Gäste sehen weiterhin die freigegebene Fassung.</span>${button('Für Gäste übernehmen','apply','small')}</div>`:''}${state.tab==='overview'?overviewPage():state.tab==='team'?teamPage():state.tab==='stations'?stationsPage():eventOffersPage(state.tab==='drinks'?'menu':null)}`;
}
function overviewPage(){
  const {event,experience}=state.current,total=experience.equipment.length+experience.games.length+experience.program.length;
  return `<section class="summary-card"><div class="status-row"><span class="status-orb ${event.app.state==='open'?'open':''}">${icon(event.app.state==='open'?'radio':'moon')}</span><div><h2>${event.app.state==='open'?'Euer Abend ist für Gäste geöffnet.':'Alles bereit für euren Abend?'}</h2><p>${event.app.state==='open'?'Die App zeigt die freigegebenen Angebote. Du kannst den Abend jederzeit schließen.':'Solange die App geschlossen ist, sehen Gäste eine geschlossene Tür. In der Vorschau könnt ihr alles vorbereiten.'}</p></div></div><div class="row-actions">${button(icon('eye')+' Vorschau ansehen','preview','secondary')}${button(icon('link-2')+' Gäste-Link kopieren','copy-link','secondary')}</div></section><div class="section-head"><h2>Was möchtest du vorbereiten?</h2></div><div class="area-grid">${areaCard('Angebote',total+' ausgewählt','layout-grid',eventPath('offers'))}${areaCard('Getränkekarte',experience.menu.length+(experience.menu.length===1?' Getränk':' Getränke'),'glass-water',eventPath('drinks'))}${areaCard('Stationen',(experience.stations||[]).filter(s=>s.enabled!==false).length+' Eingänge vorbereitet','radio',eventPath('stations'))}${areaCard('Team',event.teamIds.length+(event.teamIds.length===1?' Person dabei':' Personen dabei'),'users-round',eventPath('team'))}<button type="button" class="area-card" data-action="welcome"><span class="area-icon">${icon('message-circle-heart')}</span><span class="copy"><h2>Begrüßung</h2><p>Euer erstes Hallo in der App</p></span>${icon('chevron-right')}</button></div><div class="section-head spaced"><div><h2>Für eure Gäste</h2><p>${event.visibility==='private'?'Dieser private Abend ist nur über seinen eigenen Gäste-Link erreichbar.':'Diesen Gäste-Link könnt ihr teilen oder für eure QR-Codes verwenden.'}</p></div></div><a class="btn secondary" href="${esc(event.guestUrl)}" target="_blank" rel="noopener">${icon('external-link')}Gäste-App ansehen</a>`;
}
function areaCard(title,sub,ic,href){return `<a class="area-card" href="${href}"><span class="area-icon">${icon(ic)}</span><span class="copy"><h2>${title}</h2><p>${sub}</p></span>${icon('chevron-right')}</a>`;}
function filterButtons(includeDrinks=false){return `<div class="filters" aria-label="Angebotsarten"><button type="button" class="filter" data-filter="all" aria-pressed="${state.filter==='all'}">Alle</button>${Object.entries(types).filter(([key])=>includeDrinks||key!=='drinks').map(([key,t])=>`<button type="button" class="filter" data-filter="${key}" aria-pressed="${state.filter===key}">${t.name}</button>`).join('')}</div>`;}
function eventOffersPage(kind){
  const isMenu=kind==='menu',entries=(isMenu?['drinks']:['equipment','games','program']).filter(k=>state.filter==='all'||state.filter===k).flatMap(source=>state.catalog[source].filter(i=>!i.archived||state.current.experience[source==='drinks'?'menu':source].some(r=>r.id===i.id)).map(item=>({source,item})));
  return `<div class="section-head"><div><h2>${isMenu?'Die Getränkekarte':'Das findet heute statt.'}</h2><p>${isMenu?'Wähle Getränke aus. Preis und Verfügbarkeit bearbeitest du am Eintrag.':'Nimm Angebote dazu und ergänze bei Bedarf Ort und Ansprechperson.'}</p></div>${button(icon('plus'),'new-offer','secondary small',`data-kind="${isMenu?'drinks':'equipment'}" aria-label="Eigenes Angebot anlegen"`)}</div>${!isMenu?filterButtons():''}${entries.length?`<div class="offer-grid">${entries.map(({source,item})=>eventOfferCard(source,item)).join('')}</div>`:empty(isMenu?'glass-water':'layout-grid','Hier ist noch Platz für eure Ideen.','Lege ein eigenes Angebot an und wähle es für diesen Abend aus.',button('Angebot anlegen','new-offer','',`data-kind="${isMenu?'drinks':'equipment'}"`))}`;
}
function eventOfferCard(source,item){
  const kind=source==='drinks'?'menu':source,row=state.current.experience[kind].find(r=>r.id===item.id),person=state.people.find(p=>p.personId===row?.hostId),ic=types[source].icon;
  return `<article class="offer-card ${row?'selected':''}"><div class="offer-card-header">${item.imageUrl?`<img class="resource-image" src="${esc(item.imageUrl)}" alt="">`:`<span class="offer-symbol">${icon(ic)}</span>`}<div class="copy"><h3>${esc(item.name)}</h3><small>${esc(item.category)}${item.archived?' · Archiviert':''}</small></div><button type="button" class="toggle-offer" data-action="toggle-offer" data-kind="${kind}" data-id="${item.id}" aria-pressed="${!!row}" aria-label="${esc(item.name)} ${row?'entfernen':'dazunehmen'}">${row?icon('check'):icon('plus')}</button></div><div class="metadata">${source==='drinks'?`<span>${esc(item.unit)} · ${esc(euros(row?.priceCents??item.priceCents))}${row?.available===false?' · Ausverkauft':''}</span>`:row?`<span>${icon('map-pin')}${esc(row.place||'Standort noch offen')}</span><span>${icon('user-round')}${esc(person?.name||'Keine persönliche Zuordnung')}</span>${row.time?`<span>${icon('clock-3')}${esc(row.time)}</span>`:''}`:`<span>${esc(source==='program'?item.description||'Für euren Abend auswählbar':item.capacity?'Bis zu '+item.capacity+' Personen':'Für euren Abend auswählbar')}</span>`}</div>${row?`<div class="row-actions">${button(icon('sliders-horizontal')+' Details anpassen','offer-details','secondary small',`data-kind="${kind}" data-id="${item.id}"`)}</div>`:''}</article>`;
}
function libraryPage(){
  const entries=Object.keys(types).filter(k=>state.filter==='all'||state.filter===k).flatMap(source=>state.catalog[source].filter(item=>!!item.deletedAt===(state.catalogView==='trash')).map(item=>({source,item}))).filter(({item})=>!state.search||`${item.name} ${item.category}`.toLowerCase().includes(state.search.toLowerCase()));
  return `<div class="page-head"><div><span class="eyebrow">Angebote verwalten</span><h1>Was macht euren Abend aus?</h1><p>Eure Ausstattung, Spiele, Programmpunkte und Getränke.</p></div>${button(icon('plus')+' Angebot anlegen','new-offer','',`data-kind="${state.filter==='all'?'equipment':state.filter}"`)}</div><div class="filters" aria-label="Katalogansicht"><button type="button" class="filter" data-catalog-view="active" aria-pressed="${state.catalogView==='active'}">Angebote</button><button type="button" class="filter" data-catalog-view="trash" aria-pressed="${state.catalogView==='trash'}">${icon('trash-2')}Papierkorb</button></div><div class="catalog-toolbar">${filterButtons(true)}<label class="search">${icon('search')}<input name="catalog-search" type="search" placeholder="Angebote finden" aria-label="Angebote suchen" value="${esc(state.search)}"></label></div>${entries.length?`<div class="item-list">${entries.map(({source,item})=>`<button type="button" class="item-row" data-action="${state.catalogView==='trash'?'restore-catalog':'edit-catalog'}" data-kind="${source}" data-id="${item.id}"><span class="offer-symbol">${icon(types[source].icon)}</span><span class="copy"><strong>${esc(item.name)}</strong><small>${esc(item.category)}${source==='drinks'?' · '+esc(euros(item.priceCents)):''}</small></span>${item.deletedAt||item.archived?chip(item.deletedAt?'Im Papierkorb':'Archiviert'):''}${icon('chevron-right')}</button>`).join('')}</div>`:state.catalogView==='trash'?empty('trash-2','Der Papierkorb ist leer.','Gelöschte Angebote lassen sich hier wiederherstellen.'):empty('layout-grid','Eure Angebote beginnen mit einer Idee.','Legt an, was ihr tatsächlich mitbringt. Die Bereiche könnt ihr frei benennen.',button('Angebot anlegen','new-offer'))}`;
}
function peoplePage(){return `<div class="page-head"><div><span class="eyebrow">Personen</span><h1>Das Rudel hinter dem Abend.</h1><p>Profile, Zugehörigkeit und Benutzerzugänge gemeinsam einrichten.</p></div>${button(icon('user-round-plus')+(isAdmin()?' Teammitglied einrichten':' Profil anlegen'),'new-person')}</div><div class="filters" aria-label="Personen filtern"><button type="button" class="filter" data-people-view="active" aria-pressed="${state.peopleView==='active'}">Profile (${state.people.length})</button><button type="button" class="filter" data-people-view="trash" aria-pressed="${state.peopleView==='trash'}">${icon('trash-2')}Papierkorb (${state.trash.length})</button></div>${isEditor()?`<div class="row-actions">${button(icon('badge-check')+' Partner verwalten','manage-partners','secondary small')}</div>`:''}<p class="privacy-note">${icon('lock-keyhole')}${state.peopleView==='trash'?'Gelöschte Profile lassen sich wiederherstellen. Bestehende Gespräche bleiben erhalten.':'Kontaktangaben bleiben in der geschützten Redaktion.'}</p>${personCards(false)}`;}
function teamPage(){return `<div class="section-head"><div><h2>Wer ist heute dabei?</h2><p>Wähle das Team für diesen Abend. Ansprechpersonen an Angeboten sind optional.</p></div>${isEditor()?button(icon('user-round-plus'),'new-person','secondary small','aria-label="Person anlegen"'):''}</div>${personCards(true)}<div class="row-actions spaced">${button('Team-Zugänge verwalten','manage-access','secondary')}</div>`;}
function personCards(forEvent){
  const inTrash=!forEvent&&state.peopleView==='trash',people=(inTrash?state.trash:state.people).filter(p=>!forEvent||!p.archived||state.current.event.teamIds.includes(p.personId));
  return people.length?`<div class="person-grid">${people.map(p=>{const selected=forEvent&&state.current.event.teamIds.includes(p.personId);return `<article aria-label="${esc(p.name)}" class="person-card ${p.archived?'is-archived':''}"><div class="person-top">${profileAvatar(p)}<div class="copy"><h3>${esc(p.name)}</h3><p>${esc(p.role||(p.membershipType==='partner'?'Partner-Mitglied':'Rudelbar-Team'))}${inTrash?' · Im Papierkorb':p.archived?' · Pausiert':''}</p><small class="affiliation-label">${esc(affiliationName(p))}${p.onboardingPending?' · Einrichtung nicht abgeschlossen':''}</small></div>${forEvent?`<button class="toggle-offer" type="button" data-action="toggle-person" data-id="${p.personId}" aria-pressed="${selected}" aria-label="${esc(p.name)} ${selected?'aus dem Team nehmen':'zum Team hinzufügen'}">${icon(selected?'check':'plus')}</button>`:''}</div>${!forEvent?`<div class="person-contact">${p.email?`<p>${esc(p.email)}</p>`:''}${p.phone?`<p>${esc(p.phone)}</p>`:''}</div>`:''}<div class="row-actions">${isEditor()?(inTrash?button('Wiederherstellen','restore-person','secondary small',`data-id="${p.personId}" aria-label="Profil ${esc(p.name)} wiederherstellen"`):button('Profil bearbeiten','edit-person','secondary small',`data-id="${p.personId}"`)+(!forEvent?button(icon('trash-2')+' Profil löschen','delete-person','danger small',`data-id="${p.personId}" aria-label="Profil ${esc(p.name)} löschen"`):'')):''}${!forEvent&&!inTrash&&isAdmin()?button(p.onboardingPending?'Einrichtung fortsetzen':accountsUI.accountFor(p.personId)?'Zugang bearbeiten':'Zugang einrichten','person-access','secondary small',`data-id="${p.personId}"`):''}${!forEvent&&!inTrash&&isAdmin()&&accountsUI.accountFor(p.personId)?.enabled&&!accountsUI.accountFor(p.personId)?.activated?button('Einladung','invite-account','secondary small',`data-id="${accountsUI.accountFor(p.personId).id}"`):''}${forEvent&&selected&&!p.archived?button('Team-Zugang','team-access','secondary small',`data-id="${p.personId}"`):''}</div></article>`;}).join('')}</div>`:inTrash?empty('trash-2','Der Papierkorb ist leer.','Gelöschte Personenprofile kannst du hier wiederherstellen.'):empty('users-round','Wer gehört zu eurem Rudel?','Lege ein Profil an. Danach lässt sich diese Person dem Abend und einzelnen Angeboten zuordnen.',button(isAdmin()?'Erstes Teammitglied einrichten':'Erstes Profil anlegen','new-person'));
}
const stationKinds={music:{name:'Musikwünsche',icon:'disc-3'},karaoke:{name:'Karaoke-Anmeldungen',icon:'mic-vocal'},message:{name:'Nachrichten & Fragen',icon:'messages-square'}};
function liveLanding(){
  const events=state.events.filter(e=>e.app.hasRelease);
  return `<div class="page-head"><div><span class="eyebrow">Live-Betrieb</span><h1>Für das, was gerade passiert.</h1><p>Öffne den Eingang eines Abends. Hier laufen Musikwünsche, Anmeldungen und Gästeanfragen zusammen.</p></div></div>${events.length?`<div class="card-grid">${events.map(e=>`<a class="event-card" href="/team?abend=${e.eventId}" target="_blank" rel="noopener"><div class="event-card-top"><span class="area-icon">${icon('headphones')}</span>${eventState(e)}</div><h2>${esc(e.title)}</h2><p>${esc(dateText(e.date))} · ${esc(e.venue)}</p><div class="event-card-foot">Live-Bereich öffnen ${icon('arrow-up-right')}</div></a>`).join('')}</div>`:empty('radio','Der nächste Abend wartet.','Bereite zuerst einen Abend und seine Stationen vor. Danach kannst du hier den Live-Bereich öffnen.')}`;
}
function stationsPage(){
  const {event,experience}=state.current,stations=experience.stations||[];
  return `<div class="section-head"><div><h2>Wer nimmt was entgegen?</h2><p>Jede Station erhält einen Eingang. Zuständigkeiten kommen aus dem Abendteam.</p></div>${button(icon('plus')+' Station','new-station')}</div>${stations.length?`<div class="offer-grid">${stations.map(s=>{const kind=stationKinds[s.kind],names=s.operatorIds.map(id=>state.people.find(p=>p.personId===id)?.name).filter(Boolean);return `<article class="offer-card ${s.enabled?'selected':''}"><div class="offer-card-header"><span class="offer-symbol">${icon(kind.icon)}</span><div class="copy"><h3>${esc(s.name)}</h3><small>${kind.name}${s.enabled?'':' · Für Gäste ausgeblendet'}</small></div></div><div class="metadata"><span>${icon('users-round')}${esc(names.join(', ')||(s.assignmentRequired?'Betreuung neu zuordnen · bisher nur Abendleitung':'Gesamtes Abendteam'))}</span><span>${icon('map-pin')}${esc(s.place||'Kein fester Standort')}</span></div><div class="row-actions">${button('Bearbeiten','edit-station','secondary small',`data-id="${s.id}"`)}<a class="btn secondary small" href="/team?abend=${event.eventId}&station=${s.id}" target="_blank" rel="noopener">${icon('headphones')}Live-Eingang</a></div></article>`;}).join('')}</div>`:empty('radio','Platz für eure Stationen.','DJ, Karaoke, Spielebetreuung, Bar oder etwas ganz anderes: Name und Zuständigkeiten bestimmt ihr.',button('Erste Station anlegen','new-station'))}`;
}
function editStation(id){
  const exp=state.current.experience,station=exp.stations?.find(s=>s.id===id),row=station||{id:'station-'+crypto.randomUUID(),name:'',kind:'message',description:'',place:'',operatorIds:[],offerType:'',offerId:'',enabled:true};
  const people=state.people.filter(p=>!p.archived&&state.current.event.teamIds.includes(p.personId));
  const offers=['equipment','games','program','menu'].flatMap(kind=>exp[kind].map(o=>({key:kind+':'+o.id,name:o.name})));
  const fields=field('name','Name der Station',row.name,'maxlength="100" placeholder="z. B. Technik, Bar oder Musik" required')+`<label class="field"><span>Was können Gäste hier senden?</span><select name="kind">${Object.entries(stationKinds).map(([key,value])=>`<option value="${key}" ${row.kind===key?'selected':''}>${value.name}</option>`).join('')}</select></label>`+field('place','Standort · optional',row.place,'maxlength="160"')+area('description','Hinweis für Gäste',row.description,800)+`<label class="field"><span>Mit einem Angebot verknüpfen · optional</span><select name="offer"><option value="">Eigenständige Station</option>${offers.map(o=>`<option value="${o.key}" ${o.key===row.offerType+':'+row.offerId?'selected':''}>${esc(o.name)}</option>`).join('')}</select></label><p class="help-copy">Wer betreut den Eingang? Wähle Personen oder gib den Eingang für das gesamte Abendteam frei. Ohne Freigabe sieht ihn nur die Abendleitung.</p><label class="check-line"><input type="checkbox" name="teamWide" ${!row.assignmentRequired&&!row.operatorIds.length?'checked':''}>Ohne persönliche Auswahl für das gesamte Abendteam freigeben</label>${people.map(p=>`<label class="check-line"><input type="checkbox" name="operator" value="${p.personId}" ${row.operatorIds.includes(p.personId)?'checked':''}>${esc(p.name)}</label>`).join('')}${!people.length?`<p class="help-copy"><a href="${eventPath('team')}">Zuerst das Abendteam zusammenstellen →</a></p>`:''}<label class="check-line"><input type="checkbox" name="enabled" ${row.enabled?'checked':''}>Station für Gäste anzeigen</label><p class="help-copy">Ausblenden entfernt keine bisherigen Nachrichten. Das Team kann sie weiterhin bearbeiten.</p>`;
  dialog(station?'Station bearbeiten':'Station anlegen',fields,async fd=>{
    const [offerType='',offerId='']=String(fd.get('offer')||'').split(':');
    const next={...row,name:fd.get('name'),kind:fd.get('kind'),place:fd.get('place'),description:fd.get('description'),operatorIds:fd.getAll('operator'),assignmentRequired:!fd.has('teamWide'),offerType,offerId,enabled:fd.has('enabled')};
    await saveConfig({...exp,stations:station?exp.stations.map(s=>s.id===id?next:s):[...(exp.stations||[]),next]});toast('Station als Entwurf gespeichert.');
  },{saveLabel:station?'Station speichern':'Station anlegen'});
}
async function issueTeamAccess(personId){
  const person=state.people.find(p=>p.personId===personId),result=await api(`/api/abend/events/${state.current.event.eventId}/access`,'POST',{personId});
  dialog('Team-Zugang für '+person.name,`<p class="help-copy">Dieser persönliche Link öffnet die zugeordneten Stationen dieses Abends. Teile ihn nur mit ${esc(person.name)}. Er ist sieben Tage gültig und lässt sich zurücknehmen.</p>${field('url','Persönlicher Team-Link',result.url,'readonly')}<p class="help-copy">Der Link wird hier nur jetzt angezeigt. Weitere Links verändern bestehende Zugänge nicht.</p>`,async()=>{await navigator.clipboard.writeText(result.url);toast('Persönlichen Team-Link kopiert.');},{saveLabel:'Link kopieren'});
}
async function manageAccess(){
  const eventId=state.current.event.eventId,{grants}=await api(`/api/abend/events/${eventId}/access`);
  const active=grants.filter(g=>!g.revoked&&g.expiresAt>Date.now());
  dialog('Team-Zugänge verwalten',active.length?`<div class="item-list">${active.map(g=>`<div class="item-row"><span class="copy"><strong>${esc(state.people.find(p=>p.personId===g.personId)?.name||'Person')}</strong><small>Erstellt ${esc(dateText(new Date(g.createdAt).toISOString().slice(0,10)))}</small></span><button type="button" class="btn danger small" data-revoke="${g.id}">Zurücknehmen</button></div>`).join('')}</div>`:'<p>Noch keine aktiven Team-Links.</p>',async()=>{}, {saveLabel:'Fertig',afterOpen:node=>node.querySelectorAll('[data-revoke]').forEach(b=>b.addEventListener('click',async()=>{try{await api(`/api/abend/events/${eventId}/access/${b.dataset.revoke}/revoke`,'POST');b.closest('.item-row').remove();toast('Der Team-Zugang ist zurückgenommen.');}catch(e){toast(e.message,true);}}))});
}
function dialog(title,body,onSave,{saveLabel='Speichern',afterOpen}={}){
  const previous=document.activeElement,node=document.createElement('dialog');node.className='dialog';node.setAttribute('aria-label',title);
  node.innerHTML=`<div class="dialog-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Dialog schließen">${icon('x')}</button></div><form><div class="dialog-body"><p class="dialog-error" role="alert" hidden></p>${body}</div><div class="dialog-foot"><button type="button" class="btn secondary" data-close>Abbrechen</button><button type="submit" class="btn">${saveLabel}</button></div></form>`;
  node.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>node.close()));
  node.querySelector('form').addEventListener('submit',async event=>{event.preventDefault();const form=event.target;if(!form.reportValidity())return;node.querySelectorAll('button').forEach(b=>b.disabled=true);const error=node.querySelector('[role=alert]');error.hidden=true;try{await onSave(new FormData(form),node);node.close();}catch(err){error.textContent=err.message;error.hidden=false;error.scrollIntoView({block:'nearest'});}finally{node.querySelectorAll('button').forEach(b=>b.disabled=false);}});
  node.addEventListener('click',event=>{if(event.target.closest('a'))node.close();});
  node.addEventListener('close',()=>{node.remove();if(previous?.isConnected)previous.focus({preventScroll:true});});
  document.body.append(node);node.showModal();icons();afterOpen?.(node);return node;
}
function eventFields(event={}){
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Berlin'});
  return `${field('title','Name des Abends',event.title||'','maxlength="120" placeholder="z. B. Sommerabend im Dorf" required')}<div class="form-grid">${field('date','Datum',event.date||today,'type="date" required')}${field('time','Uhrzeit',event.time||'','placeholder="z. B. ab 18 Uhr" maxlength="80"')}</div>${field('venue','Ort',event.venue||'','maxlength="160" required')}${field('address','Adresse',event.address||'','maxlength="240"')}<span class="help-copy">Für wen ist dieser Abend?</span><div class="choice-row"><label class="choice"><input type="radio" name="visibility" value="public" ${event.visibility==='public'?'checked':''}>${icon('globe-2')}Öffentlich</label><label class="choice"><input type="radio" name="visibility" value="private" ${event.visibility!=='public'?'checked':''}>${icon('lock-keyhole')}Privat</label></div><p class="help-copy">Private Abende sind nur über ihren Gäste-Link erreichbar. Das Anlegen eines Abends erstellt keinen Termin auf der öffentlichen Webseite.</p>`;
}
function eventBody(fd,event={}){return {title:fd.get('title'),date:fd.get('date'),time:fd.get('time'),venue:fd.get('venue'),address:fd.get('address'),description:event.description||'',visibility:fd.get('visibility'),teamIds:event.teamIds||[],revision:event.revision||''};}
function editEvent(create=false){
  const event=create?{}:state.current.event;
  dialog(create?'Neuen Abend anlegen':'Veranstaltung bearbeiten',eventFields(event),async fd=>{
    if(create){const result=await api('/api/abend/events','POST',eventBody(fd));await loadData();location.hash=`event/${result.id}/overview`;toast('Dein Abend ist angelegt. Die App bleibt zunächst geschlossen.');}
    else{await saveDetails(eventBody(fd,event));toast('Veranstaltung gespeichert.');}
  },{saveLabel:create?'Abend anlegen':'Änderungen speichern'});
}
async function saveDetails(fields){const result=await api(`/api/abend/events/${state.current.event.eventId}/details`,'PUT',fields);state.current.event=result.event;state.events=(await api('/api/abend/events')).events;render();}
async function saveConfig(next=state.current.experience){const result=await api(`/api/abend/events/${state.current.event.eventId}`,'PUT',next);state.current.experience=result.experience;state.current.event.app.hasDraft=true;render();}
function editWelcome(){const exp=state.current.experience;dialog('Euer erstes Hallo',area('welcomeTitle','Begrüßung',exp.welcomeTitle,160)+area('welcomeText','Nachricht für eure Gäste',exp.welcomeText,1200)+`<label class="check-line"><input type="checkbox" name="help" ${exp.modules.help?.enabled!==false?'checked':''}>Anlaufstelle für Fragen in der App anzeigen</label>`,async fd=>{await saveConfig({...exp,welcomeTitle:fd.get('welcomeTitle'),welcomeText:fd.get('welcomeText'),modules:{...exp.modules,help:{enabled:fd.has('help')}}});toast('Begrüßung gespeichert.');});}
function editOffer(kind,id){
  const exp=state.current.experience,row=exp[kind].find(r=>r.id===id);if(!row)return;
  const people=state.people.filter(p=>!p.archived&&state.current.event.teamIds.includes(p.personId));
  const personField=`<label class="field"><span>Ansprechperson · optional</span><select name="hostId"><option value="">Keine persönliche Zuordnung</option>${people.map(p=>`<option value="${p.personId}" ${row.hostId===p.personId?'selected':''}>${esc(p.name)}${p.role?' · '+esc(p.role):''}</option>`).join('')}</select><small>Aus dem Team dieses Abends. Das Rudelbar-Team hilft auch ohne persönliche Zuordnung.</small></label>${!people.length?`<p class="help-copy"><a href="${eventPath('team')}">Zuerst Personen zum Team hinzufügen →</a></p>`:''}`;
  const fields=kind==='menu'?field('price','Preis für diesen Abend (€)',money(row.priceCents),'inputmode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" required')+`<label class="check-line"><input name="available" type="checkbox" ${row.available!==false?'checked':''}>Heute verfügbar</label>`:field('place','Wo findet man das Angebot?',row.place,'maxlength="160" placeholder="z. B. links neben dem Wagen"')+personField+(kind==='program'?field('time','Wann?',row.time,'maxlength="80" placeholder="z. B. ab 19 Uhr"')+area('description','Beschreibung für diesen Abend',row.description):field('capacity',kind==='equipment'?'Plätze · optional':'Plätze pro Runde',row.capacity??'','type="number" min="1" max="30" '+(kind==='games'?'required':'')));
  dialog(row.name,fields,async fd=>{let change=kind==='menu'?{priceCents:Math.round(Number(String(fd.get('price')).replace(',','.'))*100),available:fd.has('available')}:{place:fd.get('place'),hostId:fd.get('hostId'),...(kind==='program'?{time:fd.get('time'),description:fd.get('description')}:{capacity:fd.get('capacity')===''?null:Number(fd.get('capacity'))})};await saveConfig({...exp,[kind]:exp[kind].map(r=>r.id===id?{...r,...change}:r)});toast('Details für diesen Abend gespeichert.');});
}
function editCatalog(kind='equipment',id){
  const item=id?state.catalog[kind].find(r=>r.id===id):null;let selectedKind=kind;
  const typeField=!item?`<label class="field"><span>Was möchtest du anlegen?</span><select name="kind">${Object.entries(types).map(([key,t])=>`<option value="${key}" ${kind===key?'selected':''}>${t.name}</option>`).join('')}</select></label>`:'';
  const fields=k=>{const r=item||{};return `${field('name','Name des Angebots',r.name||'','maxlength="100" required')}${field('category',k==='drinks'?'Kategorie auf der Karte':'Bereich in der App',r.category||({equipment:'Ausstattung',games:'Spiele',program:'Programm',drinks:'Alkoholfrei'}[k]),'maxlength="80" required',k==='drinks'?'':'Frei benennbar, zum Beispiel Nachbarschaft oder Kreativ werden.')}${k==='drinks'?`<div class="form-grid">${field('unit','Menge',r.unit||'0,33 l','maxlength="40" required')}${field('price','Standardpreis (€)',money(r.priceCents),'inputmode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" required')}</div><label class="field"><span>Bild · optional</span><input type="file" name="image" accept="image/jpeg,image/png,image/webp"></label>${r.imageUrl?`<img class="resource-image" src="${esc(r.imageUrl)}" alt="${esc(r.name)}"><label class="check-line"><input name="removeImage" type="checkbox">Bild entfernen</label>`:''}`:`${k!=='program'?`<div class="form-grid">${field('capacity',k==='equipment'?'Plätze · optional':'Plätze pro Runde',r.capacity??4,'type="number" min="1" max="30" '+(k==='games'?'required':''))}${k==='games'?field('minutes','Dauer in Minuten',r.minutes??30,'type="number" min="0" max="300" required'):''}</div>`:''}${area('description','Beschreibung',r.description||'',k==='program'?1000:800)}${k==='games'?area('rules','Kurz erklärt',r.rules||'',2000):''}`}${item?`<label class="check-line"><input name="archived" type="checkbox" ${item.archived?'checked':''}>Angebot archivieren</label><p class="help-copy">Archivierte Angebote bleiben gespeichert und können hier wieder aktiviert werden.</p><button type="button" class="btn danger small" data-delete-offer>${icon('trash-2')}Angebot löschen</button>`:''}`;};
  dialog(item?'Angebot bearbeiten':'Eigenes Angebot anlegen',typeField+`<div id="catalog-fields">${fields(kind)}</div>`,async fd=>{
    const next=structuredClone(state.catalog),newId=item?.id||`${selectedKind}-${crypto.randomUUID()}`;
    let row={...item,id:newId,name:fd.get('name'),category:fd.get('category'),archived:fd.has('archived')};
    if(selectedKind==='drinks'){
      let imageUrl=fd.has('removeImage')?'':item?.imageUrl||'';const file=fd.get('image');
      if(file?.size){if(file.size>8_000_000)throw new Error('Bitte ein Bild unter 8 MB wählen.');const response=await fetch('/api/upload',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':state.user.csrf,'Content-Type':file.type,'X-File-Name':file.name},body:file});const result=await response.json();if(!response.ok)throw new Error(result.error||'Das Bild konnte nicht hochgeladen werden.');imageUrl=result.url;}
      row={...row,unit:fd.get('unit'),priceCents:Math.round(Number(String(fd.get('price')).replace(',','.'))*100),imageUrl};
    }else row={...row,kind:item?.kind||'other',description:fd.get('description'),...(selectedKind!=='program'?{capacity:fd.get('capacity')===''?null:Number(fd.get('capacity'))}:{}),...(selectedKind==='games'?{minutes:Number(fd.get('minutes')),rules:fd.get('rules')}:{})};
    if(item)next[selectedKind]=next[selectedKind].map(r=>r.id===newId?row:r);else next[selectedKind].push(row);
    state.catalog=(await api('/api/abend/catalog','PUT',next)).catalog;render();toast(item?'Angebot gespeichert.':'Angebot angelegt und für eure Abende verfügbar.');
  },{saveLabel:item?'Änderungen speichern':'Angebot anlegen',afterOpen:node=>{node.querySelector('[name=kind]')?.addEventListener('change',event=>{selectedKind=event.target.value;node.querySelector('#catalog-fields').innerHTML=fields(selectedKind);});node.querySelector('[data-delete-offer]')?.addEventListener('click',()=>{node.addEventListener('close',()=>deleteCatalog(kind,id),{once:true});node.close();});}});
}
function deleteCatalog(kind,id){
 const item=state.catalog[kind].find(r=>r.id===id);if(!item)return;
 dialog('Angebot löschen',`<p><strong>${esc(item.name)}</strong> in den Papierkorb verschieben?</p><p>Das Angebot verschwindet aus dem Katalog und kann wiederhergestellt werden. Falls es noch einem bestehenden Abend zugeordnet ist, musst du es dort zuerst entfernen.</p>`,async()=>{
  state.catalog=(await api('/api/abend/catalog/'+kind+'/'+id+'/delete','POST',{revision:state.catalog.revision})).catalog;render();toast('Angebot in den Papierkorb verschoben.');
 },{saveLabel:'In den Papierkorb verschieben'});
}
function restoreCatalog(kind,id){
 const item=state.catalog[kind].find(r=>r.id===id);if(!item)return;
 dialog('Angebot wiederherstellen',`<p><strong>${esc(item.name)}</strong> wieder zum Katalog hinzufügen?</p><p>Das Angebot bleibt zunächst archiviert. Über „Angebot bearbeiten“ kannst du es wieder aktivieren.</p>`,async()=>{
  state.catalog=(await api('/api/abend/catalog/'+kind+'/'+id+'/restore','POST',{revision:state.catalog.revision})).catalog;state.catalogView='active';render();toast('Angebot wiederhergestellt.');
 },{saveLabel:'Angebot wiederherstellen'});
}
const safeProfileImage=url=>/^https:\/\/cdn\.sanity\.io\/images\//.test(url||'')?url:'';
function affiliationName(person){return person.membershipType==='partner'?(state.partners.find(p=>p.partnerId===person.partnerId)?.name||'Rudelbar-Partner'):'Rudelbar-Team';}
function profileAvatar(person){
 const photo=safeProfileImage(person.avatarUrl),logo=person.membershipType==='partner'?(safeProfileImage(state.partners.find(p=>p.partnerId===person.partnerId)?.logoUrl)||'/abend-preview/assets/rudelbar-partner.svg'):'/abend-preview/assets/rudelbar-logo.png';
 return `<span class="avatar member-avatar">${photo?`<img class="member-photo" src="${esc(photo)}" alt="Profilfoto ${esc(person.name)}">`:esc(initial(person.name))}<span class="membership-badge" title="${esc(affiliationName(person))}"><img src="${esc(logo)}" alt="${esc(affiliationName(person))}"></span></span>`;
}
function affiliationFields(person={}){return `<label class="field"><span>Zugehörigkeit</span><select name="membershipType"><option value="rudelbar" ${person.membershipType!=='partner'?'selected':''}>Rudelbar-Team</option><option value="partner" ${person.membershipType==='partner'?'selected':''}>Partner / Verein</option></select></label><label class="field"><span>Partner · bei Partnerprofilen erforderlich</span><select name="partnerId"><option value="">Kein Partner ausgewählt</option>${state.partners.map(p=>`<option value="${p.partnerId}" ${person.partnerId===p.partnerId?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label><label class="field"><span>Profilfoto · optional</span><input type="file" name="avatar" accept="image/jpeg,image/png,image/webp"></label>${person.avatarUrl?`<label class="check-line"><input type="checkbox" name="removeAvatar">Profilfoto entfernen</label>`:''}`;}
function editPerson(id){
 const person=state.people.find(p=>p.personId===id);if(!person)return;
 dialog('Profil bearbeiten',`<div class="account-profile">${profileAvatar(person)}<div><h3>${esc(person.name)}</h3><p>${esc(affiliationName(person))}</p></div></div>`+field('name','Name / Anzeigename',person.name,'maxlength="100" required')+field('role','Aufgabe / Tätigkeit · optional',person.role,'maxlength="100"')+affiliationFields(person)+`<div class="form-grid">${field('email','Kontakt-E-Mail · intern',person.email,'type="email" maxlength="254"')}${field('phone','Telefon · intern',person.phone,'type="tel" maxlength="60"')}</div><p class="help-copy">Bei einem freigegebenen Abend erscheinen Name, Foto und Zugehörigkeit in der Gäste-App. Kontaktangaben bleiben intern. Änderungen an den Anmeldeberechtigungen erfolgen über „Zugang bearbeiten“.</p><label class="check-line"><input type="checkbox" name="archived" ${person.archived?'checked':''}>Profil pausieren</label>`,async fd=>{
  const file=fd.get('avatar'),avatarUrl=file?.size?await uploadMemberImage(file,state.user.csrf):fd.has('removeAvatar')?'':person.avatarUrl||'';
  await api('/api/abend/people/'+id,'PUT',{name:fd.get('name'),role:fd.get('role'),email:fd.get('email'),phone:fd.get('phone'),membershipType:fd.get('membershipType'),partnerId:fd.get('partnerId'),avatarUrl,archived:fd.has('archived'),revision:person.revision});await loadData();render();toast('Profil gespeichert.');
 },{saveLabel:'Profil speichern'});
}
function managePartners(){
 const node=dialog('Partner verwalten',`<p>Vereine und andere Partner erhalten eine eigene Kennzeichnung. Ohne eigenes Logo verwenden wir den Platzhalter „Rudelbar-Partner“.</p><div class="partner-list">${state.partners.map(p=>`<button type="button" class="item-row" data-edit-partner="${p.partnerId}"><img class="partner-logo" src="${esc(safeProfileImage(p.logoUrl)||'/abend-preview/assets/rudelbar-partner.svg')}" alt=""><span class="copy"><strong>${esc(p.name)}</strong><small>${p.archived?'Inaktiv':'Aktiver Partner'}</small></span>${icon('chevron-right')}</button>`).join('')||'<p class="help-copy">Noch keine Partner angelegt.</p>'}</div><button type="button" class="btn secondary" data-new-partner>${icon('plus')}Partner anlegen</button>`,async()=>{},{saveLabel:'Fertig'});
 node.querySelectorAll('[data-edit-partner]').forEach(b=>b.onclick=()=>{node.close();editPartner(b.dataset.editPartner);});node.querySelector('[data-new-partner]').onclick=()=>{node.close();editPartner();};
}
function editPartner(id){
 const partner=state.partners.find(p=>p.partnerId===id)||{};
 dialog(id?'Partner bearbeiten':'Partner anlegen',field('name','Name des Vereins / Partners',partner.name||'','maxlength="100" required')+`<div class="wizard-brand-preview"><img src="${esc(safeProfileImage(partner.logoUrl)||'/abend-preview/assets/rudelbar-partner.svg')}" alt="Partnerlogo"><span>${esc(partner.name||'Rudelbar-Partner')}</span></div><label class="field"><span>Eigenes Logo · optional</span><input type="file" name="logo" accept="image/jpeg,image/png,image/webp"></label>${partner.logoUrl?'<label class="check-line"><input type="checkbox" name="removeLogo">Eigenes Logo entfernen</label>':''}<label class="check-line"><input type="checkbox" name="archived" ${partner.archived?'checked':''}>Für neue Zuordnungen deaktivieren</label><p class="help-copy">Die Zugehörigkeit zu diesem Partner vergibt keine Anmelderechte. Berechtigungen werden am jeweiligen Benutzerkonto vergeben.</p>`,async fd=>{
  const file=fd.get('logo'),logoUrl=file?.size?await uploadMemberImage(file,state.user.csrf):fd.has('removeLogo')?'':partner.logoUrl||'';
  await api('/api/abend/partners'+(id?'/'+id:''),id?'PUT':'POST',{name:fd.get('name'),logoUrl,archived:fd.has('archived'),revision:partner.revision});await loadData();render();toast('Partner gespeichert.');
 },{saveLabel:'Partner speichern'});
}
function deletePerson(id){
 const person=state.people.find(p=>p.personId===id);if(!person)return;
 const events=state.events.filter(e=>e.teamIds.includes(id));
 dialog('Profil löschen',`<p>Möchtest du <strong>${esc(person.name)}</strong> in den Papierkorb verschieben?</p>${events.length?`<p>Das Profil ist ${events.length===1?'diesem Abend':'diesen Abenden'} zugeordnet:</p><ul>${events.map(e=>`<li>${esc(e.title)}</li>`).join('')}</ul>`:''}<p>Die Person verschwindet aus der Personenauswahl und der Gäste-App. Persönliche Konten und Team-Zugänge werden deaktiviert. Angebote und bestehende Gespräche bleiben erhalten.</p><p class="help-copy">Du kannst das Profil im Papierkorb wiederherstellen. Für Stationen ohne verbleibende Betreuung bleibt zunächst nur die Abendleitung zuständig.</p>`,async()=>{
  await api('/api/abend/people/'+id+'/delete','POST',{revision:person.revision});await loadData();render();toast('Profil in den Papierkorb verschoben.');
 },{saveLabel:'In den Papierkorb verschieben'});
}
function restorePerson(id){
 const person=state.trash.find(p=>p.personId===id);if(!person)return;
 dialog('Profil wiederherstellen',`<p><strong>${esc(person.name)}</strong> wieder zu euren Profilen hinzufügen?</p><p>Das Profil bleibt zunächst pausiert. Über „Profil bearbeiten“ kannst du es wieder freigeben. Ein verknüpftes Benutzerkonto bleibt deaktiviert und muss separat freigegeben werden.</p>`,async()=>{
  await api('/api/abend/people/'+id+'/restore','POST',{revision:person.revision});await loadData();state.peopleView='active';render();toast('Profil wiederhergestellt und zunächst pausiert.');
 },{saveLabel:'Profil wiederherstellen'});
}
async function run(action){if(state.busy)return;state.busy=true;try{await action();}catch(err){toast(err.message,true);}finally{state.busy=false;}}
root.addEventListener('click',event=>{
  const catalogView=event.target.closest('[data-catalog-view]');if(catalogView){state.catalogView=catalogView.dataset.catalogView;render();return;}
  const peopleFilter=event.target.closest('[data-people-view]');if(peopleFilter){state.peopleView=peopleFilter.dataset.peopleView;render();return;}
  if(event.target.closest('[data-website-editor]'))return;
  const node=event.target.closest('[data-action],[data-filter],[data-event-filter]');if(!node)return;
  if(node.dataset.eventFilter){state.eventFilter=node.dataset.eventFilter;render();return;}
  if(node.dataset.filter){state.filter=node.dataset.filter;render();return;}
  const {action,kind,id}=node.dataset;
  if(action==='new-account')return run(()=>memberWizard.open());
  if(action==='mail-settings')return accountsUI.mailSettings();
  if(action==='edit-account')return accountsUI.edit(id);
  if(action==='invite-account')return run(()=>accountsUI.invite(id));
  if(action==='revoke-account')return accountsUI.revoke(id);
  if(action==='account')return showAccount();
  if(action==='new-event')return editEvent(true);
  if(action==='event-details')return editEvent(false);
  if(action==='new-offer')return editCatalog(kind||'equipment');
  if(action==='restore-catalog')return restoreCatalog(kind,id);
  if(action==='edit-catalog')return editCatalog(kind,id);
  if(action==='offer-details')return editOffer(kind,id);
  if(action==='new-person')return run(()=>memberWizard.open());
  if(action==='person-access'){if(state.people.find(p=>p.personId===id)?.onboardingPending)return run(()=>memberWizard.open(id));const account=accountsUI.accountFor(id);return account?accountsUI.edit(account.id):run(()=>memberWizard.open(id));}
  if(action==='manage-partners')return managePartners();
  if(action==='delete-person')return deletePerson(id);
  if(action==='restore-person')return restorePerson(id);
  if(action==='edit-person')return editPerson(id);
  if(action==='welcome')return editWelcome();
  if(action==='new-station')return editStation();
  if(action==='edit-station')return editStation(id);
  if(action==='team-access')return run(()=>issueTeamAccess(id));
  if(action==='manage-access')return run(manageAccess);
  run(async()=>{
    if(action==='logout'){if(websiteEditor?.busy){toast('Bitte warte, bis der aktuelle Vorgang abgeschlossen ist.');return;}if(websiteEditor?.dirty&&!await confirmDiscard())return;websiteEditor?.destroy();websiteEditor=null;await api('/api/logout','POST',{});state.user=null;renderLogin();return;}
    if(action==='refresh'){if(websiteEditor?.busy)return;if(websiteEditor?.dirty&&!await confirmDiscard())return;websiteEditor?.destroy();websiteEditor=null;await loadData();if(state.page==='accounts')await accountsUI.load();if(state.current)await loadCurrent(state.current.event.eventId);render();toast('Ansicht aktualisiert.');}
    if(action==='toggle-offer'){
      const exp=state.current.experience,existing=exp[kind].some(r=>r.id===id),base=state.catalog[kind==='menu'?'drinks':kind].find(r=>r.id===id);
      const row=kind==='menu'?{id,priceCents:base.priceCents,available:true}:{id,place:'',hostId:'',...(kind==='program'?{time:'',description:base.description||''}:{capacity:base.capacity})};
      const linked=existing&&(exp.stations||[]).some(s=>s.offerType===kind&&s.offerId===id);
      const stations=(exp.stations||[]).map(s=>existing&&s.offerType===kind&&s.offerId===id?{...s,offerType:'',offerId:'',enabled:false}:s);
      await saveConfig({...exp,stations,[kind]:existing?exp[kind].filter(r=>r.id!==id):[...exp[kind],row]});toast(linked?'Angebot entfernt und verknüpfte Station für Gäste ausgeblendet.':existing?'Aus diesem Abend entfernt.':'Für diesen Abend ausgewählt.');
    }
    if(action==='toggle-person'){
      const e=state.current.event,selected=e.teamIds.includes(id),teamIds=selected?e.teamIds.filter(p=>p!==id):[...e.teamIds,id];
      if(selected){const next=structuredClone(state.current.experience);for(const k of ['equipment','games','program'])next[k]=next[k].map(r=>r.hostId===id?{...r,hostId:''}:r);next.stations=(next.stations||[]).map(s=>{const operatorIds=s.operatorIds.filter(pid=>pid!==id);return {...s,operatorIds,assignmentRequired:s.assignmentRequired||!!s.operatorIds.length&&!operatorIds.length};});await saveConfig(next);}
      await saveDetails({...e,teamIds});toast(selected?'Person aus dem Team genommen.':'Person zum Team hinzugefügt.');
    }
    if(['open-app','close-app','apply'].includes(action)){
      const eventId=state.current.event.eventId;if(action!=='close-app')await saveConfig();
      await api(`/api/abend/events/${eventId}/${action==='open-app'?'open':action==='close-app'?'close':'publish'}`,'POST');
      await loadCurrent(eventId);state.events=(await api('/api/abend/events')).events;render();toast(action==='open-app'?'Die App ist jetzt für Gäste offen.':action==='close-app'?'Die App ist jetzt geschlossen.':'Die Änderungen sind für Gäste übernommen.');
    }
    if(action==='copy-link'){await navigator.clipboard.writeText(state.current.event.guestUrl);toast('Gäste-Link kopiert.');}
    if(action==='preview')window.open(`/abend-preview/?preview=${encodeURIComponent(state.current.event.eventId)}`,'_blank','noopener');
  });
});
root.addEventListener('input',event=>{if(event.target.name==='catalog-search'){const cursor=event.target.selectionStart;state.search=event.target.value;const workspace=root.querySelector('#workspace');workspace.innerHTML=libraryPage();icons();const input=root.querySelector('[name=catalog-search]');input.focus();if(input.type!=='search')input.setSelectionRange(cursor,cursor);}});
root.addEventListener('submit',event=>{if(event.target.id!=='login-form')return;event.preventDefault();const form=event.target;run(async()=>{try{await api('/api/login','POST',{email:'redaktion@rudelbar.local',password:new FormData(form).get('password')});state.user=(await api('/api/session')).user;await loadData();await route();}catch(err){renderLogin(err.message);}});});
window.addEventListener('hashchange',()=>{if(integrated)route().catch(error=>toast(error.message,true));else run(route);});
try{state.identityConfigured=(await api('/api/auth/config')).configured;state.user=(await api('/api/session')).user;if(state.user){if(!integrated&&isAuthor()&&!hasEventAccess())location.replace('/backstage#website/posts');await loadData();if(integrated&&!location.hash&&isAuthor()&&!hasEventAccess())history.replaceState(null,'','#website/posts');if(integrated&&!isEditor()&&!isAuthor()&&!state.events.some(e=>e.canManage)){location.replace('/live');}const id=new URLSearchParams(location.search).get('abend');if(id&&!location.hash)history.replaceState(null,'',`#event/${id}/overview`);await route();}else renderLogin(new URLSearchParams(location.search).get('loginError')||'');}catch(err){renderLogin(err.message);}
