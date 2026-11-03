export function liveApiPath(path,{eventId='',sessionKey=''}={}){
 const [route,...parts]=String(path).split(/[?&]/);
 if(!/^\/[a-z0-9/-]+$/i.test(route))throw Error('Ungültiger Live-Aufruf.');
 const query=new URLSearchParams(parts.join('&'));
 query.delete('abend');query.delete('s');
 if(eventId)query.set('abend',eventId);
 if(sessionKey)query.set('s',sessionKey);
 return '/api/live'+route+(query.size?'?'+query.toString():'');
}
