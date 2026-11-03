// Retention only touches the new purpose-bound tables. Existing event accounts,
// station requests, round conversations and Wall archives remain independent.
export function createSocialRetention(env){
 const db=env.LIVE_DB;
 async function run(now=Date.now()){
  const lease=now+300000,lock=await db.prepare("UPDATE social_jobs SET lease_until=? WHERE id='retention' AND lease_until<=? AND last_run<?").bind(lease,now,now-3600000).run();if(!lock.meta.changes)return {skipped:true};let removedMedia=0;
  try{
   await db.batch([
    db.prepare("UPDATE encounter_profiles SET state='expired',revision=revision+1,about='',interests_json='[]',gender='',seeking_json='[]',gender_description='',adult_attested=0,media_id=NULL,updated_at=? WHERE expires_at<=? AND state IN('active','paused')").bind(now,now),
    db.prepare('DELETE FROM encounter_session_members WHERE session_id IN(SELECT id FROM encounter_sessions WHERE expires_at<=?)').bind(now),
    db.prepare('DELETE FROM encounter_sessions WHERE expires_at<=?').bind(now),
    db.prepare('DELETE FROM social_messages WHERE expires_at<=?').bind(now),
    db.prepare('DELETE FROM social_reports WHERE expires_at<=?').bind(now),
    db.prepare('DELETE FROM guest_contact_pairs WHERE expires_at<=?').bind(now),
    db.prepare("UPDATE guest_contact_accounts SET closed_at=COALESCE(closed_at,?),email_lookup='closed-'||profile_id,alias='' WHERE expires_at<=?").bind(now,now),
    db.prepare('DELETE FROM guest_contact_push WHERE expires_at<=? OR session_id IN(SELECT id FROM guest_contact_sessions WHERE expires_at<=? OR revoked_at IS NOT NULL) OR profile_id IN(SELECT profile_id FROM guest_contact_accounts WHERE closed_at IS NOT NULL)').bind(now,now),
    db.prepare('DELETE FROM guest_contact_sessions WHERE expires_at<=? OR profile_id IN(SELECT profile_id FROM guest_contact_accounts WHERE closed_at IS NOT NULL)').bind(now),
    db.prepare('DELETE FROM guest_contact_challenges WHERE expires_at<=?').bind(now),
    db.prepare('DELETE FROM guest_contact_accounts WHERE closed_at<? AND NOT EXISTS(SELECT 1 FROM guest_contact_sessions WHERE profile_id=guest_contact_accounts.profile_id)').bind(now-30*86400000),
    db.prepare('DELETE FROM guest_contact_reads WHERE context_id IN(SELECT id FROM social_contexts WHERE expires_at<=?)').bind(now),
    db.prepare('DELETE FROM guest_contact_activity WHERE context_id IN(SELECT id FROM social_contexts WHERE expires_at<=?)').bind(now),
    db.prepare('DELETE FROM social_reads WHERE context_id IN(SELECT id FROM social_contexts WHERE expires_at<=? AND NOT EXISTS(SELECT 1 FROM guest_contact_pairs WHERE source_context_id=social_contexts.id) AND NOT EXISTS(SELECT 1 FROM social_reports WHERE context_id=social_contexts.id))').bind(now),
    db.prepare('DELETE FROM social_contexts WHERE expires_at<=? AND NOT EXISTS(SELECT 1 FROM guest_contact_pairs WHERE source_context_id=social_contexts.id) AND NOT EXISTS(SELECT 1 FROM social_reports WHERE context_id=social_contexts.id)').bind(now),
    db.prepare('DELETE FROM encounter_profiles WHERE delete_at<=?').bind(now),
    db.prepare('DELETE FROM encounter_interests WHERE expires_at<=?').bind(now),
    db.prepare('DELETE FROM encounter_operations WHERE expires_at<=?').bind(now),
    db.prepare('DELETE FROM encounter_consent_history WHERE expires_at<=?').bind(now),
    db.prepare("DELETE FROM guest_context_reads WHERE kind IN('play','dance','dating','contact') AND NOT EXISTS(SELECT 1 FROM guest_context_events n WHERE n.object_id=guest_context_reads.object_id AND n.expires_at>?)").bind(now),
    db.prepare("DELETE FROM guest_notice_clock WHERE source='context' AND source_seq IN(SELECT seq FROM guest_context_events WHERE kind IN('play','dance','dating','contact') AND expires_at<=?)").bind(now),
    db.prepare("DELETE FROM guest_context_events WHERE kind IN('play','dance','dating','contact') AND expires_at<=?").bind(now)
   ]);
   const media=(await db.prepare('SELECT id,event_id FROM encounter_media WHERE expires_at<=? AND lease_until<=? AND NOT EXISTS(SELECT 1 FROM social_reports WHERE media_id=encounter_media.id AND expires_at>?) LIMIT 100').bind(now,now-300000,now).all()).results||[];
   if(env.GUEST_MEDIA)for(const row of media){await env.GUEST_MEDIA.delete('encounters/'+row.event_id+'/'+row.id);await db.batch([db.prepare('UPDATE encounter_profiles SET media_id=NULL WHERE media_id=?').bind(row.id),db.prepare('DELETE FROM encounter_media WHERE id=? AND expires_at<=? AND lease_until<=? AND NOT EXISTS(SELECT 1 FROM social_reports WHERE media_id=encounter_media.id AND expires_at>?)').bind(row.id,now,now-300000,now)]);removedMedia++;}
   await db.prepare("UPDATE social_jobs SET last_run=?,lease_until=0 WHERE id='retention' AND lease_until=?").bind(now,lease).run();return {removedMedia};
  }catch(error){await db.prepare("UPDATE social_jobs SET lease_until=0 WHERE id='retention' AND lease_until=?").bind(lease).run();throw error;}
 }
 return {run};
}
