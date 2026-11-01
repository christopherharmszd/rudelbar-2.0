import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
const source=`import {passwordRecord,verifyPassword} from './lib/passwords.mjs';
import {encryptMailPassword} from './lib/account-mail.mjs';
export default {async fetch(){const secret='runtime-only-secret-with-more-than-32-characters',password='Runtime-only-long-password!';
 const record=await passwordRecord(secret,password),encrypted=await encryptMailPassword(secret,'runtime-only-mail-password');
 return Response.json({correct:await verifyPassword(secret,password,record),wrong:await verifyPassword(secret,'other-long-password-value',record),unknown:await verifyPassword(secret,password,null),pepper:await verifyPassword(secret+'changed',password,record),encrypted:encrypted.includes('.')&&!encrypted.includes('runtime-only-mail-password')});}};`;
const bundled=await build({stdin:{contents:source,resolveDir:new URL('../',import.meta.url).pathname,sourcefile:'password-runtime.mjs'},bundle:true,write:false,format:'esm',platform:'browser'});
const mf=new Miniflare({workers:[{config:{name:'password-runtime',compatibilityDate:'2026-09-28',manifest:{mainModule:'index.mjs',modules:{'index.mjs':{type:'esm',contents:bundled.outputFiles[0].text}}}}}]});
try{assert.deepEqual(await(await mf.dispatchFetch('https://runtime.test')).json(),{correct:true,wrong:false,unknown:false,pepper:false,encrypted:true});console.log('Cloudflare runtime: personal password hashing, verification and mailbox encryption pass.');}finally{await mf.dispose();}
