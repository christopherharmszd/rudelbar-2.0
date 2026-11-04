export const WALL_DEFAULTS=Object.freeze({enabled:false,privacyUrl:'',policyVersion:'',notice:'',archiveDays:0,maxPhotoMB:10,title:'Momente, die bleiben.',intro:'Eure Fotos. Eure Grüße. Euer gemeinsamer Abend.'});
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
const text=(v,max)=>{if(typeof v!=='string'||v.length>max)fail('Bitte die Wall-Einstellungen prüfen.');return v.trim();};
export function cleanWall(input={}){
 const value={...WALL_DEFAULTS,...input};if(typeof value.enabled!=='boolean')fail('Bitte die Wall eindeutig ein- oder ausschalten.');
 for(const [key,max]of Object.entries({privacyUrl:1000,policyVersion:100,notice:1500,title:100,intro:400}))value[key]=text(value[key],max);
 if(value.privacyUrl){let url;try{url=new URL(value.privacyUrl);}catch{fail('Bitte eine gültige Datenschutzadresse angeben.');}if(url.protocol!=='https:'||url.username||url.password)fail('Bitte eine HTTPS-Adresse für die Datenschutzinformation angeben.');}
 if(!Number.isInteger(value.archiveDays)||value.archiveDays<0||value.archiveDays>365)fail('Bitte eine Archivdauer bis 365 Tage wählen.');
 if(![3,5,10].includes(value.maxPhotoMB))fail('Bitte eine Fotogröße von 3, 5 oder 10 MB wählen.');
 return Object.fromEntries(Object.keys(WALL_DEFAULTS).map(k=>[k,value[k]]));
}
export function wallIssues(config){const c=cleanWall(config);if(!c.enabled)return [];return [...(!c.privacyUrl?['Für die Memory Wall fehlt die Datenschutzinformation.']:[]),...(!c.policyVersion||!c.notice?['Für die Memory Wall fehlen Hinweistext und Fassung der freiwilligen Freigabe.']:[]),...(c.archiveDays<1?['Für die Memory Wall muss die Archivdauer ausdrücklich festgelegt werden.']:[])];}
export const STAGE_DEFAULTS=Object.freeze({mode:'invite',layout:'mosaic',focusId:'',page:0,density:12,frame:'gallery',header:true,qr:true});
export function wallScene(posts,settings={}){const c={...STAGE_DEFAULTS,...settings};if(c.mode==='invite'||!posts.length)return {layout:'invite',posts:[],page:0,pages:1};const size=c.layout==='editorial'?3:c.density,pages=Math.max(1,Math.ceil(posts.length/size)),page=Math.min(c.page,pages-1),focus=posts.find(p=>p.id===c.focusId)||posts.find(p=>p.hasPhoto)||posts[0];return {layout:c.mode==='focus'||posts.length===1?'focus':c.layout==='mosaic'&&posts.length<6?'growing':c.layout,posts:c.mode==='focus'?[focus]:posts.slice(page*size,(page+1)*size),focus,page,pages};}
// Deterministic, content-weighted regions. Every contribution owns its full area;
// no random stacking, overlap, invented content or automatic playback.
export function wallComposition(posts,{aspect=16/9}={}){
 const items=posts.slice(-100);if(!items.length)return [];
 const weight=p=>p.hasPhoto?3:String(p.text||'').length>180?4:3;
 // Balanced rows prevent narrow text slivers. Content weight changes width
 // within each row, while every row retains a readable, predictable height.
 const rows=Math.max(items.length>3?2:1,Math.ceil(items.length/6),Math.min(items.length,Math.round(Math.sqrt(items.length/Math.max(.5,aspect))))),result=[];let offset=0;
 for(let row=0;row<rows;row++){
  const count=Math.ceil((items.length-offset)/(rows-row)),entries=items.slice(offset,offset+count),total=entries.reduce((sum,p)=>sum+weight(p),0);let x=0;
  for(const post of entries){const width=weight(post)/total*100;result.push({post,x,y:row/rows*100,width,height:100/rows});x+=width;}
  offset+=count;
 }
 return result;
}
