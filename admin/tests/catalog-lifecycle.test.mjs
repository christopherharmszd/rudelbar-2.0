import test from 'node:test';
import assert from 'node:assert/strict';
import {changeCatalogLifecycle} from '../lib/catalog-lifecycle.mjs';
import {catalogFor} from '../lib/abend-service.mjs';
import {CATALOG_ID,DEFAULT_CATALOG,cleanCatalog} from '../../shared/experience.mjs';
const editor={accountId:'editor',roles:[{role:'editor'}]};
function setup(){
 const docs=new Map([['drafts.'+CATALOG_ID,{_id:'drafts.'+CATALOG_ID,_type:'rudelAppCatalog',_rev:'initial',...cleanCatalog(DEFAULT_CATALOG)}]]);
 const client={getDocument:async id=>docs.get(id),list:async type=>[...docs.values()].filter(d=>d._type===type),savePrivate:async(type,id,fields,revision)=>{const previous=docs.get('drafts.'+id);if(previous._rev!==revision)throw Object.assign(new Error('Conflict'),{status:409});const next={...previous,...fields,_rev:crypto.randomUUID()};docs.set(next._id,next);return next;}};
 return {docs,client};
}
test('individual offers can move to trash and be restored while other categories and products stay unchanged',async()=>{
 const s=setup(),before=await catalogFor(s.client),deleted=await changeCatalogLifecycle(s.client,editor,'drinks','wasser',{revision:before.revision},'delete');
 assert.ok(deleted.catalog.drinks.find(r=>r.id==='wasser').deletedAt);assert.equal(deleted.catalog.drinks.find(r=>r.id==='wasser').archived,true);
 for(const kind of ['equipment','games','program'])assert.deepEqual(deleted.catalog[kind],before[kind]);
 assert.deepEqual(deleted.catalog.drinks.filter(r=>r.id!=='wasser'),before.drinks.filter(r=>r.id!=='wasser'));
 const roundTrip=cleanCatalog(deleted.catalog);assert.ok(roundTrip.drinks.find(r=>r.id==='wasser').deletedAt,'an unrelated catalog edit retains trash state');
 await assert.rejects(()=>changeCatalogLifecycle(s.client,editor,'drinks','wasser',{revision:before.revision},'restore'),e=>e.status===409);
 const restored=await changeCatalogLifecycle(s.client,editor,'drinks','wasser',{revision:deleted.catalog.revision},'restore');assert.ok(!restored.catalog.drinks.find(r=>r.id==='wasser').deletedAt);assert.equal(restored.catalog.drinks.find(r=>r.id==='wasser').archived,true);
});
test('offers assigned to an existing evening are protected, while archived example evenings do not block deletion',async()=>{
 const s=setup(),catalog=await catalogFor(s.client),event={_id:'drafts.event',_type:'rudelAppEvent',eventId:'event',title:'Unser Abend',date:'2026-12-01',teamIds:[]};s.docs.set(event._id,event);
 s.docs.set('drafts.config',{_id:'drafts.config',_type:'rudelAppExperience',eventId:'event',program:[{id:'dj'}]});
 await assert.rejects(()=>changeCatalogLifecycle(s.client,editor,'program','dj',{revision:catalog.revision},'delete'),e=>e.status===409&&e.message.includes('Unser Abend'));
 assert.ok(!(await catalogFor(s.client)).program.find(r=>r.id==='dj').deletedAt);
 s.docs.set(event._id,{...event,archived:true});const result=await changeCatalogLifecycle(s.client,editor,'program','dj',{revision:catalog.revision},'delete');assert.ok(result.catalog.program.find(r=>r.id==='dj').deletedAt);assert.ok(s.docs.has('drafts.config'),'historical evening data remains available');
});
test('restricted station roles cannot delete offers and unknown records are not silently accepted',async()=>{
 const s=setup();await assert.rejects(()=>changeCatalogLifecycle(s.client,{accountId:'station',roles:[{role:'station',eventId:'event'}]},'drinks','wasser',{revision:'initial'},'delete'),e=>e.status===403);
 await assert.rejects(()=>changeCatalogLifecycle(s.client,editor,'drinks','missing',{revision:'initial'},'delete'),e=>e.status===404);
});
