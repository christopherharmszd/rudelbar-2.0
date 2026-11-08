import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../previews/brand-2026-11-08/',import.meta.url);
const {files}=JSON.parse(await readFile(new URL('revision-locks.json',root),'utf8'));
for(const [name,expected] of Object.entries(files)){
  const actual=createHash('sha256').update(await readFile(new URL(name,root))).digest('hex');
  if(actual!==expected)throw new Error('Archivstand oder gemeinsames Asset verändert: '+name);
}
console.log(Object.keys(files).length+' archivierte Dateien und Assets geprüft.');
