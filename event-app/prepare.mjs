import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
const source=new URL('./public/',import.meta.url),target=new URL('../admin/public/abend-preview/',import.meta.url);
await mkdir(target,{recursive:true});
for(const name of ['game-rounds.js','village-map.js','village-map.css','map-geometry.js','map-illustrations.js','guest-map.js','app.js','guest-live.js','notifications.js','notifications.css','styles.css','assets'])await cp(new URL(name,source),new URL(name,target),{recursive:true});
const html=(await readFile(new URL('index.html',source),'utf8')).replaceAll('"/assets/','"/abend-preview/assets/').replace('"/styles.css','"/abend-preview/styles.css').replace('"/app.js','"/abend-preview/app.js').replace('"/village-map.css','"/abend-preview/village-map.css').replace('"/notifications.css','"/abend-preview/notifications.css');
await writeFile(new URL('index.html',target),html);
console.log('Native Entwurfsvorschau für die Redaktion aktualisiert.');

for(const name of ['notifications.js','notifications.css','sw.js'])await cp(new URL(name,source),new URL('../admin/public/'+name,import.meta.url));
