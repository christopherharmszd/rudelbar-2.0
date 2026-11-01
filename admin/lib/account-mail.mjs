import {hash,fail,random,cleanEmail} from './account-utils.mjs';
import {managesUsers,requirePermission} from './permissions.mjs';
const encoder=new TextEncoder(),sender='info@rudelbar.de';
const b64=value=>btoa(String.fromCharCode(...encoder.encode(value)));
const toHex=value=>Array.from(value,b=>b.toString(16).padStart(2,'0')).join('');
const fromHex=value=>Uint8Array.from(value.match(/../g)||[],v=>parseInt(v,16));
async function cipherKey(secret){
 const material=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const key=await crypto.subtle.sign('HMAC',material,encoder.encode('rudelbar-mail-password-encryption-v1'));
 return crypto.subtle.importKey('raw',key,'AES-GCM',false,['encrypt','decrypt']);
}
export async function encryptMailPassword(secret,password){
 const iv=crypto.getRandomValues(new Uint8Array(12)),encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(sender)},await cipherKey(secret),encoder.encode(password));
 return toHex(iv)+'.'+toHex(new Uint8Array(encrypted));
}
async function decryptPassword(secret,value){const [iv,body]=value.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:fromHex(iv),additionalData:encoder.encode(sender)},await cipherKey(secret),fromHex(body)));}
export function mimeMessage(message){
 const to=cleanEmail(message.to);
 if(typeof message.subject!=='string'||/[\r\n\0]/.test(message.subject)||message.subject.length>120||typeof message.text!=='string'||message.text.length>16000||!/^[\w-]{1,80}$/.test(message.id))fail('Ungültige E-Mail-Daten.');
 const subject=Array.from(message.subject).reduce((chunks,char)=>{if(encoder.encode(chunks.at(-1)+char).length>36)chunks.push('');chunks[chunks.length-1]+=char;return chunks;},['']).map(s=>`=?UTF-8?B?${b64(s)}?=`).join('\r\n ');
 return [`From: Rudelbar <${sender}>`,`To: ${to}`,`Subject: ${subject}`,`Date: ${new Date().toUTCString()}`,`Message-ID: <${message.id}@rudelbar.de>`,'MIME-Version: 1.0','Content-Type: text/plain; charset=utf-8','Content-Transfer-Encoding: base64','',b64(message.text).match(/.{1,76}/g)?.join('\r\n')||'',''].join('\r\n');
}
export async function sendSmtp(connectTLS,password,message){
 const content=mimeMessage(message);let socket,reader,writer,timer,stopped=false,submissionStarted=false,accepted=false;
 const check=()=>{if(stopped)throw new Error('SMTP-Zeitlimit.');};
 async function perform(){
  socket=await connectTLS({hostname:'smtp.strato.de',port:465},{secureTransport:'on'});if(stopped){try{await socket.close();}catch{}check();}
  await socket.opened;check();reader=socket.readable.getReader();writer=socket.writable.getWriter();const decoder=new TextDecoder();let buffer='';
  async function line(){check();while(!buffer.includes('\r\n')){const {value,done}=await reader.read();check();if(done)throw new Error('Verbindung beendet.');buffer+=decoder.decode(value,{stream:true});if(buffer.length>16000)throw new Error('Serverantwort zu groß.');}const n=buffer.indexOf('\r\n'),value=buffer.slice(0,n);buffer=buffer.slice(n+2);return value;}
  async function reply(expected){let first;for(let n=0;n<100;n++){const value=await line();if(!/^\d{3}[ -]/.test(value))throw new Error('Ungültige Antwort.');first??=value.slice(0,3);if(first!==value.slice(0,3))throw new Error('Ungültige Antwort.');if(value[3]===' '){const code=Number(first);if(!expected.includes(code)){throw Object.assign(new Error('SMTP abgelehnt.'),{explicitRejection:true});}return;}}throw new Error('Zu viele Antworten.');}
  const command=async(value,codes)=>{check();await writer.write(encoder.encode(value+'\r\n'));await reply(codes);};
  await reply([220]);await command('EHLO rudelbar.de',[250]);await command('AUTH LOGIN',[334]);await command(b64(sender),[334]);await command(b64(password),[235]);
  await command(`MAIL FROM:<${sender}>`,[250]);await command(`RCPT TO:<${message.to}>`,[250,251]);await command('DATA',[354]);check();submissionStarted=true;
  await writer.write(encoder.encode(content.replace(/(^|\r\n)\./g,'$1..')+'\r\n.\r\n'));await reply([250]);accepted=true;
  try{await writer.write(encoder.encode('QUIT\r\n'));}catch{}return {accepted:true};
 }
 try{return await Promise.race([perform(),new Promise((_,reject)=>{timer=setTimeout(()=>{stopped=true;reject(new Error('SMTP-Zeitlimit.'));},20000);})]);}
 catch(error){if(accepted)return {accepted:true};throw Object.assign(new Error('Der Mailserver hat den Versand nicht bestätigt.'),{safeToRetry:!submissionStarted||error.explicitRejection===true});}
 finally{stopped=true;clearTimeout(timer);try{await socket?.close();}catch{}}
}
export function createAccountMail(env,{audit}){
 const db=env.LIVE_DB;
 async function settings(){const row=await db.prepare('SELECT * FROM app_mail_settings WHERE id=1').first();return {sender,host:'smtp.strato.de',port:465,enabled:!!row?.enabled,passwordSaved:!!row?.password_cipher,ready:!!row?.enabled&&!!row?.password_cipher&&(typeof env.MAIL_CONNECT==='function'||!!env.ACCOUNT_MAILER),revision:row?.revision||0};}
 async function save(actor,input){
  requirePermission(managesUsers(actor));const current=await db.prepare('SELECT * FROM app_mail_settings WHERE id=1').first();
  if(input.revision!==(current?.revision||0))fail('Die Versandeinstellung wurde inzwischen geändert. Bitte aktualisieren.',409);
  let cipher=current?.password_cipher||'';
  if(input.password!==undefined&&input.password!==''){if(typeof input.password!=='string'||input.password.length>1024||/[\r\n\0]/.test(input.password))fail('Bitte ein gültiges Postfachpasswort eingeben.');cipher=await encryptMailPassword(env.RUDELBAR_SESSION_SECRET,input.password);}
  if(input.enabled&&!cipher)fail('Bitte zuerst das Passwort für info@rudelbar.de hinterlegen.');
  const result=current?await db.prepare('UPDATE app_mail_settings SET enabled=?,password_cipher=?,revision=revision+1,updated_at=? WHERE id=1 AND revision=?').bind(input.enabled?1:0,cipher,Date.now(),input.revision).run():await db.prepare('INSERT OR IGNORE INTO app_mail_settings(id,enabled,password_cipher,updated_at) VALUES(1,?,?,?)').bind(input.enabled?1:0,cipher,Date.now()).run();
  if(!result.meta.changes)fail('Die Versandeinstellung wurde inzwischen geändert. Bitte aktualisieren.',409);
  await audit(actor,'mail.settings_updated','mail');return settings();
 }
 async function reserve(email,purpose){
  const id=random(),now=Date.now(),emailHash=await hash(email);
  // One conditional write serializes the global and recipient limits across Worker instances.
  const result=await db.prepare(`INSERT INTO app_mail_attempts(id,email_hash,purpose,state,created_at) SELECT ?,?,?,'sending',? WHERE
   (SELECT COUNT(*) FROM app_mail_attempts WHERE created_at>?)<30 AND
   (SELECT COUNT(*) FROM app_mail_attempts WHERE email_hash=? AND created_at>?)<5 AND
   NOT EXISTS(SELECT 1 FROM app_mail_attempts WHERE email_hash=? AND created_at>?)`).bind(id,emailHash,purpose,now,now-3600000,emailHash,now-3600000,emailHash,now-60000).run();
  if(!result.meta.changes)fail('Bitte warte etwas, bevor du einen weiteren Link versendest.',429);
  await db.prepare('DELETE FROM app_mail_attempts WHERE created_at<?').bind(now-2*86400000).run();return id;
 }
 async function send({to,name,purpose,link,id}){
  const row=await db.prepare('SELECT * FROM app_mail_settings WHERE id=1 AND enabled=1').first();
  if(!row?.password_cipher||!((typeof env.MAIL_CONNECT==='function')||env.ACCOUNT_MAILER))fail('Der E-Mail-Versand ist noch nicht eingerichtet. Bitte wende dich an die Administration.',503);
  const message={id,to,subject:purpose==='invite'?'Dein persönlicher Zugang zur Rudelbar':'Dein Rudelbar-Passwort zurücksetzen',text:`Moin ${name},\n\n${purpose==='invite'?'dein persönlicher Zugang zur Rudelbar ist vorbereitet. Wähle über diesen Link dein Passwort:':'über diesen Link kannst du ein neues Passwort für deinen Rudelbar-Zugang wählen:'}\n\n${link}\n\nDer Link gilt ${purpose==='invite'?'24 Stunden':'30 Minuten'} und kann einmal verwendet werden. Teile ihn nicht weiter. ${purpose==='reset'?'Dein bisheriges Passwort bleibt bis zur Änderung gültig. Wenn du die Änderung nicht angefordert hast, ignoriere diese E-Mail.':''}\n\nGemeinsam. Überall. Rudelbar.\ninfo@rudelbar.de`};
  let state;
  try{const password=await decryptPassword(env.RUDELBAR_SESSION_SECRET,row.password_cipher);const result=env.ACCOUNT_MAILER?await env.ACCOUNT_MAILER.send(message):await sendSmtp(env.MAIL_CONNECT,password,message);state=result?.accepted===true?'accepted':'uncertain';}
  catch(error){state=error.safeToRetry===true?'failed':'uncertain';}
  await db.prepare('UPDATE app_mail_attempts SET state=? WHERE id=?').bind(state,id).run();return {delivery:state};
 }
 return {settings,save,reserve,send};
}
