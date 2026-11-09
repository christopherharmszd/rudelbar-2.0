(async () => {
  const script=document.currentScript,base=new URL('.',script.src),selector=document.querySelector('#review-version-select');
  if(!selector)return;
  let versions;try{const response=await fetch(new URL('revisions.json',base),{cache:'reload'});if(!response.ok)throw Error();versions=(await response.json()).versions;}catch{versions=null;}
  const id=document.documentElement.dataset.reviewRevision,current=versions?.find(v=>v.id===id);
  if(versions&&current){
    selector.replaceChildren(...versions.map(v=>{const o=document.createElement('option');o.value=new URL(v.path,base).href;o.dataset.id=v.id;o.textContent=v.id+' · '+v.label;o.selected=v.id===id;return o;}));
    const panel=document.querySelector('.review-version-panel');panel.querySelector('p').textContent=current.origin;
    panel.querySelector('ul').replaceChildren(...current.changes.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
    const links=panel.querySelector('.review-version-links');links.replaceChildren();
    const add=(v,label,rel)=>{if(!v)return;const a=document.createElement('a');a.href=new URL(v.path,base).href;a.dataset.revisionLink='';a.dataset.id=v.id;a.textContent=label;if(rel)a.rel=rel;links.append(a);};
    const position=versions.findIndex(v=>v.id===id);add(versions[position-1],'Vorheriger Stand','prev');add(versions[position+1],'Nächster Stand','next');add(current,'Fester Link zu diesem Stand');
  }
  const toHash=(id,hash)=>{
    let next=hash||'#/';
    if(Number(id)<10&&/^#\/fragen(?:#.*)?$/.test(next))next='#/kontakt';
    if(Number(id)>=10)next=next.replace(/^#\/kontakt(?=#|$)/,'#/fragen');
    if(Number(id)<6&&/^#\/app(?:\/|$)/.test(next))next='#/';
    if(id==='02')return next.replace(/^#\/ueber-uns/,'#/das-rudel').replace(/^#\/rudelgeschichten/,'#/aktuelles');
    next=next.replace(/^#\/das-rudel/,'#/ueber-uns');
    return id==='03'?next.replace(/^#\/rudelgeschichten/,'#/aktuelles'):next.replace(/^#\/aktuelles/,'#/rudelgeschichten');
  };
  const target=(path,id)=>{const url=new URL(path,location.href);url.hash=toHash(id,location.hash);return url.href;};
  selector.addEventListener('change',()=>{const o=selector.selectedOptions[0];location.assign(target(o.value,o.dataset.id));});
  for(const a of document.querySelectorAll('[data-revision-link]')){
    const path=a.getAttribute('href'),update=()=>{a.href=target(path,a.dataset.id);};update();window.addEventListener('hashchange',update);
  }
})();
