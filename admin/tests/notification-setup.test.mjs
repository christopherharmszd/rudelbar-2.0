import test from 'node:test';
import assert from 'node:assert/strict';
import {notificationPlatform,notificationSetupContent} from '../../event-app/public/notification-setup.js';

const render=(state,device)=>notificationSetupContent({step:0,sound:false,enabled:false,configured:true,...state},notificationPlatform(device),{button:(label,action)=>`<button data-notice="${action}">${label}</button>`});
test('notification setup starts with sound on every device and never starts with installation instructions',()=>{
 for(const userAgent of ['iPhone','Android','Mac OS X']){
  const view=render({}, {userAgent,supported:true});
  assert.match(view.body,/Hinweiston einschalten/);
  assert.match(view.body,/Ton anhören/);
  assert.ok(!view.body.includes('Zum Home-Bildschirm'));
  assert.ok(!view.body.includes('Mitteilungen erlauben'));
 }
});
test('installation help is restricted to iOS browsers, including iPad desktop mode',()=>{
 for(const device of [{userAgent:'iPhone'},{userAgent:'iPad'},{userAgent:'Mac OS X',platform:'MacIntel',maxTouchPoints:5}])assert.match(render({step:1},device).body,/Zum Home-Bildschirm/);
 for(const device of [{userAgent:'Android',supported:true},{userAgent:'Mac OS X',platform:'MacIntel',maxTouchPoints:0,supported:true},{userAgent:'iPhone',standalone:true,supported:true}]){
  const view=render({step:1},device);
  assert.ok(!view.body.includes('Zum Home-Bildschirm'));
  assert.match(view.body,/Mitteilungen erlauben/);
 }
});
test('blocked, unavailable and incomplete push setup stays voluntary and does not claim success',()=>{
 const blocked=render({step:1},{supported:true,permission:'denied'});
 assert.match(blocked.body,/blockiert/);assert.ok(!blocked.body.includes('data-notice="enable"'));
 const unavailable=render({step:1,configured:false},{supported:true});assert.ok(!unavailable.body.includes('data-notice="enable"'));
 const summary=render({step:2,sound:true},{supported:true});assert.match(summary.body,/Eingeschaltet/);assert.match(summary.body,/Nicht aktiviert/);assert.match(summary.footer,/Einrichtung abschließen/);
 const active=render({step:2,enabled:true,lastStatus:502},{supported:true,permission:'granted'});assert.match(active.body,/Versand ist fehlgeschlagen/);assert.match(active.body,/Testmitteilung senden/);
});
