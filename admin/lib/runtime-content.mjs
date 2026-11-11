// D1 is the running app's read model. Sanity is consulted only by explicit
// editorial writes and the controlled bootstrap, never as a per-request fallback.
export const RUNTIME_TYPES=['rudelAppPerson','rudelAppPartner','rudelAppEvent'];
const fail=message=>{throw Object.assign(new Error(message),{status:503});};
const missing='Die Betriebsdaten werden vorbereitet. Bitte wende dich an das Rudelbar-Team.';
const active=env=>env.RUDELBAR_RUNTIME_CONTEXT==='1'&&!!env.LIVE_DB;
export const usesRuntimeContent=active;

export function createRuntimeProjection(db,dataset){
 const first=(sql,args=[])=>db.prepare(sql).bind(...args).first();
 const all=async(sql,args=[])=>((await db.prepare(sql).bind(...args).all()).results||[]);
 const put=doc=>db.prepare(`INSERT INTO app_runtime_documents(dataset,id,type,document_json,source_updated_at,mirrored_at) VALUES(?,?,?,?,?,?)
  ON CONFLICT(dataset,id) DO UPDATE SET type=excluded.type,document_json=excluded.document_json,source_updated_at=excluded.source_updated_at,mirrored_at=excluded.mirrored_at
  WHERE excluded.source_updated_at>=app_runtime_documents.source_updated_at`).bind(dataset,doc._id,doc._type,JSON.stringify(doc),doc._updatedAt||'',Date.now());
 async function ready(){if(!(await first('SELECT ready FROM app_runtime_content_state WHERE id=1'))?.ready)fail(missing);}
 async function pending(id){if(await first('SELECT 1 FROM app_runtime_pending WHERE dataset=? AND id=?',[dataset,id]))fail('Eine Änderung wird gerade synchronisiert. Bitte gleich noch einmal versuchen.');}
 async function getDocument(id){await ready();await pending(id);return JSON.parse((await first('SELECT document_json FROM app_runtime_documents WHERE dataset=? AND id=?',[dataset,id]))?.document_json||'null');}
 async function list(type){
  await ready();
  // A pending profile is withheld from every resolver until the write is mirrored.
  const rows=await all('SELECT document_json FROM app_runtime_documents d WHERE dataset=? AND type=? AND NOT EXISTS(SELECT 1 FROM app_runtime_pending p WHERE p.dataset=d.dataset AND p.id=d.id)',[dataset,type]);
  const entries=new Map();
  for(const row of rows){const doc=JSON.parse(row.document_json),draft=doc._id.startsWith('drafts.'),id=draft?doc._id.slice(7):doc._id,entry=entries.get(id)||{id,published:false,draft:false};if(draft){entry.draft=true;entry.content=doc;}else{entry.published=true;if(!entry.draft)entry.content=doc;}entries.set(id,entry);}
  return [...entries.values()].map(({content,...meta})=>({...meta,...content,_id:meta.id,archived:content?.archived===true}));
 }
 async function begin(id){const token=crypto.randomUUID();const result=await db.prepare("INSERT INTO app_runtime_pending(dataset,id,token,started_at) SELECT ?,?,?,? FROM app_runtime_content_state WHERE id=1 AND sync_token='' ON CONFLICT(dataset,id) DO UPDATE SET token=excluded.token,started_at=excluded.started_at").bind(dataset,id,token,Date.now()).run();if(!result.meta.changes)fail('Die Betriebsdaten werden gerade abgeglichen. Bitte gleich noch einmal speichern.');return token;}
 async function cancel(id,token){await db.prepare('DELETE FROM app_runtime_pending WHERE dataset=? AND id=? AND token=?').bind(dataset,id,token).run();}
 async function commit(doc,token){await db.batch([put(doc),db.prepare('DELETE FROM app_runtime_pending WHERE dataset=? AND id=? AND token=?').bind(dataset,doc._id,token)]);}
 async function event(eventId){
  await ready();const rows=await all("SELECT document_json FROM app_runtime_documents WHERE dataset=? AND type='rudelAppEvent' AND json_extract(document_json,'$.eventId')=?",[dataset,eventId]);
  const docs=rows.map(r=>JSON.parse(r.document_json));const doc=docs.find(d=>d._id.startsWith('drafts.'))||docs[0]||null;if(doc)await pending(doc._id);return doc;
 }
 return {dataset,put,ready,getDocument,list,begin,cancel,commit,event};
}

export function createRuntimeClient(env){
 if(!active(env))throw new Error('Runtime content is not enabled.');
 const db=env.LIVE_DB,projection=createRuntimeProjection(db,env.SANITY_DATASET),website=createRuntimeProjection(db,env.SANITY_WEBSITE_DATASET||env.SANITY_DATASET);
 return {...projection,website,runtimeDb:db,runtimeOnly:true};
}

export async function synchronizeRuntimeContent(env,source){
 if(!active(env))return {enabled:false};
 const db=env.LIVE_DB,app=createRuntimeProjection(db,env.SANITY_DATASET),website=createRuntimeProjection(db,env.SANITY_WEBSITE_DATASET||env.SANITY_DATASET);
 // Read everything before touching the current projection. A quota failure leaves
 // the previous complete generation intact and does not invent missing profiles.
 const token=crypto.randomUUID();
 const locked=await db.prepare("UPDATE app_runtime_content_state SET sync_token=? WHERE id=1 AND sync_token='' AND NOT EXISTS(SELECT 1 FROM app_runtime_pending)").bind(token).run();
 if(!locked.meta.changes)fail('Es wird gerade bearbeitet. Bitte die Synchronisierung nach Abschluss erneut starten.');
 try{
  const [appDocs,webDocs]=await Promise.all([source.documents(RUNTIME_TYPES),source.website.documents(['rudelEvent'])]);
  if(appDocs.some(d=>!d?._id||!RUNTIME_TYPES.includes(d._type))||webDocs.some(d=>!d?._id||d._type!=='rudelEvent'))fail('Die Betriebsdaten konnten nicht vollständig gelesen werden.');
  const bulk=(dataset,docs)=>{const encoded=JSON.stringify(docs);if(new TextEncoder().encode(encoded).byteLength>1500000)fail('Der Datenabgleich ist zu groß für einen sicheren Einzelschritt. Die bisherige Fassung bleibt erhalten.');return db.prepare("INSERT INTO app_runtime_documents(dataset,id,type,document_json,source_updated_at,mirrored_at) SELECT ?,json_extract(value,'$._id'),json_extract(value,'$._type'),value,COALESCE(json_extract(value,'$._updatedAt'),''),? FROM json_each(?)").bind(dataset,Date.now(),encoded);};
  const statements=[db.prepare('DELETE FROM app_runtime_documents WHERE dataset=? AND type IN (?,?,?)').bind(app.dataset,...RUNTIME_TYPES),db.prepare("DELETE FROM app_runtime_documents WHERE dataset=? AND type='rudelEvent'").bind(website.dataset),bulk(app.dataset,appDocs),bulk(website.dataset,webDocs),db.prepare('UPDATE app_runtime_content_state SET ready=1,synced_at=?,sync_token=\'\' WHERE id=1 AND sync_token=?').bind(Date.now(),token)];
  await db.batch(statements);
  return {enabled:true,appDocuments:appDocs.length,websiteDocuments:webDocs.length};
 }finally{await db.prepare("UPDATE app_runtime_content_state SET sync_token='' WHERE id=1 AND sync_token=?").bind(token).run();}
}
