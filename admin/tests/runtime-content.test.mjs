import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {sqliteD1} from './sqlite-d1.mjs';
import {createRuntimeClient,createRuntimeProjection,synchronizeRuntimeContent} from '../lib/runtime-content.mjs';
import {createReleaseStore} from '../lib/release-store.mjs';
import {getVisitorExperience,peopleFor} from '../lib/abend-service.mjs';
import {createLiveService} from '../lib/live-service.mjs';
import {createSanity} from '../lib/sanity.mjs';
import {createContentClient} from '../lib/content-client.mjs';
import {defaultExperience} from '../../shared/experience.mjs';

const schema=(await Promise.all((await readdir(new URL('../migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort().map(n=>readFile(new URL('../migrations/'+n,import.meta.url),'utf8')))).join('\n');
async function fixture(){
 const db=sqliteD1();db.connection.exec(schema);
 const env={LIVE_DB:db,RUDELBAR_RUNTIME_CONTEXT:'1',RUDELBAR_CONNECTED_IDENTITY:'1',SANITY_DATASET:'staging',SANITY_WEBSITE_DATASET:'production'};
 const person={_id:'drafts.person-one',_type:'rudelAppPerson',_updatedAt:'2026-11-11T10:00:00Z',personId:'person-one',name:'Team',role:'DJ',archived:false};
 const event={_id:'drafts.rudel-app-event-evening',_type:'rudelAppEvent',eventId:'evening',title:'Abend',date:'2026-12-05',venue:'Ort',teamIds:['person-one'],visibility:'private',accessCode:'existing-private-code'};
 let sourceReads=0;
 const source={documents:async()=>{sourceReads++;return [person,event];},website:{documents:async()=>{sourceReads++;return [];}}};
 await synchronizeRuntimeContent(env,source);
 const config=defaultExperience('evening');
 await createReleaseStore(db).publish({eventId:'evening',action:'publish',operationKey:'publish-one',state:'open',config,eventSnapshot:{title:'Veröffentlichter Abend',venue:'Ort'},actor:'admin'});
 return {db,env,person,event,source,reads:()=>sourceReads,client:()=>createRuntimeClient(env),close:()=>db.connection.close()};
}

test('running guest and team contexts never read Sanity and preserve private access, publication and closing',async()=>{
 const s=await fixture();try{
  const originalFetch=globalThis.fetch;let network=0;globalThis.fetch=async()=>{network++;throw Error('Sanity is unavailable');};
  try{
   for(let i=0;i<20;i++){
    const result=await getVisitorExperience(s.client(),{eventId:'evening',accessCode:'existing-private-code'});
    assert.equal(result.status,200);assert.equal(result.state,'open');assert.equal(result.experience.event.title,'Veröffentlichter Abend');
    assert.equal(JSON.stringify(result).includes('existing-private-code'),false);
    assert.equal((await createLiveService(s.env,s.client()).publisher('evening')).ctx.people[0].name,'Team');
   }
   assert.equal(network,0);assert.equal(s.reads(),2);
   assert.equal((await getVisitorExperience(s.client(),{eventId:'evening',accessCode:'wrong'})).status,404);
   const store=createReleaseStore(s.db),release=await store.read('evening');await store.state({eventId:'evening',action:'close',operationKey:'close-one',expectedRevision:release.runtimeRevision,targetState:'closed'});
   assert.equal((await getVisitorExperience(s.client(),{eventId:'evening',accessCode:'existing-private-code'})).state,'closed');
  }finally{globalThis.fetch=originalFetch;}
 }finally{s.close();}
});

test('pending profile and event writes fail closed; a confirmed mirror immediately changes the next resolver',async()=>{
 const s=await fixture();try{
  const p=createRuntimeProjection(s.db,'staging'),token=await p.begin(s.person._id);
  assert.equal((await peopleFor(s.client())).length,0);
  await p.commit({...s.person,archived:true,_updatedAt:'2026-11-11T10:01:00Z'},token);
  assert.equal((await peopleFor(s.client()))[0].archived,true);
  const et=await p.begin(s.event._id);
  assert.equal((await getVisitorExperience(s.client(),{eventId:'evening',accessCode:'existing-private-code'})).status,503);
  await p.cancel(s.event._id,et);
  assert.equal((await getVisitorExperience(s.client(),{eventId:'evening',accessCode:'existing-private-code'})).status,200);
 }finally{s.close();}
});

test('a failed bootstrap preserves the entire previous generation and releases its write lock',async()=>{
 const s=await fixture();try{
  await assert.rejects(()=>synchronizeRuntimeContent(s.env,{documents:async()=>{throw Error('quota reached');},website:{documents:async()=>[]}}),/quota reached/);
  assert.equal((await peopleFor(s.client()))[0].name,'Team');
  const p=createRuntimeProjection(s.db,'staging'),t=await p.begin(s.person._id);await p.cancel(s.person._id,t);
  const other=sqliteD1();other.connection.exec(schema);
  try{await assert.rejects(()=>createRuntimeClient({...s.env,LIVE_DB:other}).list('rudelAppPerson'),e=>e.status===503);}finally{other.connection.close();}
 }finally{s.close();}
});

test('full synchronization cannot race an editorial write and never drops its pending protection',async()=>{
 const s=await fixture();try{
  const p=createRuntimeProjection(s.db,'staging'),token=await p.begin(s.person._id);
  await assert.rejects(()=>synchronizeRuntimeContent(s.env,s.source),e=>e.status===503);
  assert.equal((await peopleFor(s.client())).length,0);
  await p.cancel(s.person._id,token);
  let finish;const waiting=new Promise(r=>finish=r);
  const job=synchronizeRuntimeContent(s.env,{documents:async()=>{await waiting;return [s.person,s.event];},website:{documents:async()=>[]}});
  await new Promise(r=>setTimeout(r,0));await assert.rejects(()=>p.begin(s.person._id),e=>e.status===503);finish();await job;
 }finally{s.close();}
});

test('editorial duplicate reads coalesce only for their explicitly scoped client and a write invalidates them',async()=>{
 const originalFetch=globalThis.fetch;let reads=0;
 globalThis.fetch=async(url,options)=>{if(options.method==='POST')return Response.json({results:[]});reads++;return Response.json({result:{_id:'drafts.one',_type:'rudelAppPerson',_rev:'r'+reads,name:'Name'}});};
 try{
  const client=createSanity({projectId:'fixture',dataset:'staging',token:'local-only',memoizeReads:true});
  const values=await Promise.all([client.getDocument('drafts.one'),client.getDocument('drafts.one')]);assert.equal(reads,1);values[0].name='Changed';assert.equal(values[1].name,'Name');
  await client.savePrivate('rudelAppPerson','one',{name:'Updated'});assert.equal(reads,2);
  await createSanity({projectId:'fixture',dataset:'staging',token:'local-only',memoizeReads:true}).getDocument('drafts.one');assert.equal(reads,3);
 }finally{globalThis.fetch=originalFetch;}
});

test('bulk editorial writes mirror app metadata and ambiguous provider failures keep access closed',async()=>{
 const s=await fixture(),originalFetch=globalThis.fetch,docs=new Map([[s.person._id,s.person],[s.event._id,s.event]]);let uncertain=false;
 globalThis.fetch=async(url,options={})=>{
  const parsed=new URL(url);
  if(options.method==='POST'){
   for(const mutation of JSON.parse(options.body).mutations){const created=mutation.create||mutation.createIfNotExists;if(created)docs.set(created._id,{...created,_updatedAt:'2026-11-11T11:00:00Z'});if(mutation.patch){const p=mutation.patch;docs.set(p.id,{...docs.get(p.id),...p.set,_updatedAt:'2026-11-11T12:00:00Z'});}}
   if(uncertain)throw Error('Connection lost after source accepted write');return Response.json({results:[]});
  }
  return Response.json({result:docs.get(JSON.parse(parsed.searchParams.get('$id')))||null});
 };
 try{
  const client=()=>createContentClient({...s.env,SANITY_PROJECT_ID:'fixture',SANITY_EDITOR_TOKEN:'local-only'});
  await client().commitPrivate([{type:'rudelAppEvent',id:'new-evening',fields:{eventId:'second-evening',title:'Second',visibility:'private',accessCode:'code',teamIds:[]}}]);assert.equal((await s.client().event('second-evening')).title,'Second');
  uncertain=true;await assert.rejects(()=>client().savePrivate('rudelAppPerson','person-one',{archived:true}),/Connection lost/);assert.equal((await peopleFor(s.client())).length,0);assert.ok(s.db.connection.prepare('SELECT 1 FROM app_runtime_pending WHERE id=?').get(s.person._id));
 }finally{globalThis.fetch=originalFetch;s.close();}
});
