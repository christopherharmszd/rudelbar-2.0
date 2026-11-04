import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanCatalog,defaultExperience,cleanExperience} from '../../shared/experience.mjs';
import {emptyMap} from '../../shared/village-map.mjs';
import {compileResourceExperience} from '../../shared/resource-experience.mjs';
import {visitorPayload} from '../lib/abend-service.mjs';
const people=[{personId:'host',name:'Internes Team',email:'private@example.invalid',archived:false}];
function fixture(){
 const catalog=cleanCatalog({equipment:[],games:[{id:'poker',name:'Poker',capacity:6,minutes:30,description:'Zentral'}],program:[{id:'music',name:'Musikzelt',kind:'dj',description:'Musik'}],drinks:[]});
 const model={nodes:[{id:'north',kind:'stand',name:'Nordzelt'},{id:'south',kind:'stand',name:'Südzelt'},{id:'host',kind:'task',name:'Betreuung',required:true}],relations:[
  {id:'north-poker',kind:'offers',from:'stand/north',to:'games/poker',values:{capacity:3}},
  {id:'south-poker',kind:'offers',from:'stand/south',to:'games/poker'},
  {id:'music',kind:'offers',from:'stand/north',to:'program/music'},
  {id:'round',kind:'supports',from:'games/poker',to:'function/game'},
  {id:'dj',kind:'supports',from:'program/music',to:'function/music'},
  {id:'karaoke',kind:'supports',from:'program/music',to:'function/karaoke'},
  {id:'host-needed',kind:'requires',from:'games/poker',to:'task/host'},
  {id:'host-assigned',kind:'assignment',from:'task/host',to:'person/host'}
 ]};
 const map=emptyMap();map.enabled=true;map.layout.booths=['north','south'].map((standId,i)=>({id:'placement-'+standId,standId,title:'Alter Kartenname',style:'games',x:100+i*300,y:100,width:120,height:100,offers:[],personIds:[]}));
 const base=cleanExperience({...defaultExperience('evening'),map,resourceSelection:{standIds:['north','south']}},catalog,'evening',people,[]);
 return {base,model,catalog,people,eventId:'evening',teamIds:[],sourcesVersion:'snapshot-version'};
}
test('a referenced template compiles independent runtime IDs and different capacities for the same content',async()=>{
 const input=fixture(),result=await compileResourceExperience(input);
 assert.equal(result.ok,true);assert.equal(result.config.games.length,2);
 assert.notEqual(result.config.games[0].id,result.config.games[1].id);
 assert.deepEqual(result.config.games.map(r=>r.capacity),[3,6]);
 assert.deepEqual(result.config.map.layout.booths.map(b=>b.title),['Nordzelt','Südzelt']);
 assert.equal(result.config.map.layout.booths[0].offers[0].id,result.config.games[0].id);
 const again=await compileResourceExperience(input);
 assert.deepEqual(again.config._resourceSnapshot,result.config._resourceSnapshot);
 assert.equal(input.base.games.length,0);assert.equal(input.base.map.layout.booths[0].title,'Alter Kartenname');
});
test('DJ and karaoke share a stand but keep distinct requests and station identities',async()=>{
 const {config}=await compileResourceExperience(fixture());
 const a=config.stations.find(s=>s.functionId==='music'),b=config.stations.find(s=>s.functionId==='karaoke');
 assert.notEqual(a.id,b.id);assert.equal(a.kind,'music');assert.equal(b.kind,'karaoke');
 assert.equal(a.offerId,b.offerId);assert.equal(a.occurrenceId,b.occurrenceId);
 assert.equal(config.map.layout.booths[0].offers.filter(o=>o.type==='program').length,1);
});
test('internal staffing is not automatically a public contact and snapshots retain no contact fields',async()=>{
 const input=fixture(),r=await compileResourceExperience(input);
 assert.deepEqual(r.config._staffIds,['host']);assert.deepEqual(r.config._publicContactIds,[]);
 let publicValue=visitorPayload(r.config,{eventId:'evening',teamIds:['host'],title:'Abend',date:'2027-01-01',venue:'Ort'},people);
 assert.equal(publicValue.team.length,0);assert.equal(publicValue.games[0].host,'');
 assert.equal(JSON.stringify(r.config).includes('private@example.invalid'),false);
 input.model.nodes.find(n=>n.kind==='task').publicContact=true;
 const visible=await compileResourceExperience(input);
 publicValue=visitorPayload(visible.config,{eventId:'evening',teamIds:[],title:'Abend',date:'2027-01-01',venue:'Ort'},people);
 assert.equal(publicValue.team[0].name,'Internes Team');assert.equal(publicValue.games[0].host,'Internes Team');
 assert.equal('email'in publicValue.team[0],false);
});
test('released snapshots are independent of later source edits; unavailable placement blocks game release',async()=>{
 const input=fixture(),first=await compileResourceExperience(input);
 input.catalog.games[0].description='Neue Regeln';input.model.nodes[0].name='Neuer Name';
 const second=await compileResourceExperience(input);
 assert.equal(first.config.games[0].description,'Zentral');assert.equal(first.config.map.layout.booths[0].title,'Nordzelt');
 assert.equal(second.config.games[0].description,'Neue Regeln');assert.equal(second.config.map.layout.booths[0].title,'Neuer Name');
 input.base.map.layout.booths=input.base.map.layout.booths.filter(b=>b.standId!=='north');
 const missing=await compileResourceExperience(input);assert.equal(missing.ok,false);assert.ok(missing.issues.some(i=>i.code==='missing-map-placement'));
});
test('unselected central stands disappear while unrelated generic geometry remains available',async()=>{
 const input=fixture();input.base.resourceSelection.standIds=['north'];
 input.base.map.layout.booths.push({id:'generic',title:'Wegweiser',style:'welcome',x:10,y:10,width:100,height:100,offers:[],personIds:[]});
 const result=await compileResourceExperience(input);
 assert.equal(result.config.games.length,1);assert.deepEqual(result.config.map.layout.booths.map(b=>b.id),['placement-north','generic']);
});
test('the same physical stand cannot be duplicated into independent live placements',async()=>{
 const input=fixture();input.base.map.layout.booths.push({...input.base.map.layout.booths[0],id:'second-north'});
 const result=await compileResourceExperience(input);
 assert.equal(result.ok,false);assert.ok(result.issues.some(i=>i.code==='duplicate-stand-placement'));
});
test('long central stand names and descriptions survive the map projection without truncation',async()=>{
 const input=fixture();input.model.nodes[0].name='Langer gemeinsamer Anlaufpunkt '.repeat(3).trim();input.model.nodes[0].description='Beschreibung '.repeat(90).trim();
 const result=await compileResourceExperience(input);
 assert.equal(result.ok,true);assert.equal(result.config.map.layout.booths[0].title,input.model.nodes[0].name);assert.equal(result.config.map.layout.booths[0].description,input.model.nodes[0].description);
});

test('a central Wall capability requires deliberate template activation and preserves its public route without granting private team access',async()=>{
 const input=fixture();input.model.relations.push({id:'wall',kind:'supports',from:'program/music',to:'function/wall'});
 const disabled=await compileResourceExperience(input);assert.equal(disabled.ok,false);assert.ok(disabled.issues.some(i=>i.code==='wall-not-enabled'));assert.equal(disabled.config.wall.enabled,false);
 input.base.wall={...input.base.wall,enabled:true,privacyUrl:'https://example.test/privacy',policyVersion:'v1',notice:'Nur isolierter Test',archiveDays:30};
 const active=await compileResourceExperience(input);assert.equal(active.ok,true);const station=active.config.stations.find(s=>s.functionId==='wall');assert.equal(station.contactEnabled,false);
 const guest=visitorPayload(active.config,{eventId:'evening',teamIds:[],title:'Abend',date:'2027-01-01',venue:'Ort'},people);assert.equal(guest.stations.find(s=>s.id===station.id).functionId,'wall');assert.equal('operatorIds' in guest.stations.find(s=>s.id===station.id),false);assert.ok(guest.map.layout.booths.flatMap(b=>b.offers).flatMap(o=>o.actions).some(a=>a.stationId===station.id&&a.label==='Eure Memory Wall öffnen'));
});

test('new central interaction capabilities require an explicitly prepared module and keep public routing separate from inbox rights',async()=>{
 const input=fixture(),ids=['play','dance','dating','raffle'];
 for(const id of ids)input.model.relations.push({id:'cap-'+id,kind:'supports',from:'program/music',to:'function/'+id});
 const off=await compileResourceExperience(input);assert.deepEqual(off.issues.filter(i=>i.code==='module-not-enabled').map(i=>i.refs[1]).sort(),ids.toSorted());
 input.base.encounters={...input.base.encounters,enabled:true,playEnabled:true,danceEnabled:true,datingEnabled:true};input.base.raffle={enabled:true,actions:[{id:'configured'}]};
 const active=await compileResourceExperience(input);assert.equal(active.ok,true);
 for(const id of ids){const station=active.config.stations.find(s=>s.functionId===id);assert.ok(station);assert.equal(station.contactEnabled,false);assert.equal(station.assignmentRequired,true);}
 const guest=visitorPayload(active.config,{eventId:'evening',teamIds:[],title:'Abend',date:'2027-01-01',venue:'Ort'},people);
 assert.deepEqual(guest.stations.filter(s=>ids.includes(s.functionId)).map(s=>s.functionId).sort(),ids.toSorted());assert.ok(guest.stations.every(s=>!Object.hasOwn(s,'operatorIds')));
});
const hostedOffer=(extra={})=>({id:'welcome',title:'Zusammen ankommen',kind:'welcome',enabled:true,intro:'Freiwillige Runde',time:'',place:'',standId:'north',hostPersonIds:[],staffingMode:'inherit',minPeople:2,maxPeople:8,...extra});
function hostedFixture(extra={}){const input=fixture();input.people=structuredClone(people);delete input.base.resourceSelection;input.base.encounters={...input.base.encounters,enabled:true,offers:[hostedOffer(extra)]};input.model.relations.push({id:'stand-host',kind:'requires',from:'stand/north',to:'task/host'});return input;}
test('a hosted offer independently inherits central stand tasks and location without selecting or duplicating its contents',async()=>{
 const input=hostedFixture(),compiled=await compileResourceExperience(input),offer=compiled.config.encounters.offers[0];
 assert.equal(compiled.ok,true);assert.equal(offer.place,'Nordzelt');assert.deepEqual(offer.hostPersonIds,['host']);assert.equal(compiled.config.games.length,0);assert.equal(compiled.config.program.length,0);
 assert.deepEqual(compiled.config._staffIds,['host']);assert.deepEqual(compiled.config._publicContactIds,[]);assert.equal(compiled.resolution.encounterStaffing[0].mode,'inherit');assert.equal(compiled.resolution.encounterStaffing[0].tasks[0].source[0],'host-assigned');
 assert.deepEqual(input.base.encounters.offers[0].hostPersonIds,[]);assert.equal(input.base.encounters.offers[0].place,'');
 assert.deepEqual(compiled.config.map.layout.booths.map(b=>b.id),input.base.map.layout.booths.map(b=>b.id));
 input.model.nodes[0].name='Neuer Standname';input.model.relations.find(r=>r.id==='host-assigned').archived=true;
 const changed=await compileResourceExperience(input);assert.equal(changed.ok,false);assert.equal(offer.place,'Nordzelt');assert.deepEqual(offer.hostPersonIds,['host']);
});
test('explicit hosted staffing and unattended mode replace inherited requirements while archived stands and people still block publication',async()=>{
 const input=hostedFixture({staffingMode:'unattended'});input.model.relations.find(r=>r.id==='host-assigned').archived=true;
 const unattended=await compileResourceExperience(input);assert.equal(unattended.ok,true);assert.deepEqual(unattended.config.encounters.offers[0].hostPersonIds,[]);assert.equal(unattended.resolution.encounterStaffing[0].mode,'unattended');
 Object.assign(input.base.encounters.offers[0],{staffingMode:'assigned',hostPersonIds:['host'],place:'Treffpunkt am Tor'});
 const assigned=await compileResourceExperience(input);assert.equal(assigned.ok,true);assert.equal(assigned.config.encounters.offers[0].place,'Treffpunkt am Tor');assert.deepEqual(assigned.config._staffIds,['host']);
 input.people[0]={...input.people[0],archived:true};assert.ok((await compileResourceExperience(input)).issues.some(i=>i.code==='unavailable-host'));
 input.model.nodes[0].archived=true;assert.ok((await compileResourceExperience(input)).issues.some(i=>i.code==='unavailable-stand'));
});
test('function-scoped hosted tasks resolve independently and explicit local staffing never changes the shared definition',async()=>{
 const input=hostedFixture({kind:'dance',standId:''});input.base.encounters.danceEnabled=true;
 input.model.relations.push({id:'dance-host',kind:'requires',from:'function/dance',to:'task/host'});
 const inherited=await compileResourceExperience(input);assert.equal(inherited.ok,true,JSON.stringify(inherited.issues));assert.deepEqual(inherited.config.encounters.offers[0].hostPersonIds,['host']);assert.equal(inherited.config.encounters.offers[0].place,'');
 input.base.encounters.offers[0].staffingMode='unattended';assert.deepEqual((await compileResourceExperience(input)).config.encounters.offers[0].hostPersonIds,[]);
 assert.equal(input.model.relations.find(r=>r.id==='dance-host').unattended,undefined);
});
