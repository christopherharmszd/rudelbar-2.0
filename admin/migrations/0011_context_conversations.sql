-- Internal team profiles remain separate from event guest details.
CREATE TABLE IF NOT EXISTS guest_profile_details(
 participation_id TEXT PRIMARY KEY REFERENCES guest_participations(id),
 about TEXT NOT NULL DEFAULT '',interests_json TEXT NOT NULL DEFAULT '[]',
 revision INTEGER NOT NULL DEFAULT 1,updated_at INTEGER NOT NULL,
 last_operation TEXT NOT NULL,request_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS guest_blocks(
 id TEXT PRIMARY KEY,blocker_profile TEXT NOT NULL REFERENCES guest_profiles(id),
 blocked_profile TEXT NOT NULL REFERENCES guest_profiles(id),created_at INTEGER NOT NULL,
 UNIQUE(blocker_profile,blocked_profile),CHECK(blocker_profile!=blocked_profile)
);
CREATE INDEX IF NOT EXISTS guest_blocks_reverse ON guest_blocks(blocked_profile,blocker_profile);
CREATE TABLE IF NOT EXISTS round_membership_history(
 round_id TEXT NOT NULL REFERENCES game_rounds(id),participation_id TEXT NOT NULL REFERENCES guest_participations(id),
 joined_at INTEGER NOT NULL,left_at INTEGER,operation TEXT NOT NULL,joined_seq INTEGER NOT NULL DEFAULT 0,left_seq INTEGER,
 PRIMARY KEY(round_id,participation_id,joined_at,operation)
);
INSERT OR IGNORE INTO round_membership_history(round_id,participation_id,joined_at,operation)
 SELECT round_id,visitor_id,joined_at,operation FROM game_round_members;
CREATE TRIGGER IF NOT EXISTS conversation_round_joined AFTER INSERT ON game_round_members BEGIN
 INSERT OR IGNORE INTO round_membership_history(round_id,participation_id,joined_at,operation,joined_seq)
 VALUES(NEW.round_id,NEW.visitor_id,NEW.joined_at,NEW.operation,COALESCE((SELECT MAX(seq) FROM guest_conversation_activity),0));
END;
CREATE TRIGGER IF NOT EXISTS conversation_round_left BEFORE DELETE ON game_round_members BEGIN
 UPDATE round_membership_history SET left_at=CAST(unixepoch('subsec')*1000 AS INTEGER),left_seq=COALESCE((SELECT MAX(seq) FROM guest_conversation_activity),0)
 WHERE round_id=OLD.round_id AND participation_id=OLD.visitor_id AND left_at IS NULL;
END;
CREATE TABLE IF NOT EXISTS guest_conversations(
 id TEXT PRIMARY KEY,event_id TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN('round','dating','dance','contact')),
 reference_id TEXT NOT NULL,title TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,
 UNIQUE(event_id,kind,reference_id)
);
CREATE TABLE IF NOT EXISTS guest_conversation_messages(
 id TEXT PRIMARY KEY,conversation_id TEXT NOT NULL REFERENCES guest_conversations(id),
 participation_id TEXT NOT NULL REFERENCES guest_participations(id),alias TEXT NOT NULL,
 body TEXT NOT NULL,client_key TEXT NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,
 request_hash TEXT NOT NULL,UNIQUE(conversation_id,participation_id,client_key)
);
CREATE INDEX IF NOT EXISTS guest_conversation_messages_time ON guest_conversation_messages(conversation_id,created_at,id);
CREATE TABLE IF NOT EXISTS guest_conversation_activity(
 seq INTEGER PRIMARY KEY AUTOINCREMENT,event_id TEXT NOT NULL,conversation_id TEXT NOT NULL REFERENCES guest_conversations(id),
 message_id TEXT NOT NULL REFERENCES guest_conversation_messages(id) ON DELETE CASCADE,
 sender_id TEXT NOT NULL REFERENCES guest_participations(id),created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS guest_conversation_activity_event ON guest_conversation_activity(event_id,seq);
CREATE TABLE IF NOT EXISTS guest_conversation_reads(
 conversation_id TEXT NOT NULL REFERENCES guest_conversations(id),participation_id TEXT NOT NULL REFERENCES guest_participations(id),
 seen_seq INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(conversation_id,participation_id)
);
CREATE TABLE IF NOT EXISTS guest_content_reports(
 id TEXT PRIMARY KEY,event_id TEXT NOT NULL,conversation_id TEXT NOT NULL REFERENCES guest_conversations(id),
 message_id TEXT NOT NULL,reporter_id TEXT NOT NULL REFERENCES guest_participations(id),
 reason TEXT NOT NULL,comment TEXT NOT NULL,snapshot_json TEXT NOT NULL,
 client_key TEXT NOT NULL,request_hash TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'new',
 revision INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,
 UNIQUE(reporter_id,client_key)
);
CREATE TABLE IF NOT EXISTS guest_notice_clock(
 seq INTEGER PRIMARY KEY AUTOINCREMENT,event_id TEXT NOT NULL,source TEXT NOT NULL,source_seq INTEGER NOT NULL,
 created_at INTEGER NOT NULL,UNIQUE(source,source_seq)
);
INSERT OR IGNORE INTO guest_notice_clock(event_id,source,source_seq,created_at)
 SELECT event_id,'station',seq,created_at FROM live_activity ORDER BY seq;
CREATE TRIGGER IF NOT EXISTS conversation_station_clock AFTER INSERT ON live_activity BEGIN
 INSERT OR IGNORE INTO guest_notice_clock(event_id,source,source_seq,created_at) VALUES(NEW.event_id,'station',NEW.seq,NEW.created_at);
END;
CREATE TRIGGER IF NOT EXISTS conversation_message_activity AFTER INSERT ON guest_conversation_messages BEGIN
 INSERT INTO guest_conversation_activity(event_id,conversation_id,message_id,sender_id,created_at)
 SELECT event_id,NEW.conversation_id,NEW.id,NEW.participation_id,NEW.created_at FROM guest_conversations WHERE id=NEW.conversation_id;
 UPDATE guest_conversations SET updated_at=MAX(updated_at,NEW.created_at) WHERE id=NEW.conversation_id;
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 SELECT 'chat-'||NEW.id,event_id,NEW.participation_id,'conversation.sent',NEW.conversation_id,NEW.id,NEW.created_at FROM guest_conversations WHERE id=NEW.conversation_id AND kind='round' AND (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;
CREATE TRIGGER IF NOT EXISTS conversation_chat_clock AFTER INSERT ON guest_conversation_activity BEGIN
 INSERT OR IGNORE INTO guest_notice_clock(event_id,source,source_seq,created_at) VALUES(NEW.event_id,'conversation',NEW.seq,NEW.created_at);
END;
CREATE TABLE IF NOT EXISTS guest_chat_push_cursors(
 subscription_id TEXT PRIMARY KEY REFERENCES live_push_subscriptions(id),cursor INTEGER NOT NULL DEFAULT 0,
 lease_until INTEGER NOT NULL DEFAULT 0,next_attempt INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO guest_chat_push_cursors(subscription_id,cursor)
 SELECT s.id,COALESCE((SELECT MAX(a.seq) FROM guest_conversation_activity a WHERE a.event_id=s.event_id),0)
 FROM live_push_subscriptions s WHERE s.audience='guest';
CREATE TABLE IF NOT EXISTS guest_communication_jobs(
 id TEXT PRIMARY KEY,last_run INTEGER NOT NULL DEFAULT 0,lease_until INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO guest_communication_jobs(id) VALUES('retention');
