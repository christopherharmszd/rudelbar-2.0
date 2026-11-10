import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from '../worker.mjs';
import {APP_ICONS} from '../../shared/app-icons.mjs';

test('installation manifest keeps the private evening link and uses opaque icons at declared sizes',async()=>{
 const response=await worker.fetch(new Request('https://app.example/api/manifest?abend=private-evening&zugang=invitation'),{CONTENT:{getExperience:async args=>{assert.equal(args.accessCode,'invitation');return {status:200,state:'open',experience:{eventId:args.eventId}};}}});
 assert.equal(response.status,200);
 const manifest=await response.json();assert.equal(manifest.start_url,'/?abend=private-evening&zugang=invitation');
 assert.deepEqual(manifest.icons,APP_ICONS);
 for(const icon of manifest.icons){
  const file=await readFile(new URL('../../shared'+icon.src.replace('/brand/','/brand/'),import.meta.url));
  const [width,height]=icon.sizes.split('x').map(Number);
  assert.equal(file.readUInt32BE(16),width);assert.equal(file.readUInt32BE(20),height);
  assert.equal(file[25],2,'PNG must be RGB without transparency');
 }
});
test('local image previews are permitted without extending script or network permissions',async()=>{
 const headers=await readFile(new URL('../public/_headers',import.meta.url),'utf8');
 assert.match(headers,/img-src[^;]*blob:/);
 assert.match(headers,/script-src 'self';/);
 assert.match(headers,/connect-src 'self';/);
 assert.match(headers,/object-src 'none';/);
});
