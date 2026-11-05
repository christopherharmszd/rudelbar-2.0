export const ENCOUNTER_MODES=Object.freeze({play:'Gemeinsam spielen',dance:'Zusammen tanzen',dating:'Offen für ein Kennenlernen'});
export const ENCOUNTER_GENDERS=Object.freeze({woman:'Frau',man:'Mann',nonbinary:'Nichtbinär',selfdescribed:'Mit eigener Beschreibung'});
export const ENCOUNTER_DEFAULTS=Object.freeze({enabled:false,playEnabled:false,danceEnabled:false,datingEnabled:false,photosEnabled:false,contactsEnabled:false,privacyUrl:'',policyVersion:'',notice:'',datingNotice:'',profileHours:12,messageDays:7,photoMB:3,contactDays:0,contactPolicyVersion:'',contactNotice:'',offers:[]});
const fail=message=>{throw Object.assign(Error(message),{status:400});};
const text=(v,max)=>{if(typeof v!=='string'||v.length>max)fail('Bitte die Angaben zu Begegnungen prüfen.');return v.trim();};
const id=v=>{if(typeof v!=='string'||!/^[a-z0-9][a-z0-9-]{0,79}$/i.test(v))fail('Bitte eine gültige Begegnungskennung verwenden.');return v;};
const number=(v,min,max)=>{if(!Number.isSafeInteger(v)||v<min||v>max)fail('Bitte die Fristen und Gruppengrößen prüfen.');return v;};
const list=(v,max)=>{if(!Array.isArray(v)||v.length>max)fail('Die Liste der Begegnungsangebote ist ungültig.');return v;};
export function cleanEncounters(input={}){
 const c={...ENCOUNTER_DEFAULTS,...input};for(const key of ['enabled','playEnabled','danceEnabled','datingEnabled','photosEnabled','contactsEnabled'])if(typeof c[key]!=='boolean')fail('Begegnungsangebote bitte eindeutig ein- oder ausschalten.');
 for(const [key,max] of Object.entries({privacyUrl:1000,policyVersion:100,notice:1500,datingNotice:1500,contactPolicyVersion:100,contactNotice:1500}))c[key]=text(c[key],max);
 if(c.privacyUrl){let u;try{u=new URL(c.privacyUrl);}catch{fail('Bitte eine gültige Datenschutzadresse angeben.');}if(u.protocol!=='https:'||u.username||u.password)fail('Bitte eine HTTPS-Datenschutzadresse angeben.');}
 c.profileHours=number(c.profileHours,1,72);c.messageDays=number(c.messageDays,1,30);c.contactDays=number(c.contactDays,0,365);if(![3,5].includes(c.photoMB))fail('Bitte eine Fotogrenze von 3 oder 5 MB wählen.');
 c.offers=list(c.offers,20).map(o=>{if(!['welcome','play','dance','speed-dating'].includes(o.kind)||typeof o.enabled!=='boolean')fail('Bitte eine gültige betreute Begegnungsaktion auswählen.');const value={id:id(o.id),title:text(o.title,120),kind:o.kind,enabled:o.enabled,intro:text(o.intro||'',1200),time:text(o.time||'',100),place:text(o.place||'',160),standId:o.standId?id(o.standId):'',minPeople:number(o.minPeople,2,40),maxPeople:number(o.maxPeople,2,40),hostPersonIds:[...new Set(list(o.hostPersonIds||[],20).map(id))]};value.staffingMode=o.staffingMode??(value.hostPersonIds.length?'assigned':'inherit');if(!['inherit','assigned','unattended'].includes(value.staffingMode)||value.staffingMode==='assigned'&&!value.hostPersonIds.length||value.staffingMode!=='assigned'&&value.hostPersonIds.length)fail('Betreuung eindeutig aus Vorgabe, eigener Besetzung oder bewusst unbetreut wählen.');if(value.minPeople>value.maxPeople)fail('Die Mindestgröße darf nicht über der Gruppengröße liegen.');return value;});if(new Set(c.offers.map(o=>o.id)).size!==c.offers.length)fail('Begegnungsangebote brauchen eindeutige Kennungen.');
 return Object.fromEntries(Object.keys(ENCOUNTER_DEFAULTS).map(k=>[k,c[k]]));
}
export function encounterIssues(input={}){
 const c=cleanEncounters(input);if(!c.enabled)return [];const issues=[];
 if(!c.playEnabled&&!c.danceEnabled&&!c.datingEnabled&&!c.offers.some(o=>o.enabled))issues.push('Mindestens eine Begegnungsmöglichkeit wählen oder den Bereich ausschalten.');
 if(!c.privacyUrl||!c.policyVersion||!c.notice)issues.push('Für Begegnungen fehlen Datenschutzinformation, Hinweis und Fassung der freiwilligen Teilnahme.');
 if(c.datingEnabled&&!c.datingNotice)issues.push('Die getrennte freiwillige Dating-Teilnahme und die 18+-Selbstauskunft beschreiben.');
 if(c.contactsEnabled&&(!c.contactDays||!c.contactPolicyVersion||!c.contactNotice))issues.push('Für dauerhafte Kontakte eine eigene Information, Fassung und ausdrücklich begrenzte Aufbewahrung einrichten.');
 for(const o of c.offers.filter(o=>o.enabled)){if(!o.title||!o.intro)issues.push('Jede betreute Begegnungsaktion braucht Titel und einen Hinweis zur Anmeldung und sichtbaren Teilnehmerliste.');if(o.kind==='speed-dating'&&!c.datingEnabled)issues.push(o.title+': Speed-Dating setzt das separat eingeschaltete Dating-Angebot voraus.');}
 return issues;
}
export function cleanEncounterProfile(input,config,mode){
 const c=cleanEncounters(config);if(!Object.hasOwn(ENCOUNTER_MODES,mode)||!c.enabled||!c[mode+'Enabled'])fail('Diese Begegnungsmöglichkeit ist nicht eingeschaltet.');
 if(input.agree!==true||input.policyVersion!==c.policyVersion)fail('Bitte die freiwillige Sichtbarkeit für diesen Abend ausdrücklich bestätigen.');
 const about=text(input.about||'',400),interests=[...new Set(list(input.interests||[],8).map(v=>text(v,40)).filter(Boolean))];
 let gender='',seeking=[],genderDescription='';if(mode==='dating'){
  if(input.over18!==true)fail('Das Dating-Angebot ist nur mit ausdrücklicher 18+-Selbstauskunft verfügbar.');
  if(!Object.hasOwn(ENCOUNTER_GENDERS,input.gender))fail('Bitte eine eigene Angabe wählen. Wir leiten sie nicht aus deinem Namen ab.');gender=input.gender;
  seeking=[...new Set(list(input.seeking||[],4))];if(!seeking.length||seeking.some(v=>!Object.hasOwn(ENCOUNTER_GENDERS,v)))fail('Bitte ausdrücklich wählen, wen du kennenlernen möchtest. Eine leere Auswahl bedeutet nicht alle.');
  if(gender==='selfdescribed')genderDescription=text(input.genderDescription||'',60);
 }
 return {mode,about,interests,gender,seeking,genderDescription,over18:mode==='dating',consentVersion:c.policyVersion};
}
export function compatibleEncounters(a,b){
 if(a.profileId===b.profileId||a.mode!==b.mode||a.state!=='active'||b.state!=='active')return false;
 if(a.mode!=='dating')return true;
 return a.over18===true&&b.over18===true&&Array.isArray(a.seeking)&&Array.isArray(b.seeking)&&a.seeking.includes(b.gender)&&b.seeking.includes(a.gender);
}
