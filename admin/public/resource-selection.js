import {openFlow} from './flow-dialog.js?v=1';
export function createResourceSelectionUI({state,api,esc,icon,button,field,area,dialog,toast,save,loadResources,isEditor,eventPath}){
 const selection=()=>state.current.experience.resourceSelection;
 const resource=()=>state.resources||{nodes:[],relations:[],sources:[]};
 const label=ref=>resource().sources.find(n=>n.key===ref)?.name||resource().nodes.find(n=>n.kind+'/'+n.id===ref)?.name||'Zugeordneter Inhalt';
 const check=(name,value,title,selected)=>'<label class="wizard-option"><input type="checkbox" name="'+name+'" value="'+esc(value)+'" '+(selected?'checked':'')+'><span><strong>'+esc(title)+'</strong></span></label>';
 function page(){
  const selected=selection(),review=state.current.resourceReview,rows=review?.resolution?.occurrences||[];
  if(!selected)return '<section class="summary-card"><h2>Vorhandene Stände verwenden.</h2><p>Übernimm zentral gepflegte Angebote und Zuständigkeiten. Du wählst hier aus, was zu dieser Vorlage oder diesem Abend gehört.</p>'+(isEditor()?button('Zentrale Stände auswählen','selection-choose','secondary'):'')+'</section>';
  const issues=review?.issues||[];
  return '<section class="summary-card"><div class="section-head"><div><h2>Einmal eingerichtet. Hier zusammengestellt.</h2><p>'+selected.standIds.length+' Stände · '+rows.length+' Angebote · '+(review?.teamIds.length||0)+((review?.teamIds.length||0)===1?' Person':' Personen')+' in der Besetzung</p></div>'+(isEditor()?button('Auswahl ändern','selection-choose','secondary small'):'')+'</div>'+(issues.length?'<div class="notice error"><div><strong>Vor der Freigabe noch klären</strong><ul>'+issues.map(i=>'<li>'+esc(i.message)+'</li>').join('')+'</ul><a href="'+eventPath('map')+'">Ortsplan und Platzierung prüfen →</a></div></div>':'<p class="success-copy">Die zentralen Zuordnungen passen zusammen.</p>')+'<p class="help-copy">Änderungen an der zentralen Grundlage werden erst mit einer neuen Freigabe für Gäste übernommen.</p></section><div class="card-grid spaced">'+rows.map(o=>{
   const tasks=[...o.tasks,...o.functions.flatMap(f=>f.tasks)].filter((t,i,a)=>a.findIndex(x=>x.taskId===t.taskId)===i);
   return '<article class="event-card"><div class="chips"><span class="chip">'+esc(o.standName)+'</span></div><h3>'+esc(o.name)+'</h3><p>'+esc(o.description||'')+'</p><small>'+(o.capacity?o.capacity+' Plätze · ':'')+esc(o.functions.map(f=>f.name).join(' · ')||'Vor Ort ohne Anmeldung')+'</small>'+tasks.map(t=>'<p class="help-copy">'+esc(t.name)+': '+(t.mode==='unattended'?'Bewusst unbetreut':esc(t.personIds.map(id=>state.people.find(p=>p.personId===id)?.name||'Zugeordnete Person').join(', ')||'Noch nicht besetzt'))+'</p>').join('')+(isEditor()?'<div class="row-actions">'+button('Für diese Zusammenstellung anpassen','selection-occurrence','secondary small','data-id="'+o.id+'"')+'</div>':'')+'</article>';
  }).join('')+'</div>';
 }
 async function choose(){
  if(!isEditor())return;
  await loadResources();
  const old=selection()||{standIds:[],occurrenceIds:null,overrides:[],disabledFunctions:[]},value=structuredClone(old);
  const stands=resource().nodes.filter(n=>n.kind==='stand'&&(!n.archived||value.standIds.includes(n.id)));
  const offers=()=>resource().relations.filter(r=>r.kind==='offers'&&!r.archived&&value.standIds.includes(r.from.slice(6)));
  const enabled=(r)=>value.occurrenceIds===null||value.occurrenceIds.includes(r.id);
  openFlow({title:state.current.template?'Vorlage zusammenstellen':'Verfügbarkeit für diesen Abend',steps:['Welche Stände?','Was ist dabei?','Auswahl prüfen'],value,
   body(step,d){
    if(step===0)return '<p>Beschreibungen, Bilder und Standardzuständigkeiten kommen aus den zentralen Definitionen.</p>'+stands.map(s=>check('stands',s.id,s.name+(s.archived?' · pausiert':''),d.standIds.includes(s.id))).join('')+(!stands.length?'<p>Noch keine Stände eingerichtet. Beginne unter „Unser Angebot → Stände“.</p><a class="btn secondary" href="#library/stands">Stände einrichten</a>':'');
    if(step===1)return '<p>Wähle die Inhalte, die hier verfügbar sein sollen. Ein Inhalt an zwei Ständen bleibt getrennt auswählbar.</p>'+offers().map(r=>check('occurrences',r.id,label(r.to)+' · '+label(r.from),enabled(r))).join('')+(!offers().length?'<p>Den ausgewählten Ständen sind noch keine aktiven Inhalte zugeordnet.</p>':'');
    const selected=offers().filter(enabled);
    return '<h3>'+d.standIds.length+' Stände · '+selected.length+' Angebote</h3><ul>'+selected.map(r=>'<li>'+esc(label(r.to))+' · '+esc(label(r.from))+'</li>').join('')+'</ul><p>Welche Funktionen sollen hier ausgeschaltet bleiben?</p>'+resource().sources.filter(n=>n.kind==='function'&&n.implemented).map(f=>check('disabledFunctions',f.id,f.name+' ausschalten',d.disabledFunctions.includes(f.id))).join('')+'<p class="help-copy">Die Auswahl wird als Vorbereitung gespeichert. Sie öffnet keine Gäste-App.</p>';
   },
   collect(step,fd,d){
    if(step===0){const before=d.standIds;d.standIds=fd.getAll('stands');if(d.occurrenceIds!==null){const added=offers().filter(r=>!before.includes(r.from.slice(6))).map(r=>r.id);d.occurrenceIds=[...new Set([...d.occurrenceIds,...added])];}}
    if(step===1)d.occurrenceIds=fd.getAll('occurrences');
    if(step===2)d.disabledFunctions=fd.getAll('disabledFunctions');
   },finishLabel:'Zusammenstellung speichern',
   finish:d=>save({...state.current.experience,resourceSelection:{...d,overrides:d.overrides.filter(o=>d.occurrenceIds===null||d.occurrenceIds.includes(o.occurrenceId))}}),
   done:()=>toast('Die Auswahl ist gespeichert. Gäste sehen weiterhin die bisher freigegebene Fassung.')
  });
 }
 function occurrence(id){
  const o=state.current.resourceReview?.resolution?.occurrences.find(r=>r.id===id);if(!o)return;
  const old=selection().overrides.find(r=>r.occurrenceId===id)||{occurrenceId:id,values:{},staffing:[]};
  const tasks=[...o.tasks,...o.functions.flatMap(f=>f.tasks)].filter((t,i,a)=>a.findIndex(x=>x.taskId===t.taskId)===i);
  const people=state.people.filter(p=>!p.archived&&!p.deletedAt);
  const body='<p>'+esc(o.standName)+' · '+esc(o.name)+'</p>'+(o.capacity?check('inheritCapacity','yes','Plätze aus der Vorgabe übernehmen',!Object.hasOwn(old.values,'capacity'))+field('capacity','Abweichende Plätze',old.values.capacity??o.capacity,'type="number" min="1" max="30" required'):'')+check('inheritDescription','yes','Beschreibung aus der Vorgabe übernehmen',!Object.hasOwn(old.values,'description'))+area('description','Eigene Beschreibung · darf auch leer sein',old.values.description??o.description,1200)+tasks.map(t=>{
   const entry=old.staffing.find(s=>s.taskId===t.taskId),mode=entry?.mode||'inherit';
   return '<fieldset class="resource-staffing"><legend>'+esc(t.name)+'</legend><label class="field"><span>Betreuung</span><select name="mode-'+t.taskId+'" data-task-mode="'+t.taskId+'">'+[['inherit','Standard übernehmen'],['unattended','Bewusst unbetreut'],['assigned','Personen für diese Zusammenstellung wählen']].map(([v,label])=>'<option value="'+v+'" '+(mode===v?'selected':'')+'>'+label+'</option>').join('')+'</select></label><div data-task-people="'+t.taskId+'" '+(mode==='assigned'?'':'hidden')+'>'+people.map(p=>check('people-'+t.taskId,p.personId,p.name,(entry?.personIds||[]).includes(p.personId))).join('')+'</div></fieldset>';
  }).join('')+'<p class="help-copy">Diese Anpassung ändert keine zentralen Inhalte, Aufgaben oder anderen Vorlagen.</p>';
  dialog('Gezielt für hier anpassen',body,async fd=>{
   const next=structuredClone(selection()),values={};
   if(o.capacity&&!fd.has('inheritCapacity'))values.capacity=Number(fd.get('capacity'));
   if(!fd.has('inheritDescription'))values.description=fd.get('description');
   const staffing=tasks.map(t=>{const mode=fd.get('mode-'+t.taskId);return {taskId:t.taskId,mode,personIds:mode==='assigned'?fd.getAll('people-'+t.taskId):[]};});
   next.overrides=next.overrides.filter(r=>r.occurrenceId!==id);
   if(Object.keys(values).length||staffing.some(s=>s.mode!=='inherit'))next.overrides.push({occurrenceId:id,values,staffing});
   await save({...state.current.experience,resourceSelection:next});
  },{saveLabel:'Anpassung speichern',afterOpen:node=>node.querySelectorAll('[data-task-mode]').forEach(select=>select.onchange=()=>{node.querySelector('[data-task-people="'+select.dataset.taskMode+'"]').hidden=select.value!=='assigned';})});
 }
 async function handle(action,node){
  if(action==='selection-choose'){await choose();return true;}
  if(action==='selection-occurrence'){occurrence(node.dataset.id);return true;}
  return false;
 }
 return {page,handle};
}
