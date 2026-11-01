import {safeReturnPath} from './session-paths.js';
const params=new URLSearchParams(location.search),target=safeReturnPath(params.get('weiter')),error=document.querySelector('#login-error'),form=document.querySelector('#shared-login');
document.querySelector('#purpose').textContent=target.startsWith('/team')||target.startsWith('/live')?'Melde dich für die Eingänge, Wartelisten und Gespräche deines Abends an.':'Melde dich an, um Inhalte und Veranstaltungen vorzubereiten.';
const showError=message=>{error.textContent=message;error.hidden=false;};
if(params.get('loginError'))showError(params.get('loginError'));
try{
 const [session,config]=await Promise.all([fetch('/api/session',{cache:'no-store'}).then(r=>r.json()),fetch('/api/auth/config',{cache:'no-store'}).then(r=>r.json())]);
 if(session.user&&!params.has('loginError'))location.replace(target);
 if(config.configured){const link=document.querySelector('#personal-login');link.href='/api/auth/start?weiter='+encodeURIComponent(target);link.hidden=false;document.querySelector('#legacy-access').open=false;}
}catch{showError('Die Anmeldung ist gerade nicht erreichbar. Bitte versuche es erneut.');}
form.addEventListener('submit',async event=>{
 event.preventDefault();error.hidden=true;const button=form.querySelector('button');button.disabled=true;
 try{const response=await fetch('/api/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'redaktion@rudelbar.local',password:new FormData(form).get('password')})}),result=await response.json();if(!response.ok)throw new Error(result.error);location.replace(target);}catch(e){showError(e.message||'Die Anmeldung konnte nicht abgeschlossen werden.');button.disabled=false;}
});
