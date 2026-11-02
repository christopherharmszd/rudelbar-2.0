CREATE TABLE IF NOT EXISTS wall_media(
 id TEXT PRIMARY KEY,event_id TEXT NOT NULL,participation_id TEXT NOT NULL REFERENCES guest_participations(id),
 mime TEXT NOT NULL,original_bytes INTEGER NOT NULL,preview_bytes INTEGER NOT NULL,original_hash TEXT NOT NULL,preview_hash TEXT NOT NULL,
 original_ready INTEGER NOT NULL DEFAULT 0,preview_ready INTEGER NOT NULL DEFAULT 0,
 original_lease INTEGER NOT NULL DEFAULT 0,preview_lease INTEGER NOT NULL DEFAULT 0,
 attempted INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,
 CHECK(original_bytes>0 AND preview_bytes>0)
);
CREATE INDEX IF NOT EXISTS wall_media_owner ON wall_media(event_id,participation_id,created_at);
CREATE TABLE IF NOT EXISTS wall_posts(
 seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT NOT NULL UNIQUE,event_id TEXT NOT NULL,
 participation_id TEXT NOT NULL REFERENCES guest_participations(id),alias_snapshot TEXT NOT NULL,body TEXT NOT NULL,
 media_id TEXT REFERENCES wall_media(id),status TEXT NOT NULL CHECK(status IN('pending','approved','hidden','withdrawn')),
 display_consent INTEGER NOT NULL,external_consent INTEGER NOT NULL DEFAULT 0,consent_version TEXT NOT NULL,
 last_actor TEXT NOT NULL DEFAULT '',client_key TEXT NOT NULL,request_hash TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,
 UNIQUE(participation_id,client_key)
);
CREATE INDEX IF NOT EXISTS wall_posts_event ON wall_posts(event_id,seq);
CREATE TABLE IF NOT EXISTS wall_consent_history(
 id INTEGER PRIMARY KEY AUTOINCREMENT,post_id TEXT NOT NULL REFERENCES wall_posts(id),
 purpose TEXT NOT NULL CHECK(purpose IN('display','external')),enabled INTEGER NOT NULL,
 version TEXT NOT NULL,recorded_at INTEGER NOT NULL,operation_key TEXT NOT NULL,
 UNIQUE(post_id,purpose,operation_key)
);
CREATE TABLE IF NOT EXISTS wall_controls(
 event_id TEXT PRIMARY KEY,config_json TEXT NOT NULL DEFAULT '{}',revision INTEGER NOT NULL DEFAULT 1,updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS wall_audit(
 seq INTEGER PRIMARY KEY AUTOINCREMENT,event_id TEXT NOT NULL,post_id TEXT NOT NULL DEFAULT '',
 action TEXT NOT NULL,actor_id TEXT NOT NULL,recorded_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS wall_jobs(id TEXT PRIMARY KEY,last_run INTEGER NOT NULL DEFAULT 0,lease_until INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO wall_jobs(id) VALUES('retention');
CREATE TABLE IF NOT EXISTS wall_favorites(event_id TEXT NOT NULL,post_id TEXT NOT NULL REFERENCES wall_posts(id),actor_id TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(post_id,actor_id));
CREATE TABLE IF NOT EXISTS wall_archive_exports(
 id TEXT PRIMARY KEY,event_id TEXT NOT NULL,actor_id TEXT NOT NULL,manifest_json TEXT NOT NULL,manifest_hash TEXT NOT NULL,
 created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS wall_restored_archives(
 id TEXT PRIMARY KEY,event_id TEXT NOT NULL,title TEXT NOT NULL,manifest_json TEXT NOT NULL,manifest_hash TEXT NOT NULL,
 created_by TEXT NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,total_bytes INTEGER NOT NULL,ready INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS wall_restored_objects(
 archive_id TEXT NOT NULL REFERENCES wall_restored_archives(id),object_path TEXT NOT NULL,
 bytes INTEGER NOT NULL,sha256 TEXT NOT NULL,ready INTEGER NOT NULL DEFAULT 0,lease_until INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(archive_id,object_path)
);
CREATE TRIGGER IF NOT EXISTS wall_domain_submitted AFTER INSERT ON wall_posts BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 SELECT 'wall-submit-'||NEW.id,NEW.event_id,NEW.participation_id,'wall.submitted',NEW.id,NEW.client_key,NEW.created_at WHERE (SELECT enabled FROM reporting_settings WHERE id=1)=1;
 INSERT INTO wall_audit(event_id,post_id,action,actor_id,recorded_at) VALUES(NEW.event_id,NEW.id,'submitted',NEW.participation_id,NEW.created_at);
END;

CREATE TRIGGER IF NOT EXISTS wall_status_changed AFTER UPDATE ON wall_posts WHEN NEW.status!=OLD.status BEGIN
 INSERT INTO wall_audit(event_id,post_id,action,actor_id,recorded_at) VALUES(NEW.event_id,NEW.id,NEW.status,NEW.last_actor,NEW.updated_at);
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 SELECT 'wall-status-'||NEW.id||'-'||NEW.revision,NEW.event_id,CASE WHEN NEW.status='withdrawn' THEN NEW.participation_id ELSE NULL END,
 CASE WHEN NEW.status='approved' THEN 'wall.approved' ELSE 'wall.withdrawn' END,NEW.id,NEW.id||'-'||NEW.revision,NEW.updated_at
 WHERE NEW.status IN('approved','withdrawn') AND (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;
