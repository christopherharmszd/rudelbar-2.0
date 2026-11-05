export const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
export const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
export const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export const cleanText=(value,max,required=false)=>{const v=String(value??'').trim();if(v.length>max||required&&!v)fail('Bitte die erforderlichen Angaben vollständig ausfüllen.');return v;};
export function cleanEmail(value){const email=cleanText(value,254,true).toLowerCase();if(!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email))fail('Bitte eine gültige E-Mail-Adresse angeben.');return email;}
export const accountCookie=(token,age=28800)=>`rb_account=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${age}`;
export const cookieValue=(request,name)=>(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1)||'';
