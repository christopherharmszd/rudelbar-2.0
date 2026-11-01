import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_CATALOG,cleanCatalog,cleanExperience,defaultExperience,publicExperience,programFor} from '../../shared/experience.mjs';
import worker from '../worker.mjs';

test('event selection validates resources, capacities, money and enabled program responsibilities',()=>{
  const catalog=cleanCatalog(DEFAULT_CATALOG),input=defaultExperience('test-abend');
  input.equipment=[{id:'kicker-1',capacity:4,place:'Links vom Wagen',host:'Martin'},{id:'kicker-2',capacity:4,place:'Im Zelt',host:'Nora'}];
  input.menu=[{id:'wasser',priceCents:175}];
  const valid=cleanExperience(input,catalog,'test-abend');
  assert.equal(valid.equipment.length,2);assert.equal(valid.menu[0].priceCents,175);
  assert.throws(()=>cleanExperience({...input,equipment:[{...input.equipment[0],capacity:31}]},catalog,'test-abend'));
  assert.equal(cleanExperience({...input,equipment:[{...input.equipment[0],hostId:''}]},catalog,'test-abend').equipment[0].hostId,'');
  assert.throws(()=>cleanExperience({...input,menu:[{id:'wasser',priceCents:1.5}]},catalog,'test-abend'));
  assert.throws(()=>cleanExperience({...input,menu:[{id:'missing'}]},catalog,'test-abend'));
  assert.throws(()=>cleanExperience({...input,equipment:[input.equipment[0],input.equipment[0]]},catalog,'test-abend'));
  assert.throws(()=>cleanExperience({...input,program:[{id:'dj',time:'19 Uhr',hostId:'unknown-person'}]},catalog,'test-abend'));
  const archived=structuredClone(catalog);archived.equipment[0].archived=true;
  assert.throws(()=>cleanExperience(input,archived,'test-abend'));
  assert.equal(valid.equipment[0].name,'Kicker 1');
  catalog.equipment[0].name='Umbenannt';assert.equal(valid.equipment[0].name,'Kicker 1','published snapshots are independent from the catalog');
});

test('only published valid events become public, with no editorial metadata',()=>{
  const event={_id:'test-abend',title:'Rudelbar',date:'2026-11-01',venue:'Scharnebeck',time:'18 Uhr'};
  const doc={...defaultExperience(event._id),_id:'app-test',_rev:'rev',privateField:'private'};
  assert.equal(publicExperience({...doc,_id:'drafts.app-test'},event),null);
  assert.equal(publicExperience(doc,{...event,_id:'drafts.test-abend'}),null);
  assert.equal(publicExperience(doc,{...event,archived:true}),null);
  assert.equal(publicExperience(doc,{...event,_id:'other'}),null);
  assert.equal(publicExperience({...doc,enabled:false},event),null);
  assert.equal(publicExperience(doc,event).privateField,undefined);
});

test('visitor endpoint delegates to the private content binding and rejects invalid identifiers',async()=>{
  let calls=0;
  const env={ASSETS:{fetch:()=>new Response('app')},CONTENT:{getExperience:async input=>{calls++;assert.equal(input.eventId,'test-abend');assert.equal(input.accessCode,'private-link');return {status:200,state:'closed',event:{title:'Testabend'},experience:null};}}};
  const request=new Request('https://app.example/api/experience?abend=test-abend&zugang=private-link');
  const result=await worker.fetch(request,env);assert.equal(result.status,200);assert.equal((await result.json()).state,'closed');
  assert.equal((await worker.fetch(new Request('https://app.example/api/experience?abend=drafts.test'),env)).status,400);assert.equal(calls,1);
  assert.equal((await worker.fetch(new Request('https://app.example/api/experience',{method:'POST'}),env)).status,405);
  assert.equal((await worker.fetch(request,{ASSETS:env.ASSETS})).status,503);
});

 test('custom programs and custom categories survive saving and legacy evenings remain readable',()=>{
  const library=cleanCatalog({...DEFAULT_CATALOG,program:[{id:'village-quiz',name:'Das Dorfquiz',category:'Nachbarschaft',description:'Rätseln im Team.',kind:'other'}]});
  const config=cleanExperience({...defaultExperience('quiz-abend'),program:[{id:'village-quiz',time:'20 Uhr',host:'Chris',place:'Unter dem Pavillon'}]},library,'quiz-abend');
  assert.equal(config.program[0].name,'Das Dorfquiz');assert.equal(config.program[0].category,'Nachbarschaft');
  assert.equal(config.program[0].time,'20 Uhr');
  const old={modules:{karaoke:{enabled:true,title:'Unser Mikro',time:'21 Uhr',host:'Pat'}}};
  assert.equal(programFor(old)[0].kind,'karaoke');
  assert.equal(programFor({...old,program:[]}).length,0,'an explicit empty program stays empty');
 });
