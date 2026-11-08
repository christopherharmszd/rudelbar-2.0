(() => {
  const selector=document.querySelector('#review-version-select');
  if(!selector)return;
  const toHash=(id,hash)=>{
    let next=hash||'#/';
    if(id==='02')return next.replace(/^#\/ueber-uns/,'#/das-rudel').replace(/^#\/rudelgeschichten/,'#/aktuelles');
    next=next.replace(/^#\/das-rudel/,'#/ueber-uns');
    return id==='03'?next.replace(/^#\/rudelgeschichten/,'#/aktuelles'):next.replace(/^#\/aktuelles/,'#/rudelgeschichten');
  };
  const target=(path,id)=>{const url=new URL(path,location.href);url.hash=toHash(id,location.hash);return url.href;};
  selector.addEventListener('change',()=>{const o=selector.selectedOptions[0];location.assign(target(o.value,o.dataset.id));});
  for(const a of document.querySelectorAll('[data-revision-link]')){
    const path=a.getAttribute('href');
    const update=()=>{a.href=target(path,a.dataset.id);};
    update();window.addEventListener('hashchange',update);
  }
})();
