import test from 'node:test';
import assert from 'node:assert/strict';
import {liveApiPath} from '../public/live-api-path.js';
test('Live detail parameters remain query parameters and preserve the existing authenticated evening',()=>{
 assert.equal(liveApiPath('/encounters&runde=round-one',{eventId:'evening'}),'/api/live/encounters?runde=round-one&abend=evening');
 assert.equal(liveApiPath('/requests/one',{eventId:'evening'}),'/api/live/requests/one?abend=evening');
 assert.equal(liveApiPath('/encounters?runde=round-one',{sessionKey:'grant'}),'/api/live/encounters?runde=round-one&s=grant');
});
test('extra detail parameters cannot replace the current evening or team session',()=>{
 const url=new URL(liveApiPath('/encounters&abend=other&s=other&runde=one',{eventId:'mine',sessionKey:'my-grant'}),'https://example.test');
 assert.equal(url.searchParams.get('abend'),'mine');assert.equal(url.searchParams.get('s'),'my-grant');
 assert.throws(()=>liveApiPath('https://other.test/encounters'));assert.throws(()=>liveApiPath('//other.test/encounters'));
});
