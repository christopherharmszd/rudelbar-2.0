import test from 'node:test';import assert from 'node:assert/strict';
import {exportResourcesCsv,previewResourcesImport} from '../../shared/resources-csv.mjs';
import {cleanResources,sourceObjects} from '../../shared/resources.mjs';
const sources=sourceObjects({games:[{id:'game',name:'Spiel'}]}),requestKey='12345678-1234-1234-1234-123456789012';
const fixture=()=>({...cleanResources({nodes:[{id:'stand',kind:'stand',name:'=FORMEL()',description:'Zwei\nZeilen; "genau"'},{id:'task',kind:'task',name:'Betreuung'}],relations:[{id:'offering',kind:'offers',from:'stand/stand',to:'games/game',values:{description:'',place:'Hier'}},{id:'required',kind:'requires',from:'games/game',to:'task/task'}]},sources),sources,revision:'r1',sourcesVersion:'s1'});
test('resource CSV roundtrip retains explicit blank overrides, references, multiline fields and formula-safe text',()=>{
 const current=fixture(),csv=exportResourcesCsv(current),result=previewResourcesImport(current,{csv,requestKey});
 assert.ok(csv.includes("'=FORMEL()"));assert.deepEqual(result.errors,[]);assert.deepEqual(result.model.nodes,current.nodes);assert.deepEqual(result.model.relations,current.relations);assert.equal(result.counts.unchanged,4);
 assert.equal(/passwort|session|email/i.test(csv),false);
});
test('import preview rejects broken cross references and duplicate rows without changing current records',()=>{
 const current=fixture(),csv=exportResourcesCsv(current),before=JSON.stringify(current);
 const broken=previewResourcesImport(current,{csv:csv.replaceAll('games/game','games/missing'),requestKey});assert.ok(broken.errors.length);assert.equal(broken.model,null);
 const duplicate=previewResourcesImport(current,{csv:csv+csv.split('\r\n')[1]+'\r\n',requestKey});assert.ok(duplicate.errors.some(e=>e.message.includes('mehrfach')));assert.equal(JSON.stringify(current),before);
});
