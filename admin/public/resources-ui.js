import {chooseImage} from './image-picker.js?v=1';
const names={stand:'Stand',task:'Aufgabe',asset:'Bestand',equipment:'Ausstattung',games:'Spiel',program:'Programm',menu:'Karte',person:'Person',function:'Funktion',occurrence:'Durchführung'};
const choices={offers:'Angebot an einem Stand',supports:'Mitmachen ermöglichen',needs:'Benötigte Ausstattung',requires:'Aufgabe festlegen',assignment:'Zuständige Person'};
const endpoints={offers:[['stand'],['equipment','games','program','menu']],supports:[['equipment','games','program','menu'],['function']],needs:[['equipment','games','program','menu'],['asset','equipment']],requires:[['stand','equipment','games','program','menu','function','occurrence'],['task']],assignment:[['task'],['person']]};
export function createResourcesUI({state,api,esc,icon,button,field,area,dialog,toast,render}){
 const current=()=>state.resources||{nodes:[],relations:[],sources:[]};
 const key=row=>row.kind+'/'+row.id;
 const all=()=>[...current().sources,...current().nodes.map(n=>({...n,key:key(n)})),...current().relations.filter(r=>r.kind==='offers').map(r=>({id:r.id,kind:'occurrence',key:'occurrence/'+r.id,name:label(r.to)+' · '+label(r.from),archived:r.archived}))];
 const label=ref=>[...current().sources,...current().nodes.map(n=>({...n,key:key(n)}))].find(n=>n.key===ref)?.name||(current().relations.some(r=>r.id===ref)?'Zuordnung am Stand':'Zentrale Vorgabe');
 const clock=n=>String(Math.floor(n/60)%24).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
 const minutes=s=>Number(s.split(':')[0])*60+Number(s.split(':')[1]);
 const options=(rows,value='',empty='Bitte auswählen')=>'<option value="">'+esc(empty)+'</option>'+rows.map(n=>'<option value="'+esc(n.key)+'" '+(n.key===value?'selected':'')+'>'+esc(n.name)+(n.archived?' · pausiert':'')+'</option>').join('');
 const select=(name,title,rows,value='',required=true)=>'<label class="field"><span>'+esc(title)+'</span><select name="'+name+'" '+(required?'required':'')+'>'+options(rows,value,required?'Bitte auswählen':'Allgemein / keine Einschränkung')+'</select></label>';
 const checkbox=(name,value,title,checked=false)=>'<label class="wizard-option"><input type="checkbox" name="'+name+'" value="'+esc(value)+'" '+(checked?'checked':'')+'><span><strong>'+esc(title)+'</strong></span></label>';
 async function load(){state.resources=(await api('/api/abend/resources')).resources;}
 async function save(model){state.resources=(await api('/api/abend/resources','PUT',model)).resources;render();toast('Zentrale Zuordnung gespeichert.');}
 function csvActions(){return '<a class="btn secondary small" href="/api/abend/resources/csv" download>CSV exportieren</a>'+button('CSV importieren','resource-import','secondary small');}
 function page(tab){
  if(!state.resources)return '<p class="loading">Eure Zuordnungen werden geladen …</p>';
  if(tab==='relationships')return relationshipPage();
  const kind=tab==='stands'?'stand':tab==='tasks'?'task':'asset';
  const copy=kind==='stand'?['Eure Anlaufpunkte. Einmal eingerichtet.','Ordne einem Stand beliebig viele Inhalte zu. Derselbe Inhalt darf an mehreren Ständen stattfinden.']:kind==='task'?['Wer kümmert sich worum?','Lege Aufgaben und ihre Standardbesetzung fest. Standbezogene und abendbezogene Zuordnungen können gezielt abweichen.']:['Was ist tatsächlich verfügbar?','Pflege verfügbare Mengen oder einzelne Geräte, damit dasselbe Stück nicht gleichzeitig doppelt verplant wird.'];
  const rows=current().nodes.filter(n=>n.kind===kind);
  return '<div class="page-head"><div><span class="eyebrow">Unser Angebot · '+(kind==='stand'?'Stände':kind==='task'?'Aufgaben & Zuständigkeiten':'Bestände')+'</span><h1>'+copy[0]+'</h1><p>'+copy[1]+'</p></div>'+button(icon('plus')+' '+(kind==='stand'?'Stand anlegen':kind==='task'?'Aufgabe anlegen':'Bestand anlegen'),'resource-new','','data-kind="'+kind+'"')+'</div><div class="content-actions">'+button(icon('scan-check')+' Zusammenspiel prüfen','resource-preview','secondary small')+csvActions()+'</div><div class="card-grid">'+(rows.map(n=>{
   const uses=current().relations.filter(r=>!r.archived&&(r.from===key(n)||r.to===key(n)));
   const details=kind==='stand'?uses.filter(r=>r.kind==='offers').map(r=>label(r.to)).join(' · '):kind==='task'?uses.filter(r=>r.kind==='assignment'&&!r.scope).map(r=>label(r.to)).join(' · '):n.quantity+' verfügbar';
   return '<article class="event-card">'+(n.imageUrl?'<img class="resource-photo" src="'+esc(n.imageUrl)+'" alt="'+esc(n.imageAlt)+'">':'')+'<div class="chips">'+(n.archived?'<span class="chip">Pausiert</span>':'')+'</div><h2>'+esc(n.name)+'</h2><p>'+esc(n.description||details||'Noch keine Zuordnung.')+'</p>'+(n.description&&details?'<small>'+esc(details)+'</small>':'')+'<div class="row-actions">'+button('Bearbeiten','resource-edit','secondary small','data-kind="'+kind+'" data-id="'+n.id+'"')+button(n.archived?'Wieder aktivieren':'Archivieren','resource-archive','secondary small','data-kind="'+kind+'" data-id="'+n.id+'"')+'</div></article>';
  }).join('')||'<div class="empty-state"><h2>Hier beginnt eure gemeinsame Grundlage.</h2><p>Lege den ersten Eintrag an. Er steht anschließend in allen Vorlagen zur Verfügung.</p></div>')+'</div>';
 }
 function relationText(r){
  const from=label(r.from),to=label(r.to);
  if(r.kind==='offers')return from+' bietet '+to+' an';
  if(r.kind==='supports')return from+' ermöglicht '+to;
  if(r.kind==='needs')return from+' braucht '+r.quantity+' × '+to;
  if(r.kind==='requires')return from+' benötigt '+to+(r.unattended?' · bewusst unbetreut':'');
  return to+' übernimmt '+from+(r.scope?' · für '+label(r.scope):' · allgemein');
 }
 function relationshipPage(){return '<div class="page-head"><div><span class="eyebrow">Unser Angebot · Zusammenspiel</span><h1>Was gehört zusammen?</h1><p>Verbinde eure Inhalte, Stände, Funktionen und Zuständigkeiten. Diese Vorgaben gelten unabhängig von einem einzelnen Abend.</p></div>'+button(icon('plus')+' Zuordnung hinzufügen','resource-link')+'</div><div class="content-actions">'+button('Zusammenspiel prüfen','resource-preview','secondary small')+csvActions()+'</div><div class="item-list">'+(current().relations.map(r=>'<button type="button" class="item-row" data-action="resource-relation-edit" data-id="'+r.id+'"><span class="offer-symbol">'+icon(r.kind==='assignment'?'user-round':'link')+'</span><span class="copy"><strong>'+esc(relationText(r))+'</strong><small>'+choices[r.kind]+(r.archived?' · pausiert':'')+'</small></span>'+icon('chevron-right')+'</button>').join('')||'<div class="empty-state"><h2>Eure Bausteine warten aufeinander.</h2><p>Zum Beispiel: ein Stand bietet ein Spiel an, das Spiel braucht eine Betreuung, eine Person übernimmt diese Aufgabe.</p></div>')+'</div>';}
 function editStand(id,step=0,draft){
  const existing=current().nodes.find(n=>n.kind==='stand'&&n.id===id);
  draft=draft||{...(existing||{id:'stand-'+crypto.randomUUID(),kind:'stand',name:'',description:'',detailsEnabled:true}),offers:current().relations.filter(r=>r.kind==='offers'&&r.from==='stand/'+id&&!r.archived).map(r=>r.to),tasks:current().relations.filter(r=>r.kind==='requires'&&r.from==='stand/'+id&&!r.archived).map(r=>r.to),unattended:current().relations.filter(r=>r.kind==='requires'&&r.from==='stand/'+id&&!r.archived&&r.unattended).map(r=>r.to)};
  const contents=current().sources.filter(n=>['equipment','games','program','menu'].includes(n.kind)&&!n.archived);
  const tasks=current().nodes.filter(n=>n.kind==='task'&&!n.archived);
  const body=step===0?field('name','Wie heißt der Stand?',draft.name,'required maxlength="120"')+area('description','Was findet man hier?',draft.description,1200)+'<input type="hidden" name="imageUrl" value="'+esc(draft.imageUrl||'')+'"><div data-resource-image>'+(draft.imageUrl?'<img class="editor-image-preview" src="'+esc(draft.imageUrl)+'" alt="">':'')+'</div><button type="button" class="btn secondary small" data-resource-pick>Bild auswählen</button>'+field('imageAlt','Was zeigt das Bild? · optional',draft.imageAlt||'','maxlength="300"')+checkbox('archived','yes','Stand pausieren',draft.archived):step===1?'<p>Diese Inhalte werden an diesem Stand angeboten. Beschreibungen und Bilder bleiben zentral gepflegt.</p><div class="wizard-options">'+(contents.map(n=>checkbox('offers',n.key,n.name,draft.offers.includes(n.key))).join('')||'<p>Noch keine aktiven Inhalte. Du kannst sie zuerst unter Aktivitäten & Karte anlegen und später zuordnen.</p>')+'</div>':'<div class="wizard-summary"><div><dt>Stand</dt><dd>'+esc(draft.name)+'</dd></div><div><dt>Angebote</dt><dd>'+esc(draft.offers.map(label).join(' · ')||'Noch keine')+'</dd></div></div><p>Welche Aufgaben gehören zum Stand? Die Standardbesetzung wird aus der Aufgabe übernommen. Fehlende Pflichtbetreuung zeigt die Prüfung an.</p><div class="wizard-options">'+tasks.map(n=>'<div>'+checkbox('tasks',key(n),n.name,draft.tasks.includes(key(n)))+checkbox('unattended',key(n),'Für diese Aufgabe bewusst unbetreut',draft.unattended.includes(key(n)))+'</div>').join('')+'</div>'+(tasks.length?'':'<p class="help-copy">Aufgaben kannst du anschließend zentral anlegen und zuordnen.</p>');
  const node=dialog((existing?'Stand bearbeiten':'Stand anlegen')+' · '+(step+1)+' von 3',body,async(fd,node)=>{
   if(step===0)Object.assign(draft,{name:fd.get('name'),description:fd.get('description'),imageUrl:fd.get('imageUrl'),imageAlt:fd.get('imageAlt'),archived:fd.has('archived')});
   if(step===1)draft.offers=fd.getAll('offers');
   if(step<2){node.addEventListener('close',()=>editStand(id,step+1,draft),{once:true});return;}
   draft.tasks=fd.getAll('tasks');draft.unattended=fd.getAll('unattended');
   const model=structuredClone(current()),{offers,tasks,unattended,...stand}=draft;
   model.nodes=existing?model.nodes.map(n=>n.kind==='stand'&&n.id===id?stand:n):[...model.nodes,stand];
   const ref='stand/'+stand.id;
   for(const [kind,selected]of [['offers',offers],['requires',tasks]]){
    for(const r of model.relations.filter(r=>r.kind===kind&&r.from===ref))r.archived=!selected.includes(r.to);
    for(const target of selected){
     const old=model.relations.find(r=>r.kind===kind&&r.from===ref&&r.to===target);
     if(old){old.archived=false;if(kind==='requires')old.unattended=unattended.includes(target);}
     else model.relations.push({id:'link-'+crypto.randomUUID(),kind,from:ref,to:target,...(kind==='requires'?{required:true,unattended:unattended.includes(target)}:{})});
    }
   }
   await save(model);
  },{saveLabel:step<2?'Weiter':'Stand speichern',afterOpen:node=>{
   node.querySelector('[data-resource-pick]')?.addEventListener('click',async()=>{try{const image=await chooseImage({csrf:state.user.csrf,current:node.querySelector('[name=imageUrl]').value});if(image){node.querySelector('[name=imageUrl]').value=image.url;node.querySelector('[data-resource-image]').innerHTML='<img class="editor-image-preview" src="'+esc(image.url)+'" alt="">';}}catch(e){toast(e.message,true);}});
   if(step>0){
    const back=document.createElement('button');back.type='button';back.className='btn secondary';back.textContent='Zurück';
    back.onclick=()=>{const fd=new FormData(node.querySelector('form'));if(step===1)draft.offers=fd.getAll('offers');else{draft.tasks=fd.getAll('tasks');draft.unattended=fd.getAll('unattended');}node.addEventListener('close',()=>editStand(id,step-1,draft),{once:true});node.close();};
    node.querySelector('.dialog-foot').prepend(back);
   }
  }});
  return node;
 }
 function edit(kind,id){
  if(kind==='stand')return editStand(id);
  const old=current().nodes.find(n=>n.kind===kind&&n.id===id),row=old||{id:kind+'-'+crypto.randomUUID(),kind,name:'',description:'',quantity:1,maxPeople:1};
  const people=current().sources.filter(n=>n.kind==='person'&&!n.archived);
  const assigned=current().relations.filter(r=>r.kind==='assignment'&&r.from===key(row)&&!r.scope&&!r.archived).map(r=>r.to);
  const body=field('name',kind==='task'?'Wie heißt die Aufgabe?':'Wie heißt die Ausstattung?',row.name,'required maxlength="120"')+area('description','Beschreibung',row.description,1200)+(kind==='task'?field('maxPeople','Wie viele Personen dürfen die Aufgabe übernehmen?',row.maxPeople,'required type="number" min="1" max="100"')+checkbox('required','yes','Besetzung grundsätzlich erforderlich',row.required)+checkbox('publicContact','yes','Besetzung als Ansprechperson für Gäste anzeigen',row.publicContact)+'<fieldset><legend>Standardbesetzung · optional</legend>'+people.map(p=>checkbox('people',p.key,p.name,assigned.includes(p.key))).join('')+'</fieldset>':field('quantity','Wie viele sind verfügbar?',row.quantity,'required type="number" min="1" max="1000"')+select('equipmentRef','Gehört zu dieser Ausstattung · optional',current().sources.filter(n=>n.kind==='equipment'&&!n.archived),row.equipmentRef,false))+checkbox('archived','yes','Für neue Auswahlen pausieren',row.archived);
  dialog(old?'Eintrag bearbeiten':kind==='task'?'Aufgabe anlegen':'Bestand anlegen',body,async fd=>{
   const model=structuredClone(current()),value={...row,name:fd.get('name'),description:fd.get('description'),archived:fd.has('archived')};
   if(kind==='task'){value.required=fd.has('required');value.publicContact=fd.has('publicContact');value.maxPeople=Number(fd.get('maxPeople'));const selected=fd.getAll('people');for(const r of model.relations.filter(r=>r.kind==='assignment'&&r.from===key(row)&&!r.scope))r.archived=!selected.includes(r.to);for(const target of selected){const previous=model.relations.find(r=>r.kind==='assignment'&&r.from===key(row)&&r.to===target&&!r.scope);if(previous)previous.archived=false;else model.relations.push({id:'link-'+crypto.randomUUID(),kind:'assignment',from:key(row),to:target});}}
   else{value.quantity=Number(fd.get('quantity'));value.equipmentRef=fd.get('equipmentRef');}
   model.nodes=old?model.nodes.map(n=>key(n)===key(row)?value:n):[...model.nodes,value];await save(model);
  },{saveLabel:'Speichern'});
 }
 function editRelation(id){
  const old=current().relations.find(r=>r.id===id),row=old||{id:'link-'+crypto.randomUUID(),kind:'offers',from:'',to:''};
  function fields(kind){
   const [fromKinds,toKinds]=endpoints[kind],objects=all().filter(n=>!n.archived||n.key===row.from||n.key===row.to);
   return select('from',kind==='assignment'?'Aufgabe':kind==='offers'?'Stand':'Für welchen Inhalt / Bereich?',objects.filter(n=>fromKinds.includes(n.kind)),row.from)+select('to',kind==='assignment'?'Person':kind==='supports'?'Welche Funktion?':kind==='requires'?'Welche Aufgabe?':kind==='needs'?'Welche Ausstattung?':'Welcher Inhalt?',objects.filter(n=>toKinds.includes(n.kind)),row.to)+(kind==='assignment'?select('scope','Gilt nur hier · optional',objects.filter(n=>['stand','function','occurrence','games','program','equipment','menu'].includes(n.kind)),row.scope,false):kind==='needs'?field('quantity','Benötigte Menge',row.quantity||1,'required type="number" min="1" max="1000"'):kind==='requires'?checkbox('required','yes','Besetzung erforderlich',row.required!==false)+checkbox('unattended','yes','Bewusst unbetreut · Standardbesetzung nicht übernehmen',row.unattended):kind==='offers'?field('capacity','Abweichende Plätze · optional',row.values?.capacity??'','type="number" min="1" max="30"')+field('place','Hinweis zum Ort · optional',row.values?.place||'','maxlength="160"')+checkbox('limited','yes','Nur zu bestimmten Zeiten',!!row.window&&!(row.window.start===0&&row.window.end===2880))+field('start','Von',clock(row.window?.start||1080),'type="time" required')+field('end','Bis',clock(row.window?.end||1320),'type="time" required')+'<p class="help-copy">Ohne Zeitbegrenzung gilt das Angebot für den ganzen Abend. Eine Endzeit vor der Startzeit liegt am Folgetag.</p>':'');
  }
  dialog(old?'Zuordnung bearbeiten':'Was möchtest du verbinden?','<label class="field"><span>Zuordnung</span><select name="kind">'+Object.entries(choices).map(([id,name])=>'<option value="'+id+'" '+(id===row.kind?'selected':'')+'>'+name+'</option>').join('')+'</select></label><div data-relation-fields>'+fields(row.kind)+'</div>'+checkbox('archived','yes','Zuordnung pausieren',row.archived),async fd=>{
   const model=structuredClone(current()),kind=fd.get('kind'),value={...row,kind,from:fd.get('from'),to:fd.get('to'),archived:fd.has('archived')};
   if(kind==='assignment')value.scope=fd.get('scope');
   if(kind==='needs')value.quantity=Number(fd.get('quantity'));
   if(kind==='requires'){value.required=fd.has('required');value.unattended=fd.has('unattended');}
   if(kind==='offers'){value.values={...(row.values||{})};if(fd.get('place'))value.values.place=fd.get('place');else delete value.values.place;if(fd.get('capacity'))value.values.capacity=Number(fd.get('capacity'));else delete value.values.capacity;let start=minutes(fd.get('start')),end=minutes(fd.get('end'));if(end<=start)end+=1440;value.window=fd.has('limited')?{start,end}:{start:0,end:2880};}
   model.relations=old?model.relations.map(r=>r.id===id?value:r):[...model.relations,value];await save(model);
  },{saveLabel:'Zuordnung speichern',afterOpen:node=>{node.querySelector('[name=kind]').onchange=e=>{node.querySelector('[data-relation-fields]').innerHTML=fields(e.target.value);};}});
 }
 async function preview(){
  const result=await api('/api/abend/resources/resolve','POST',{revision:current().revision,sourcesVersion:current().sourcesVersion});
  const html='<p>'+ (result.ok?'Die ausgewählten Zuordnungen passen zusammen.':'Diese Punkte müssen vor einer Freigabe geklärt werden:')+'</p>'+(result.issues.length?'<ul class="resource-issues">'+result.issues.map(i=>'<li>'+esc(i.message)+'</li>').join('')+'</ul>':'')+result.occurrences.map(o=>'<article class="resource-result"><h3>'+esc(o.name)+' · '+esc(o.standName)+'</h3><p>'+(o.capacity?o.capacity+' Plätze · ':'')+esc(o.functions.map(f=>f.name).join(' · ')||'Ohne interaktive Funktion')+'</p>'+[...o.tasks,...o.functions.flatMap(f=>f.tasks)].filter((t,i,arr)=>arr.findIndex(x=>x.taskId===t.taskId&&x.personIds.join()===t.personIds.join())===i).map(t=>'<p><strong>'+esc(t.name)+':</strong> '+(t.mode==='unattended'?'Bewusst unbetreut':esc(t.personIds.map(p=>label('person/'+p)).join(', ')||'Noch nicht besetzt'))+'</p>').join('')+'<details><summary>Woher kommen die Angaben?</summary><dl>'+Object.entries(o.provenance).map(([name,values])=>'<dt>'+esc(({name:'Name',description:'Beschreibung',capacity:'Plätze',minutes:'Dauer',place:'Ort'})[name])+'</dt><dd>'+values.map(v=>esc(v.source==='evening'?'Abendabweichung':label(v.source))+(v.effective?' · wirksam':' · übersteuert')).join('<br>')+'</dd>').join('')+'</dl></details></article>').join('')+(!result.occurrences.length?'<p>Noch keine aktiven Angebote an Ständen eingerichtet.</p>':'')+'<p class="help-copy">Diese Prüfung veröffentlicht nichts und ändert keine bereits geöffnete Gäste-App.</p>';
  dialog('So wirkt eure Zusammenstellung',html,async()=>{},{saveLabel:'Fertig'});
 }
 async function importCsv(){
  const first=dialog('Zuordnungen aus CSV übernehmen','<p>Importiere Objekte und ihre Beziehungen gemeinsam. Bestehende Kennungen bleiben erhalten. Fehlende Zeilen werden nicht gelöscht.</p><a href="/api/abend/resources/csv?template=1" download>Leere CSV-Vorlage herunterladen</a><label class="field"><span>CSV-Datei · höchstens 1 MB</span><input type="file" name="csv" accept=".csv,text/csv" required></label>',async fd=>{
   const file=fd.get('csv');if(!file||file.size>1000000)throw new Error('Bitte eine CSV-Datei unter 1 MB auswählen.');
   const input={csv:await file.text(),requestKey:crypto.randomUUID(),revision:current().revision,sourcesVersion:current().sourcesVersion};
   const preview=await api('/api/abend/resources/csv/preview','POST',input);input.hash=preview.hash;
   first.addEventListener('close',()=>dialog('Import prüfen','<p>'+preview.counts.new+' neue und '+preview.counts.updated+' geänderte Einträge. '+preview.counts.unchanged+' bleiben unverändert.</p>'+(preview.errors.length?'<div class="notice error"><ul>'+preview.errors.map(e=>'<li>'+esc((e.row?'Zeile '+e.row+': ':'')+e.message)+'</li>').join('')+'</ul></div>':'')+'<div class="item-list">'+preview.changes.slice(0,100).map(c=>'<div class="item-row"><span class="copy"><strong>'+esc(c.name)+'</strong><small>Zeile '+c.row+' · '+({new:'Neu',updated:'Geändert',unchanged:'Unverändert'})[c.action]+'</small></span></div>').join('')+'</div>'+(preview.changes.length>100?'<p>Die Vorschau zeigt die ersten 100 Einträge. Der Import umfasst alle geprüften Zeilen.</p>':''),async()=>{
    state.resources=(await api('/api/abend/resources/csv/apply','POST',input)).resources;render();toast('CSV-Import abgeschlossen.');
   },{saveLabel:'Geprüfte Einträge übernehmen',afterOpen:node=>{node.querySelector('[type=submit]').disabled=!!preview.errors.length;}}),{once:true});
  },{saveLabel:'Vorschau prüfen'});
 }
 async function archive(kind,id){
  const model=structuredClone(current()),row=model.nodes.find(n=>n.kind===kind&&n.id===id);if(!row)return;
  const uses=model.relations.filter(r=>!r.archived&&[r.from,r.to,r.scope].includes(key(row)));
  dialog(row.archived?'Eintrag wieder aktivieren':'Eintrag archivieren','<p>'+esc(row.name)+'</p><p>'+(row.archived?'Der Eintrag steht wieder für neue Auswahlen bereit.':'Der Eintrag bleibt erhalten. '+uses.length+' zentrale Zuordnungen verweisen darauf; diese werden nicht gelöscht. Bereits freigegebene Abende bleiben unverändert. Die Prüfung zeigt betroffene neue Vorbereitungen an.')+'</p>',async()=>{row.archived=!row.archived;await save(model);},{saveLabel:row.archived?'Aktivieren':'Archivieren'});
 }
 async function handle(action,node){
  if(!action.startsWith('resource-'))return false;
  if(action==='resource-import'){await load();await importCsv();return true;}
  if(action==='resource-archive'){await load();await archive(node.dataset.kind,node.dataset.id);return true;}
  if(action==='resource-preview'){await preview();return true;}
  await load();
  if(action==='resource-new')edit(node.dataset.kind);
  else if(action==='resource-edit')edit(node.dataset.kind,node.dataset.id);
  else if(action==='resource-link')editRelation();
  else if(action==='resource-relation-edit')editRelation(node.dataset.id);
  return true;
 }
 return {load,page,handle};
}
