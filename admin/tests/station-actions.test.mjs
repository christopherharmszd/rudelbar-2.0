import test from 'node:test';
import assert from 'node:assert/strict';
import {stationInteraction} from '../../shared/station-actions.mjs';
const station=functionId=>({id:'immutable-station',functionId,kind:'message',contactEnabled:false,detailsEnabled:false});
test('module interactions remain available independently of optional details but require their own published purpose',()=>{
 for(const mode of ['play','dance','dating']){
  assert.equal(stationInteraction(station(mode),{encounters:{enabled:true}}),null);
  const allowed=stationInteraction(station(mode),{encounters:{enabled:true,[mode+'Enabled']:true}});assert.equal(allowed.action,'encounters');assert.equal(allowed.mode,mode);
  assert.equal(stationInteraction(station(mode),{encounters:{enabled:false,[mode+'Enabled']:true}}),null);
 }
 for(const id of ['wall','raffle']){assert.equal(stationInteraction(station(id)),null);assert.equal(stationInteraction(station(id),{[id]:{enabled:true}}).action,id);}
});
test('physical round navigation uses the public map contract and never invents an enabled map',()=>{
 assert.equal(stationInteraction(station('game'),{map:null}),null);
 assert.equal(stationInteraction(station('game'),{map:{enabled:false,layout:{}}}),null);
 assert.equal(stationInteraction(station('game'),{map:{layout:{booths:[]}}}).action,'map');
});
test('music and karaoke keep their separate station identities while a closed information-only station creates no message route',()=>{
 const dj={id:'dj-instance',kind:'music'},karaoke={id:'karaoke-instance',kind:'karaoke'};
 assert.equal(stationInteraction(dj).id,'dj-instance');assert.equal(stationInteraction(karaoke).id,'karaoke-instance');assert.equal(stationInteraction(dj).action,'station');
 assert.equal(stationInteraction({...dj,contactEnabled:false}),null);assert.equal(stationInteraction({...karaoke,enabled:false}),null);
});
