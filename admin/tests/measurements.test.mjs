import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanMeasurement,MEASUREMENTS,REPORTING_RULES} from '../../shared/measurements.mjs';
const context={source:'client',eventId:'evening-a',participationId:'guest-a',consent:true,now:1000};
const event={type:'offer.opened',key:'attempt-1',refs:{contentKey:'games/poker',standId:'north',occurrenceId:'poker-north'}};
test('client measurement requires affirmative consent and never upgrades to a confirmed business action',()=>{
 assert.equal(cleanMeasurement(event,{...context,consent:false}),null);
 assert.throws(()=>cleanMeasurement({...event,type:'dating.activated'},context));
 assert.throws(()=>cleanMeasurement({...event,type:'round.joined'},context));
 const result=cleanMeasurement(event,context);assert.equal(result.participationId,'guest-a');assert.equal(result.recordedAt,1000);
 assert.equal(MEASUREMENTS[event.type].active,undefined);
});
test('tracking payload cannot carry names, URLs, tokens, private preferences or free-form content',()=>{
 for(const extra of [{name:'Name'},{url:'https://site/?zugang=secret'},{payload:{text:'private'}},{occurredAt:0},{preferences:['private']},{participantId:'someone-else'}])assert.throws(()=>cleanMeasurement({...event,...extra},context));
 for(const refs of [{token:'secret'},{email:'private'},{contentKey:'https://example.org'},{standId:'x?zugang=secret'}])assert.throws(()=>cleanMeasurement({...event,refs},context));
 assert.throws(()=>cleanMeasurement({...event,errorCode:'Private Nachricht'},context));
});
test('server-confirmed action identity and time come from its authenticated context',()=>{
 const result=cleanMeasurement({type:'round.joined',key:'operation-1',refs:{objectId:'round-1'}},{...context,source:'server',consent:false});
 assert.equal(result.source,'server');assert.equal(result.eventId,'evening-a');assert.equal(result.participationId,'guest-a');
 assert.equal(MEASUREMENTS[result.type].active,true);
 assert.equal(REPORTING_RULES.detailedRetentionDays,30);
 assert.equal(MEASUREMENTS['dating.activated'].sensitive,true);
 assert.equal('poll.received'in MEASUREMENTS,false);
});
