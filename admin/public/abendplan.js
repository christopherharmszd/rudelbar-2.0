const root=document.querySelector('#planner');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let user=null,catalog=null,events=[],active=new URLSearchParams(location.search).get('abend'),experience=null,mode='event',libraryTab='equipment',editingId=null,dirty=false,busy=false,notice='',error=false,visitorAppUrl='';
const names={equipment:'Ausstattung',games:'Spiele',program:'Programmpunkte',drinks:'Getränke'};
const money=cents=>(Number(cents)/100).toFixed(2).replace('.',',');
async function api(path,method='GET',body){
  const response=await fetch(path,{method,credentials:'same-origin',headers:{...(user?{'X-CSRF-Token':user.csrf}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const value=await response.json();
  if(response.status===401&&path!=='/api/login'){user=null;login();throw new Error('Bitte erneut anmelden.');}
  if(!response.ok)throw new Error(value.error||'Die Aktion ist gerade nicht möglich.');
  return value;
}
const field=(name,label,value='',extra='')=>`<label class="field"><span>${label}</span><input name="${name}" value="${esc(value)}" ${extra}></label>`;
const area=(name,label,value='',max=1200)=>`<label class="field"><span>${label}</span><textarea name="${name}" maxlength="${max}" rows="3">${esc(value)}</textarea></label>`;
function login(message=''){
  root.innerHTML=`<div class="login"><span class="eyebrow">Rudelbar · Redaktion</span><h1>Ein guter Abend beginnt hier.</h1><p class="muted">Melde dich mit dem bestehenden Redaktionspasswort an.</p><form id="login-form">${field('password','Passwort','','type="password" autocomplete="current-password" required')}<p class="notice error" role="alert">${esc(message)}</p><button>Anmelden</button></form><p class="spacer"><a href="/">Zur Redaktion</a></p></div>`;
}
async function load(){
  const values=await Promise.all([api('/api/abend/catalog'),api('/api/abend/events')]);
  catalog=values[0].catalog;events=values[1].events;visitorAppUrl=values[1].visitorAppUrl;
  if(active&&!events.some(e=>e._id===active))active=null;
  active=active||events.find(e=>e.app)?._id||events[0]?._id||null;
  if(active)await loadEvent(active);
  render();
}
async function loadEvent(id){const result=await api(`/api/abend/events/${encodeURIComponent(id)}`);active=id;experience=result.experience;Object.assign(events.find(e=>e._id===id),{app:{published:result.published,draft:result.draft}});dirty=false;}
function selectedRow(kind,item){return experience?.[kind]?.find(row=>row.id===item.id);}
function resources(kind,source,category){
  const items=catalog[source].filter(item=>(!item.archived||selectedRow(kind,item))&&(!category||item.category===category));
  return items.map(item=>{
    const row=selectedRow(kind,item),prefix=`${kind}.${item.id}`,isMenu=kind==='menu',isProgram=kind==='program';
    const fields=isMenu?field(`${prefix}.price`,'Preis an diesem Abend (€)',money(row?.priceCents??item.priceCents),'inputmode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" required')+`<label class="check"><input name="${prefix}.available" type="checkbox" ${row?.available!==false?'checked':''}>Verfügbar</label>`:`<div class="grid">${field(`${prefix}.place`,'Wo findet man das Angebot?',row?.place||'','maxlength="160" required')}${field(`${prefix}.host`,'Ansprechperson vor Ort',row?.host||'','maxlength="100" required')}</div>${isProgram?field(`${prefix}.time`,'Wann?',row?.time||'','placeholder="z. B. ab 19 Uhr" maxlength="80" required')+area(`${prefix}.description`,'Beschreibung für diesen Abend',row?.description??item.description,1000):field(`${prefix}.capacity`,'Plätze pro Runde',row?.capacity??item.capacity,'type="number" min="1" max="30" required')}`;
    return `<div class="resource" data-resource="${kind}" data-id="${item.id}"><label class="check"><input type="checkbox" name="${prefix}.selected" ${row?'checked':''} data-toggle="resource">${esc(item.name)}<small>${item.archived?'Archiviert':isMenu?`${esc(item.unit)} · ${money(item.priceCents)} €`:isProgram?'Programmpunkt':item.capacity+' Plätze'}</small></label><div class="resource-fields" ${row?'':'hidden'}>${fields}</div></div>`;
  }).join('')||'<p class="empty">Noch keine Angebote angelegt.</p>';
}
function offerSections(){
  const kinds=['equipment','games','program'];
  const categories=[...new Set(kinds.flatMap(kind=>catalog[kind].filter(item=>!item.archived||selectedRow(kind,item)).map(item=>item.category)))];
  return categories.map(category=>{const groupKinds=kinds.filter(kind=>catalog[kind].some(item=>item.category===category));return `<section class="panel"><div class="row-head"><h2>${esc(category)}</h2><button type="button" class="secondary" data-manage="${groupKinds[0]}">Angebote bearbeiten</button></div>${groupKinds.map(kind=>resources(kind,kind,category)).join('')}</section>`;}).join('');
}
function eventEditor(){
  const event=events.find(e=>e._id===active);
  if(!event)return `<section class="panel"><h2>Noch kein Termin vorhanden.</h2><p>Lege in der Redaktion einen Termin an. Danach kannst du seinen Abend hier vorbereiten.</p><a href="/">Termine öffnen</a></section>`;
  const app=event.app||{},url=`${visitorAppUrl}/?abend=${encodeURIComponent(active)}`;
  const others=events.filter(e=>e._id!==active&&e.app);
  return `<label class="field"><span>Welchen Abend möchtest du vorbereiten?</span><select id="event-select">${events.map(e=>`<option value="${e._id}" ${active===e._id?'selected':''}>${esc(e.date)} · ${esc(e.title)} · ${esc(e.venue)}</option>`).join('')}</select></label><div class="layout"><form id="event-form"><section class="panel"><span class="eyebrow">${esc(event.date)} · ${esc(event.time)}</span><h2>${esc(event.title)}</h2><p class="muted">${esc(event.venue)}${event.address?' · '+esc(event.address):''}</p>${!event.published?'<p class="notice">Dieser Termin ist noch ein Entwurf. Veröffentliche ihn in der Redaktion, bevor du die App freigibst.</p>':''}${others.length?`<div class="copy-line"><label class="field"><span>Mit einem früheren Abend starten</span><select id="copy-event"><option value="">Abend auswählen …</option>${others.map(e=>`<option value="${e._id}">${esc(e.date)} · ${esc(e.title)}</option>`).join('')}</select></label><button type="button" class="secondary" data-action="copy">Übernehmen</button></div>`:''}${field('welcomeTitle','Begrüßung',experience.welcomeTitle,'placeholder="Herzlich willkommen in '+esc(event.venue)+'." maxlength="160"')}${area('welcomeText','Der erste Satz für eure Gäste',experience.welcomeText)}<p class="section-description">Ort, Datum und Titel kommen direkt aus dem Termin in der Redaktion.</p></section><section class="panel"><div class="row-head"><div><h2>Was findet an diesem Abend statt?</h2><p class="section-description">Die Bereiche und Angebote unten kommen aus eurer Angebotsverwaltung. Ihr könnt eigene anlegen, umbenennen und archivieren.</p></div></div><button type="button" data-manage="equipment">+ Eigenes Angebot anlegen</button></section>${offerSections()}<section class="panel"><div class="row-head"><h2>Die Getränkekarte</h2><button type="button" class="secondary" data-manage="drinks">Getränke bearbeiten</button></div><p class="section-description">Wähle Getränke aus und passe die Preise für diesen Abend an. Ausverkaufte Getränke bleiben mit einem Hinweis sichtbar.</p>${resources('menu','drinks')}</section><section class="panel"><h2>Ankommen & Unterstützung</h2><label class="check"><input name="help.enabled" type="checkbox" ${experience.modules.help?.enabled!==false?'checked':''}>Anlaufstelle für Fragen anzeigen</label><p class="section-description spacer">Begegnungsprofile, gemeinsame Spielrunden und die Team-Inbox folgen im nächsten Entwicklungsschritt. Diese Planung legt dafür bereits die Angebote und Verantwortlichen fest.</p></section><div class="actions form-end"><button type="submit">Entwurf speichern</button><span class="muted" id="dirty-label">${dirty?'Noch nicht gespeichert':''}</span></div></form><aside class="summary"><span class="eyebrow">Besucher-App</span><h3>Bereit für eure Gäste?</h3><span class="status ${app.published?'live':''}">${app.published?(app.draft?'Live · Änderungen als Entwurf':'Veröffentlicht'):app.draft?'Entwurf gespeichert':'Noch nicht vorbereitet'}</span><p>Änderungen werden erst mit „Veröffentlichen“ für Gäste sichtbar.</p><div class="actions vertical"><button type="button" data-action="publish">Veröffentlichen</button><button type="button" class="secondary" data-action="preview">Vorschau öffnen</button>${app.published?'<button type="button" class="secondary" data-action="unpublish">Aus der App nehmen</button>':''}</div>${app.published?`<a class="link-box" href="${esc(url)}" target="_blank" rel="noopener">Besucher-App öffnen ↗</a><button type="button" class="secondary" data-action="copy-link">Link kopieren</button>`:''}<p class="muted spacer">Die Vorschau zeigt den zuletzt gespeicherten Entwurf und ist nur mit Anmeldung zugänglich.</p></aside></div>`;
}
function libraryEditor(){
  const items=catalog[libraryTab];
  if(!items.some(item=>item.id===editingId))editingId=items[0]?.id||null;
  const selected=items.find(item=>item.id===editingId);
  return `<div class="subhead"><div><h2>Eure Ideen werden Angebote.</h2><p class="muted">Name, Bereich und Beschreibung sind frei bearbeitbar.</p></div><button type="button" data-action="add">+ Angebot anlegen</button></div><div class="tabs" role="tablist" aria-label="Angebotsarten">${Object.entries(names).map(([id,name])=>`<button type="button" role="tab" aria-selected="${libraryTab===id}" data-library="${id}">${name}</button>`).join('')}</div><p class="section-description">Die Angebotsart bestimmt die nötigen Angaben. Den Bereich in der App könnt ihr frei benennen, etwa „Nachbarschaft“, „Kreativ werden“ oder „Gemeinsam spielen“.</p><div class="library-layout"><aside class="library-picker"><span class="eyebrow">${items.length} ${names[libraryTab]}</span><div class="library-list">${items.map(item=>`<button type="button" class="secondary" data-edit="${item.id}" ${editingId===item.id?'aria-current="true"':''}><strong>${esc(item.name||'Neues Angebot')}</strong><small>${item.archived?'Archiviert':esc(item.category)}</small></button>`).join('')}</div><label class="field library-select"><span>Angebot bearbeiten</span><select id="library-item-select">${items.map(item=>`<option value="${item.id}" ${editingId===item.id?'selected':''}>${esc(item.name||'Neues Angebot')}</option>`).join('')}</select></label></aside><form id="library-form"><div class="panel">${selected?libraryRow(selected):'<p class="empty">Noch keine Angebote. Lege euer erstes eigenes Angebot an.</p>'}</div><div class="actions"><button type="submit">Angebote speichern</button><span class="muted" id="dirty-label">${dirty?'Noch nicht gespeichert':''}</span></div></form></div>`;
}
function libraryRow(item){
  const p=item.id,isDrink=libraryTab==='drinks',isProgram=libraryTab==='program';
  return `<section class="library-row" data-library-id="${p}"><div class="row-head"><h3>${esc(item.name||'Neues Angebot')}</h3><label class="check"><input name="${p}.archived" type="checkbox" ${item.archived?'checked':''}>Archiviert</label></div>${field(`${p}.name`,'Name des Angebots',item.name,'maxlength="100" required')}${field(`${p}.category`,isDrink?'Kategorie auf der Getränkekarte':'Bereich in der App',item.category,'placeholder="Eigenen Bereich eingeben …" maxlength="80" required')}${isDrink?`<div class="grid">${field(`${p}.unit`,'Menge',item.unit,'placeholder="z. B. 0,33 l" maxlength="40" required')}${field(`${p}.price`,'Standardpreis (€)',money(item.priceCents),'inputmode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" required')}</div><label class="field"><span>Getränkebild · freiwillig</span><input type="file" accept="image/jpeg,image/png,image/webp" data-image="${p}"></label><div class="image-preview">${item.imageUrl?`<img src="${esc(item.imageUrl)}" alt="${esc(item.name)}"><button type="button" class="secondary" data-action="remove-image" data-id="${p}">Bild entfernen</button>`:'<small>Noch kein Bild hinterlegt.</small>'}</div>`:`${!isProgram?`<div class="grid">${field(`${p}.capacity`,'Plätze pro Runde',item.capacity,'type="number" min="1" max="30" required')}${libraryTab==='games'?field(`${p}.minutes`,'Dauer in Minuten',item.minutes,'type="number" min="0" max="300" required'):''}</div>`:''}${area(`${p}.description`,'Beschreibung',item.description,isProgram?1000:800)}${libraryTab==='games'?area(`${p}.rules`,'Kurze Erklärung / Regeln vor Ort',item.rules,2000):''}`}</section>`;
}
function render(){
  if(!user)return login();
  root.innerHTML=`<header><div class="header-inner"><div class="brand">RUDEL BAR<small>DIE MOBILE KNEIPE</small></div><a href="/">← Zur Redaktion</a></div></header><main><div class="topline"><div><span class="eyebrow">Für das, was den Abend ausmacht.</span><h1>Dein Abend. Gut vorbereitet.</h1><p class="muted">Angebote zusammenstellen, gemeinsam vorbereiten und für eure Gäste freigeben.</p></div></div><nav class="tabs" aria-label="Abendplanung"><button type="button" data-mode="event" aria-selected="${mode==='event'}">Abend vorbereiten</button><button type="button" data-mode="library" aria-selected="${mode==='library'}">Angebote verwalten</button></nav><div class="notice ${error?'error':''}" role="status" id="notice">${esc(notice)}</div>${mode==='event'?eventEditor():libraryEditor()}</main>`;
  syncRequired();
}
function syncRequired(){root.querySelectorAll('.resource-fields').forEach(box=>box.querySelectorAll('input,textarea,select').forEach(input=>input.disabled=box.hidden));}
function notify(message,isError=false){notice=message;error=isError;const node=root.querySelector('#notice')||root.querySelector('#login-form [role="alert"]');if(node){node.textContent=message;node.classList.toggle('error',isError);node.scrollIntoView({block:'nearest',behavior:'smooth'});}}
function changed(){dirty=true;const node=root.querySelector('#dirty-label');if(node)node.textContent='Noch nicht gespeichert';}
function mayLeave(){if(!dirty)return true;notify('Speichere deine Änderungen, bevor du den Bereich wechselst.');const node=root.querySelector('#notice');if(node){const button=document.createElement('button');button.type='button';button.className='secondary';button.dataset.action='discard';button.textContent='Änderungen verwerfen';node.append(' ',button);}return false;}
function readExperience(){
  const form=root.querySelector('#event-form'),fd=new FormData(form),value=name=>String(form.elements.namedItem(name)?.value??fd.get(name)??'').trim(),number=name=>Number(value(name));
  const next={...experience,welcomeTitle:value('welcomeTitle'),welcomeText:value('welcomeText'),equipment:[],games:[],program:[],menu:[],modules:{}};
  for(const kind of ['equipment','games','program','menu'])for(const box of form.querySelectorAll(`[data-resource="${kind}"]`)){
    const id=box.dataset.id,p=`${kind}.${id}`;
    if(fd.has(`${p}.selected`))next[kind].push(kind==='menu'?{id,priceCents:Math.round(Number(value(`${p}.price`).replace(',','.'))*100),available:fd.has(`${p}.available`)}:kind==='program'?{id,place:value(`${p}.place`),host:value(`${p}.host`),time:value(`${p}.time`),description:value(`${p}.description`)}:{id,place:value(`${p}.place`),host:value(`${p}.host`),capacity:number(`${p}.capacity`)});
  }
  next.modules.encounters={enabled:false};next.modules.help={enabled:fd.has('help.enabled')};
  return next;
}
function readLibrary(){
  const form=root.querySelector('#library-form');if(!form)return;
  const fd=new FormData(form),value=name=>String(fd.get(name)||'').trim();
  catalog[libraryTab]=catalog[libraryTab].map(item=>{
    if(item.id!==editingId)return item;
    const p=item.id,next={...item,name:value(`${p}.name`),category:value(`${p}.category`),archived:fd.has(`${p}.archived`)};
    if(libraryTab==='drinks')return {...next,unit:value(`${p}.unit`),priceCents:Math.round(Number(value(`${p}.price`).replace(',','.'))*100)};
    next.description=value(`${p}.description`);
    if(libraryTab!=='program')next.capacity=Number(value(`${p}.capacity`));
    if(libraryTab==='games'){next.minutes=Number(value(`${p}.minutes`));next.rules=value(`${p}.rules`);}
    return next;
  });
}
async function saveEvent(){if(!root.querySelector('#event-form').reportValidity())return false;const result=await api(`/api/abend/events/${active}`,'PUT',readExperience());experience=result.experience;dirty=false;events.find(e=>e._id===active).app={...events.find(e=>e._id===active).app,draft:true};return true;}
async function perform(fn){if(busy)return;busy=true;root.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(err){notify(err.message,true);}finally{busy=false;root.querySelectorAll('button').forEach(b=>b.disabled=false);}}
root.addEventListener('input',event=>{if(event.target.closest('#event-form,#library-form')&&event.target.id!=='copy-event')changed();});
root.addEventListener('change',event=>{
  const target=event.target;
  if(target.dataset.toggle){target.closest('.resource').querySelector('.resource-fields').hidden=!target.checked;syncRequired();changed();}
  if(target.id==='library-item-select'){readLibrary();editingId=target.value;render();}
  if(target.id==='event-select')perform(async()=>{if(mayLeave()){await loadEvent(target.value);notice='';render();}else target.value=active;});
  if(target.dataset.image)perform(async()=>{
    const file=target.files[0];if(!file)return;
    if(file.size>8_000_000)throw new Error('Bitte ein Bild unter 8 MB auswählen.');
    readLibrary();
    const response=await fetch('/api/upload',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':user.csrf,'Content-Type':file.type,'X-File-Name':file.name},body:file});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Das Bild konnte nicht hochgeladen werden.');
    catalog.drinks.find(item=>item.id===target.dataset.image).imageUrl=data.url;changed();notice='Bild hochgeladen. Speichere die Angebote, um es zu übernehmen.';render();
  });
});
root.addEventListener('submit',event=>{
  event.preventDefault();perform(async()=>{
    if(event.target.id==='login-form'){await api('/api/login','POST',{email:'redaktion@rudelbar.local',password:new FormData(event.target).get('password')});user=(await api('/api/session')).user;await load();return;}
    if(event.target.id==='library-form'){readLibrary();catalog=(await api('/api/abend/catalog','PUT',catalog)).catalog;dirty=false;notice='Angebote gespeichert. Bereits veröffentlichte Abende bleiben unverändert.';error=false;render();}
    if(event.target.id==='event-form'&&await saveEvent()){notice='Entwurf gespeichert. Du kannst ihn jetzt prüfen oder veröffentlichen.';error=false;render();}
  });
});
root.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||button.type==='submit')return;
  perform(async()=>{
    if(button.dataset.manage){if(!mayLeave())return;mode='library';libraryTab=button.dataset.manage;editingId=null;notice='Hier könnt ihr Angebote anlegen und bearbeiten. Den Bereich in der App bestimmt ihr selbst.';await load();return;}
    if(button.dataset.mode){if(!mayLeave())return;mode=button.dataset.mode;dirty=false;notice='';await load();return;}
    if(button.dataset.library){readLibrary();libraryTab=button.dataset.library;editingId=null;render();return;}
    if(button.dataset.edit){readLibrary();editingId=button.dataset.edit;render();return;}
    const action=button.dataset.action;
    if(action==='discard'){dirty=false;await load();notice='Ungespeicherte Änderungen verworfen.';render();}
    if(action==='add'){readLibrary();editingId=`${libraryTab}-${crypto.randomUUID()}`;catalog[libraryTab].push({id:editingId,name:'',category:libraryTab==='program'?'Programm':libraryTab==='games'?'Spiele':'Ausstattung',archived:false,...(libraryTab==='drinks'?{category:'Alkoholfrei',unit:'0,33 l',priceCents:0,imageUrl:''}:libraryTab==='program'?{kind:'other',description:''}:{capacity:4,kind:'other',minutes:30,description:'',rules:''})});changed();render();root.querySelector('.library-row:last-of-type input:not([type=checkbox])')?.focus();}
    if(action==='remove-image'){readLibrary();catalog.drinks.find(item=>item.id===button.dataset.id).imageUrl='';changed();render();}
    if(action==='copy'){const id=root.querySelector('#copy-event').value;if(!id)return;if(!mayLeave())return;const source=(await api(`/api/abend/events/${id}`)).experience;experience={...source,eventId:active,welcomeTitle:'',welcomeText:source.welcomeText};dirty=true;notice='Auswahl übernommen. Prüfe Standorte, Verantwortliche und Zeiten für diesen Abend.';render();}
    if(action==='publish'){if(!await saveEvent())return;const result=await api(`/api/abend/events/${active}/publish`,'POST');events.find(e=>e._id===active).app={published:true,draft:false};notice='Veröffentlicht. Die Besucher-App zeigt jetzt diesen Stand.';error=false;render();}
    if(action==='unpublish'){await api(`/api/abend/events/${active}/unpublish`,'POST');await loadEvent(active);notice='Der Abend ist jetzt nur noch in der Redaktion sichtbar.';render();}
    if(action==='preview'){if(dirty){notify('Speichere den Entwurf, damit die Vorschau deine Änderungen zeigt.');return;}location.href=`/abend-preview/?preview=${encodeURIComponent(active)}`;}
    if(action==='copy-link'){await navigator.clipboard.writeText(`${visitorAppUrl}/?abend=${encodeURIComponent(active)}`);notify('Der Link zur Besucher-App wurde kopiert.');}
  });
});
root.addEventListener('click',event=>{if(event.target.closest('a[href="/"]')&&!mayLeave())event.preventDefault();});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
try{user=(await api('/api/session')).user;if(user)await load();else login();}catch(err){if(user)root.innerHTML=`<div class="login"><h1>Die Planung wartet kurz.</h1><p>${esc(err.message)}</p><a href="/abendplan.html">Erneut laden</a></div>`;else login(err.message);}
