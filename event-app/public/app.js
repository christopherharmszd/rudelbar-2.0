(async () => {
  const root=document.querySelector('.re-app'),screen=root.querySelector('#re-screen'),nav=root.querySelector('#re-nav');
  const query=new URLSearchParams(location.search),preview=query.get('preview'),eventId=preview||query.get('abend');
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
  const button=(label,action,extra='',secondary=false)=>`<button type="button" class="re-btn ${secondary?'re-btn-secondary':''}" data-action="${action}" ${extra}>${label}</button>`;
  const back=()=>`<button type="button" class="re-back" data-action="home">${icon('chevron-left')}Dein Abend</button>`;
  const heading=(kicker,title,lead='')=>`<div class="re-kicker">${esc(kicker)}</div><h1>${esc(title).replace(/\n/g,'<br>')}</h1>${lead?`<p class="re-lead">${esc(lead)}</p>`:''}`;
  const locationBox=(place,detail)=>`<div class="re-location">${icon('map-pin')}<div><strong>${esc(place)}</strong><p>${esc(detail)}</p></div></div>`;
  const tile=(title,detail,ic,action,extra='')=>`<button type="button" class="re-tile" data-action="${action}" ${extra}><span class="re-icon">${icon(ic)}</span><span class="re-tile-copy"><span class="re-tile-title">${esc(title)}</span><span class="re-tile-sub">${esc(detail)}</span></span>${icon('arrow-right')}</button>`;
  let experience=null,state={name:'',saved:[]},view='welcome',selected='',storageKey='';
  const games=()=>[...experience.equipment.map(g=>({...g,icon:g.kind==='kicker'?'goal':'puzzle'})),...experience.games.map(g=>({...g,icon:'dices'}))];
  const modules=()=>(experience.program||[]).map(item=>({...item,key:item.id,title:item.name}));
  const offers=()=>[...games().map(g=>({...g,type:'game',category:g.category||'Gemeinsam spielen'})),...modules().map(m=>({...m,type:'program',icon:m.kind==='dj'?'disc-3':m.kind==='karaoke'?'mic-vocal':'sparkles',category:m.category||'Programm'}))];
  const dateLabel=()=>{const e=experience.event;try{return new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'numeric',month:'long'}).format(new Date(e.date+'T12:00:00'))+' · '+e.time;}catch{return e.date+' · '+e.time;}};
  function save(){try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{}}
  function icons(){globalThis.lucide?.createIcons({attrs:{width:20,height:20}});}
  function welcome(){return `<section class="re-welcome"><div class="re-welcome-copy">${heading(dateLabel(),experience.welcomeTitle,experience.welcomeText)}${button(`Schön, ich bin dabei ${icon('arrow-right')}`,'name')}<p class="re-small">Dein Vorname genügt. Dann geht’s los.</p></div><div><img class="re-photo" src="${asset('rudelbar-wagen.jpeg')}" alt="Der Rudelbar-Wagen" width="1654" height="951"><p class="re-hand">Gute Leute. Gute Begegnungen.</p></div></section>`;}
  function namePage(){return `<button type="button" class="re-back" data-action="welcome">${icon('chevron-left')}Willkommen</button>${heading('Ein kurzes Hallo.','Wie dürfen wir\ndich nennen?','Dein Vorname reicht. Dann zeigen wir dir, was heute los ist.')}<form id="name-form" class="re-form"><div class="re-field"><label for="firstname">Dein Vorname</label><input id="firstname" name="firstname" type="text" maxlength="32" autocomplete="given-name" autocapitalize="words" spellcheck="false" inputmode="text" enterkeyhint="go" placeholder="z. B. Chris" value="${esc(state.name)}" required></div><button type="submit" class="re-btn">Das ist heute los ${icon('arrow-right')}</button><p class="re-small">Dein Name und deine Merkliste bleiben auf diesem Gerät.</p></form>`;}
  function home(){
    const all=offers(),categories=[...new Set(all.map(item=>item.category))];
    return heading(`Moin, ${state.name}. Schön, dass du da bist.`,'Dein Abend.\nDein Rudel.',experience.event.title)+`<div class="re-stack re-section">${experience.menu.length?tile('Getränkekarte','Was gibt’s am Wagen?','beer','drinks'):''}${categories.map(category=>{const group=all.filter(item=>item.category===category);return tile(category,group.map(item=>item.name||item.title).join(', '),group[0].icon,'activities',`data-id="${esc(category)}"`);}).join('')}</div><div class="re-section-head"><h2>Hier kommen wir zusammen.</h2></div>${locationBox(experience.event.venue,experience.event.address||'Du findest das Team am Rudelbar-Wagen.')}<p class="re-small">${esc(dateLabel())}</p>${state.saved.length?`<div class="re-section">${tile('Mein Abend',state.saved.length+' Angebote gemerkt','heart','evening')}</div>`:''}${experience.modules.help?.enabled?`<div class="re-section">${button('Alleine hier? Eine Frage?','help','',true)}</div>`:''}`;
  }
  function drinks(){
    const groups=[...new Set(experience.menu.map(d=>d.category))],currency=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'});
    return back()+heading('Am Rudelbar-Wagen.','Was darf’s\nfür dich sein?','Unsere Getränkekarte für diesen Abend.')+groups.map(category=>`<div class="re-section-head"><h2>${esc(category)}</h2></div>${experience.menu.filter(d=>d.category===category).map(d=>`<div class="re-menu-row ${d.available===false?'is-unavailable':''}">${d.imageUrl?`<img class="re-drink-image" src="${esc(d.imageUrl)}" alt="${esc(d.name)}" width="64" height="64" loading="lazy">`:''}<div class="re-menu-copy"><strong>${esc(d.name)}</strong><p class="re-small">${esc(d.unit)}${d.available===false?' · Gerade ausverkauft':''}</p></div><span class="re-price">${esc(currency.format(d.priceCents/100))}</span></div>`).join('')}`).join('')+locationBox('Bestellen direkt am Wagen','Das Team freut sich auf dein persönliches Hallo.');
  }
  function activities(){const all=offers().filter(item=>!selected||item.category===selected);return back()+heading('Das findet vor Ort statt.',selected||'Entdecke Angebote.\nKomm dazu.','Hier findest du den richtigen Ort und eine Ansprechperson.')+`<div class="re-stack re-section">${all.map(item=>tile(item.name||item.title,item.type==='game'?`${item.place} · bis zu ${item.capacity} pro Runde`:`${item.time} · ${item.host}`,item.icon,item.type,`data-id="${item.id}"`)).join('')}</div>`;}
  function saveButton(kind,id){const saved=state.saved.some(s=>s.kind===kind&&s.id===id);return button(saved?`${icon('check')} Für meinen Abend gemerkt`:`${icon('heart')} Für meinen Abend merken`,'bookmark',`data-kind="${kind}" data-id="${id}"`,saved);}
  function game(){const g=games().find(g=>g.id===selected);if(!g)return activities();return back()+heading('Gemeinsam vor Ort.',g.name,g.description)+locationBox(g.place,'Ansprechperson: '+g.host)+`<div class="re-meta"><span>Bis zu ${g.capacity} Personen pro Runde</span>${g.minutes?`<span>Etwa ${g.minutes} Minuten</span>`:''}</div><p class="re-lead">Geh einfach zum Tisch und sag Hallo. ${esc(g.host)} hilft dir beim Dazukommen.</p>${saveButton('game',g.id)}<p class="re-small re-section">Deine Merkliste ist persönlich. Einen Platz vereinbart ihr direkt am Tisch.</p>${g.rules?`<details class="re-section"><summary>Kurz erklärt</summary><p class="re-lead">${esc(g.rules)}</p></details>`:''}`;}
  function program(){const m=modules().find(m=>m.key===selected);if(!m)return home();return back()+heading(m.time,m.title,m.description||'Komm dazu und genieße den Abend mit uns.')+locationBox(m.place||'Vor Ort','Ansprechperson: '+m.host)+`<p class="re-lead">${m.kind==='dj'?`Du hast einen Musikwunsch? Sprich ${esc(m.host)} einfach vor Ort an.`:m.kind==='karaoke'?`Du möchtest etwas singen? Melde dich vor Ort bei ${esc(m.host)}. Allein oder gemeinsam: Trau dich ruhig.`:`Du möchtest mitmachen oder hast eine Frage? Sprich ${esc(m.host)} vor Ort an.`}</p>${saveButton('program',m.key)}`;}
  function evening(){const items=state.saved.map(s=>s.kind==='game'?{...games().find(g=>g.id===s.id),kind:s.kind}: {...modules().find(m=>m.key===s.id),kind:s.kind}).filter(item=>item.id||item.key);return back()+heading('Dein persönlicher Merkzettel.','Darauf freust\ndu dich heute.','Hier findest du die Angebote, die du für dich gemerkt hast.')+`<div class="re-stack re-section">${items.map(item=>tile(item.name||item.title,item.place||item.time,item.icon||'music-2',item.kind==='game'?'game':'program',`data-id="${item.id||item.key}"`)).join('')||'<p class="re-lead">Noch nichts gemerkt? Entdecke, was heute angeboten wird.</p>'}</div><div class="re-section">${button('Den Abend entdecken','home','',true)}</div><button type="button" class="re-text-link" data-action="restart">Auf diesem Gerät neu anfangen</button>`;}
  function help(){return back()+heading('Das Rudel ist für dich da.','Eine Frage?\nEin Problem?','Du bist alleine hier oder weißt nicht, wo du anfangen sollst? Wir helfen dir beim Ankommen.')+locationBox('Komm zum Rudelbar-Team','Am Wagen, dort wo die Getränke ausgegeben werden.')+`<div class="re-invite re-section"><h3>Ein Hallo reicht.</h3><p>„Ich bin ${esc(state.name)} und würde gern dazukommen.“ Wir zeigen dir, was gerade los ist und wo du mitmachen kannst.</p></div><div class="re-section-head"><h2>Ansprechpersonen heute.</h2></div><div class="re-stack">${games().map(g=>`<div class="re-menu-row"><div><strong>${esc(g.host)}</strong><p class="re-small">${esc(g.name)} · ${esc(g.place)}</p></div></div>`).join('')}${modules().map(m=>`<div class="re-menu-row"><div><strong>${esc(m.host)}</strong><p class="re-small">${esc(m.title)} · ${esc(m.time)}</p></div></div>`).join('')}</div>`;}
  function asset(file){return preview?`/abend-preview/assets/${file}`:`/assets/${file}`;}
  function render(){
    root.dataset.view=view;
    const signedIn=!!state.name&&!['welcome','name'].includes(view);
    root.classList.toggle('has-navigation',signedIn);nav.hidden=!signedIn;
    const pages={welcome,name:namePage,home,drinks,activities,game,program,evening,help};
    screen.innerHTML=(pages[view]||home)();
    nav.innerHTML=[['home','house','Heute'],...(offers().length?[['activities','compass','Entdecken']]:[]),['evening','heart','Mein Abend'],...(experience.modules.help?.enabled?[['help','hand-heart','Hilfe']]:[])].map(([id,ic,label])=>`<button type="button" data-action="${id}" ${id===view?'aria-current="page"':''}>${icon(ic)}<span>${label}</span></button>`).join('');
    root.classList.remove('is-editing');icons();save();
  }
  function go(next,id='',push=true){
    if(!state.name&&!['welcome','name'].includes(next))next='welcome';
    document.activeElement?.blur?.();view=next;selected=id;
    if(push)history.pushState({view,selected},'',location.href);
    render();window.scrollTo({top:0,behavior:'instant'});
    screen.querySelector('h1')?.setAttribute('tabindex','-1');screen.querySelector('h1')?.focus({preventScroll:true});
  }
  root.addEventListener('click',event=>{
    const target=event.target.closest('[data-action]');if(!target)return;
    const action=target.dataset.action;
    if(!experience&&action!=='reload')return;
    if(action==='bookmark'){const {kind,id}=target.dataset;state.saved=state.saved.some(s=>s.id===id&&s.kind===kind)?state.saved.filter(s=>s.id!==id||s.kind!==kind):[...state.saved,{kind,id}];save();render();return;}
    if(action==='restart'){state={name:'',saved:[]};save();go('welcome');return;}
    if(action==='reload'){location.reload();return;}
    go(action,target.dataset.id||'');
  });
  root.addEventListener('submit',event=>{if(event.target.id!=='name-form')return;event.preventDefault();const input=event.target.elements.firstname;const name=input.value.trim();if(!name){input.setCustomValidity('Verrätst du uns noch deinen Vornamen?');input.reportValidity();return;}state.name=name.slice(0,32);go('home');});
  root.addEventListener('input',event=>event.target.setCustomValidity?.(''));
  root.addEventListener('focusin',event=>root.classList.toggle('is-editing',event.target.matches('input,textarea,select')));
  root.addEventListener('focusout',()=>setTimeout(()=>root.classList.toggle('is-editing',document.activeElement?.matches('input,textarea,select')),0));
  window.addEventListener('popstate',event=>go(event.state?.view||'home',event.state?.selected||'',false));
  window.visualViewport?.addEventListener('resize',()=>{const focused=document.activeElement;if(!focused?.matches('input,textarea,select'))return;requestAnimationFrame(()=>{const bounds=focused.getBoundingClientRect(),vp=window.visualViewport;if(bounds.bottom>vp.offsetTop+vp.height-24)window.scrollBy({top:bounds.bottom-vp.offsetTop-vp.height+24,behavior:'instant'});});});
  screen.innerHTML='<p class="re-lead">Dein Abend wird geladen …</p>';
  try{
    const endpoint=preview?`/api/abend/events/${encodeURIComponent(preview)}/preview`:`/api/experience${eventId?'?abend='+encodeURIComponent(eventId):''}`;
    const response=await fetch(endpoint,{credentials:'same-origin',cache:'no-store'}),result=await response.json();
    if(!response.ok)throw new Error(result.error||'Dieser Abend kann gerade nicht geladen werden.');
    experience=result.experience;
    if(!experience)throw new Error('Für diesen Abend gibt es noch kein Programm.');
    storageKey=`rudelbar:evening:${experience.eventId}:v1${preview?':preview':''}`;
    try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved){state.name=String(saved.name||'').slice(0,32);state.saved=Array.isArray(saved.saved)?saved.saved.filter(s=>s&&['game','program'].includes(s.kind)&&typeof s.id==='string').slice(0,100):[];}}catch{}
    state.saved=state.saved.filter(s=>s.kind==='game'?games().some(g=>g.id===s.id):modules().some(m=>m.key===s.id));
    document.title=`Rudelbar · ${experience.event.venue}`;
    root.setAttribute('aria-label','Rudelbar: '+experience.event.title);
    root.querySelector('.re-header-place').innerHTML=`Dein Abend in<strong>${esc(experience.event.venue)}</strong>`;
    root.querySelector('.re-brand').dataset.action='home';
    if(preview){const bar=document.createElement('a');bar.href='/abendplan.html';bar.className='re-preview-link';bar.textContent='← Zur Abendplanung · gespeicherter Entwurf';document.body.prepend(bar);}
    view=state.name?'home':'welcome';history.replaceState({view,selected:''},'',location.href);render();
  }catch(error){nav.hidden=true;root.querySelector('.re-header-place').textContent='Gemeinsam. Überall.';screen.innerHTML=heading('Wir sind gleich wieder da.','Ein kurzer Moment.',error.message)+button('Erneut versuchen','reload');icons();}
})();
