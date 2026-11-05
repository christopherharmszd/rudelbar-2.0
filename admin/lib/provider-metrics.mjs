// Fixed read-only endpoint and Rudelbar resource allowlist. Personal workstation
// OAuth credentials are deliberately not available to this module.
export const REPORT_ACCOUNT='87e06345951a028223b167dd69056336';
export const REPORT_DATABASE='5207ce12-4fc5-4923-a92b-d30a8699b0ff';
const sources={cms:'rudelbar-cms-staging',guest:'rudelbar-app-staging',database:REPORT_DATABASE};
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const enc=new TextEncoder(),hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''),unhex=s=>Uint8Array.from(s.match(/../g)||[],v=>parseInt(v,16));
async function key(secret){if(!secret)fail('Die sichere Ablage ist noch nicht verfügbar.',503);const material=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return crypto.subtle.importKey('raw',await crypto.subtle.sign('HMAC',material,enc.encode('rudelbar-provider-metrics-v1')),'AES-GCM',false,['encrypt','decrypt']);}
async function seal(secret,value){const iv=crypto.getRandomValues(new Uint8Array(12));return hex(iv)+'.'+hex(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(REPORT_ACCOUNT)},await key(secret),enc.encode(value))));}
async function unseal(secret,value){const [iv,data]=value.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unhex(iv),additionalData:enc.encode(REPORT_ACCOUNT)},await key(secret),unhex(data)));}
const query=`query RudelbarMetrics($accountTag:string!,$start:Date!,$end:Date!,$since:string!,$until:string!){viewer{accounts(filter:{accountTag:$accountTag}){
 cms:workersInvocationsAdaptive(limit:1,filter:{scriptName:"rudelbar-cms-staging",datetime_geq:$since,datetime_leq:$until}){sum{requests errors subrequests}}
 guest:workersInvocationsAdaptive(limit:1,filter:{scriptName:"rudelbar-app-staging",datetime_geq:$since,datetime_leq:$until}){sum{requests errors subrequests}}
 database:d1AnalyticsAdaptiveGroups(limit:1,filter:{databaseId:"${REPORT_DATABASE}",date_geq:$start,date_leq:$end}){sum{readQueries writeQueries rowsRead rowsWritten} quantiles{queryBatchTimeMsP90}}
}}}`;
export function createProviderMetrics(env,{transport=fetch}={}){
 const db=env.LIVE_DB,raw=()=>db.prepare('SELECT * FROM reporting_provider_settings WHERE id=1').first();
 const dto=row=>({enabled:!!row.enabled,tokenSaved:!!row.token_cipher,revision:row.revision,lastSync:row.last_sync||null,lastStatus:row.last_status,account:REPORT_ACCOUNT,resources:Object.values(sources),requiredPermission:'Account Analytics Read; auf das benannte Cloudflare-Konto begrenzt.'});
 async function settings(){return dto(await raw());}
 async function collect(token,day,now=Date.now()){
  const start=Date.parse(day+'T00:00:00Z'),end=start+86400000,until=Math.min(now,end)-1;
  if(!/^[a-zA-Z0-9._-]{20,4096}$/.test(token))fail('Bitte einen gültigen lesenden Cloudflare-Schlüssel eingeben.');
  const response=await transport('https://api.cloudflare.com/client/v4/graphql',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({query,variables:{accountTag:REPORT_ACCOUNT,start:day,end:day,since:new Date(start).toISOString(),until:new Date(until).toISOString()}}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)fail('Cloudflare hat die lesende Abfrage nicht angenommen. Bitte Schlüssel und Analytics-Leserecht prüfen.',502);
  const data=await response.json();if(data.errors?.length||!data.data?.viewer?.accounts?.[0])fail('Die gewählten Analytics-Daten sind mit diesem Schlüssel noch nicht abrufbar.',502);
  const rows=[],account=data.data.viewer.accounts[0];
  for(const [alias,resource]of Object.entries(sources)){
   const group=account[alias];if(!Array.isArray(group)||group.length>1)fail('Die Cloudflare-Antwort konnte nicht eindeutig zugeordnet werden.',502);
   const values=group[0],fields=alias==='database'?['readQueries','writeQueries','rowsRead','rowsWritten']:['requests','errors','subrequests'],metrics={};
   if(values){for(const field of fields){const v=values.sum?.[field];if(typeof v!=='number'||!Number.isFinite(v)||v<0)fail('Cloudflare hat unvollständige Kennzahlen geliefert.',502);metrics[field]=v;}if(alias==='database'&&values.quantiles?.queryBatchTimeMsP90!==undefined)metrics.queryBatchTimeMsP90=values.quantiles.queryBatchTimeMsP90;}
   // An empty returned dataset remains explicitly unavailable, never invented zero.
   rows.push({provider:'cloudflare',resource,periodStart:start,periodEnd:end,measuredAt:now,metrics:{...metrics,coverageEndMs:until+1,available:!!values,sampled:true}});
  }
  return rows;
 }
 async function configure(input){
  const old=await raw();if(input.revision!==old.revision)fail('Die Anbieteranbindung wurde inzwischen geändert.',409);
  if(typeof input.enabled!=='boolean')fail('Bitte die Verbindung eindeutig auswählen.');let cipher=old.token_cipher;
  if(input.token){if(typeof input.token!=='string')fail('Bitte einen gültigen Schlüssel eingeben.');await collect(input.token,new Date(Date.now()-86400000).toISOString().slice(0,10));cipher=await seal(env.RUDELBAR_SESSION_SECRET,input.token);}
  if(input.enabled&&!cipher)fail('Bitte zuerst einen Cloudflare-Schlüssel mit Analytics-Leserecht hinterlegen.');
  const result=await db.prepare('UPDATE reporting_provider_settings SET enabled=?,token_cipher=?,revision=revision+1,last_status=?,updated_at=? WHERE id=1 AND revision=?').bind(Number(input.enabled),cipher,cipher?'configured':'not-connected',Date.now(),old.revision).run();if(!result.meta.changes)fail('Die Anbieteranbindung wurde inzwischen geändert.',409);return settings();
 }
 async function sync({force=false,now=Date.now()}={}){
  const old=await raw();if(!old.enabled||!old.token_cipher||old.last_sync>now-(force?60000:3600000))return settings();
  const lease=await db.prepare('UPDATE reporting_provider_settings SET last_sync=?,last_status=\'fetching\' WHERE id=1 AND revision=? AND last_sync=?').bind(now,old.revision,old.last_sync).run();if(!lease.meta.changes)return settings();
  try{
   const token=await unseal(env.RUDELBAR_SESSION_SECRET,old.token_cipher),rows=[];
   for(const t of [now-86400000,now])rows.push(...await collect(token,new Date(t).toISOString().slice(0,10),now));
   await db.batch(rows.map(r=>db.prepare('INSERT INTO reporting_provider_snapshots(provider,resource,period_start,period_end,measured_at,metrics_json) VALUES(?,?,?,?,?,?) ON CONFLICT(provider,resource,period_start,period_end) DO UPDATE SET measured_at=excluded.measured_at,metrics_json=excluded.metrics_json WHERE excluded.measured_at>reporting_provider_snapshots.measured_at').bind(r.provider,r.resource,r.periodStart,r.periodEnd,r.measuredAt,JSON.stringify(r.metrics))));
   await db.prepare('UPDATE reporting_provider_settings SET last_status=\'ok\' WHERE id=1 AND revision=? AND last_sync=?').bind(old.revision,now).run();
  }catch{await db.prepare('UPDATE reporting_provider_settings SET last_status=\'unavailable\' WHERE id=1 AND revision=? AND last_sync=?').bind(old.revision,now).run();}
  return settings();
 }
 return {settings,configure,sync,collect};
}
