import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanResources,resolveResources,sourceObjects,resourceSelection} from '../../shared/resources.mjs';
import {createResources,RESOURCE_NODE_TYPE,RESOURCE_RELATION_TYPE,RESOURCE_STATE_ID} from '../lib/resources.mjs';
import {experienceApi} from '../lib/experience-api.mjs';
import {CATALOG_ID} from '../../shared/experience.mjs';
const people=[{personId:'one',name:'Gleicher Name',revision:'p1'},{personId:'two',name:'Gleicher Name',revision:'p2'}];
const catalog={revision:'c1',equipment:[],games:[{id:'poker',name:'Poker',capacity:6,minutes:45,description:'Zentrale Regeln'}],program:[],drinks:[]};
const sources=()=>sourceObjects(catalog,people);
const node=(kind,id,extra={})=>({kind,id,name:id,...extra});
const edge=(kind,id,from,to,extra={})=>({kind,id,from,to,...extra});
function graph(){return {nodes:[node('stand','north'),node('stand','south'),node('task','host',{required:true})],relations:[
 edge('offers','poker-north','stand/north','games/poker',{values:{capacity:4}}),
 edge('offers','poker-south','stand/south','games/poker'),
 edge('supports','poker-rounds','games/poker','function/game'),
 edge('requires','poker-host','games/poker','task/host'),
 edge('assignment','default-host','task/host','person/one')
]};}
test('one central content supports independent occurrences; provenance preserves explicit empty overrides',()=>{
 const input=graph(),r=resolveResources(input,sources(),{overrides:[{occurrenceId:'poker-north',values:{capacity:2,description:''}}]});
 assert.equal(r.ok,true);assert.equal(r.occurrences.length,2);
 assert.equal(r.occurrences[0].capacity,2);assert.equal(r.occurrences[1].capacity,6);
 assert.equal(r.occurrences[0].description,'');assert.equal(r.occurrences[1].description,'Zentrale Regeln');
 assert.deepEqual(r.occurrences[0].provenance.capacity.map(p=>p.source),['games/poker','poker-north','evening']);
 assert.equal(r.occurrences[0].tasks[0].personIds[0],'one');
 assert.equal(input.relations[0].values.capacity,4);
 assert.deepEqual(resourceSelection(r.selection,cleanResources(input,sources())),r.selection);
 const sameStand=graph();sameStand.relations.push(edge('offers','poker-north-late','stand/north','games/poker',{window:{start:600,end:700}}));
 assert.equal(resolveResources(sameStand,sources()).occurrences.length,3);
});
test('general staffing, scoped staffing and evening override resolve without granting permissions',()=>{
 const input=graph();input.relations.push(edge('assignment','north-host','task/host','person/two',{scope:'stand/north'}));
 let r=resolveResources(input,sources());
 assert.deepEqual(r.occurrences.map(o=>o.tasks[0].personIds),[['two'],['one']]);
 r=resolveResources(input,sources(),{overrides:[{occurrenceId:'poker-north',staffing:[{taskId:'host',mode:'assigned',personIds:['one']}]}]});
 assert.deepEqual(r.occurrences[0].tasks[0].personIds,['one']);assert.equal(r.occurrences[0].tasks[0].source[0],'evening');
 assert.equal(JSON.stringify(r).includes('password'),false);assert.equal('roles' in r.occurrences[0].tasks[0],false);
});
test('unattended stops inheritance while an unassigned required task blocks release',()=>{
 const input=graph();input.relations=input.relations.filter(r=>r.kind!=='assignment');
 assert.equal(resolveResources(input,sources()).ok,false);
 const r=resolveResources(input,sources(),{overrides:[{occurrenceId:'poker-north',staffing:[{taskId:'host',mode:'unattended'}]}],occurrenceIds:['poker-north']});
 assert.equal(r.ok,true);assert.equal(r.occurrences[0].tasks[0].mode,'unattended');
 assert.deepEqual(r.occurrences[0].tasks[0].personIds,[]);
 assert.throws(()=>resolveResources(input,sources(),{overrides:[{occurrenceId:'poker-north',staffing:[{taskId:'host',mode:'unattended',personIds:['one']}]}]}));
});
test('equal-specificity conflicts are stable under relationship ordering, not last writer wins',()=>{
 const input=graph();input.relations.push(
  edge('assignment','north-person','task/host','person/one',{scope:'stand/north'}),
  edge('assignment','game-person','task/host','person/two',{scope:'function/game'})
 );
 const r=resolveResources(input,sources()),reversed=resolveResources({...input,relations:[...input.relations].reverse()},sources());
 assert.equal(r.ok,false);assert.ok(r.issues.some(i=>i.code==='staffing-conflict'));
 assert.deepEqual(r.issues.map(i=>i.message).sort(),reversed.issues.map(i=>i.message).sort());
});
test('archived people, unavailable functions and stale references fail closed',()=>{
 const input=graph(),archived=sources().map(s=>s.key==='person/one'?{...s,archived:true}:s);
 assert.equal(resolveResources(input,archived).ok,false);
 input.relations.push(edge('supports','dating','games/poker','function/dating'));
 assert.ok(resolveResources(input,sources()).issues.some(i=>i.code==='function-unavailable'));
 assert.equal(resolveResources(input,sources(),{disabledFunctions:['dating']}).ok,true);
 input.relations.push(edge('assignment','missing','task/host','person/missing'));
 assert.throws(()=>cleanResources(input,sources()),/nicht mehr vorhanden/);
});
test('physical inventory is checked across overlapping occurrences; adjacent windows are allowed',()=>{
 const input=graph();input.nodes.push(node('asset','cards',{quantity:1}));input.relations.push(edge('needs','poker-cards','games/poker','asset/cards'));
 assert.ok(resolveResources(input,sources()).issues.some(i=>i.code==='resource-overbooked'));
 input.relations[0].window={start:0,end:60};input.relations[1].window={start:60,end:120};
 assert.equal(resolveResources(input,sources()).ok,true);
 input.relations[1].window={start:59,end:120};
 assert.equal(resolveResources(input,sources()).ok,false);
 input.relations[0].window={start:1320,end:1500};input.relations[1].window={start:1440,end:1560};
 assert.equal(resolveResources(input,sources()).ok,false);
});
test('typed relationships reject wrong endpoints, duplicate assignments and unknown modes',()=>{
 const input=graph();input.relations.push(edge('supports','bad','stand/north','function/music'));
 assert.throws(()=>cleanResources(input,sources()),/nicht verbunden/);
 const duplicate=graph();duplicate.relations.push({...duplicate.relations.at(-1),id:'duplicate'});
 assert.throws(()=>cleanResources(duplicate,sources()),/doppelt/);
 assert.throws(()=>resolveResources(graph(),sources(),{standIds:['missing']}));
 assert.throws(()=>cleanResources({...graph(),nodes:[node('admin','role')]}));
});
function fixture(){
 const docs=new Map(),client={
  getDocument:async id=>structuredClone(docs.get(id)||null),
  list:async type=>[...docs.values()].filter(d=>d._type===type).map(d=>structuredClone(d)),
  async commitPrivate(changes){
   const next=new Map(docs);
   for(const c of changes){const key='drafts.'+c.id,old=next.get(key);if(c.revision?old?._rev!==c.revision:!!old)throw Object.assign(new Error('conflict'),{status:409});next.set(key,{...structuredClone(c.fields),_id:key,_type:c.type,_rev:crypto.randomUUID()});}
   docs.clear();for(const [k,v]of next)docs.set(k,v);
  }
 };
 docs.set('drafts.'+CATALOG_ID,{...catalog,games:catalog.games.map(g=>({...g,category:'Spiele'})),_type:'rudelAppCatalog',_rev:'c1'});
 for(const p of people)docs.set('drafts.'+p.personId,{...p,_type:'rudelAppPerson',_rev:p.revision});
 return {docs,client,service:createResources(client)};
}
const admin={legacy:true},station={accountId:'s',roles:[{role:'station',eventId:'e'}]};
test('each object and relationship is stored independently with atomic revision guards',async()=>{
 const f=fixture(),before=await f.service.load();
 const saved=await f.service.save(admin,{...graph(),revision:before.revision,sourcesVersion:before.sourcesVersion});
 assert.equal(saved.nodes.length,3);assert.equal(saved.relations.length,5);
 assert.equal([...f.docs.values()].filter(d=>d._type===RESOURCE_NODE_TYPE).length,3);
 assert.equal([...f.docs.values()].filter(d=>d._type===RESOURCE_RELATION_TYPE).length,5);
 assert.ok(f.docs.has('drafts.'+RESOURCE_STATE_ID));
 assert.equal((await f.service.preview(admin,{})).ok,true);
 const unchanged=await f.service.save(admin,saved);assert.equal(unchanged.revision,saved.revision);
 await assert.rejects(()=>f.service.save(admin,{...graph(),revision:before.revision,sourcesVersion:before.sourcesVersion}),e=>e.status===409);
 assert.equal((await f.service.load()).revision,saved.revision);
});
test('source changes invalidate stale edits; matching names never merge identities',async()=>{
 const f=fixture(),before=await f.service.load();
 assert.equal(before.sources.filter(s=>s.kind==='person').length,2);
 assert.equal(before.sources.some(s=>'email'in s||'phone'in s),false);
 f.docs.get('drafts.'+CATALOG_ID)._rev='c2';
 await assert.rejects(()=>f.service.save(admin,{...graph(),revision:before.revision,sourcesVersion:before.sourcesVersion}),e=>e.status===409);
 assert.equal([...f.docs.values()].filter(d=>d._type===RESOURCE_NODE_TYPE).length,0);
});
test('concurrent resource edits commit a whole revision or nothing',async()=>{
 const f=fixture(),empty=await f.service.load();
 const original=await f.service.save(admin,{...graph(),revision:empty.revision,sourcesVersion:empty.sourcesVersion});
 const a=structuredClone(original),b=structuredClone(original);a.nodes[0].description='A';b.nodes[0].description='B';
 const results=await Promise.allSettled([f.service.save(admin,a),f.service.save(admin,b)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
 const next=await f.service.load();assert.ok(['A','B'].includes(next.nodes[0].description));
 assert.equal(next.nodes.length,original.nodes.length);assert.equal(next.relations.length,original.relations.length);
});
test('new endpoints require editorial permission and existing mutation authorization',async()=>{
 const f=fixture(),json=(status,value)=>Response.json(value,{status}),data=r=>r.json();
 const request=(method='GET')=>new Request('https://app.example/api/abend/resources',{method,...(method==='PUT'?{body:'{}'}:{})});
 const base={client:f.client,json,data,session:async()=>station,authorized:async()=>({})};
 await assert.rejects(()=>experienceApi(request(),{},base),e=>e.status===403);
 const unauth=await experienceApi(request(),{},{...base,session:async()=>null});assert.equal(unauth.status,401);
 const denied=await experienceApi(request('PUT'),{},{...base,session:async()=>admin,authorized:async()=>({error:json(403,{error:'csrf'})})});assert.equal(denied.status,403);
 const response=await experienceApi(request(),{},{...base,session:async()=>admin});assert.equal(response.status,200);
});
