CREATE TABLE IF NOT EXISTS raffle_campaigns(
 id TEXT PRIMARY KEY,event_id TEXT NOT NULL,config_id TEXT NOT NULL,config_json TEXT NOT NULL,config_hash TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN('draft','open','frozen','ended')),revision INTEGER NOT NULL DEFAULT 1,
 last_operation TEXT NOT NULL DEFAULT '',frozen_pool_json TEXT NOT NULL DEFAULT '[]',frozen_pool_hash TEXT NOT NULL DEFAULT '',
 created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,UNIQUE(event_id,config_id)
);
CREATE TABLE IF NOT EXISTS raffle_prizes(
 campaign_id TEXT NOT NULL REFERENCES raffle_campaigns(id),prize_id TEXT NOT NULL,name TEXT NOT NULL,quantity INTEGER NOT NULL CHECK(quantity>=0),
 PRIMARY KEY(campaign_id,prize_id)
);
CREATE TABLE IF NOT EXISTS raffle_codes(
 id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL REFERENCES raffle_campaigns(id),code_hash TEXT NOT NULL UNIQUE,
 operation_key TEXT NOT NULL,claimed_profile TEXT,actor_id TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(campaign_id,operation_key)
);
CREATE TABLE IF NOT EXISTS raffle_entries(
 id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL REFERENCES raffle_campaigns(id),event_id TEXT NOT NULL,
 profile_id TEXT NOT NULL REFERENCES guest_profiles(id),participation_id TEXT NOT NULL REFERENCES guest_participations(id),
 alias TEXT NOT NULL,rules_version TEXT NOT NULL,age_attested INTEGER NOT NULL,public_consent INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN('active','withdrawn')),created_at INTEGER NOT NULL,
 UNIQUE(campaign_id,profile_id)
);
CREATE TABLE IF NOT EXISTS raffle_slots(
 id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL REFERENCES raffle_campaigns(id),options_json TEXT NOT NULL,card_id TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS raffle_card_single_issue ON raffle_slots(campaign_id,card_id) WHERE card_id!='';
CREATE TABLE IF NOT EXISTS raffle_draws(
 id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL REFERENCES raffle_campaigns(id),slot_id TEXT NOT NULL REFERENCES raffle_slots(id),
 entry_id TEXT NOT NULL REFERENCES raffle_entries(id),replaced_id TEXT NOT NULL DEFAULT '',generation INTEGER NOT NULL DEFAULT 1,
 operation_key TEXT NOT NULL,request_hash TEXT NOT NULL,pool_json TEXT NOT NULL,pool_hash TEXT NOT NULL,random_value INTEGER NOT NULL,
 rules_version TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN('pending','awarded','redeemed','lost','cancelled','expired')),
 prize_id TEXT NOT NULL DEFAULT '',revision INTEGER NOT NULL DEFAULT 1,last_operation TEXT NOT NULL DEFAULT '',
 created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,
 UNIQUE(campaign_id,operation_key),UNIQUE(slot_id,generation)
);
CREATE TABLE IF NOT EXISTS raffle_reservations(
 draw_id TEXT NOT NULL REFERENCES raffle_draws(id),campaign_id TEXT NOT NULL,prize_id TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'held' CHECK(state IN('held','issued','released')),PRIMARY KEY(draw_id,prize_id),
 FOREIGN KEY(campaign_id,prize_id) REFERENCES raffle_prizes(campaign_id,prize_id)
);
CREATE TABLE IF NOT EXISTS raffle_redemptions(
 id TEXT PRIMARY KEY,draw_id TEXT NOT NULL UNIQUE REFERENCES raffle_draws(id),campaign_id TEXT NOT NULL REFERENCES raffle_campaigns(id),
 operation_key TEXT NOT NULL,request_hash TEXT NOT NULL,prize_id TEXT NOT NULL,age_checked INTEGER NOT NULL,
 actor_id TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(campaign_id,operation_key)
);
CREATE TABLE IF NOT EXISTS raffle_audit(
 id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL REFERENCES raffle_campaigns(id),draw_id TEXT NOT NULL DEFAULT '',
 action TEXT NOT NULL,actor_id TEXT NOT NULL,reason TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS raffle_mutations(
 id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL REFERENCES raffle_campaigns(id),operation_key TEXT NOT NULL,
 kind TEXT NOT NULL,target_id TEXT NOT NULL,request_hash TEXT NOT NULL,created_at INTEGER NOT NULL,
 UNIQUE(campaign_id,operation_key)
);
CREATE TRIGGER IF NOT EXISTS raffle_slot_limit BEFORE INSERT ON raffle_slots BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM raffle_slots WHERE campaign_id=NEW.campaign_id)>=(SELECT json_extract(config_json,'$.maxAwards') FROM raffle_campaigns WHERE id=NEW.campaign_id) THEN RAISE(ABORT,'RAFFLE_AWARD_LIMIT') END;
END;
CREATE TRIGGER IF NOT EXISTS raffle_stock_limit BEFORE INSERT ON raffle_reservations WHEN NEW.state='held' BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM raffle_reservations WHERE campaign_id=NEW.campaign_id AND prize_id=NEW.prize_id AND state IN('held','issued'))>=(SELECT quantity FROM raffle_prizes WHERE campaign_id=NEW.campaign_id AND prize_id=NEW.prize_id) THEN RAISE(ABORT,'RAFFLE_STOCK_LIMIT') END;
END;
CREATE TRIGGER IF NOT EXISTS raffle_reservation_immutable BEFORE UPDATE ON raffle_reservations WHEN OLD.state!='held' AND NEW.state!=OLD.state BEGIN
 SELECT RAISE(ABORT,'RAFFLE_CLOSED_RESERVATION');
END;
CREATE TRIGGER IF NOT EXISTS raffle_entry_measurement AFTER INSERT ON raffle_entries BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 SELECT 'raffle-entry-'||NEW.id,NEW.event_id,NEW.participation_id,'raffle.entered',NEW.campaign_id,NEW.id,NEW.created_at WHERE (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;
CREATE TRIGGER IF NOT EXISTS raffle_draw_measurement AFTER INSERT ON raffle_draws BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,type,object_id,operation_key,recorded_at)
 SELECT 'raffle-draw-'||NEW.id,event_id,'raffle.drawn',NEW.campaign_id,NEW.id,NEW.created_at FROM raffle_campaigns WHERE id=NEW.campaign_id AND (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;
CREATE TRIGGER IF NOT EXISTS raffle_redemption_measurement AFTER INSERT ON raffle_redemptions BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,type,object_id,operation_key,recorded_at)
 SELECT 'raffle-redeemed-'||NEW.id,event_id,'prize.redeemed',NEW.campaign_id,NEW.id,NEW.created_at FROM raffle_campaigns WHERE id=NEW.campaign_id AND (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;

CREATE TRIGGER IF NOT EXISTS raffle_expiry_audit AFTER UPDATE ON raffle_draws WHEN NEW.state='expired' AND OLD.state!='expired' BEGIN
 INSERT INTO raffle_audit(id,campaign_id,draw_id,action,actor_id,reason,created_at)
 VALUES('expiry-'||NEW.id,NEW.campaign_id,NEW.id,'expired','system','Festgelegte Abholfrist abgelaufen',NEW.updated_at);
END;

CREATE TABLE IF NOT EXISTS guest_context_events(
 seq INTEGER PRIMARY KEY AUTOINCREMENT,event_id TEXT NOT NULL,participation_id TEXT NOT NULL REFERENCES guest_participations(id),
 kind TEXT NOT NULL,object_id TEXT NOT NULL,revision INTEGER NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,
 UNIQUE(participation_id,kind,object_id,revision)
);
CREATE INDEX IF NOT EXISTS guest_context_owner ON guest_context_events(participation_id,seq);
CREATE TABLE IF NOT EXISTS guest_context_reads(
 participation_id TEXT NOT NULL REFERENCES guest_participations(id),kind TEXT NOT NULL,object_id TEXT NOT NULL,
 seen_seq INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(participation_id,kind,object_id)
);
CREATE TABLE IF NOT EXISTS guest_context_push_cursors(
 subscription_id TEXT PRIMARY KEY REFERENCES live_push_subscriptions(id),cursor INTEGER NOT NULL DEFAULT 0,
 lease_until INTEGER NOT NULL DEFAULT 0,next_attempt INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO guest_context_push_cursors(subscription_id,cursor)
 SELECT s.id,COALESCE((SELECT MAX(n.seq) FROM guest_context_events n WHERE n.event_id=s.event_id),0) FROM live_push_subscriptions s WHERE s.audience='guest';
CREATE TRIGGER IF NOT EXISTS guest_context_clock AFTER INSERT ON guest_context_events BEGIN
 INSERT OR IGNORE INTO guest_notice_clock(event_id,source,source_seq,created_at) VALUES(NEW.event_id,'context',NEW.seq,NEW.created_at);
END;
CREATE TRIGGER IF NOT EXISTS raffle_context_notice AFTER INSERT ON raffle_audit WHEN NEW.draw_id!='' AND NEW.action IN('drawn','redrawn','settle','redeem','cancel','expired') BEGIN
 INSERT OR IGNORE INTO guest_context_events(event_id,participation_id,kind,object_id,revision,created_at,expires_at)
 SELECT c.event_id,e.participation_id,'raffle',d.id,d.revision,NEW.created_at,c.expires_at FROM raffle_draws d JOIN raffle_entries e ON e.id=d.entry_id JOIN raffle_campaigns c ON c.id=d.campaign_id WHERE d.id=NEW.draw_id;
END;
CREATE TRIGGER IF NOT EXISTS context_read_insert AFTER INSERT ON guest_context_reads WHEN NEW.seen_seq>0 AND NEW.kind!='dating' BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 SELECT 'context-read-'||NEW.participation_id||'-'||NEW.kind||'-'||NEW.object_id||'-'||NEW.seen_seq,event_id,NEW.participation_id,'inbox.read',NEW.object_id,CAST(NEW.seen_seq AS TEXT),CAST(unixepoch('subsec')*1000 AS INTEGER) FROM guest_participations WHERE id=NEW.participation_id AND (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;
CREATE TRIGGER IF NOT EXISTS context_read_update AFTER UPDATE ON guest_context_reads WHEN NEW.seen_seq>OLD.seen_seq AND NEW.kind!='dating' BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 SELECT 'context-read-'||NEW.participation_id||'-'||NEW.kind||'-'||NEW.object_id||'-'||NEW.seen_seq,event_id,NEW.participation_id,'inbox.read',NEW.object_id,CAST(NEW.seen_seq AS TEXT),CAST(unixepoch('subsec')*1000 AS INTEGER) FROM guest_participations WHERE id=NEW.participation_id AND (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;
CREATE TRIGGER IF NOT EXISTS wall_read_insert AFTER INSERT ON wall_notice_reads WHEN NEW.seen_seq>0 BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 SELECT 'wall-read-'||NEW.participation_id||'-'||NEW.post_id||'-'||NEW.seen_seq,event_id,NEW.participation_id,'inbox.read',NEW.post_id,CAST(NEW.seen_seq AS TEXT),CAST(unixepoch('subsec')*1000 AS INTEGER) FROM wall_posts WHERE id=NEW.post_id AND (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;
CREATE TRIGGER IF NOT EXISTS wall_read_update AFTER UPDATE ON wall_notice_reads WHEN NEW.seen_seq>OLD.seen_seq BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 SELECT 'wall-read-'||NEW.participation_id||'-'||NEW.post_id||'-'||NEW.seen_seq,event_id,NEW.participation_id,'inbox.read',NEW.post_id,CAST(NEW.seen_seq AS TEXT),CAST(unixepoch('subsec')*1000 AS INTEGER) FROM wall_posts WHERE id=NEW.post_id AND (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;
CREATE TRIGGER IF NOT EXISTS conversation_read_insert AFTER INSERT ON guest_conversation_reads WHEN NEW.seen_seq>0 BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 SELECT 'chat-read-'||NEW.participation_id||'-'||NEW.conversation_id||'-'||NEW.seen_seq,event_id,NEW.participation_id,'inbox.read',NEW.conversation_id,CAST(NEW.seen_seq AS TEXT),CAST(unixepoch('subsec')*1000 AS INTEGER) FROM guest_conversations WHERE id=NEW.conversation_id AND kind!='dating' AND (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;
CREATE TRIGGER IF NOT EXISTS conversation_read_update AFTER UPDATE ON guest_conversation_reads WHEN NEW.seen_seq>OLD.seen_seq BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 SELECT 'chat-read-'||NEW.participation_id||'-'||NEW.conversation_id||'-'||NEW.seen_seq,event_id,NEW.participation_id,'inbox.read',NEW.conversation_id,CAST(NEW.seen_seq AS TEXT),CAST(unixepoch('subsec')*1000 AS INTEGER) FROM guest_conversations WHERE id=NEW.conversation_id AND kind!='dating' AND (SELECT enabled FROM reporting_settings WHERE id=1)=1;
END;
