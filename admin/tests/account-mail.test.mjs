import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sqliteD1} from './sqlite-d1.mjs';
import {createAccounts} from '../lib/accounts.mjs';
import {mimeMessage,sendSmtp} from '../lib/account-mail.mjs';
const schema=(await Promise.all(['0001_live_stations','0002_notifications','0003_accounts','0004_native_accounts'].map(n=>readFile(new URL('../migrations/'+n+'.sql',import.meta.url),'utf8')))).join('\n');
const actor={name:'Redaktion'},secret='mail-test-secret-only-not-a-real-postbox-password',password='Local-test-account-password!';
function setup(){const db=sqliteD1();db.connection.exec(schema);const deliveries=[],env={LIVE_DB:db,RUDELBAR_SESSION_SECRET:secret,ACCOUNT_MAILER:{send:async m=>{deliveries.push(m);return {accepted:true};}}};const service=createAccounts(env,{people:async()=>[{personId:'alex',name:'Alex'}],events:async()=>[]});return {db,env,service,deliveries,close:()=>db.connection.close()};}
test('mailbox settings are admin-only, encrypted at rest, revision guarded and never disclose the saved password',async()=>{
 const s=setup();try{
  const input={revision:0,password:'synthetic-mailbox-password',enabled:true};
  await assert.rejects(()=>s.service.mail.save({accountId:'station-user',roles:[{role:'station'}]},input),e=>e.status===403);
  const settings=await s.service.mail.save(actor,input);assert.equal(settings.ready,true);assert.equal(settings.sender,'info@rudelbar.de');assert.equal(s.deliveries.length,0);
  const row=s.db.connection.prepare('SELECT * FROM app_mail_settings').get();assert.ok(row.password_cipher);assert.ok(!row.password_cipher.includes(input.password));assert.ok(!JSON.stringify(settings).includes(input.password));assert.ok(!JSON.stringify(await s.service.list()).includes(row.password_cipher));
  await assert.rejects(()=>s.service.mail.save(actor,input),e=>e.status===409);
  await s.service.mail.save(actor,{revision:settings.revision,password:'',enabled:false});assert.equal((await s.service.mail.settings()).ready,false);assert.equal(s.db.connection.prepare('SELECT password_cipher FROM app_mail_settings').get().password_cipher,row.password_cipher);
 }finally{s.close();}
});
test('manual invitation never sends; an explicit email uses the chosen mailbox and respects recipient cooldown',async()=>{
 const s=setup();try{
  const account=(await s.service.save(actor,{personId:'alex',email:'alex@example.invalid',roles:[{role:'admin'}]})).account;
  const manual=await s.service.invite(actor,account.id);assert.ok(manual.token);assert.equal(s.deliveries.length,0);
  await s.service.mail.save(actor,{revision:0,password:'synthetic-only-mail-password',enabled:true});
  const sent=await s.service.invite(actor,account.id,{delivery:'email',origin:'https://cms.example.test'});assert.equal(sent.delivery,'accepted');assert.equal(sent.token,undefined);assert.equal(s.deliveries.length,1);assert.ok(s.deliveries[0].text.includes('https://cms.example.test/einladung#'));assert.equal(s.deliveries[0].to,account.email);
  await assert.rejects(()=>s.service.invite(actor,account.id,{delivery:'email',origin:'https://cms.example.test'}),e=>e.status===429);
  assert.ok(await s.service.inspect(manual.token),'previous links remain valid until used or expired');
 }finally{s.close();}
});
test('forgotten-password responses do not disclose account existence and uncertain mail keeps a valid link',async()=>{
 const s=setup();try{
  await s.service.mail.save(actor,{revision:0,password:'synthetic-only-mail-password',enabled:true});
  const account=(await s.service.save(actor,{personId:'alex',email:'alex@example.invalid',roles:[{role:'admin'}]})).account;
  const invitation=await s.service.invite(actor,account.id);await s.service.complete({token:invitation.token,password});
  s.env.ACCOUNT_MAILER.send=async m=>{s.deliveries.push(m);throw new Error('Lost final SMTP response');};
  assert.deepEqual(await s.service.forgot(account.email,'https://cms.example.test'),await s.service.forgot('missing@example.invalid','https://cms.example.test'));
  const token=s.deliveries[0].text.match(/einladung#([a-f0-9]{64})/)[1];assert.equal((await s.service.inspect(token)).purpose,'reset');assert.ok(await s.service.signIn(account.email,password));
  assert.equal(s.db.connection.prepare("SELECT state FROM app_mail_attempts WHERE purpose='reset' ORDER BY created_at LIMIT 1").get().state,'uncertain');
 }finally{s.close();}
});
function smtp(mode='accepted'){
 let control,phase=0,closed=false;const commands=[],enc=new TextEncoder();
 const readable=new ReadableStream({start(c){control=c;c.enqueue(enc.encode('220 ready\r\n'));}});
 const writable=new WritableStream({write(bytes){const value=new TextDecoder().decode(bytes);commands.push(value);let reply;
  if(value.startsWith('EHLO'))reply='250-server\r\n250 AUTH LOGIN\r\n';
  else if(value.startsWith('AUTH LOGIN')){phase=1;reply='334 username\r\n';}
  else if(phase===1){phase=2;reply='334 password\r\n';}
  else if(phase===2){phase=3;reply='235 authenticated\r\n';}
  else if(value.startsWith('MAIL FROM')||value.startsWith('RCPT TO'))reply='250 ok\r\n';
  else if(value==='DATA\r\n'){phase=4;reply='354 send\r\n';}
  else if(phase===4){phase=5;if(mode==='uncertain'){control.close();closed=true;return;}reply=mode==='rejected'?'550 rejected\r\n':'250 accepted\r\n';}
  else if(value==='QUIT\r\n'){throw new Error('Connection ended after acceptance');}
  if(reply)control.enqueue(enc.encode(reply));
 }});
 return {commands,connect:async(address,options)=>{assert.deepEqual(address,{hostname:'smtp.strato.de',port:465});assert.equal(options.secureTransport,'on');return {opened:Promise.resolve(),readable,writable,close:async()=>{if(!closed){control.close();closed=true;}}};}};
}
test('SMTP waits for DATA acceptance, tolerates a failed QUIT and distinguishes an uncertain response',async()=>{
 const message={id:'test-only-message',to:'alex@example.invalid',subject:'Rudelbar – Einladung',text:'Ein persönlicher Link.'};
 const accepted=smtp();assert.deepEqual(await sendSmtp(accepted.connect,'test-only-postbox-password',message),{accepted:true});assert.ok(accepted.commands.some(v=>v.startsWith('From: Rudelbar <info@rudelbar.de>')));
 const uncertain=smtp('uncertain');await assert.rejects(()=>sendSmtp(uncertain.connect,'test-only',message),e=>e.safeToRetry===false);
 const rejected=smtp('rejected');await assert.rejects(()=>sendSmtp(rejected.connect,'test-only',message),e=>e.safeToRetry===true);
});
test('MIME headers reject injection before connecting and preserve UTF-8 content',async()=>{
 const message={id:'test-only',to:'alex@example.invalid',subject:'Einladung für dich',text:'Moin – schön, dass du dabei bist.'};
 const mime=mimeMessage(message);assert.ok(mime.includes('From: Rudelbar <info@rudelbar.de>'));assert.equal(Buffer.from(mime.split('\r\n\r\n')[1].replace(/\r\n/g,''),'base64').toString(),message.text);
 for(const changed of [{to:'alex@example.invalid\r\nBcc: other@example.invalid'},{subject:'Hallo\r\nBcc: other@example.invalid'},{id:'bad\r\nheader'}])await assert.rejects(()=>sendSmtp(()=>{throw new Error('must not connect');},'password',{...message,...changed}),e=>e.status===400);
});
