const encoder=new TextEncoder(),iterations=100_000;
const bytes=hex=>Uint8Array.from(hex.match(/../g)||[],v=>parseInt(v,16));
const hex=value=>Array.from(new Uint8Array(value),b=>b.toString(16).padStart(2,'0')).join('');
export function validPassword(password){return typeof password==='string'&&password.length>=16&&password.length<=1024;}
async function derive(secret,password,salt){
 // Domain-separated server pepper protects a copied database. The existing secret is never rotated here.
 const pepper=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const material=await crypto.subtle.sign('HMAC',pepper,encoder.encode('rudelbar-personal-password-v1:'+password));
 const key=await crypto.subtle.importKey('raw',material,'PBKDF2',false,['deriveBits']);
 return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:bytes(salt),iterations,hash:'SHA-256'},key,256));
}
export async function passwordRecord(secret,password){
 if(!validPassword(password))throw Object.assign(new Error('Bitte ein Passwort mit 16 bis 1024 Zeichen wählen. Ein längerer Satz eignet sich gut.'),{status:400});
 const salt=hex(crypto.getRandomValues(new Uint8Array(24)));
 return JSON.stringify({v:1,iterations,salt,hash:hex(await derive(secret,password,salt))});
}
export async function verifyPassword(secret,password,record){
 let parsed;try{parsed=JSON.parse(record);}catch{}
 const usable=parsed?.v===1&&parsed.iterations===iterations&&/^[a-f0-9]{48}$/.test(parsed.salt)&&/^[a-f0-9]{64}$/.test(parsed.hash);
 const candidate=await derive(secret,validPassword(password)?password:'invalid-password-input',usable?parsed.salt:'0'.repeat(48)),expected=bytes(usable?parsed.hash:'0'.repeat(64));
 let difference=0;for(let i=0;i<32;i++)difference|=candidate[i]^expected[i];
 return !!usable&&validPassword(password)&&difference===0;
}
