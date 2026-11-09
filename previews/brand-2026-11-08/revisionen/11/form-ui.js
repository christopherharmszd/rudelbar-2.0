const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const descriptions=new WeakMap();
const warning='<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="8"></circle><path d="M10 5.5v5"></path><circle class="icon-dot" cx="10" cy="14" r="1"></circle></svg>';
const check='<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="m3 10 4.5 4.5L17 5"></path></svg>';
export function clearFieldError(input){
 input.removeAttribute('aria-invalid');
 const original=descriptions.get(input)||'';
 if(original)input.setAttribute('aria-describedby',original);else input.removeAttribute('aria-describedby');
 if(input.dataset.errorId)document.getElementById(input.dataset.errorId)?.remove();
}
export function reportFieldError(input,text){
 clearFieldError(input);
 const label=input.closest('label');let wrapper=label?.parentElement;
 if(label&&!wrapper?.classList.contains('validated-field')){wrapper=document.createElement('div');wrapper.className='validated-field';label.before(wrapper);wrapper.append(label);}
 if(!wrapper)return;
 const id='error-'+input.form.id+'-'+input.name;
 const error=document.createElement('small');error.id=id;error.className='field-error';error.innerHTML=warning+'<span>'+esc(text)+'</span>';wrapper.append(error);
 input.dataset.errorId=id;input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby',[descriptions.get(input),id].filter(Boolean).join(' '));
}
export function clearResult(form){
 const box=form.querySelector('.form-feedback');if(!box)return;
 box.replaceChildren();box.hidden=true;box.setAttribute('role','status');
}
export function showResult(form,kind,text){
 const box=form.querySelector('.form-feedback');if(!box)return;
 box.className='form-feedback form-result '+(kind==='error'?'is-error':'is-success');
 box.setAttribute('role',kind==='error'?'alert':'status');box.innerHTML=(kind==='error'?warning:check)+'<span>'+esc(text)+'</span>';box.hidden=false;
}
export function attachValidation(form,{group=false,onValid}={}){
 form.noValidate=true;
 const controls=[...form.querySelectorAll('input,textarea,select')];
 const box=form.querySelector('.form-feedback'),submit=form.querySelector('[type="submit"]');
 if(box&&submit){box.classList.add('form-result');box.hidden=true;(submit.closest('.studio-actions')||submit).before(box);}
 const text=input=>input.validity.customError?input.validationMessage:input.type==='email'&&input.value.trim()?(group?'Diese E-Mail-Adresse stimmt noch nicht ganz. Schaut bitte noch mal drauf.':'Diese E-Mail-Adresse stimmt noch nicht ganz. Schau bitte noch mal drauf.'):(group?'Bitte tragt hier noch etwas ein.':'Bitte trag hier noch etwas ein.');
 const show=input=>input.validity.valid?clearFieldError(input):reportFieldError(input,text(input));
 controls.forEach(input=>{
   descriptions.set(input,input.getAttribute('aria-describedby')||'');
   input.addEventListener('input',()=>{if(input.hasAttribute('aria-invalid'))show(input);clearResult(form);});
   input.addEventListener('change',()=>{if(input.hasAttribute('aria-invalid'))show(input);clearResult(form);});
   input.addEventListener('invalid',event=>{event.preventDefault();show(input);});
 });
 form.addEventListener('submit',event=>{event.preventDefault();clearResult(form);controls.forEach(show);const invalid=controls.find(input=>!input.validity.valid);if(invalid){invalid.focus();return;}onValid?.();});
}
