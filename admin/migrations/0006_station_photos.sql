CREATE TABLE IF NOT EXISTS live_station_photos (
 event_id TEXT NOT NULL,
 station_id TEXT NOT NULL,
 image_url TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at INTEGER NOT NULL,
 actor_name TEXT NOT NULL,
 PRIMARY KEY(event_id,station_id)
);
