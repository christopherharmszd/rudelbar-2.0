-- Additive identity migration. Existing visitor IDs and secret hashes stay intact.
-- Re-running is safe. No merge by display name, no change to existing expiry.
CREATE TABLE IF NOT EXISTS guest_profiles (
 id TEXT PRIMARY KEY, created_at INTEGER NOT NULL,
 persistent INTEGER NOT NULL DEFAULT 0 CHECK(persistent IN(0,1)),
 closed_at INTEGER
);
CREATE TABLE IF NOT EXISTS guest_participations (
 id TEXT PRIMARY KEY REFERENCES live_visitors(id),
 event_id TEXT NOT NULL, profile_id TEXT NOT NULL REFERENCES guest_profiles(id),
 display_name TEXT NOT NULL, created_at INTEGER NOT NULL, closed_at INTEGER
);
CREATE INDEX IF NOT EXISTS guest_participations_profile ON guest_participations(profile_id,event_id);
CREATE INDEX IF NOT EXISTS guest_participations_event ON guest_participations(event_id,created_at);
CREATE TABLE IF NOT EXISTS guest_sessions (
 id TEXT PRIMARY KEY, participation_id TEXT NOT NULL REFERENCES guest_participations(id),
 secret_hash TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
 revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS guest_sessions_participation ON guest_sessions(participation_id,expires_at);
CREATE TABLE IF NOT EXISTS guest_consents (
 participation_id TEXT NOT NULL REFERENCES guest_participations(id),
 purpose TEXT NOT NULL CHECK(purpose IN('analysis','wall-display','wall-external','dating','contacts')),
 version TEXT NOT NULL, enabled INTEGER NOT NULL CHECK(enabled IN(0,1)),
 changed_at INTEGER NOT NULL,
 PRIMARY KEY(participation_id,purpose)
);
CREATE TABLE IF NOT EXISTS guest_consent_history (
 id TEXT PRIMARY KEY, participation_id TEXT NOT NULL REFERENCES guest_participations(id),
 purpose TEXT NOT NULL, version TEXT NOT NULL, enabled INTEGER NOT NULL CHECK(enabled IN(0,1)),
 changed_at INTEGER NOT NULL, operation_key TEXT NOT NULL,
 UNIQUE(participation_id,purpose,operation_key)
);
CREATE TABLE IF NOT EXISTS domain_events (
 id TEXT PRIMARY KEY, event_id TEXT NOT NULL,
 participation_id TEXT REFERENCES guest_participations(id),
 type TEXT NOT NULL, object_id TEXT NOT NULL DEFAULT '',
 operation_key TEXT NOT NULL, recorded_at INTEGER NOT NULL,
 refs_json TEXT NOT NULL DEFAULT '{}',
 UNIQUE(event_id,type,operation_key)
);
CREATE INDEX IF NOT EXISTS domain_events_event ON domain_events(event_id,recorded_at,type);
CREATE INDEX IF NOT EXISTS domain_events_participation ON domain_events(participation_id,recorded_at);

INSERT OR IGNORE INTO guest_profiles(id,created_at)
 SELECT 'gp-'||id,created_at FROM live_visitors;
INSERT OR IGNORE INTO guest_participations(id,event_id,profile_id,display_name,created_at)
 SELECT id,event_id,'gp-'||id,name,created_at FROM live_visitors;
INSERT OR IGNORE INTO guest_sessions(id,participation_id,secret_hash,created_at,expires_at)
 SELECT id,id,secret_hash,created_at,expires_at FROM live_visitors;

-- Keep the old write path compatible during staged rollout and code rollback.
CREATE TRIGGER IF NOT EXISTS guest_identity_on_visitor_insert
 AFTER INSERT ON live_visitors BEGIN
  INSERT INTO guest_profiles(id,created_at) VALUES('gp-'||NEW.id,NEW.created_at);
  INSERT INTO guest_participations(id,event_id,profile_id,display_name,created_at)
   VALUES(NEW.id,NEW.event_id,'gp-'||NEW.id,NEW.name,NEW.created_at);
  INSERT INTO guest_sessions(id,participation_id,secret_hash,created_at,expires_at)
   VALUES(NEW.id,NEW.id,NEW.secret_hash,NEW.created_at,NEW.expires_at);
 END;
CREATE TRIGGER IF NOT EXISTS guest_identity_on_name_update
 AFTER UPDATE OF name ON live_visitors BEGIN
  UPDATE guest_participations SET display_name=NEW.name WHERE id=NEW.id;
 END;
