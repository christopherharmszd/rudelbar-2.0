// A second tab may renew the same login while a form remains open. Retry only a
// server-confirmed CSRF rejection, before any write, and only for the same actor.
export function createSessionApi({getUser,setUser,onExpired,fetcher=fetch}){
 let refreshing;
 async function refresh(actor){
  refreshing??=(async()=>{const response=await fetcher('/api/session',{credentials:'same-origin',cache:'no-store'});if(!response.ok)return null;return (await response.json()).user;})().finally(()=>{refreshing=null;});
  const user=await refreshing;if(!user||user.id!==actor)throw Object.assign(new Error('Die Anmeldung wurde in einem anderen Fenster geändert. Deine Eingaben bleiben erhalten. Bitte öffne diesen Bereich mit dem gewünschten Konto erneut.'),{status:403});setUser(user);return user;
 }
 return async function api(path,method='GET',body){
  const actor=getUser()?.id,encoded=body!==undefined?JSON.stringify(body):undefined;
  for(let attempt=0;attempt<2;attempt++){
   const user=getUser(),response=await fetcher(path,{method,credentials:'same-origin',cache:'no-store',headers:{...(user?{'X-CSRF-Token':user.csrf}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},body:encoded}),value=await response.json();
   if(response.status===403&&value.code==='csrf_stale'&&actor&&attempt===0&&method!=='GET'){await refresh(actor);continue;}
   if(response.status===401&&path!=='/api/login'){onExpired();throw Object.assign(new Error('Bitte erneut anmelden.'),{status:401});}
   if(!response.ok)throw Object.assign(new Error(value.error||'Die Aktion konnte nicht abgeschlossen werden.'),{status:response.status});return value;
  }
 };
}
