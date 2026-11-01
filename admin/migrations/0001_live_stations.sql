PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS live_visitors (
 id TEXT PRIMARY KEY, event_id TEXT NOT NULL, secret_hash TEXT NOT NULL,
 name TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS live_visitors_event ON live_visitors(event_id);
CREATE TABLE IF NOT EXISTS live_grants (
 id TEXT PRIMARY KEY, event_id TEXT NOT NULL, person_id TEXT NOT NULL,
 secret_hash TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
 revoked INTEGER NOT NULL DEFAULT 0 CHECK(revoked IN(0,1))
);
CREATE INDEX IF NOT EXISTS live_grants_event ON live_grants(event_id);
CREATE TABLE IF NOT EXISTS live_station_state (
 event_id TEXT NOT NULL, station_id TEXT NOT NULL,
 accepting INTEGER NOT NULL DEFAULT 1 CHECK(accepting IN(0,1)), revision INTEGER NOT NULL DEFAULT 1,
 PRIMARY KEY(event_id,station_id)
);
CREATE TABLE IF NOT EXISTS live_requests (
 id TEXT PRIMARY KEY, event_id TEXT NOT NULL, station_id TEXT NOT NULL, station_name TEXT NOT NULL,
 visitor_id TEXT NOT NULL REFERENCES live_visitors(id), client_key TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN('music','karaoke','message')),
 subject TEXT NOT NULL, payload_json TEXT NOT NULL, location TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'new' CHECK(status IN('new','queued','in_progress','done','declined','cancelled')),
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, queue_order INTEGER NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1, last_operation TEXT NOT NULL,
 UNIQUE(event_id,visitor_id,client_key)
);
CREATE INDEX IF NOT EXISTS live_requests_inbox ON live_requests(event_id,station_id,status,queue_order);
CREATE INDEX IF NOT EXISTS live_requests_visitor ON live_requests(event_id,visitor_id,created_at);
CREATE TABLE IF NOT EXISTS live_messages (
 id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES live_requests(id),
 direction TEXT NOT NULL CHECK(direction IN('visitor','team','internal','system')),
 author_name TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS live_messages_thread ON live_messages(request_id,created_at,id);
