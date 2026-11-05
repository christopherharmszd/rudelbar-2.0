import test from 'node:test';
import assert from 'node:assert/strict';
import {stripJpegMetadata} from '../../event-app/public/compact-jpeg.js';
import {checkPrivateJpeg} from '../lib/encounter-media.mjs';
import {TEST_PREVIEW} from './wall-images.mjs';
function withSegment(marker,body){const out=new Uint8Array(TEST_PREVIEW.length+body.length+4);out.set(TEST_PREVIEW.subarray(0,2));out.set([255,marker,(body.length+2)>>8,(body.length+2)&255],2);out.set(body,6);out.set(TEST_PREVIEW.subarray(2),body.length+6);return out;}
test('compact photo preparation strips browser ICC/EXIF/comments while preserving the encoded pixels',()=>{
 const plain=stripJpegMetadata(TEST_PREVIEW);assert.equal(checkPrivateJpeg(plain),true);
 for(const marker of [225,226,237,254]){
  const source=withSegment(marker,new TextEncoder().encode('ICC_PROFILE Exif location synthetic test data'));
  assert.throws(()=>checkPrivateJpeg(source));const clean=stripJpegMetadata(source);
  assert.equal(checkPrivateJpeg(clean),true);assert.deepEqual(clean,plain);assert.ok(!new TextDecoder().decode(clean).includes('synthetic test data'));
 }
});
test('metadata removal rejects incomplete or appended files rather than forwarding hidden trailing data',()=>{
 assert.throws(()=>stripJpegMetadata(TEST_PREVIEW.subarray(0,-1)));
 const tail=new Uint8Array(TEST_PREVIEW.length+1);tail.set(TEST_PREVIEW);assert.throws(()=>stripJpegMetadata(tail));
 assert.throws(()=>stripJpegMetadata(new Uint8Array([255,216,255,225,255,255])));
});
