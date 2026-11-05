import test from 'node:test';
import assert from 'node:assert/strict';
import {safeReturnPath,signInPath} from '../public/session-paths.js';
test('shared sign-in preserves supported workspace and live destinations without carrying access codes',()=>{
 for(const path of ['/backstage#website/posts','/backstage#event/abc-123/stations','/abendplan#events','/live','/team?abend=abc-123&station=music&backstage=1'])assert.equal(safeReturnPath(path),path);
 assert.equal(safeReturnPath('/team?abend=abc&zugang=private-secret&unexpected=another'),'/team?abend=abc');
 assert.equal(signInPath('/team?abend=abc'),'/anmelden?weiter=%2Fteam%3Fabend%3Dabc');
});
test('return destinations reject open redirects and unrecognized paths',()=>{
 for(const value of [null,'https://evil.invalid/','//evil.invalid/','/\\evil.invalid/','/backstage\n','javascript:alert(1)','/api/accounts','/anmelden?weiter=/live','/backstage/../../other','/%2f%2fevil.invalid','/backstage#<script>'])assert.equal(safeReturnPath(value),'/backstage');
 assert.equal(safeReturnPath('//evil.invalid','/abendplan'),'/abendplan');
});
