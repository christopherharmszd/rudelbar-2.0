const fail=(message,status=409)=>{throw Object.assign(new Error(message),{status});};
const key=value=>{if(typeof value!=='string'||!/^[a-z0-9][a-z0-9-]{0,119}$/i.test(value))fail('Ungültige Freigabekennung.',400);return value;};
const validAction=action=>{if(!['publish','open','close','unpublish'].includes(action))fail('Unbekannte Freigabeaktion.',400);return action;};
export async function releaseRequestHash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function releaseMetadata(db){
 const rows=(await db.prepare(
  'SELECT a.event_id,a.state,a.revision,a.updated_at,v.version_id,v.source_revision,v.source_resources_version,'+
  "CASE WHEN json_type(v.config_json)='object' THEN 1 ELSE 0 END AS has_config,"+
  "COALESCE(json_extract(v.config_json,'$._staffIds'),'[]') AS staff_json "+
  'FROM app_active_releases a JOIN app_release_versions v ON v.event_id=a.event_id AND v.version_id=a.version_id'
 ).all()).results||[];
 return rows.map(row=>({eventId:row.event_id,state:row.state,revision:row.revision,changedAt:new Date(row.updated_at).toISOString(),versionId:row.version_id,sourceRevision:row.source_revision,sourceResourcesVersion:JSON.parse(row.source_resources_version),hasConfig:!!row.has_config,staffIds:JSON.parse(row.staff_json)}));
}
export function createReleaseStore(db){
 const receipt=eventId=>db.prepare(
  'INSERT INTO app_release_receipts(event_id,target_revision) SELECT event_id,revision FROM app_active_releases WHERE event_id=? '+
  'ON CONFLICT(event_id) DO UPDATE SET target_revision=excluded.target_revision,next_attempt=0,attempts=0 WHERE excluded.target_revision>app_release_receipts.target_revision'
 ).bind(eventId);
 async function read(eventId){
  const row=await db.prepare('SELECT a.*,v.config_json,v.event_json,v.source_revision,v.source_resources_version FROM app_active_releases a JOIN app_release_versions v ON v.event_id=a.event_id AND v.version_id=a.version_id WHERE a.event_id=?').bind(key(eventId)).first();
  return row?{eventId:row.event_id,state:row.state,config:JSON.parse(row.config_json),eventSnapshot:JSON.parse(row.event_json),versionId:row.version_id,runtimeRevision:row.revision,sourceRevision:row.source_revision,sourceResourcesVersion:JSON.parse(row.source_resources_version),changedAt:new Date(row.updated_at).toISOString(),_store:'d1'}:null;
 }
 async function operation(eventId,operationKey,action,requestHash){
  key(eventId);key(operationKey);validAction(action);
  const row=await db.prepare('SELECT action,request_hash,version_id,target_state,active_revision FROM app_release_operations WHERE event_id=? AND operation_key=?').bind(eventId,operationKey).first();
  if(row&&(row.action!==action||requestHash&&row.request_hash!==requestHash))fail('Dieser Freigabeauftrag gehört zu einer anderen Aktion oder Fassung.');
  return row?{versionId:row.version_id,state:row.target_state,revision:row.active_revision}:null;
 }
 async function publish({eventId,action,operationKey,expectedRevision=0,state,config,eventSnapshot,sourceRevision='',actor='legacy-redaktion',requestSignature}){
  key(eventId);key(operationKey);validAction(action);
  if(!['open','closed'].includes(state)||!Number.isSafeInteger(expectedRevision)||expectedRevision<0)fail('Ungültiger Freigabestand.',400);
  const versionId='release-'+crypto.randomUUID(),now=Date.now(),configJson=JSON.stringify(config??null),eventJson=JSON.stringify(eventSnapshot||{});
  if(new TextEncoder().encode(configJson+eventJson).byteLength>1000000)fail('Die Freigabefassung ist zu groß.',413);
  const requestHash=await releaseRequestHash(requestSignature??{action,state,config:config??null,eventSnapshot:eventSnapshot||{},sourceRevision});
  if(await operation(eventId,operationKey,action,requestHash))return {...await read(eventId),replayed:true};
  const source=JSON.stringify(config?._resourceSnapshot?{resourceRevision:config._resourceSnapshot.resourceRevision,sourcesVersion:config._resourceSnapshot.sourcesVersion}:null);
  await db.batch([
   db.prepare(
    'INSERT INTO app_release_versions(version_id,event_id,config_json,event_json,source_revision,source_resources_version,created_at,created_by) '+
    'SELECT ?,?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM app_release_operations WHERE event_id=? AND operation_key=?) '+
    'AND COALESCE((SELECT revision FROM app_active_releases WHERE event_id=?),0)=?'
   ).bind(versionId,eventId,configJson,eventJson,sourceRevision,source,now,actor,eventId,operationKey,eventId,expectedRevision),
   db.prepare(
    'INSERT INTO app_active_releases(event_id,version_id,state,revision,updated_at,last_operation) '+
    'SELECT event_id,version_id,?,?,?,? FROM app_release_versions WHERE version_id=? AND event_id=? '+
    'ON CONFLICT(event_id) DO UPDATE SET version_id=excluded.version_id,state=excluded.state,revision=excluded.revision,updated_at=excluded.updated_at,last_operation=excluded.last_operation WHERE app_active_releases.revision=?'
   ).bind(state,expectedRevision+1,now,operationKey,versionId,eventId,expectedRevision),
   db.prepare(
    'INSERT OR IGNORE INTO app_release_operations(event_id,operation_key,action,request_hash,version_id,target_state,active_revision,recorded_at) '+
    'SELECT event_id,?,?,?,version_id,state,revision,? FROM app_active_releases WHERE event_id=? AND version_id=? AND last_operation=?'
   ).bind(operationKey,action,requestHash,now,eventId,versionId,operationKey),
   receipt(eventId)
  ]);
  if(!await operation(eventId,operationKey,action,requestHash))fail('Der Freigabestand wurde inzwischen geändert. Bitte erneut prüfen.');
  return read(eventId);
 }
 async function state({eventId,action,operationKey,expectedRevision,targetState}){
  key(eventId);key(operationKey);validAction(action);
  if(!['closed','open'].includes(targetState)||!Number.isSafeInteger(expectedRevision)||expectedRevision<1)fail('Ungültiger Freigabestand.',400);
  const requestHash=await releaseRequestHash({action,targetState});
  if(await operation(eventId,operationKey,action,requestHash))return {...await read(eventId),replayed:true};
  const now=Date.now();
  await db.batch([
   db.prepare(
    'INSERT OR IGNORE INTO app_release_operations(event_id,operation_key,action,request_hash,version_id,target_state,active_revision,recorded_at) '+
    'SELECT event_id,?,?,?,version_id,?,revision+CASE WHEN state=? THEN 0 ELSE 1 END,? FROM app_active_releases WHERE event_id=? AND revision=?'
   ).bind(operationKey,action,requestHash,targetState,targetState,now,eventId,expectedRevision),
   db.prepare(
    'UPDATE app_active_releases SET state=?,revision=revision+1,updated_at=?,last_operation=? WHERE event_id=? AND revision=? AND state!=? '+
    'AND EXISTS(SELECT 1 FROM app_release_operations WHERE event_id=? AND operation_key=? AND action=? AND active_revision=?)'
   ).bind(targetState,now,operationKey,eventId,expectedRevision,targetState,eventId,operationKey,action,expectedRevision+1),
   receipt(eventId)
  ]);
  if(!await operation(eventId,operationKey,action,requestHash))fail('Der Freigabestand wurde inzwischen geändert. Bitte aktualisieren.');
  return read(eventId);
 }
 return {read,operation,publish,state};
}
