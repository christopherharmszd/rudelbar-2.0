const token=location.hash.slice(1);history.replaceState(null,'',location.pathname);
const form=document.querySelector('#activate'),error=document.querySelector('#error'),intro=document.querySelector('#intro');
const showError=message=>{error.textContent=message;error.hidden=false;};
async function post(path,body){const response=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),result=await response.json();if(!response.ok)throw new Error(result.error);return result;}
try{
 if(!/^[a-f0-9]{64}$/.test(token))throw new Error('Bitte öffne den vollständigen Link, den du vom Team oder per E-Mail erhalten hast.');
 const result=await post('/api/auth/link',{token});form.elements.email.value=result.email;intro.textContent=result.purpose==='invite'?`Moin ${result.name}. Wähle dein Passwort für Backstage und Live. Deine Aufgaben sind schon vorbereitet.`:`Moin ${result.name}. Hier kannst du ein neues Passwort für deinen Zugang wählen.`;
 if(result.purpose==='reset')document.querySelector('#title').textContent='Wieder dabei.';form.hidden=false;
}catch(e){intro.textContent='Dein Zugang konnte noch nicht eingerichtet werden.';showError(e.message);}
form.addEventListener('submit',async event=>{
 event.preventDefault();error.hidden=true;const fd=new FormData(form);if(fd.get('password')!==fd.get('confirm'))return showError('Die beiden Passwörter stimmen nicht überein.');const button=form.querySelector('button');button.disabled=true;
 try{await post('/api/auth/complete',{token,password:fd.get('password')});form.reset();location.replace('/anmelden?eingerichtet=1');}catch(e){showError(e.message||'Das Passwort konnte nicht gespeichert werden.');button.disabled=false;}
});
