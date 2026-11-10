import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import {prepareBrand} from '../scripts/prepare-brand.mjs';
await prepareBrand();
await writeFile(new URL('./public/station-actions.js',import.meta.url),await readFile(new URL('../shared/station-actions.mjs',import.meta.url)));
await writeFile(new URL('./public/wall-model.js',import.meta.url),await readFile(new URL('../shared/wall.mjs',import.meta.url)));
await writeFile(new URL('./public/raffle-model.js',import.meta.url),await readFile(new URL('../shared/raffle.mjs',import.meta.url)));
await writeFile(new URL('./public/encounters-model.js',import.meta.url),await readFile(new URL('../shared/encounters.mjs',import.meta.url)));
await cp(new URL('../admin/public/sheets.css',import.meta.url),new URL('./public/sheets.css',import.meta.url));
const source=new URL('./public/',import.meta.url),target=new URL('../admin/public/abend-preview/',import.meta.url);
await mkdir(target,{recursive:true});
for(const name of ['brand','station-actions.js','sheets.css','compact-jpeg.js','encounters-model.js','guest-encounters.js','pair-chat.js','encounters.css','raffle-model.js','guest-raffle.js','guest-wall.js','wall-view.js','wall-model.js','wall.css','guest-social.js','guest-analytics.js','game-rounds.js','village-map.js','village-map.css','map-geometry.js','map-illustrations.js','guest-map.js','app.js','guest-live.js','notifications.js','notification-setup.js','notifications.css','styles.css','assets'])await cp(new URL(name,source),new URL(name,target),{recursive:true});
const html=(await readFile(new URL('index.html',source),'utf8')).replaceAll('"/assets/','"/abend-preview/assets/').replaceAll('"/brand/','"/abend-preview/brand/').replace('"/sheets.css','"/abend-preview/sheets.css').replace('"/styles.css','"/abend-preview/styles.css').replace('"/encounters.css','"/abend-preview/encounters.css').replace('"/wall.css','"/abend-preview/wall.css').replace('"/app.js','"/abend-preview/app.js').replace('"/village-map.css','"/abend-preview/village-map.css').replace('"/notifications.css','"/abend-preview/notifications.css');
await writeFile(new URL('index.html',target),html);
console.log('Native Entwurfsvorschau für die Redaktion aktualisiert.');

for(const name of ['notifications.js','notification-setup.js','notifications.css','sw.js'])await cp(new URL(name,source),new URL('../admin/public/'+name,import.meta.url));
