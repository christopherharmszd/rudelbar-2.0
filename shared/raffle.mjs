export const RAFFLE_DEFAULTS=Object.freeze({enabled:false,actions:[]});
export const RAFFLE_FORMATS=Object.freeze({direct:'Direkte Preisziehung',virtual:'Virtuelle Ziehung',wheel:'Echtes Glücksrad',cards:'Physische Gewinnkarten'});
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
const id=v=>{if(typeof v!=='string'||!/^[a-z0-9][a-z0-9-]{0,79}$/i.test(v))fail('Bitte eine gültige Aktionskennung verwenden.');return v;};
const text=(v,max)=>{if(typeof v!=='string'||v.length>max)fail('Bitte die Texte der Gewinnaktion prüfen.');return v.trim();};
const number=(v,min,max)=>{if(!Number.isSafeInteger(v)||v<min||v>max)fail('Bitte die Mengen und Fristen der Gewinnaktion prüfen.');return v;};
const list=(v,max)=>{if(!Array.isArray(v)||v.length>max)fail('Bitte die Liste der Gewinnaktion prüfen.');return v;};
const unique=(rows,key)=>{if(new Set(rows.map(key)).size!==rows.length)fail('Kennungen müssen innerhalb einer Aktion eindeutig sein.');return rows;};
export function cleanRaffle(input={}){
 if(typeof(input.enabled??false)!=='boolean')fail('Gewinnaktionen bitte eindeutig ein- oder ausschalten.');
 return {enabled:input.enabled===true,actions:unique(list(input.actions||[],20).map(a=>{
  if(!Object.hasOwn(RAFFLE_FORMATS,a.format)||!['profile','issued-code'].includes(a.admission)||![0,16,18].includes(a.minAge)||typeof a.publicWinners!=='boolean'||typeof a.redeemAfterClose!=='boolean')fail('Bitte Format, Zugang und Regeln der Gewinnaktion prüfen.');
  const prizes=unique(list(a.prizes||[],20).map(p=>{if(![0,16,18].includes(p.minAge)||typeof p.alcohol!=='boolean')fail('Bitte die Altersregel dieses Preises prüfen.');return {id:id(p.id),name:text(p.name,120),quantity:number(p.quantity,0,5000),minAge:p.minAge,alcohol:p.alcohol,alternativeId:p.alternativeId?id(p.alternativeId):''};}),p=>p.id);
  const value={id:id(a.id),title:text(a.title,120),format:a.format,admission:a.admission,minAge:a.minAge,publicWinners:a.publicWinners,redeemAfterClose:a.redeemAfterClose,rulesVersion:text(a.rulesVersion||'',100),rules:text(a.rules||'',5000),privacyUrl:text(a.privacyUrl||'',1000),issueProcess:text(a.issueProcess||'',1000),ageCheckPolicy:text(a.ageCheckPolicy||'',1000),noShowPolicy:text(a.noShowPolicy||'',1000),entryLimit:number(a.entryLimit,1,5000),maxAwards:number(a.maxAwards,1,500),claimMinutes:number(a.claimMinutes,1,1440),retentionDays:number(a.retentionDays,1,90),prizes,wheelOutcomes:unique(list(a.wheelOutcomes||[],21).map(id),v=>v),cards:unique(list(a.cards||[],500).map(c=>({id:id(c.id),mark:text(c.mark,80),prizeId:id(c.prizeId)})),c=>c.id)};
  if(value.privacyUrl){let u;try{u=new URL(value.privacyUrl);}catch{fail('Bitte eine gültige Datenschutzadresse angeben.');}if(u.protocol!=='https:'||u.username||u.password)fail('Bitte eine HTTPS-Datenschutzadresse verwenden.');}
  return value;
 }),a=>a.id)};
}
export function raffleIssues(input={}){
 const config=cleanRaffle(input);if(!config.enabled)return [];const issues=[];
 if(!config.actions.length)issues.push('Mindestens eine Gewinnaktion einrichten oder den Bereich ausschalten.');
 for(const a of config.actions){const add=message=>issues.push(a.title+': '+message),prizes=new Map(a.prizes.map(p=>[p.id,p]));
  if(!a.title||!a.rulesVersion||!a.rules||!a.privacyUrl||!a.noShowPolicy||!a.ageCheckPolicy)add('Titel, Teilnahmebedingungen mit Fassung, Datenschutz, Altersprüfung und Regeln für Nichterscheinen vollständig festlegen.');
  if(a.admission==='issued-code'&&!a.issueProcess)add('Beschreiben, wie das Team die einmaligen Teilnahme-Codes vor Ort ausgibt. Ein Code allein beweist keine Person.');
  if(!a.prizes.length||!a.prizes.some(p=>p.quantity>0))add('Einen begrenzten Preisvorrat einrichten.');
  for(const p of a.prizes){const alternative=prizes.get(p.alternativeId);if(!p.name)add('Jeder Preis braucht einen Namen.');if(p.alcohol&&(!alternative||alternative.alcohol||alternative.minAge>0||alternative.id===p.id))add(p.name+': Eine alkoholfreie, nicht altersbeschränkte Alternative angeben.');if(p.alternativeId&&(!alternative||alternative.id===p.id))add(p.name+': Die Alternative ist ungültig.');if(p.minAge>a.minAge&&!p.alternativeId)add(p.name+': Altersregel und alternative Ausgabe müssen zusammenpassen.');}
  if(a.format==='wheel'){if(!a.wheelOutcomes.length||a.wheelOutcomes.some(v=>v!=='none'&&!prizes.has(v)))add('Alle möglichen Ergebnisse des echten Rads angeben. Jeder ausstehende Dreh wird gegen jedes mögliche Ergebnis abgesichert.');}
  if(a.format==='cards'){if(!a.cards.length||a.cards.some(c=>!c.mark||!prizes.has(c.prizeId)))add('Den begrenzten Kartenbestand mit eindeutiger Beschriftung und festem Preis anlegen.');if(a.maxAwards>a.cards.length)add('Mehr Gewinnrechte als vorhandene Karten sind nicht möglich.');for(const p of a.prizes)if(a.cards.filter(c=>c.prizeId===p.id).length>p.quantity)add(p.name+': Der Kartenbestand überschreitet den Preisvorrat.');}
 }
 return issues;
}
// Rejection sampling gives every eligible entry the same probability. The UI
// receives the recorded result; an animation never chooses a new winner.
export function uniformChoice(length,fill=bytes=>crypto.getRandomValues(bytes)){
 number(length,1,5000);const limit=Math.floor(4294967296/length)*length,bytes=new Uint32Array(1);let value;
 do{fill(bytes);value=bytes[0];}while(value>=limit);return {index:value%length,value,method:'crypto-uniform-v1'};
}
export function outcomeReserves(action,prizeIds){
 const ids=new Set();for(const prizeId of prizeIds){if(prizeId==='none')continue;const p=action.prizes.find(p=>p.id===prizeId);if(!p)fail('Dieser Preis gehört nicht zur Aktion.');ids.add(p.id);if(p.alternativeId)ids.add(p.alternativeId);}return [...ids].sort();
}
