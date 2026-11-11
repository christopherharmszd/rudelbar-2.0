-- Additive editorial projection. No existing account, release or media is changed.
CREATE TABLE IF NOT EXISTS app_runtime_documents (
 dataset TEXT NOT NULL,
 id TEXT NOT NULL,
 type TEXT NOT NULL,
 document_json TEXT NOT NULL CHECK(json_valid(document_json)),
 source_updated_at TEXT NOT NULL DEFAULT '',
 mirrored_at INTEGER NOT NULL,
 PRIMARY KEY(dataset,id)
);
CREATE INDEX IF NOT EXISTS app_runtime_documents_type ON app_runtime_documents(dataset,type);
CREATE INDEX IF NOT EXISTS app_runtime_documents_event ON app_runtime_documents(dataset,json_extract(document_json,'$.eventId')) WHERE type='rudelAppEvent';
CREATE TABLE IF NOT EXISTS app_runtime_pending (
 dataset TEXT NOT NULL,
 id TEXT NOT NULL,
 token TEXT NOT NULL,
 started_at INTEGER NOT NULL,
 PRIMARY KEY(dataset,id)
);
CREATE TABLE IF NOT EXISTS app_runtime_content_state (
 id INTEGER PRIMARY KEY CHECK(id=1),
 ready INTEGER NOT NULL DEFAULT 0 CHECK(ready IN(0,1)),
 sync_token TEXT NOT NULL DEFAULT '',
 synced_at INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO app_runtime_content_state(id) VALUES(1);
