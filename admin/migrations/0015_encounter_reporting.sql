-- Future confirmed operations only. No historical backfill or private content.
CREATE TRIGGER IF NOT EXISTS social_profile_measurement AFTER INSERT ON encounter_profiles
WHEN NEW.mode IN('play','dance') AND NEW.state='active' BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 SELECT 'social-start-'||NEW.id,NEW.event_id,NEW.participation_id,NEW.mode||'.activated',NEW.id,NEW.id,NEW.created_at
 WHERE (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;
CREATE TRIGGER IF NOT EXISTS social_profile_state_measurement AFTER UPDATE ON encounter_profiles
WHEN NEW.mode IN('play','dance') AND NEW.state!=OLD.state BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 SELECT 'social-state-'||NEW.id||'-'||NEW.revision,NEW.event_id,NEW.participation_id,NEW.mode||CASE WHEN NEW.state='active' THEN '.activated' ELSE '.paused' END,NEW.id,NEW.id||'-'||NEW.revision,NEW.updated_at
 WHERE (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;
CREATE TRIGGER IF NOT EXISTS social_interest_measurement AFTER INSERT ON encounter_interests
WHEN NEW.mode IN('play','dance') AND NEW.state='active' BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 SELECT 'social-interest-'||NEW.id,NEW.event_id,p.id,NEW.mode||'.interest',NEW.id,NEW.id,NEW.created_at
 FROM guest_participations p WHERE p.event_id=NEW.event_id AND p.profile_id=NEW.from_profile
 AND (SELECT enabled FROM reporting_settings WHERE id=1)=1 LIMIT 1;
END;
CREATE TRIGGER IF NOT EXISTS social_pair_measurement AFTER INSERT ON social_contexts
WHEN NEW.kind IN('play','dance') BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,type,object_id,operation_key,recorded_at)
 SELECT 'social-match-'||NEW.id,NEW.event_id,NEW.kind||'.matched',NEW.id,NEW.id,NEW.created_at
 WHERE (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;
CREATE TRIGGER IF NOT EXISTS hosted_round_measurement AFTER INSERT ON encounter_sessions
WHEN NEW.kind!='speed-dating' BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,type,object_id,operation_key,recorded_at)
 SELECT 'hosted-open-'||NEW.id,NEW.event_id,'encounter.opened',NEW.id,NEW.id,NEW.created_at
 WHERE (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;
CREATE TRIGGER IF NOT EXISTS hosted_round_state_measurement AFTER UPDATE ON encounter_sessions
WHEN NEW.kind!='speed-dating' AND NEW.state!=OLD.state AND NEW.state IN('running','ended') BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,type,object_id,operation_key,recorded_at)
 SELECT 'hosted-state-'||NEW.id||'-'||NEW.revision,NEW.event_id,CASE WHEN NEW.state='running' THEN 'encounter.started' ELSE 'encounter.ended' END,NEW.id,NEW.id||'-'||NEW.revision,NEW.updated_at
 WHERE (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;
CREATE TRIGGER IF NOT EXISTS hosted_join_measurement AFTER INSERT ON encounter_session_members BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 SELECT 'hosted-join-'||NEW.session_id||'-'||NEW.profile_id||'-'||NEW.joined_at,s.event_id,NEW.participation_id,CASE WHEN s.kind='speed-dating' THEN 'dating.round.joined' ELSE 'encounter.joined' END,s.id,NEW.profile_id||'-'||NEW.joined_at,NEW.joined_at
 FROM encounter_sessions s WHERE s.id=NEW.session_id AND (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;
CREATE TRIGGER IF NOT EXISTS hosted_leave_measurement AFTER DELETE ON encounter_session_members
WHEN EXISTS(SELECT 1 FROM encounter_sessions WHERE id=OLD.session_id AND kind!='speed-dating' AND state IN('open','ready','running') AND expires_at>CAST(unixepoch('subsec')*1000 AS INTEGER)) BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,type,object_id,operation_key,recorded_at)
 SELECT 'hosted-left-'||OLD.session_id||'-'||OLD.profile_id||'-'||OLD.joined_at,s.event_id,'encounter.left',s.id,OLD.profile_id||'-'||OLD.joined_at,CAST(unixepoch('subsec')*1000 AS INTEGER)
 FROM encounter_sessions s WHERE s.id=OLD.session_id AND (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;
CREATE TRIGGER IF NOT EXISTS contact_pair_measurement AFTER INSERT ON social_contexts
WHEN NEW.kind='contact' BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 SELECT 'contact-confirmed-'||NEW.id||'-'||p.id,NEW.event_id,p.id,'contact.confirmed',NEW.id,NEW.id||'-'||p.id,NEW.created_at
 FROM guest_participations p WHERE p.event_id=NEW.event_id AND p.profile_id IN(NEW.profile_a,NEW.profile_b)
 AND (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;
