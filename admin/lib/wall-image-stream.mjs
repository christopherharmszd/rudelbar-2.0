// Image validation/streaming pattern adapted from the user-owned Elbmafia reference.
import {fail} from './wall-policy.mjs';

const HEADER_LIMIT=256*1024;
function dimensions(bytes,mime){
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(mime==='image/png'){
  if(bytes.length<24)return null;
  if(![137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n)||String.fromCharCode(...bytes.slice(12,16))!=='IHDR')fail('Die Datei ist kein gültiges PNG-Foto.',415);
  return [v.getUint32(16),v.getUint32(20)];
 }
 if(mime==='image/webp'){
  if(bytes.length<30)return null;
  if(String.fromCharCode(...bytes.slice(0,4))!=='RIFF'||String.fromCharCode(...bytes.slice(8,12))!=='WEBP')fail('Die Datei ist kein gültiges WebP-Foto.',415);
  const format=String.fromCharCode(...bytes.slice(12,16)),u24=i=>bytes[i]+(bytes[i+1]<<8)+(bytes[i+2]<<16);
  if(format==='VP8X')return [u24(24)+1,u24(27)+1];
  if(format==='VP8L'&&bytes[20]===47){const n=v.getUint32(21,true);return [(n&16383)+1,((n>>>14)&16383)+1];}
  if(format==='VP8 '&&bytes[23]===157&&bytes[24]===1&&bytes[25]===42)return [v.getUint16(26,true)&16383,v.getUint16(28,true)&16383];
  fail('Die WebP-Abmessungen sind nicht lesbar.',415);
 }
 if(bytes.length<3)return null;
 if(bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)fail('Die Datei ist kein gültiges JPEG-Foto.',415);
 let i=2;
 while(i+4<=bytes.length){
  if(bytes[i++]!==255)fail('Der JPEG-Kopf ist beschädigt.',415);
  while(bytes[i]===255)i++;
  const marker=bytes[i++];if(marker===217||marker===218)fail('Die Bildabmessungen fehlen.',415);
  if(marker===1||(marker>=208&&marker<=215))continue;
  if(i+2>bytes.length)return null;
  const length=v.getUint16(i);if(length<2)fail('Der JPEG-Kopf ist beschädigt.',415);
  if(i+length>bytes.length)return null;
  if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){
   if(length<8)fail('Der JPEG-Kopf ist beschädigt.',415);
   return [v.getUint16(i+5),v.getUint16(i+3)];
  }
  i+=length;
 }
 return null;
}

// Inspect only a bounded header. Original bytes keep streaming, unchanged, to R2.
export async function validatedImageStream(body,mime,{preview=false}={}){
 const reader=body.getReader(),chunks=[];let prefix=new Uint8Array(),size=null;
 try{
  while(!size){
   const {done,value}=await reader.read();if(done)fail('Die Bilddatei ist unvollständig.',415);
   chunks.push(value);
   const take=value.subarray(0,HEADER_LIMIT-prefix.length),next=new Uint8Array(prefix.length+take.length);next.set(prefix);next.set(take,prefix.length);prefix=next;
   size=dimensions(prefix,mime);
   if(!size&&prefix.length>=HEADER_LIMIT)fail('Der Bildkopf ist zu groß. Bitte das Foto erneut als JPG exportieren.',415);
  }
  const [width,height]=size;
  if(!width||!height||width*height>50e6||(preview&&(width>1400||height>1400)))fail('Die Bildabmessungen sind zu groß.',413);
 }catch(error){await reader.cancel().catch(()=>{});throw error;}
 return new ReadableStream({
  start(controller){for(const chunk of chunks)controller.enqueue(chunk);},
  async pull(controller){try{const {done,value}=await reader.read();if(done)controller.close();else controller.enqueue(value);}catch(error){controller.error(error);}},
  cancel(reason){return reader.cancel(reason);}
 });
}

export async function storeImage(bucket,key,stream,size,options){
 if(typeof FixedLengthStream==='undefined')return bucket.put(key,stream,options);
 const fixed=new FixedLengthStream(size),abort=new AbortController(),pump=stream.pipeTo(fixed.writable,{signal:abort.signal});
 // Attach a handler immediately; R2 and the pump consume the stream together.
 const drained=pump.catch(error=>{throw error;});drained.catch(()=>{});
 try{const object=await bucket.put(key,fixed.readable,options);await drained;return object;}
 catch(error){abort.abort();await drained.catch(()=>{});throw error;}
}
