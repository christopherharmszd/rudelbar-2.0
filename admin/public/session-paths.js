// Shared by browser entry points and the OIDC callback. Never accept arbitrary return URLs.
export function safeReturnPath(value,fallback='/backstage'){
 if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u0020]/.test(value))return fallback;
 try{
  const url=new URL(value,'https://rudelbar.invalid');
  if(url.origin!=='https://rudelbar.invalid'||!['/','/index.html','/backstage','/backstage.html','/abendplan','/abendplan.html','/live','/live.html','/team','/team.html'].includes(url.pathname))return fallback;
  if(url.hash&&!/^#[a-z0-9/_-]*$/i.test(url.hash))return fallback;
  const query=new URLSearchParams();
  for(const key of ['abend','s','station','anfrage','backstage']){const item=url.searchParams.get(key);if(item&&/^[a-z0-9-]{1,100}$/i.test(item))query.set(key,item);}
  return url.pathname+(query.size?'?'+query.toString():'')+url.hash;
 }catch{return fallback;}
}
export const signInPath=target=>'/anmelden?weiter='+encodeURIComponent(safeReturnPath(target));
