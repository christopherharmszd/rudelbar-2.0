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
export function wallScene(posts,settings={}){const c={...STAGE_DEFAULTS,...settings};if(c.mode==='invite'||!posts.length)return {layout:'invite',posts:[],page:0,pages:1};const size=c.layout==='editorial'?3:c.density,pages=Math.max(1,Math.ceil(posts.length/size)),page=Math.min(c.page,pages-1),focus=posts.find(p=>p.id===c.focusId)||posts.find(p=>p.hasPhoto)||posts[0];return {layout:c.mode==='focus'?'focus':c.layout,posts:c.mode==='focus'?[focus]:posts.slice(page*size,(page+1)*size),focus,page,pages};}
// Deterministic composition; no automatic rotation and no invented content.
export function wallComposition(posts){return posts.slice(-100).map((post,i,all)=>{let h=2166136261;for(const c of post.id){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}const f=(h>>>0)/4294967295,front=i>=all.length-5,rank=all.length-1-i,positions=all.length===1?[[50,50]]:all.length===2?[[34,47],[66,52]]:[[24,35],[51,30],[77,42],[35,73],[65,70]];return {post,front,x:front?positions[rank][0]:12+(i*.618+f*.17)%1*76,y:front?positions[rank][1]:19+(i*.414+f*.13)%1*62,width:front?(all.length===1?42:all.length===2?33:24):14+f*5,angle:(f-.5)*(front?6:13),opacity:front?1:.32+i/Math.max(1,all.length)*.35,z:front?200+5-rank:i};});}
