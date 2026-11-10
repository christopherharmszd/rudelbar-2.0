import {cp,mkdir} from 'node:fs/promises';

// Both workers ship the same source and local licensed fonts. No external font CDN.
export async function prepareBrand(){
 const source=new URL('../shared/brand/',import.meta.url);
 for(const directory of ['../admin/public/brand/','../event-app/public/brand/']){
  const target=new URL(directory,import.meta.url);
  await mkdir(target,{recursive:true});
  await cp(source,target,{recursive:true});
 }
}
if(import.meta.url===new URL(process.argv[1],'file://').href)await prepareBrand();
