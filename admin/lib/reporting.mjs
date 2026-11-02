import {createProviderMetrics} from './provider-metrics.mjs';
import {MEASUREMENTS,REPORTING_RULES,cleanMeasurement} from '../../shared/measurements.mjs';
import {createGuestIdentity} from './guest-identity.mjs';
import {releaseRequestHash} from './release-store.mjs';
import {hasRole,editsContent,managesEvent,requirePermission} from './permissions.mjs';
import {eventList,loadEvent,snapshotFor} from './abend-service.mjs';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const days=86400000;
export const readsReports=(user,eventId)=>editsContent(user)||!!eventId&&hasRole(user,'manager',eventId);
const text=(v,max,required=false)=>{if(typeof v!=='string'||v.length>max||required&&!v.trim())fail('Bitte Zweck, Information und Textlängen prüfen.');return v.trim();};
export function dateBound(day,next=false){
 if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day)fail('Bitte ein gültiges Datum auswählen.');
 let t=Date.parse(day+'T00:00:00Z')+(next?days:0);
 const zone=new Intl.DateTimeFormat('en',{timeZone:'Europe/Berlin',timeZoneName:'longOffset'}).formatToParts(t).find(p=>p.type==='timeZoneName').value;
 const m=zone.match(/GMT([+-])(\d{2}):(\d{2})/);return t-(m?(m[1]==='-'?-1:1)*(Number(m[2])*60+Number(m[3]))*60000:0);
}
export function reportWindow(input={},fallback='',now=Date.now()){
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(now),from=input.from||fallback||today,to=input.to||fallback||today,start=dateBound(from),end=dateBound(to,true);
 if(end<=start||end-start>397*days)fail('Bitte einen Zeitraum von höchstens 13 Monaten auswählen.');
 return {from,to,start,end,timeZone:'Europe/Berlin'};
}
export function createReporting(db){
 const all=async(sql,args=[])=>((await db.prepare(sql).bind(...args).all()).results||[]),first=(sql,args=[])=>db.prepare(sql).bind(...args).first();
 async function settings(){return first('SELECT * FROM reporting_settings WHERE id=1');}
 async function configure(user,input){
  requirePermission(hasRole(user,'admin'));
  const old=await settings();if(input.revision!==old.revision)fail('Die Messeinstellungen wurden inzwischen geändert.',409);
  if(typeof input.enabled!=='boolean'||typeof input.analysisEnabled!=='boolean')fail('Bitte die Messung eindeutig auswählen.');
  const purpose=text(input.purpose||'',1200,input.enabled||input.analysisEnabled),legalBasis=text(input.legalBasis||'',500,input.enabled),privacyUrl=text(input.privacyUrl||'',1000,input.enabled||input.analysisEnabled),policyVersion=text(input.policyVersion||'',80,true);
  if(privacyUrl){let url;try{url=new URL(privacyUrl);}catch{fail('Bitte eine vollständige HTTPS-Adresse der Datenschutzinformation angeben.');}if(url.protocol!=='https:'||url.username||url.password)fail('Bitte eine HTTPS-Adresse ohne Zugangsdaten verwenden.');}
  if(input.analysisEnabled&&old.client_since&&policyVersion===old.policy_version&&(purpose!==old.purpose||privacyUrl!==old.privacy_url))fail('Bitte bei geänderter Analyseinformation eine neue Fassung angeben. Bisherige Zustimmungen werden nicht übertragen.',409);
  if(input.analysisEnabled&&!input.enabled)fail('Bitte zuerst die fachliche Auswertung einrichten.');
  const rawDays=Number(input.rawDays??30),aggregateDays=Number(input.aggregateDays??396);if(!Number.isInteger(rawDays)||rawDays<1||rawDays>30||!Number.isInteger(aggregateDays)||aggregateDays<1||aggregateDays>396)fail('Die Fristen dürfen höchstens 30 beziehungsweise 396 Tage betragen.');
  const now=Date.now(),result=await db.prepare('UPDATE reporting_settings SET enabled=?,analysis_enabled=?,purpose=?,legal_basis=?,privacy_url=?,policy_version=?,raw_days=?,aggregate_days=?,operational_since=COALESCE(operational_since,CASE WHEN ?=1 THEN ? END),client_since=COALESCE(client_since,CASE WHEN ?=1 THEN ? END),revision=revision+1,updated_at=? WHERE id=1 AND revision=?').bind(Number(input.enabled),Number(input.analysisEnabled),purpose,legalBasis,privacyUrl,policyVersion,rawDays,aggregateDays,Number(input.enabled),now,Number(input.analysisEnabled),now,now,old.revision).run();
  if(!result.meta.changes)fail('Die Einstellungen wurden inzwischen geändert.',409);return settings();
 }
 async function guestSettings(person){const s=await settings(),consent=await createGuestIdentity(db).consent(person.id,'analysis');return {available:!!s?.enabled&&!!s.analysis_enabled,purpose:s?.purpose||'',privacyUrl:s?.privacy_url||'',version:s?.policy_version||'',enabled:!!s?.enabled&&!!s.analysis_enabled&&consent.enabled===1&&consent.version===s.policy_version,retentionDays:s?.raw_days||30};}
 async function guestConsent(person,input){
  const current=await guestSettings(person);if(input.enabled&&(!current.available||input.version!==current.version))fail('Die freiwillige Messung ist noch nicht eingerichtet oder wurde geändert.',409);
  await createGuestIdentity(db).changeConsent(person.id,{purpose:'analysis',version:input.version,enabled:input.enabled,operationKey:input.operationKey});
  if(!input.enabled)await db.prepare('DELETE FROM measurement_events WHERE participation_id=?').bind(person.id).run();
  return guestSettings(person);
 }
 async function ingest(person,input,release){
  const s=await guestSettings(person);if(!s.enabled)return {accepted:0,enabled:false};
  if(!Array.isArray(input.events)||input.events.length>10)fail('Bitte höchstens zehn Bedienereignisse gemeinsam übertragen.');
  const now=Date.now(),events=input.events.filter(e=>e?.view!=='dating').map(e=>cleanMeasurement(e,{source:'client',eventId:person.event_id,participationId:person.id,consent:true,now}));
  if(new Set(events.map(e=>e.key)).size!==events.length)fail('Ein Ereignis wurde doppelt übertragen.');
  const config=release?.config||{},allowed={placementId:new Set(['entrance',...(config.map?.layout?.booths||[]).map(b=>b.id)]),standId:new Set((config.map?.layout?.booths||[]).flatMap(b=>[b.id,b.standId].filter(Boolean))),occurrenceId:new Set((config._resourceSnapshot?.occurrences||[]).map(o=>o.id)),releaseId:new Set([release?.versionId].filter(Boolean)),functionId:new Set((config.stations||[]).map(s=>s.kind))};
  for(const e of events)for(const [key,value]of Object.entries(e.refs)){
   if(allowed[key]&&!allowed[key].has(value))fail('Das gemessene Element gehört nicht zur freigegebenen App.');
   if(key==='objectId'&&!['equipment','games','program','menu'].some(k=>(config[k]||[]).some(o=>o.id===value)))fail('Der gemessene Inhalt gehört nicht zu diesem Abend.');
   if(key==='contentKey'&&!config._resourceSnapshot?.occurrences?.some(o=>o.contentKey===value))fail('Der Inhaltsverweis gehört nicht zu diesem Abend.');
  }
  if((await first('SELECT COUNT(*) AS n FROM measurement_events WHERE participation_id=? AND recorded_at>?',[person.id,now-60000])).n+events.length>60)fail('Es werden gerade sehr viele Bedienereignisse übertragen.',429);
  const rows=await Promise.all(events.map(async e=>({...e,hash:await releaseRequestHash({type:e.type,refs:e.refs,view:e.view||'',action:e.action||'',errorCode:e.errorCode||''})})));
  const statements=[];for(const e of rows){
   const old=await first('SELECT request_hash FROM measurement_events WHERE event_id=? AND participation_id=? AND operation_key=?',[e.eventId,person.id,e.key]);if(old&&old.request_hash!==e.hash)fail('Diese Ereigniskennung wurde schon anders verwendet.',409);
   statements.push(db.prepare('INSERT OR IGNORE INTO measurement_events(id,event_id,participation_id,operation_key,type,view,action,error_code,refs_json,recorded_at,policy_version,request_hash) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM guest_consents WHERE participation_id=? AND purpose=\'analysis\' AND enabled=1 AND version=?) AND EXISTS(SELECT 1 FROM reporting_settings WHERE id=1 AND enabled=1 AND analysis_enabled=1 AND policy_version=?)').bind(crypto.randomUUID(),e.eventId,person.id,e.key,e.type,e.view||'',e.action||'',e.errorCode||'',JSON.stringify(e.refs),now,s.version,e.hash,person.id,s.version,s.version));
  }
  const results=statements.length?await db.batch(statements):[];
  // Check collisions after the atomic write as well, including concurrent retries.
  for(const e of rows){const saved=await first('SELECT request_hash FROM measurement_events WHERE event_id=? AND participation_id=? AND operation_key=?',[e.eventId,person.id,e.key]);if(saved&&saved.request_hash!==e.hash)fail('Die Ereigniskennung gehört zu einer anderen Aktion.',409);}
  return {accepted:results.reduce((n,r)=>n+(r.meta.changes||0),0),enabled:true};
 }
 async function retention(now=Date.now()){
  const s=await settings();if(!s)return;
  const lease=await db.prepare('UPDATE reporting_jobs SET lease_until=? WHERE id=\'retention\' AND last_run<? AND lease_until<=?').bind(now+300000,now-3600000,now).run();if(!lease.meta.changes)return;
  const cutoff=now-s.raw_days*days;
  // Aggregates contain action totals, never distinct people or sensitive module dimensions.
  // One transaction prevents an interrupted job from counting a raw event twice.
  const allowed=Object.entries(MEASUREMENTS).filter(([,v])=>!v.sensitive).map(([k])=>k),placeholders=allowed.map(()=>'?').join(',');
  try{await db.batch([
   db.prepare('INSERT INTO reporting_daily(event_id,day,source,type,dimension,count,expires_at) SELECT event_id,date(recorded_at/1000,\'unixepoch\'),\'server\',type,\'\',COUNT(*),MIN(recorded_at)+? FROM domain_events WHERE recorded_at<? AND type IN('+placeholders+') GROUP BY event_id,date(recorded_at/1000,\'unixepoch\'),type ON CONFLICT(event_id,day,source,type,dimension) DO UPDATE SET count=reporting_daily.count+excluded.count,expires_at=MIN(reporting_daily.expires_at,excluded.expires_at)').bind(s.aggregate_days*days,cutoff,...allowed),
   db.prepare('INSERT INTO reporting_daily(event_id,day,source,type,dimension,count,expires_at) SELECT event_id,date(recorded_at/1000,\'unixepoch\'),\'client\',type,view,COUNT(*),MIN(recorded_at)+? FROM measurement_events WHERE recorded_at<? GROUP BY event_id,date(recorded_at/1000,\'unixepoch\'),type,view ON CONFLICT(event_id,day,source,type,dimension) DO UPDATE SET count=reporting_daily.count+excluded.count,expires_at=MIN(reporting_daily.expires_at,excluded.expires_at)').bind(s.aggregate_days*days,cutoff),
   db.prepare('DELETE FROM domain_events WHERE recorded_at<?').bind(cutoff),db.prepare('DELETE FROM measurement_events WHERE recorded_at<?').bind(cutoff),db.prepare('DELETE FROM reporting_daily WHERE expires_at<=?').bind(now),db.prepare('DELETE FROM reporting_provider_snapshots WHERE period_end<?').bind(now-s.aggregate_days*days),db.prepare('UPDATE reporting_jobs SET last_run=?,lease_until=0 WHERE id=\'retention\' AND lease_until=?').bind(now,now+300000)
  ]);}catch(error){await db.prepare('UPDATE reporting_jobs SET lease_until=0 WHERE id=\'retention\' AND lease_until=?').bind(now+300000).run();throw error;}
 }
 async function report(event,window,{sensitive=false,release=null,providerAllowed=false}={}){
  const {start,end}=window,args=[event.eventId,start,end],s=await settings();
  const [visitors,requests,stations,series,active,rounds,members,roundActions,views,usageCoverage,push,reads,versions,aggregates,provider]=await Promise.all([
   first('SELECT COUNT(*) AS count FROM guest_participations WHERE event_id=? AND created_at>=? AND created_at<?',args),
   all('SELECT kind,status,COUNT(*) AS count FROM live_requests WHERE event_id=? AND created_at>=? AND created_at<? GROUP BY kind,status',args),
   all('SELECT station_id AS id,MAX(station_name) AS name,kind,COUNT(*) AS total,SUM(CASE WHEN status IN(\'new\',\'queued\',\'in_progress\') THEN 1 ELSE 0 END) AS pending FROM live_requests WHERE event_id=? AND created_at>=? AND created_at<? GROUP BY station_id,kind ORDER BY total DESC LIMIT 200',args),
   all('SELECT CAST(recorded_at/3600000 AS INTEGER)*3600000 AS hour,type,COUNT(*) AS count FROM domain_events WHERE event_id=? AND recorded_at>=? AND recorded_at<? AND type NOT LIKE \'dating.%\' GROUP BY hour,type ORDER BY hour LIMIT 10000',args),
   first('SELECT COUNT(DISTINCT participation_id) AS count FROM domain_events WHERE event_id=? AND recorded_at>=? AND recorded_at<? AND participation_id IS NOT NULL AND type IN(\'request.created\',\'round.created\',\'round.joined\',\'round.left\',\'round.started\',\'round.ended\',\'inbox.read\')',args),
   all('SELECT status,COUNT(*) AS count,SUM(capacity) AS capacity FROM game_rounds WHERE event_id=? AND created_at>=? AND created_at<? GROUP BY status',args),
   first('SELECT COUNT(*) AS count FROM game_round_members m JOIN game_rounds r ON r.id=m.round_id WHERE r.event_id=? AND r.created_at>=? AND r.created_at<? AND r.status!=\'ended\'',args),
   all('SELECT type,COUNT(*) AS count FROM domain_events WHERE event_id=? AND recorded_at>=? AND recorded_at<? AND type LIKE \'round.%\' GROUP BY type',args),
   all('SELECT type,view,COALESCE(json_extract(refs_json,\'$.objectId\'),json_extract(refs_json,\'$.standId\'),json_extract(refs_json,\'$.placementId\'),\'\') AS objectId,COUNT(*) AS count FROM measurement_events WHERE event_id=? AND recorded_at>=? AND recorded_at<? GROUP BY type,view,objectId ORDER BY count DESC LIMIT 500',args),
   first('SELECT COUNT(DISTINCT participation_id) AS count,MIN(recorded_at) AS first_at,MAX(recorded_at) AS last_at FROM measurement_events WHERE event_id=? AND recorded_at>=? AND recorded_at<?',args),
   all('SELECT audience,active,last_status,COUNT(*) AS count FROM live_push_subscriptions WHERE event_id=? AND created_at>=? AND created_at<? GROUP BY audience,active,last_status',args),
   all('SELECT type,COUNT(*) AS count FROM domain_events WHERE event_id=? AND recorded_at>=? AND recorded_at<? AND type IN(\'push.accepted\',\'inbox.read\') GROUP BY type',args),
   all('SELECT version_id AS id,source_revision AS sourceRevision,created_at AS createdAt,source_resources_version AS resourceVersion FROM app_release_versions WHERE event_id=? AND created_at>=? AND created_at<? ORDER BY created_at LIMIT 500',args),
   all('SELECT day,source,type,dimension,count FROM reporting_daily WHERE event_id=? AND day>=? AND day<=? ORDER BY day,type LIMIT 5000',[event.eventId,window.from,window.to]),
   providerAllowed?all('SELECT provider,resource,period_start AS periodStart,period_end AS periodEnd,measured_at AS measuredAt,metrics_json FROM reporting_provider_snapshots WHERE period_end>? AND period_start<? ORDER BY measured_at DESC LIMIT 100',[start,end]):Promise.resolve([])
  ]);
  async function latency(table,condition){return first(`WITH delays AS (SELECT MAX(0,MIN(x.created_at)-r.created_at)/60000.0 AS delay FROM live_requests r JOIN ${table} x ON ${table==='live_messages'?'x.request_id':'x.request_id'}=r.id WHERE r.event_id=? AND r.created_at>=? AND r.created_at<? AND ${condition} GROUP BY r.id),ranked AS(SELECT delay,ROW_NUMBER() OVER(ORDER BY delay) AS rn,COUNT(*) OVER() AS n FROM delays) SELECT COUNT(*) AS count,AVG(delay) AS average,AVG(CASE WHEN rn IN(CAST((n+1)/2 AS INTEGER),CAST((n+2)/2 AS INTEGER)) THEN delay END) AS median,MAX(CASE WHEN rn=CAST((n*9+9)/10 AS INTEGER) THEN delay END) AS p90 FROM ranked`,args);}
  const funnels=await all("SELECT m.action,COUNT(*) AS started,SUM(CASE WHEN EXISTS(SELECT 1 FROM domain_events d WHERE d.event_id=m.event_id AND d.participation_id=m.participation_id AND d.recorded_at>=? AND d.recorded_at<? AND d.type=CASE m.action WHEN 'round' THEN 'round.created' WHEN 'join' THEN 'round.joined' ELSE 'request.created' END AND json_extract(d.refs_json,'$.clientKey')||CASE m.action WHEN 'round' THEN '-create-started' WHEN 'join' THEN '-join-started' ELSE '-started' END=m.operation_key) THEN 1 ELSE 0 END) AS completed FROM measurement_events m WHERE m.event_id=? AND m.recorded_at>=? AND m.recorded_at<? AND m.type='action.started' GROUP BY m.action",[start,end,...args]);
  const [reaction,response,pending]=await Promise.all([latency('live_activity',"x.audience='guest' AND x.actor NOT LIKE 'v:%'"),latency('live_messages',"x.direction='team'"),first("SELECT COUNT(*) AS count,MIN(created_at) AS oldest FROM live_requests WHERE event_id=? AND status IN('new','queued','in_progress')",[event.eventId])]);
  const periods=await all('SELECT source,started_at,ended_at FROM reporting_periods WHERE started_at<=? AND COALESCE(ended_at,?)>=? ORDER BY started_at',[Math.min(end,Date.now()),Date.now(),start]);
  const sinceLimit=Date.now()-(s?.raw_days||30)*days;
  const opPeriods=periods.filter(p=>p.source==='server'),covered=opPeriods.reduce((sum,p)=>sum+Math.max(0,Math.min(end,p.ended_at||Date.now())-Math.max(start,p.started_at,sinceLimit)),0);
  const labels=new Map(['equipment','games','program','menu'].flatMap(kind=>(release?.config?.[kind]||[]).map(o=>[o.id,o.name])));labels.set('entrance','Eingang');for(const booth of release?.config?.map?.layout?.booths||[])labels.set(booth.id,booth.title);
  for(const view of views)if(view.objectId)view.label=labels.get(view.objectId)||'Früherer Inhalt / Stand';
  const rawSince=Math.max(s?.operational_since||Infinity,Date.now()-(s?.raw_days||30)*days),hasCoverage=opPeriods.some(p=>p.started_at<end&&(p.ended_at||Date.now())>=start);
  const sensitiveCounts=sensitive?await all("SELECT type,COUNT(DISTINCT participation_id) AS count FROM domain_events WHERE event_id=? AND type LIKE 'dating.%' AND participation_id IS NOT NULL GROUP BY type",[event.eventId]):[];
  const hidden=count=>count<s.sensitive_min?{value:null,state:'suppressed',reason:'Kleine Gruppe: weniger als '+s.sensitive_min+'.'}:{value:count,state:'measured'};
  return {generatedAt:Date.now(),window,event:{id:event.eventId,title:event.title,date:event.date,visibility:event.visibility,appState:event.app.state},metrics:{guestAccesses:{value:visitors.count,source:'Abendteilnahmen im gewählten Zeitraum',state:'stock',definition:REPORTING_RULES.guestDefinition},activeGuests:{value:hasCoverage?active.count:null,state:hasCoverage?'measured':'not-measured',since:Number.isFinite(rawSince)?rawSince:null,partial:hasCoverage&&covered<Math.max(0,Math.min(end,Date.now())-start),definition:REPORTING_RULES.activeGuestDefinition},requests,stations,pending:{count:pending.count,oldest:pending.oldest,asOf:Date.now()},reaction,response,rounds,currentRoundMembers:members.count,roundActions,funnels,views,usage:{participations:usageCoverage.count,firstAt:usageCoverage.first_at,lastAt:usageCoverage.last_at,available:!!s?.analysis_enabled,since:s?.client_since,definition:REPORTING_RULES.historicalCoverage},push,reads,series,versions:versions.map(v=>({...v,resourceVersion:JSON.parse(v.resourceVersion)})),aggregates,dating:{scope:'Gesamter Abend; keine zeitlichen oder persönlichen Untergruppen.',values:sensitiveCounts.map(row=>({type:row.type,...hidden(row.count)})),state:sensitive?'measured-if-configured':'restricted'}},provider:{state:!providerAllowed?'restricted':provider.length?'available':'not-connected',scope:'Ressource und Zeitfenster; keine Zuordnung zu einzelnen Gästen oder parallelen Abenden.',snapshots:provider.map(({metrics_json,...row})=>{const {coverageEndMs,available=true,sampled=true,...metrics}=JSON.parse(metrics_json);return {...row,periodEnd:Math.min(row.periodEnd,coverageEndMs||row.periodEnd),available,sampled,metrics};}),github:{state:'build-only',note:'Versions- und Build-Nachweise sind keine App-Besucherzahlen.'}},coverage:{operationalSince:s?.operational_since,clientSince:s?.client_since,enabled:!!s?.enabled,periods:periods.map(p=>({source:p.source,from:p.started_at,to:p.ended_at})),rawDays:s?.raw_days||30,aggregateDays:s?.aggregate_days||396,sensitiveMinimum:s?.sensitive_min||5},definitions:REPORTING_RULES,warnings:['Bestandszahlen zeigen den heutigen Zustand ausgewählter Einträge. Frühere gelöschte Rundenteilnahmen sind nur ab Einführung der Ereigniserfassung nachvollziehbar.','Angenommene Push-Mitteilungen belegen weder Anzeige noch Lesen.','Digitale Teilnahmen und Matches belegen keine Begegnung vor Ort.','Technische Hintergrundabrufe zählen nicht als aktive Gäste.']};
 }
 return {settings,configure,guestSettings,guestConsent,ingest,retention,report};
}
export async function reportingApi(request,env,{client,user,json,data}){
 if(!env.LIVE_DB)fail('Die Auswertung ist noch nicht eingerichtet.',503);
 const service=createReporting(env.LIVE_DB),url=new URL(request.url),path=url.pathname;
 if(path.includes('/provider')){requirePermission(hasRole(user,'admin'));const provider=createProviderMetrics(env);if(path.endsWith('/sync')&&request.method==='POST')return json(200,{provider:await provider.sync({force:true})});return json(200,{provider:request.method==='GET'?await provider.settings():await provider.configure(await data(request))});}
 if(path.endsWith('/settings')){requirePermission(hasRole(user,'admin'));return json(200,{settings:request.method==='GET'?await service.settings():await service.configure(user,await data(request))});}
 const available=(await eventList(client)).filter(e=>readsReports(user,e.eventId)&&(editsContent(user)||(e.operatingTeamIds||e.teamIds).includes(user.personId)));
 if(path.endsWith('/events'))return json(200,{events:available.map(e=>({id:e.eventId,title:e.title,date:e.date,state:e.app.state}))});
 const id=url.searchParams.get('abend');requirePermission(readsReports(user,id));const event=available.find(e=>e.eventId===id);if(!event)fail('Abend nicht gefunden.',404);
 const bounds=await env.LIVE_DB.prepare('SELECT (SELECT MIN(created_at) FROM guest_participations WHERE event_id=?) AS first_at,(SELECT MAX(updated_at) FROM live_requests WHERE event_id=?) AS last_request,(SELECT MAX(created_at) FROM guest_participations WHERE event_id=?) AS last_guest,(SELECT MAX(recorded_at) FROM measurement_events WHERE event_id=?) AS last_measurement').bind(id,id,id,id).first();
 const day=t=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(t),windowInput=Object.fromEntries(url.searchParams);
 if(!windowInput.from&&!windowInput.to&&bounds.first_at){const last=Math.max(bounds.last_request||0,bounds.last_guest||0,bounds.last_measurement||0);windowInput.from=day(Math.max(bounds.first_at,last-395*days));windowInput.to=day(last);}
 const window=reportWindow(windowInput,event.date),result=await service.report(event,window,{sensitive:hasRole(user,'admin'),providerAllowed:editsContent(user),release:await snapshotFor(client,event)});
 result.provider.deployment=env.CF_VERSION_METADATA?{id:env.CF_VERSION_METADATA.id,tag:env.CF_VERSION_METADATA.tag||'',timestamp:env.CF_VERSION_METADATA.timestamp}:null;
 if(!path.endsWith('/csv'))return json(200,result);
 const safe=v=>{const str=String(v??'');return /^[\s]*[=+\-@\t\r]/.test(str)||str.startsWith("'")?"'"+str:str;},cells=v=>'"'+safe(v).replaceAll('"','""')+'"';
 const m=result.metrics,rows=[['Bereich','Kennzahl','Wert','Status','Zeitraum'],['Einstieg','Neue Gastzugänge',m.guestAccesses.value,'Bestand'],['Nutzung','Aktiv handelnde Gastzugänge',m.activeGuests.value,m.activeGuests.state+(m.activeGuests.partial?' · teilweise Abdeckung':'')],['Bestand jetzt','Offene Anfragen',m.pending.count,'Stand '+new Date(m.pending.asOf).toISOString()],['Kommunikation','Teamreaktion Median (Minuten)',m.reaction.median,'Grundlage '+m.reaction.count],['Kommunikation','Teamreaktion 90 % (Minuten)',m.reaction.p90,'Grundlage '+m.reaction.count],['Kommunikation','Antwort Median (Minuten)',m.response.median,'Grundlage '+m.response.count],['Kommunikation','Antwort 90 % (Minuten)',m.response.p90,'Grundlage '+m.response.count],['Spielrunden','Aktuell belegt',m.currentRoundMembers,'Offene Runden'],['Abdeckung','Gastzugänge mit Bedienmessung',m.usage.participations,'Freiwillig gemessen'],...m.requests.map(r=>['Anfragen',r.kind+' · '+r.status,r.count,'Bestand']),...m.stations.map(r=>['Stationen',r.name,r.total,'Davon jetzt offen: '+r.pending]),...m.rounds.map(r=>['Rundenbestand',r.status,r.count,'Eingerichtete Plätze: '+r.capacity]),...m.roundActions.map(r=>['Spielrunden',r.type,r.count,'Ereignisse']),...m.reads.map(r=>['Mitteilungen',r.type,r.count,'Ereignisse']),...m.funnels.map(r=>['Gemessener Ablauf',r.action,r.started,'Begonnen; bestätigt: '+r.completed]),...m.views.map(r=>['Bedienmessung',[r.type,r.view,r.label||r.objectId].filter(Boolean).join(' · '),r.count,'Freiwillig gemessen']),...m.aggregates.map(r=>['Ältere Summen',r.day+' · '+r.source+' · '+r.type,r.count,'Tag (UTC)']),...m.series.map(r=>['Zeitverlauf',new Date(r.hour).toISOString()+' · '+r.type,r.count,'Ereignisse']),...m.dating.values.map(r=>['Dating',r.type,r.value,r.state+' · gesamter Abend']),...m.versions.map(r=>['App-Fassung',r.id,r.sourceRevision,new Date(r.createdAt).toISOString()]),...result.provider.snapshots.flatMap(r=>Object.entries(r.metrics).map(([key,value])=>['Technischer Betrieb',r.provider+' · '+r.resource+' · '+key,value,'Ressource, nicht Gäste'])),...Object.entries(result.definitions).map(([key,value])=>['Definition',key,value,'']),['Datenstand',new Date(result.generatedAt).toISOString(),'','']];
 const csv='\ufeff'+rows.map((row,index)=>[...row,...(index?Array(Math.max(0,4-row.length)).fill(''):[])].map(cells).join(';')+(index?';'+cells(window.from+' bis '+window.to):'')).join('\r\n');
 return new Response(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="rudelbar-auswertung.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
