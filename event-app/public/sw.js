self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 event.waitUntil((async()=>{
  let message={};try{message=event.data?.json()||{};}catch{}
  let url='/';try{const target=new URL(message.url,self.location.origin);if(target.origin===self.location.origin)url=target.pathname+target.search;}catch{}
  const icon=message.icon==='/abend-preview/assets/rudelbar-logo.png'?message.icon:'/assets/rudelbar-logo.png';
  await self.registration.showNotification(message.title||'Neues von Rudelbar',{body:message.body||'Schau in dein Postfach.',icon,badge:icon,tag:message.tag||'rudelbar',data:{url,id:message.id||'',seq:message.seq||0}});
  if('setAppBadge' in self.navigator)try{if(message.count)await self.navigator.setAppBadge(message.count);else await self.navigator.clearAppBadge();}catch{}
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of clients)client.postMessage({type:'rudelbar-push'});
 })());
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();event.waitUntil((async()=>{
  const target=new URL(event.notification.data?.url||'/',self.location.origin);if(target.origin!==self.location.origin)return;
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of windows){const current=new URL(client.url);if(current.pathname===target.pathname&&current.searchParams.get('abend')===target.searchParams.get('abend')&&current.searchParams.get('s')===target.searchParams.get('s')){await client.focus();if(event.notification.data?.id)client.postMessage({type:'rudelbar-open-request',id:event.notification.data.id});return;}}
  await self.clients.openWindow(target.href);
 })());
});
