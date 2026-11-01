import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
const source=new URL('./public/',import.meta.url),target=new URL('../admin/public/abend-preview/',import.meta.url);
await mkdir(target,{recursive:true});
for(const name of ['app.js','guest-live.js','styles.css','assets'])await cp(new URL(name,source),new URL(name,target),{recursive:true});
const html=(await readFile(new URL('index.html',source),'utf8')).replaceAll('"/assets/','"/abend-preview/assets/').replace('"/styles.css','"/abend-preview/styles.css').replace('"/app.js','"/abend-preview/app.js');
await writeFile(new URL('index.html',target),html);
console.log('Native Entwurfsvorschau für die Redaktion aktualisiert.');
