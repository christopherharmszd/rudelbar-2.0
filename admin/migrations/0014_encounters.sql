-- Discovery, private pair conversations and persistent contacts have separate
-- purposes. These tables never enter Memory Wall exports.
CREATE TABLE IF NOT EXISTS encounter_media(
 id TEXT PRIMARY KEY,event_id TEXT NOT NULL,profile_id TEXT NOT NULL REFERENCES guest_profiles(id),
 participation_id TEXT NOT NULL REFERENCES guest_participations(id),mode TEXT NOT NULL CHECK(mode IN('play','dance','dating')),bytes INTEGER NOT NULL CHECK(bytes>0),
 sha256 TEXT NOT NULL,ready INTEGER NOT NULL DEFAULT 0,lease_until INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS encounter_profiles(
 id TEXT PRIMARY KEY,event_id TEXT NOT NULL,mode TEXT NOT NULL CHECK(mode IN('play','dance','dating')),
 profile_id TEXT NOT NULL REFERENCES guest_profiles(id),participation_id TEXT NOT NULL REFERENCES guest_participations(id),
 alias TEXT NOT NULL,about TEXT NOT NULL DEFAULT '',interests_json TEXT NOT NULL DEFAULT '[]',
 gender TEXT NOT NULL DEFAULT '',seeking_json TEXT NOT NULL DEFAULT '[]',gender_description TEXT NOT NULL DEFAULT '',
 adult_attested INTEGER NOT NULL DEFAULT 0,consent_version TEXT NOT NULL,media_id TEXT REFERENCES encounter_media(id),
 state TEXT NOT NULL CHECK(state IN('active','paused','withdrawn','expired')),revision INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,delete_at INTEGER NOT NULL,
 UNIQUE(event_id,mode,profile_id)
);
CREATE TABLE IF NOT EXISTS encounter_operations(
 id TEXT PRIMARY KEY,event_id TEXT NOT NULL,profile_id TEXT NOT NULL REFERENCES guest_profiles(id),
 operation_key TEXT NOT NULL,kind TEXT NOT NULL,target_id TEXT NOT NULL,request_hash TEXT NOT NULL,
 created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,UNIQUE(profile_id,operation_key)
);
CREATE TABLE IF NOT EXISTS encounter_consent_history(
 id TEXT PRIMARY KEY,event_id TEXT NOT NULL,profile_id TEXT NOT NULL REFERENCES guest_profiles(id),
 mode TEXT NOT NULL,version TEXT NOT NULL,enabled INTEGER NOT NULL,operation_key TEXT NOT NULL,
 recorded_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,UNIQUE(profile_id,mode,operation_key)
);
CREATE TABLE IF NOT EXISTS encounter_interests(
 id TEXT PRIMARY KEY,event_id TEXT NOT NULL,mode TEXT NOT NULL CHECK(mode IN('play','dance','dating')),
 from_profile TEXT NOT NULL REFERENCES guest_profiles(id),to_profile TEXT NOT NULL REFERENCES guest_profiles(id),
 state TEXT NOT NULL CHECK(state IN('active','withdrawn')),revision INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,
 UNIQUE(event_id,mode,from_profile,to_profile),CHECK(from_profile!=to_profile)
);
CREATE TABLE IF NOT EXISTS social_contexts(
 id TEXT PRIMARY KEY,event_id TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN('play','dance','dating','contact')),
 reference_id TEXT NOT NULL,profile_a TEXT NOT NULL REFERENCES guest_profiles(id),profile_b TEXT NOT NULL REFERENCES guest_profiles(id),
 state TEXT NOT NULL CHECK(state IN('active','ended')),reason TEXT NOT NULL DEFAULT '',policy_json TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,
 UNIQUE(event_id,kind,profile_a,profile_b),CHECK(profile_a<profile_b)
);
CREATE TABLE IF NOT EXISTS social_messages(
 seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT NOT NULL UNIQUE,context_id TEXT NOT NULL REFERENCES social_contexts(id),
 sender_profile TEXT NOT NULL REFERENCES guest_profiles(id),alias TEXT NOT NULL,body TEXT NOT NULL,
 client_key TEXT NOT NULL,request_hash TEXT NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,
 UNIQUE(context_id,sender_profile,client_key)
);
CREATE INDEX IF NOT EXISTS social_messages_context ON social_messages(context_id,seq);
CREATE TABLE IF NOT EXISTS social_reads(
 context_id TEXT NOT NULL REFERENCES social_contexts(id),profile_id TEXT NOT NULL REFERENCES guest_profiles(id),
 seen_seq INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(context_id,profile_id)
);
CREATE TABLE IF NOT EXISTS social_reports(
 id TEXT PRIMARY KEY,event_id TEXT NOT NULL,context_id TEXT NOT NULL REFERENCES social_contexts(id),
 reporter_profile TEXT NOT NULL REFERENCES guest_profiles(id),message_id TEXT NOT NULL DEFAULT '',media_id TEXT NOT NULL DEFAULT '',
 reason TEXT NOT NULL,comment TEXT NOT NULL,snapshot_json TEXT NOT NULL,operation_key TEXT NOT NULL,request_hash TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'new',revision INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,
 UNIQUE(reporter_profile,operation_key)
);
CREATE TABLE IF NOT EXISTS encounter_sessions(
 id TEXT PRIMARY KEY,event_id TEXT NOT NULL,offer_id TEXT NOT NULL,title TEXT NOT NULL,kind TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN('open','ready','running','ended')),min_people INTEGER NOT NULL,max_people INTEGER NOT NULL,
 policy_json TEXT NOT NULL,operation_key TEXT NOT NULL,request_hash TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,
 UNIQUE(event_id,operation_key)
);
CREATE TABLE IF NOT EXISTS encounter_session_members(
 session_id TEXT NOT NULL REFERENCES encounter_sessions(id),profile_id TEXT NOT NULL REFERENCES guest_profiles(id),
 participation_id TEXT NOT NULL REFERENCES guest_participations(id),alias TEXT NOT NULL,joined_at INTEGER NOT NULL,
 consent_version TEXT NOT NULL,PRIMARY KEY(session_id,profile_id)
);
CREATE TABLE IF NOT EXISTS guest_contact_accounts(
 profile_id TEXT PRIMARY KEY REFERENCES guest_profiles(id),email_lookup TEXT NOT NULL UNIQUE,
 alias TEXT NOT NULL,policy_version TEXT NOT NULL,verified_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,closed_at INTEGER
);
CREATE TABLE IF NOT EXISTS guest_contact_challenges(
 id TEXT PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,email_lookup TEXT NOT NULL,
 candidate_profile TEXT REFERENCES guest_profiles(id),purpose TEXT NOT NULL CHECK(purpose IN('enroll','recover')),
 policy_json TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'pending',mail_attempt_id TEXT NOT NULL,
 created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,consumed_at INTEGER
);
CREATE TABLE IF NOT EXISTS guest_contact_sessions(
 id TEXT PRIMARY KEY,profile_id TEXT NOT NULL REFERENCES guest_contact_accounts(profile_id),secret_hash TEXT NOT NULL,
 created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,revoked_at INTEGER
);
CREATE TABLE IF NOT EXISTS guest_contact_pairs(
 id TEXT PRIMARY KEY,profile_a TEXT NOT NULL REFERENCES guest_profiles(id),profile_b TEXT NOT NULL REFERENCES guest_profiles(id),
 source_event_id TEXT NOT NULL,source_context_id TEXT NOT NULL REFERENCES social_contexts(id),
 consent_a INTEGER NOT NULL DEFAULT 0,consent_b INTEGER NOT NULL DEFAULT 0,state TEXT NOT NULL DEFAULT 'pending',
 policy_json TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,
 UNIQUE(profile_a,profile_b),CHECK(profile_a<profile_b)
);
CREATE TABLE IF NOT EXISTS social_jobs(id TEXT PRIMARY KEY,last_run INTEGER NOT NULL DEFAULT 0,lease_until INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO social_jobs(id) VALUES('retention');
CREATE TRIGGER IF NOT EXISTS encounter_activated AFTER INSERT ON encounter_profiles WHEN NEW.mode='dating' AND NEW.state='active' BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 SELECT 'dating-start-'||NEW.id,NEW.event_id,NEW.participation_id,'dating.activated',NEW.id,NEW.id,NEW.created_at WHERE (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;
CREATE TRIGGER IF NOT EXISTS encounter_state_measurement AFTER UPDATE ON encounter_profiles WHEN NEW.mode='dating' AND NEW.state!=OLD.state BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 SELECT 'dating-state-'||NEW.id||'-'||NEW.revision,NEW.event_id,NEW.participation_id,CASE WHEN NEW.state='active' THEN 'dating.activated' ELSE 'dating.paused' END,NEW.id,NEW.id||'-'||NEW.revision,NEW.updated_at WHERE (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;
CREATE TRIGGER IF NOT EXISTS encounter_interest_measurement AFTER INSERT ON encounter_interests WHEN NEW.mode='dating' AND NEW.state='active' BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 SELECT 'dating-interest-'||NEW.id,NEW.event_id,p.id,'dating.interest',NEW.id,NEW.id,NEW.created_at FROM guest_participations p WHERE p.event_id=NEW.event_id AND p.profile_id=NEW.from_profile AND (SELECT enabled FROM reporting_settings WHERE id=1)=1 LIMIT 1;
END;
CREATE TRIGGER IF NOT EXISTS social_match_measurement AFTER INSERT ON social_contexts WHEN NEW.kind='dating' BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 SELECT 'dating-match-'||NEW.id||'-'||p.id,NEW.event_id,p.id,'dating.matched',NEW.id,NEW.id||'-'||p.id,NEW.created_at FROM guest_participations p WHERE p.event_id=NEW.event_id AND p.profile_id IN(NEW.profile_a,NEW.profile_b) AND (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;
CREATE TRIGGER IF NOT EXISTS social_match_notice AFTER INSERT ON social_contexts WHEN NEW.kind!='contact' BEGIN
 INSERT OR IGNORE INTO guest_context_events(event_id,participation_id,kind,object_id,revision,created_at,expires_at)
 SELECT NEW.event_id,p.participation_id,NEW.kind,NEW.id,NEW.revision,NEW.created_at,NEW.expires_at FROM encounter_profiles p WHERE p.event_id=NEW.event_id AND p.mode=NEW.kind AND p.profile_id IN(NEW.profile_a,NEW.profile_b);
END;
CREATE TRIGGER IF NOT EXISTS social_message_notice AFTER INSERT ON social_messages BEGIN
 INSERT OR IGNORE INTO guest_context_events(event_id,participation_id,kind,object_id,revision,created_at,expires_at)
 SELECT c.event_id,p.participation_id,c.kind,c.id,NEW.seq+1,NEW.created_at,c.expires_at FROM social_contexts c JOIN encounter_profiles p ON p.event_id=c.event_id AND p.mode=c.kind AND p.profile_id IN(c.profile_a,c.profile_b) WHERE c.id=NEW.context_id AND p.profile_id!=NEW.sender_profile;
END;
