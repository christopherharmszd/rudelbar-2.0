CREATE TABLE IF NOT EXISTS live_activity (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,
 event_id TEXT NOT NULL, request_id TEXT NOT NULL REFERENCES live_requests(id),
 audience TEXT NOT NULL CHECK(audience IN('guest','team')),
 actor TEXT NOT NULL, kind TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS live_activity_event ON live_activity(event_id,audience,seq);
CREATE TABLE IF NOT EXISTS live_reads (
 event_id TEXT NOT NULL, recipient TEXT NOT NULL,
 request_id TEXT NOT NULL REFERENCES live_requests(id), seen_seq INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(event_id,recipient,request_id)
);
CREATE TABLE IF NOT EXISTS live_push_subscriptions (
 id TEXT PRIMARY KEY, event_id TEXT NOT NULL, recipient TEXT NOT NULL,
 audience TEXT NOT NULL, person_id TEXT NOT NULL DEFAULT '', grant_id TEXT NOT NULL DEFAULT '',
 auth_version TEXT NOT NULL DEFAULT '', endpoint_hash TEXT NOT NULL, subscription_json TEXT NOT NULL,
 return_path TEXT NOT NULL, expires_at INTEGER NOT NULL,
 active INTEGER NOT NULL DEFAULT 1, cursor INTEGER NOT NULL DEFAULT 0,
 next_attempt INTEGER NOT NULL DEFAULT 0, lease_until INTEGER NOT NULL DEFAULT 0,
 attempts INTEGER NOT NULL DEFAULT 0, last_status INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 UNIQUE(event_id,recipient,endpoint_hash)
);
CREATE INDEX IF NOT EXISTS live_push_pending ON live_push_subscriptions(active,next_attempt,expires_at);
