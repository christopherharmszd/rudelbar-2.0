import {mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';

// Deterministic app assets, using the unchanged original logo and the website's
// existing Sharp pipeline. Install app/ dependencies before regenerating.
const sharp=createRequire(new URL('../app/package.json',import.meta.url))('sharp');
const source=new URL('../event-app/public/assets/rudelbar-logo.png',import.meta.url);
const target=new URL('../shared/brand/images/',import.meta.url);
await mkdir(target,{recursive:true});
for(const size of [180,192,512]){
 await sharp(source.pathname).resize(size,size,{fit:'contain'}).flatten({background:'#0D0D0D'}).removeAlpha().png().toFile(new URL(`rudelbar-app-${size}-v2.png`,target).pathname);
}
const masked=await sharp(source.pathname).resize(400,400).toBuffer();
await sharp({create:{width:512,height:512,channels:3,background:'#0D0D0D'}}).composite([{input:masked,left:56,top:56}]).removeAlpha().png().toFile(new URL('rudelbar-app-maskable-512-v2.png',target).pathname);
const logo=await sharp(source.pathname).resize(510,510).toBuffer();
await sharp({create:{width:1200,height:630,channels:3,background:'#0D0D0D'}}).composite([{input:logo,left:345,top:60}]).removeAlpha().jpeg({quality:94,mozjpeg:true}).toFile(new URL('rudelbar-share-black-v2.jpg',target).pathname);
console.log('Opaque app icons and sharing image prepared from the original logo.');
