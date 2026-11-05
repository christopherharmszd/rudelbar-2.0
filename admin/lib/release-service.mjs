import {createReleaseStore,releaseRequestHash} from './release-store.mjs';
import {RELEASE_TYPE,releaseDocId} from './abend-service.mjs';
export async function releaseOperation(input,action){
 const token=input.reviewToken||'';
 const operationKey=input.operationKey||'check-'+await releaseRequestHash({action,token:token||crypto.randomUUID()});
 if(typeof operationKey!=='string'||!/^[a-z0-9][a-z0-9-]{0,119}$/i.test(operationKey))throw Object.assign(new Error('Ungültiger Freigabeauftrag.'),{status:400});
 const signature=['publish','open'].includes(action)?{action,reviewToken:token}:{action,targetState:'closed'};
 return {key:operationKey,signature,hash:await releaseRequestHash(signature)};
}
export async function mirrorReleaseReceipt(client,eventId){
 const db=client.runtimeDb;if(!db)return false;
 const store=createReleaseStore(db),current=await store.read(eventId);if(!current)return false;
 const revision=current.runtimeRevision;
 try{
  const old=await client.getDocument('drafts.'+releaseDocId(eventId));
  if(old?.runtimeRevision!==revision){
   const latest=await store.read(eventId);
   if(latest.runtimeRevision!==revision)return false;
   await client.savePrivate(RELEASE_TYPE,releaseDocId(eventId),{eventId,state:current.state,config:current.config,eventSnapshot:current.eventSnapshot,changedAt:current.changedAt,sourceRevision:current.sourceRevision,runtimeVersionId:current.versionId,runtimeRevision:revision},old?._rev);
  }
  await db.prepare('UPDATE app_release_receipts SET acknowledged_revision=?,attempts=0,next_attempt=0 WHERE event_id=? AND target_revision=?').bind(revision,eventId,revision).run();
  return true;
 }catch(error){
  await db.prepare('UPDATE app_release_receipts SET attempts=attempts+1,next_attempt=?+MIN(3600000,30000*(1<<MIN(attempts,7))) WHERE event_id=? AND target_revision=? AND acknowledged_revision<target_revision').bind(Date.now(),eventId,revision).run();
  console.error('Redaktionelle Freigabequittung ausstehend',{status:error.status||500});
  return false;
 }
}
export async function flushReleaseReceipts(client){
 if(!client.runtimeDb)return;
 const rows=(await client.runtimeDb.prepare('SELECT event_id FROM app_release_receipts WHERE target_revision>acknowledged_revision AND next_attempt<=? ORDER BY next_attempt,event_id LIMIT 10').bind(Date.now()).all()).results||[];
 for(const row of rows)await mirrorReleaseReceipt(client,row.event_id);
}
export async function writeRelease(client,{event,previous,action,operation,config,eventSnapshot,sourceRevision,actor}){
 const state=['close','unpublish'].includes(action)?'closed':action==='open'?'open':previous.state;
 if(!client.runtimeDb){
  await client.savePrivate(RELEASE_TYPE,releaseDocId(event.eventId),{eventId:event.eventId,state,config,eventSnapshot,changedAt:new Date().toISOString(),sourceRevision},previous._rev);
  return {receiptPending:false};
 }
 const store=createReleaseStore(client.runtimeDb);
 let result;
 if(['close','unpublish'].includes(action)&&previous._store==='d1'){
  result=await store.state({eventId:event.eventId,action,operationKey:operation.key,expectedRevision:previous.runtimeRevision,targetState:state});
 }else{
  result=await store.publish({eventId:event.eventId,action,operationKey:operation.key,expectedRevision:previous.runtimeRevision||0,state,config,eventSnapshot,sourceRevision,actor,requestSignature:operation.signature});
 }
 const mirrored=await mirrorReleaseReceipt(client,event.eventId);
 return {replayed:result.replayed===true,receiptPending:!mirrored,versionId:result.versionId};
}
