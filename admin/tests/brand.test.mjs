import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {prepareBrand} from '../../scripts/prepare-brand.mjs';

const root=new URL('../../',import.meta.url);
const text=path=>readFile(new URL(path,root),'utf8');
const luminance=hex=>{
 const rgb=hex.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
};
const contrast=(a,b)=>{const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (values[0]+.05)/(values[1]+.05);};

test('shared brand assets retain their licensed fonts on both worker surfaces',async()=>{
 await prepareBrand();
 for(const file of ['brand.css','fonts/bitter-latin-variable.woff2','fonts/bitter-latin-ext-variable.woff2','fonts/source-sans-3-latin-variable.woff2','fonts/source-sans-3-latin-ext-variable.woff2','fonts/OFL-Bitter.txt','fonts/OFL-Source-Sans-3.txt']){
  const original=await readFile(new URL('shared/brand/'+file,root));
  for(const surface of ['admin','event-app'])assert.deepEqual(await readFile(new URL(surface+'/public/brand/'+file,root)),original);
  if(file.endsWith('.woff2'))assert.equal(original.subarray(0,4).toString(),'wOF2');
 }
});
test('brand palette has legible text, controls and allowed functional signals',async()=>{
 const css=await text('shared/brand/brand.css');
 const tokens=Object.fromEntries([...css.matchAll(/--rb-([\w-]+):#([\da-f]{6})/gi)].map(m=>[m[1],m[2]]));
 assert.equal(tokens.gold.toUpperCase(),'FDC300');
 assert.equal(tokens.night.toUpperCase(),'0D0D0D');
 for(const background of ['night','surface']){
  for(const foreground of ['text','muted','error','warning'])assert.ok(contrast(tokens[foreground],tokens[background])>=4.5,foreground+' on '+background);
  assert.ok(contrast(tokens['control-border'],tokens[background])>=3,'field boundary on '+background);
 }
 assert.ok(contrast(tokens.night,tokens.gold)>=7);
 assert.ok(contrast(tokens.night,tokens['gold-pressed'])>=7);
 assert.ok(!css.includes('fonts.googleapis.com'));
});
test('guest and current internal entry points load the shared brand before their components',async()=>{
 for(const path of ['event-app/public/index.html','event-app/public/kontakte.html','event-app/public/wall.html','admin/public/backstage.html','admin/public/anmelden.html','admin/public/einladung.html','admin/public/live.html','admin/public/team.html']){
  const html=await text(path),brand=html.indexOf('/brand/brand.css');
  assert.ok(brand>0,path);
  assert.ok(brand<html.indexOf('.css'),path+' has a component before brand');
  assert.ok(!html.includes('RUDEL BAR')&&!html.includes('DIE MOBILE KNEIPE'),path);
 }
 const prepare=await text('event-app/prepare.mjs');
 assert.ok(prepare.includes('"/abend-preview/brand/'));
 assert.match(await text('event-app/wrangler.jsonc'),/"build"/);
});
