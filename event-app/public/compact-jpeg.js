// Browsers may include ICC/EXIF application segments even in canvas output.
// Keep the already resized, sRGB encoded pixels and drop optional metadata.
export function stripJpegMetadata(bytes){
 const fail=()=>{throw Error('Das Foto konnte nicht vollständig vorbereitet werden. Bitte ein anderes JPG oder PNG wählen.');};
 if(!(bytes instanceof Uint8Array)||bytes[0]!==255||bytes[1]!==216)fail();
 const parts=[bytes.subarray(0,2)];let at=2,scan=false,scanStart=0;
 while(at<bytes.length){
  if(scan){
   while(at<bytes.length){
    if(bytes[at]!==255){at++;continue;}
    const markerStart=at;while(bytes[at]===255)at++;
    const marker=bytes[at++];
    if(marker===0||marker>=208&&marker<=215)continue;
    parts.push(bytes.subarray(scanStart,markerStart));at=markerStart;scan=false;break;
   }
   if(scan)fail();
  }
  const start=at;if(bytes[at++]!==255)fail();while(bytes[at]===255)at++;
  const marker=bytes[at++];
  if(marker===217){
   if(at!==bytes.length)fail();parts.push(bytes.subarray(start,at));
   const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;
   for(const part of parts){out.set(part,offset);offset+=part.length;}return out;
  }
  if(marker===undefined||marker===0||marker===216||at+2>bytes.length)fail();
  const size=(bytes[at]<<8)|bytes[at+1];if(size<2||at+size>bytes.length)fail();at+=size;
  if(!(marker>=224&&marker<=239||marker===254))parts.push(bytes.subarray(start,at));
  if(marker===218){scan=true;scanStart=at;}
 }
 fail();
}
