-- Immutable packages and a single atomic pointer for each evening.
CREATE TABLE IF NOT EXISTS app_release_versions (
 version_id TEXT PRIMARY KEY,
 event_id TEXT NOT NULL,
 config_json TEXT NOT NULL CHECK(json_valid(config_json)),
 event_json TEXT NOT NULL CHECK(json_valid(event_json)),
 source_revision TEXT NOT NULL,
 source_resources_version TEXT NOT NULL CHECK(json_valid(source_resources_version)),
 created_at INTEGER NOT NULL,
 created_by TEXT NOT NULL,
 UNIQUE(event_id,version_id)
);
CREATE INDEX IF NOT EXISTS app_release_versions_event ON app_release_versions(event_id,created_at);
CREATE TRIGGER IF NOT EXISTS app_release_versions_immutable
 BEFORE UPDATE ON app_release_versions BEGIN
  SELECT RAISE(ABORT,'Published release packages are immutable');
 END;
CREATE TABLE IF NOT EXISTS app_active_releases (
 event_id TEXT PRIMARY KEY,
 version_id TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN('open','closed')),
 revision INTEGER NOT NULL CHECK(revision>0),
 updated_at INTEGER NOT NULL,
 last_operation TEXT NOT NULL,
 FOREIGN KEY(event_id,version_id) REFERENCES app_release_versions(event_id,version_id)
);
CREATE TABLE IF NOT EXISTS app_release_operations (
 event_id TEXT NOT NULL,
 operation_key TEXT NOT NULL,
 action TEXT NOT NULL CHECK(action IN('publish','open','close','unpublish')),
 request_hash TEXT NOT NULL,
 version_id TEXT NOT NULL,
 target_state TEXT NOT NULL CHECK(target_state IN('open','closed')),
 active_revision INTEGER NOT NULL,
 recorded_at INTEGER NOT NULL,
 PRIMARY KEY(event_id,operation_key),
 FOREIGN KEY(event_id,version_id) REFERENCES app_release_versions(event_id,version_id)
);
CREATE TABLE IF NOT EXISTS app_release_receipts (
 event_id TEXT PRIMARY KEY,
 target_revision INTEGER NOT NULL,
 acknowledged_revision INTEGER NOT NULL DEFAULT 0,
 next_attempt INTEGER NOT NULL DEFAULT 0,
 attempts INTEGER NOT NULL DEFAULT 0
);
