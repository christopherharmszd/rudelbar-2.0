import {safeReturnPath} from './session-paths.js';
const params=new URLSearchParams(location.search),target=safeReturnPath(params.get('weiter')),action=params.get('aktion'),error=document.querySelector('#login-error'),success=document.querySelector('#success');
const personal=document.querySelector('#personal-login'),forgot=document.querySelector('#forgot-form'),change=document.querySelector('#change-form');let user;
const showError=message=>{error.textContent=message;error.hidden=false;};
const message=text=>{success.textContent=text;success.hidden=false;};
const loginPath='/anmelden?weiter='+encodeURIComponent(target);
document.querySelector('#forgot-link').href=loginPath+'&aktion=reset';document.querySelector('#return-link').href=loginPath;
if(params.get('loginError'))showError(params.get('loginError'));
if(params.has('eingerichtet'))message('Dein Passwort ist gespeichert. Melde dich jetzt mit deinem persönlichen Konto an.');
if(action){personal.hidden=true;document.querySelector('#forgot-link').hidden=true;document.querySelector('#return-link').hidden=false;document.querySelector('#legacy-access').hidden=true;document.querySelector('#access-hint').hidden=true;}
if(action==='reset'){forgot.hidden=false;document.querySelector('#title').textContent='Wieder dabei.';document.querySelector('#purpose').textContent='Fordere einen Link an, um ein neues Passwort zu wählen.';}
if(action==='passwort'){change.hidden=false;document.querySelector('#title').textContent='Dein neues Passwort.';document.querySelector('#purpose').textContent='Nach der Änderung meldest du dich auf deinen Geräten erneut an.';}
try{
 const response=await fetch('/api/session',{cache:'no-store'});if(!response.ok)throw new Error();user=(await response.json()).user;
 if(user&&!action&&!params.has('wechsel')&&!params.has('eingerichtet')&&!params.has('loginError'))location.replace(target);
 if(action==='passwort'){if(!user||user.legacy){change.hidden=true;showError('Melde dich zuerst mit deinem persönlichen Konto an.');}else change.elements.email.value=user.email;}
}catch{showError('Die Anmeldung ist gerade nicht erreichbar. Bitte versuche es erneut.');}
async function post(form,path,body,onSuccess){
 error.hidden=true;success.hidden=true;const button=form.querySelector('button');button.disabled=true;
 try{const response=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',...(user?{'X-CSRF-Token':user.csrf}:{})},body:JSON.stringify(body)}),result=await response.json();if(!response.ok)throw new Error(result.error);await onSuccess(result);}
 catch(e){showError(e.message||'Der Vorgang konnte nicht abgeschlossen werden.');}finally{button.disabled=false;}
}
personal.addEventListener('submit',event=>{event.preventDefault();const fd=new FormData(personal);post(personal,'/api/login',{email:fd.get('email'),password:fd.get('password')},()=>location.replace(target));});
document.querySelector('#shared-login').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;post(form,'/api/login',{email:'redaktion@rudelbar.local',password:new FormData(form).get('password')},()=>location.replace(target));});
forgot.addEventListener('submit',event=>{event.preventDefault();post(forgot,'/api/auth/forgot',{email:new FormData(forgot).get('email')},result=>message(result.message));});
change.addEventListener('submit',event=>{event.preventDefault();const fd=new FormData(change);if(fd.get('password')!==fd.get('confirm'))return showError('Die beiden neuen Passwörter stimmen nicht überein.');post(change,'/api/auth/change',{currentPassword:fd.get('currentPassword'),password:fd.get('password')},()=>location.replace(loginPath+'&eingerichtet=1'));});
