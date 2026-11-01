const root=document.querySelector('#planner');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
const types={equipment:{name:'Ausstattung',icon:'armchair'},games:{name:'Spiele',icon:'dices'},program:{name:'Programm',icon:'music-2'},drinks:{name:'Getränke',icon:'glass-water'}};
const state={user:null,events:[],people:[],catalog:null,current:null,page:'events',tab:'overview',kind:'equipment',filter:'all',eventFilter:'all',search:'',busy:false};
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
  if(!response.ok)throw new Error(value.error||'Die Aktion konnte nicht abgeschlossen werden.');
  return value;
}
async function loadData(){const [a,b,c]=await Promise.all([api('/api/abend/events'),api('/api/abend/catalog'),api('/api/abend/people')]);state.events=a.events;state.catalog=b.catalog;state.people=c.people;}
async function loadCurrent(id){state.current=await api(`/api/abend/events/${encodeURIComponent(id)}`);}
function eventPath(tab='overview'){return `#event/${state.current.event.eventId}/${tab}`;}
async function route(){
  if(!state.user)return;
  const hash=location.hash.slice(1),parts=hash.split('/');
  state.filter='all';state.search='';
  if(parts[0]==='event'&&parts[1]){state.page='event';state.tab=['overview','offers','drinks','team'].includes(parts[2])?parts[2]:'overview';if(state.current?.event.eventId!==parts[1])await loadCurrent(parts[1]);}
  else {state.page=['library','people'].includes(parts[0])?parts[0]:'events';state.current=null;}
  render();window.scrollTo({top:0,behavior:'instant'});
}
function navLinks(){return [['events','calendar-days','Veranstaltungen'],['library','layout-grid','Angebote'],['people','users-round','Personen']].map(([page,ic,label])=>`<a href="#${page}" ${state.page===page||(page==='events'&&state.page==='event')?'aria-current="page"':''}>${icon(ic)}<span>${label}</span></a>`).join('');}
function render(){
  if(!state.user)return renderLogin();
  root.innerHTML=`<header class="app-header"><a class="brand" href="#events"><img src="/abend-preview/assets/rudelbar-logo.png" alt="Rudelbar" width="30" height="46"><strong>RUDEL BAR<span class="brand-sub">Backstage</span></strong></a><div class="header-actions"><span class="session-name">Redaktion</span><button type="button" class="icon-btn" data-action="refresh" aria-label="Ansicht aktualisieren">${icon('refresh-cw')}</button></div></header><aside class="app-sidebar"><nav class="global-nav" aria-label="Backstage">${navLinks()}</nav><div class="sidebar-foot"><a href="/">← Webseitenredaktion</a>Gemeinsam. Überall. Rudelbar.</div></aside><main class="workspace" id="workspace">${state.page==='events'?eventsPage():state.page==='event'?eventPage():state.page==='people'?peoplePage():libraryPage()}</main><nav class="mobile-nav" aria-label="Backstage mobil">${navLinks()}</nav>`;
  icons();
}
function renderLogin(error=''){
  root.innerHTML=`<main class="login-wrap"><section class="login-card"><div class="brand"><img src="/abend-preview/assets/rudelbar-logo.png" alt="Rudelbar" width="30" height="46"><strong>RUDEL BAR</strong></div><span class="eyebrow">Dein Backstage</span><h1>Gute Abende beginnen hier.</h1><p>Plane Veranstaltungen und bereite die App für eure Gäste vor.</p><form id="login-form">${field('password','Redaktionspasswort','','type="password" autocomplete="current-password" required')}<p class="dialog-error" role="alert" ${error?'':'hidden'}>${esc(error)}</p><button class="btn" type="submit">Anmelden ${icon('arrow-right')}</button></form></section></main>`;icons();
}
function eventState(event){return chip(event.app.state==='open'?'App offen':'App geschlossen',event.app.state==='open'?'open':'closed',event.app.state==='open'?'radio':'moon');}
function eventsPage(){
  const events=state.events.filter(e=>state.eventFilter==='all'||(state.eventFilter==='open'?e.app.state==='open':e.visibility==='private'));
  return `<div class="page-head"><div><span class="eyebrow">Veranstaltungen</span><h1>Deine Abende im Überblick.</h1><p>${state.events.length} Veranstaltungen · ${state.events.filter(e=>e.app.state==='open').length} ${state.events.filter(e=>e.app.state==='open').length===1?'App geöffnet':'Apps geöffnet'}</p></div>${button(icon('plus')+' Abend anlegen','new-event')}</div><div class="filters" aria-label="Veranstaltungen filtern">${[['all','Alle Abende'],['open','App offen'],['private','Privat']].map(([id,label])=>`<button class="filter" type="button" data-event-filter="${id}" aria-pressed="${state.eventFilter===id}">${label}</button>`).join('')}</div>${events.length?`<div class="card-grid">${events.map(e=>{const date=new Date(e.date+'T12:00:00'),month=new Intl.DateTimeFormat('de-DE',{month:'short'}).format(date);return `<a class="event-card" href="#event/${e.eventId}/overview"><div class="event-card-top"><span class="date-stamp"><strong>${date.getDate()}</strong><small>${esc(month)}</small></span><div class="chips">${chip(e.visibility==='private'?'Privat':'Öffentlich',e.visibility==='private'?'private':'',e.visibility==='private'?'lock-keyhole':'globe-2')}</div></div><h2>${esc(e.title)}</h2><p>${esc(e.venue)} · ${esc(e.time||'Zeit noch offen')}</p><div class="event-card-foot">${eventState(e)}<span>${e.app.hasDraft?'In Vorbereitung':'Vorbereiten'} ${icon('arrow-up-right')}</span></div></a>`;}).join('')}</div>`:empty('calendar-plus','Platz für euren nächsten Abend.','Lege eine Veranstaltung an und bereite sie ganz unabhängig vom Webseitenkalender vor.',button('Abend anlegen','new-event'))}`;
}
function empty(ic,title,copy,action=''){return `<div class="empty-state">${icon(ic)}<h2>${title}</h2><p>${copy}</p>${action}</div>`;}
function eventPage(){
  const {event}=state.current;
  const tabs=[['overview','house','Übersicht'],['offers','layout-grid','Angebote'],['drinks','glass-water','Getränke'],['team','users-round','Team']];
  return `<a class="back-link" href="#events">${icon('chevron-left')}Alle Veranstaltungen</a><div class="event-context"><div><div class="chips">${chip(event.visibility==='private'?'Privater Abend':'Öffentlicher Abend',event.visibility==='private'?'private':'',event.visibility==='private'?'lock-keyhole':'globe-2')}${eventState(event)}</div><h1>${esc(event.title)}</h1><p>${esc(dateText(event.date))} · ${esc(event.time||'Zeit noch offen')} · ${esc(event.venue)}</p></div><div class="context-actions"><div class="page-actions">${button(icon(event.app.state==='open'?'moon':'radio')+(event.app.state==='open'?' App schließen':' App öffnen'),event.app.state==='open'?'close-app':'open-app',event.app.state==='open'?'secondary':'')}${button(icon('settings-2'),'event-details','secondary','aria-label="Veranstaltung bearbeiten"')}</div><span class="saved-indicator">${icon('cloud-check')}Änderungen werden als Entwurf gespeichert</span></div></div><nav class="workspace-tabs" aria-label="Abend vorbereiten">${tabs.map(([id,ic,label])=>`<a href="${eventPath(id)}" ${state.tab===id?'aria-current="page"':''}>${icon(ic)}${label}</a>`).join('')}</nav>${event.app.hasDraft&&event.app.state==='open'?`<div class="notice"><span>Du hast Änderungen vorbereitet. Gäste sehen weiterhin die freigegebene Fassung.</span>${button('Für Gäste übernehmen','apply','small')}</div>`:''}${state.tab==='overview'?overviewPage():state.tab==='team'?teamPage():eventOffersPage(state.tab==='drinks'?'menu':null)}`;
}
function overviewPage(){
  const {event,experience}=state.current,total=experience.equipment.length+experience.games.length+experience.program.length;
  return `<section class="summary-card"><div class="status-row"><span class="status-orb ${event.app.state==='open'?'open':''}">${icon(event.app.state==='open'?'radio':'moon')}</span><div><h2>${event.app.state==='open'?'Euer Abend ist für Gäste geöffnet.':'Alles bereit für euren Abend?'}</h2><p>${event.app.state==='open'?'Die App zeigt die freigegebenen Angebote. Du kannst den Abend jederzeit schließen.':'Solange die App geschlossen ist, sehen Gäste eine geschlossene Tür. In der Vorschau könnt ihr alles vorbereiten.'}</p></div></div><div class="row-actions">${button(icon('eye')+' Vorschau ansehen','preview','secondary')}${button(icon('link-2')+' Gäste-Link kopieren','copy-link','secondary')}</div></section><div class="section-head"><h2>Was möchtest du vorbereiten?</h2></div><div class="area-grid">${areaCard('Angebote',total+' ausgewählt','layout-grid',eventPath('offers'))}${areaCard('Getränkekarte',experience.menu.length+(experience.menu.length===1?' Getränk':' Getränke'),'glass-water',eventPath('drinks'))}${areaCard('Team',event.teamIds.length+(event.teamIds.length===1?' Person dabei':' Personen dabei'),'users-round',eventPath('team'))}<button type="button" class="area-card" data-action="welcome"><span class="area-icon">${icon('message-circle-heart')}</span><span class="copy"><h2>Begrüßung</h2><p>Euer erstes Hallo in der App</p></span>${icon('chevron-right')}</button></div><div class="section-head spaced"><div><h2>Für eure Gäste</h2><p>${event.visibility==='private'?'Dieser private Abend ist nur über seinen eigenen Gäste-Link erreichbar.':'Diesen Gäste-Link könnt ihr teilen oder für eure QR-Codes verwenden.'}</p></div></div><a class="btn secondary" href="${esc(event.guestUrl)}" target="_blank" rel="noopener">${icon('external-link')}Gäste-App ansehen</a>`;
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
  const entries=Object.keys(types).filter(k=>state.filter==='all'||state.filter===k).flatMap(source=>state.catalog[source].map(item=>({source,item}))).filter(({item})=>!state.search||`${item.name} ${item.category}`.toLowerCase().includes(state.search.toLowerCase()));
  return `<div class="page-head"><div><span class="eyebrow">Angebote verwalten</span><h1>Was macht euren Abend aus?</h1><p>Eure Ausstattung, Spiele, Programmpunkte und Getränke.</p></div>${button(icon('plus')+' Angebot anlegen','new-offer','',`data-kind="${state.filter==='all'?'equipment':state.filter}"`)}</div><div class="catalog-toolbar">${filterButtons(true)}<label class="search">${icon('search')}<input name="catalog-search" type="search" placeholder="Angebote finden" aria-label="Angebote suchen" value="${esc(state.search)}"></label></div>${entries.length?`<div class="item-list">${entries.map(({source,item})=>`<button type="button" class="item-row" data-action="edit-catalog" data-kind="${source}" data-id="${item.id}"><span class="offer-symbol">${icon(types[source].icon)}</span><span class="copy"><strong>${esc(item.name)}</strong><small>${esc(item.category)}${source==='drinks'?' · '+esc(euros(item.priceCents)):''}</small></span>${item.archived?chip('Archiviert'):''}${icon('chevron-right')}</button>`).join('')}</div>`:empty('layout-grid','Eure Angebote beginnen mit einer Idee.','Legt an, was ihr tatsächlich mitbringt. Die Bereiche könnt ihr frei benennen.',button('Angebot anlegen','new-offer'))}`;
}
function peoplePage(){return `<div class="page-head"><div><span class="eyebrow">Personen</span><h1>Das Rudel hinter dem Abend.</h1><p>Profile anlegen und später den passenden Angeboten zuordnen.</p></div>${button(icon('user-round-plus')+' Person anlegen','new-person')}</div><p class="privacy-note">${icon('lock-keyhole')}Kontaktangaben bleiben in der geschützten Redaktion.</p>${personCards(false)}`;}
function teamPage(){return `<div class="section-head"><div><h2>Wer ist heute dabei?</h2><p>Wähle das Team für diesen Abend. Ansprechpersonen an Angeboten sind optional.</p></div>${button(icon('user-round-plus'),'new-person','secondary small','aria-label="Person anlegen"')}</div>${personCards(true)}`;}
function personCards(forEvent){
  const people=state.people.filter(p=>!forEvent||!p.archived||state.current.event.teamIds.includes(p.personId));
  return people.length?`<div class="person-grid">${people.map(p=>{const selected=forEvent&&state.current.event.teamIds.includes(p.personId);return `<article class="person-card ${p.archived?'is-archived':''}"><div class="person-top"><span class="avatar">${esc(initial(p.name))}</span><div class="copy"><h3>${esc(p.name)}</h3><p>${esc(p.role||'Im Rudelbar-Team')}${p.archived?' · Pausiert':''}</p></div>${forEvent?`<button class="toggle-offer" type="button" data-action="toggle-person" data-id="${p.personId}" aria-pressed="${selected}" aria-label="${esc(p.name)} ${selected?'aus dem Team nehmen':'zum Team hinzufügen'}">${icon(selected?'check':'plus')}</button>`:''}</div>${!forEvent?`<div class="person-contact">${p.email?`<p>${esc(p.email)}</p>`:''}${p.phone?`<p>${esc(p.phone)}</p>`:''}</div>`:''}<div class="row-actions">${button('Profil bearbeiten','edit-person','secondary small',`data-id="${p.personId}"`)}</div></article>`;}).join('')}</div>`:empty('users-round','Wer gehört zu eurem Rudel?','Lege ein Profil an. Danach lässt sich diese Person dem Abend und einzelnen Angeboten zuordnen.',button('Erste Person anlegen','new-person'));
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
  const fields=k=>{const r=item||{};return `${field('name','Name des Angebots',r.name||'','maxlength="100" required')}${field('category',k==='drinks'?'Kategorie auf der Karte':'Bereich in der App',r.category||({equipment:'Ausstattung',games:'Spiele',program:'Programm',drinks:'Alkoholfrei'}[k]),'maxlength="80" required',k==='drinks'?'':'Frei benennbar, zum Beispiel Nachbarschaft oder Kreativ werden.')}${k==='drinks'?`<div class="form-grid">${field('unit','Menge',r.unit||'0,33 l','maxlength="40" required')}${field('price','Standardpreis (€)',money(r.priceCents),'inputmode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" required')}</div><label class="field"><span>Bild · optional</span><input type="file" name="image" accept="image/jpeg,image/png,image/webp"></label>${r.imageUrl?`<img class="resource-image" src="${esc(r.imageUrl)}" alt="${esc(r.name)}"><label class="check-line"><input name="removeImage" type="checkbox">Bild entfernen</label>`:''}`:`${k!=='program'?`<div class="form-grid">${field('capacity',k==='equipment'?'Plätze · optional':'Plätze pro Runde',r.capacity??4,'type="number" min="1" max="30" '+(k==='games'?'required':''))}${k==='games'?field('minutes','Dauer in Minuten',r.minutes??30,'type="number" min="0" max="300" required'):''}</div>`:''}${area('description','Beschreibung',r.description||'',k==='program'?1000:800)}${k==='games'?area('rules','Kurz erklärt',r.rules||'',2000):''}`}${item?`<label class="check-line"><input name="archived" type="checkbox" ${item.archived?'checked':''}>Angebot archivieren</label><p class="help-copy">Archivierte Angebote bleiben gespeichert und können hier wieder aktiviert werden.</p>`:''}`;};
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
  },{saveLabel:item?'Änderungen speichern':'Angebot anlegen',afterOpen:node=>node.querySelector('[name=kind]')?.addEventListener('change',event=>{selectedKind=event.target.value;node.querySelector('#catalog-fields').innerHTML=fields(selectedKind);})});
}
function editPerson(id){
  const person=state.people.find(p=>p.personId===id)||{};
  dialog(id?'Person bearbeiten':'Person anlegen',field('name','Vorname / Anzeigename',person.name||'','maxlength="100" required')+field('role','Rolle · optional',person.role||'','maxlength="100" placeholder="z. B. Spielbegleitung"')+`<div class="form-grid">${field('email','E-Mail · intern',person.email||'','type="email" maxlength="254"')}${field('phone','Telefon · intern',person.phone||'','type="tel" maxlength="60"')}</div><p class="help-copy">In der Besucher-App erscheinen nur Name und Rolle, wenn die Person dem Abend zugeordnet ist. Die Kontaktangaben bleiben intern.</p>${id?`<label class="check-line"><input type="checkbox" name="archived" ${person.archived?'checked':''}>Profil pausieren</label>`:''}`,async fd=>{
    const fields={name:fd.get('name'),role:fd.get('role'),email:fd.get('email'),phone:fd.get('phone'),archived:fd.has('archived'),revision:person.revision||''};
    const result=await api('/api/abend/people'+(id?'/'+id:''),id?'PUT':'POST',fields);state.people=(await api('/api/abend/people')).people;
    if(!id&&state.page==='event'&&state.tab==='team')await saveDetails({...eventBody(new FormData(),state.current.event),...state.current.event,teamIds:[...state.current.event.teamIds,result.person.personId]});
    render();toast(id?'Profil gespeichert.':'Person angelegt.');
  },{saveLabel:id?'Profil speichern':'Person anlegen'});
}
async function run(action){if(state.busy)return;state.busy=true;try{await action();}catch(err){toast(err.message,true);}finally{state.busy=false;}}
root.addEventListener('click',event=>{
  const node=event.target.closest('[data-action],[data-filter],[data-event-filter]');if(!node)return;
  if(node.dataset.eventFilter){state.eventFilter=node.dataset.eventFilter;render();return;}
  if(node.dataset.filter){state.filter=node.dataset.filter;render();return;}
  const {action,kind,id}=node.dataset;
  if(action==='new-event')return editEvent(true);
  if(action==='event-details')return editEvent(false);
  if(action==='new-offer')return editCatalog(kind||'equipment');
  if(action==='edit-catalog')return editCatalog(kind,id);
  if(action==='offer-details')return editOffer(kind,id);
  if(action==='new-person')return editPerson();
  if(action==='edit-person')return editPerson(id);
  if(action==='welcome')return editWelcome();
  run(async()=>{
    if(action==='refresh'){await loadData();if(state.current)await loadCurrent(state.current.event.eventId);render();toast('Ansicht aktualisiert.');}
    if(action==='toggle-offer'){
      const exp=state.current.experience,existing=exp[kind].some(r=>r.id===id),base=state.catalog[kind==='menu'?'drinks':kind].find(r=>r.id===id);
      const row=kind==='menu'?{id,priceCents:base.priceCents,available:true}:{id,place:'',hostId:'',...(kind==='program'?{time:'',description:base.description||''}:{capacity:base.capacity})};
      await saveConfig({...exp,[kind]:existing?exp[kind].filter(r=>r.id!==id):[...exp[kind],row]});toast(existing?'Aus diesem Abend entfernt.':'Für diesen Abend ausgewählt.');
    }
    if(action==='toggle-person'){
      const e=state.current.event,selected=e.teamIds.includes(id),teamIds=selected?e.teamIds.filter(p=>p!==id):[...e.teamIds,id];
      if(selected){const next=structuredClone(state.current.experience);for(const k of ['equipment','games','program'])next[k]=next[k].map(r=>r.hostId===id?{...r,hostId:''}:r);await saveConfig(next);}
      await saveDetails({...e,teamIds});toast(selected?'Person aus dem Team genommen.':'Person zum Team hinzugefügt.');
    }
    if(['open-app','close-app','apply'].includes(action)){
      const eventId=state.current.event.eventId;if(action!=='close-app')await saveConfig();
      await api(`/api/abend/events/${eventId}/${action==='open-app'?'open':action==='close-app'?'close':'publish'}`,'POST');
      await loadCurrent(eventId);state.events=(await api('/api/abend/events')).events;render();toast(action==='open-app'?'Die App ist jetzt für Gäste offen.':action==='close-app'?'Die App ist jetzt geschlossen.':'Die Änderungen sind für Gäste übernommen.');
    }
    if(action==='copy-link'){await navigator.clipboard.writeText(state.current.event.guestUrl);toast('Gäste-Link kopiert.');}
    if(action==='preview')location.href=`/abend-preview/?preview=${encodeURIComponent(state.current.event.eventId)}`;
  });
});
root.addEventListener('input',event=>{if(event.target.name==='catalog-search'){const cursor=event.target.selectionStart;state.search=event.target.value;const workspace=root.querySelector('#workspace');workspace.innerHTML=libraryPage();icons();const input=root.querySelector('[name=catalog-search]');input.focus();if(input.type!=='search')input.setSelectionRange(cursor,cursor);}});
root.addEventListener('submit',event=>{if(event.target.id!=='login-form')return;event.preventDefault();const form=event.target;run(async()=>{try{await api('/api/login','POST',{email:'redaktion@rudelbar.local',password:new FormData(form).get('password')});state.user=(await api('/api/session')).user;await loadData();await route();}catch(err){renderLogin(err.message);}});});
window.addEventListener('hashchange',()=>run(route));
try{state.user=(await api('/api/session')).user;if(state.user){await loadData();const id=new URLSearchParams(location.search).get('abend');if(id&&!location.hash)history.replaceState(null,'',`#event/${id}/overview`);await route();}else renderLogin();}catch(err){renderLogin(err.message);}
