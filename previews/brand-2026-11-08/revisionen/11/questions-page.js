const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function answer(entry){
  let text=esc(entry.answer);
  for(const link of entry.links||[])if(/^(#\/|https:\/\/|mailto:)/.test(link.href))text=text.replace(esc(link.text),'<a href="'+esc(link.href)+'">'+esc(link.text)+'</a>');
  return text;
}
function section(entries,key,eyebrow,title){
  const items=entries.filter(e=>e.section===key&&!e.hidden).sort((a,b)=>a.order-b.order);
  if(!items.length)return '';
  return '<section class="faq faq-section" id="'+key+'" aria-labelledby="'+key+'-title"><p class="eyebrow">'+eyebrow+'</p><h2 id="'+key+'-title" tabindex="-1">'+title+'</h2>'+items.map(e=>'<details id="'+esc(e.id)+'"><summary>'+esc(e.question)+'</summary><p>'+answer(e)+'</p></details>').join('')+(key==='orte'?'<a class="button secondary questions-inquiry" href="#/dein-event#anfrage">Rudelbar zu euch holen</a>':'')+'</section>';
}
export function topicField(){
  return '<label>Worum geht’s?<select name="topic" required><option value="">Bitte auswählen</option><option value="frage">Eine Frage zum Abend oder zur Rudelbar</option><option value="ort">Einen Ort vorschlagen</option><option value="anderes">Etwas anderes</option></select></label><p class="topic-notice" id="topic-notice" hidden>Du willst selbst mit anpacken und einen Rudelabend in deinen Ort holen? Dann geht es <a href="#/dein-event#anfrage">hier zur Anfrage</a> für euren Ort.</p>';
}
function searchField(){return '<div class="faq-search" role="search" aria-label="Fragen durchsuchen"><label for="faq-search-input">Fragen durchsuchen</label><div class="faq-search-controls"><input id="faq-search-input" type="search" autocomplete="off" placeholder="Suchbegriff eingeben" aria-controls="abend orte" aria-describedby="faq-search-status"><button id="faq-search-clear" type="button" disabled>Suche leeren</button></div><p id="faq-search-status" class="faq-search-status" role="status" aria-live="polite" aria-atomic="true"></p><p id="faq-search-empty" hidden><a class="text-link" href="#/fragen#nachricht">Schreib uns.</a></p></div>';}
export function questionsPage(data,form){
 return '<div class="container questions-page"><div class="page-head"><p class="eyebrow">Fragen</p><h1>Moin. Was wollt ihr wissen?</h1><p class="lede">Hier findet ihr Antworten auf die Fragen, die uns am häufigsten erreichen. Und wenn eure nicht dabei ist: Schreibt uns.</p></div>'+searchField()+section(data.entries,'abend','Zum Rudelabend','Vorbeikommen und dabei sein.')+section(data.entries,'orte','Rudelbar zu euch holen','Ein Rudelabend in eurem Ort.')+'<section class="press-contact format-fit"><p class="eyebrow">Presse</p><h2>Für Presse und Medien.</h2><p>Sie möchten über die Rudelbar berichten? Schreiben Sie uns an <a href="mailto:info@rudelbar.de">info@rudelbar.de</a> – wir melden uns bei Ihnen. Was bisher über uns berichtet wurde, finden Sie bei den <a href="#/rudelgeschichten">Rudelgeschichten</a>.</p></section><section class="questions-contact" id="nachricht"><h2 tabindex="-1">Deine Frage war nicht dabei?</h2><p>Schreib uns. Wir melden uns bei dir.</p>'+form+'</section><div class="contact-cards"><a href="mailto:info@rudelbar.de"><span>Lieber direkt schreiben?</span>info@rudelbar.de</a><a href="tel:+4915259574522"><span>Oder kurz schnacken?</span>+49 152 59574522</a></div></div>';
}

const normalized=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('de-DE').replace(/ß/g,'ss');
export function matchingQuestions(entries,query){
 const terms=normalized(query).trim().split(/\s+/).filter(Boolean);
 return entries.filter(entry=>!entry.hidden&&terms.every(term=>normalized(entry.question+' '+entry.answer).includes(term)));
}
export function bindQuestionSearch(data,root){
 const input=root.querySelector('#faq-search-input');if(!input)return;
 const clear=root.querySelector('#faq-search-clear'),status=root.querySelector('#faq-search-status'),empty=root.querySelector('#faq-search-empty');
 const rows=[...root.querySelectorAll('.faq-section details')],sections=[...root.querySelectorAll('.faq-section')];
 let previousOpen=null;
 const update=()=>{
  const query=input.value.trim(),matches=new Set(matchingQuestions(data.entries,query).map(entry=>entry.id));
  if(query&&previousOpen===null)previousOpen=new Map(rows.map(row=>[row.id,row.open]));
  for(const row of rows){
   row.hidden=!matches.has(row.id);
   if(query)row.open=!row.hidden;
   else if(previousOpen)row.open=previousOpen.get(row.id)||false;
  }
  for(const section of sections)section.hidden=![...section.querySelectorAll('details')].some(row=>!row.hidden);
  const count=rows.filter(row=>!row.hidden).length;
  status.textContent=query?(count?count+' passende '+(count===1?'Frage.':'Fragen.'):'Keine passenden Fragen gefunden.'):count+' Fragen.';
  empty.hidden=!query||count>0;
  clear.disabled=!input.value;
  if(!query)previousOpen=null;
 };
 const reset=()=>{input.value='';update();input.focus();};
 input.addEventListener('input',update);
 input.addEventListener('keydown',event=>{if(event.key==='Escape'&&input.value){event.preventDefault();reset();}});
 clear.addEventListener('click',reset);
 update();
}
