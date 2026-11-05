CREATE TABLE IF NOT EXISTS game_rounds (
 id TEXT PRIMARY KEY,
 event_id TEXT NOT NULL,
 booth_id TEXT NOT NULL,
 offer_type TEXT NOT NULL,
 offer_id TEXT NOT NULL,
 host_visitor_id TEXT NOT NULL,
 client_key TEXT NOT NULL,
 capacity INTEGER NOT NULL CHECK(capacity BETWEEN 2 AND 30),
 status TEXT NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','playing','ended')),
 revision INTEGER NOT NULL DEFAULT 1,
 last_operation TEXT NOT NULL DEFAULT '',
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 UNIQUE(event_id,host_visitor_id,client_key)
);
CREATE INDEX IF NOT EXISTS game_rounds_event ON game_rounds(event_id,status,offer_type,offer_id);
CREATE TABLE IF NOT EXISTS game_round_members (
 round_id TEXT NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
 visitor_id TEXT NOT NULL,
 joined_at INTEGER NOT NULL,
 operation TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(round_id,visitor_id)
);
