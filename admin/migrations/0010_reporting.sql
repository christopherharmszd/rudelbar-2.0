-- Measurement begins at explicit configuration; no invented historical events.
CREATE TABLE IF NOT EXISTS reporting_settings(
 id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL DEFAULT 1,
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN(0,1)),
 analysis_enabled INTEGER NOT NULL DEFAULT 0 CHECK(analysis_enabled IN(0,1)),
 policy_version TEXT NOT NULL DEFAULT 'analysis-v1',purpose TEXT NOT NULL DEFAULT '',
 legal_basis TEXT NOT NULL DEFAULT '',privacy_url TEXT NOT NULL DEFAULT '',
 raw_days INTEGER NOT NULL DEFAULT 30 CHECK(raw_days BETWEEN 1 AND 30),
 aggregate_days INTEGER NOT NULL DEFAULT 396 CHECK(aggregate_days BETWEEN 1 AND 396),
 sensitive_min INTEGER NOT NULL DEFAULT 5 CHECK(sensitive_min>=5),
 operational_since INTEGER,client_since INTEGER,updated_at INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO reporting_settings(id) VALUES(1);
CREATE TABLE IF NOT EXISTS measurement_events(
 id TEXT PRIMARY KEY,event_id TEXT NOT NULL,participation_id TEXT NOT NULL REFERENCES guest_participations(id),
 operation_key TEXT NOT NULL,type TEXT NOT NULL,view TEXT NOT NULL DEFAULT '',action TEXT NOT NULL DEFAULT '',
 error_code TEXT NOT NULL DEFAULT '',refs_json TEXT NOT NULL CHECK(json_valid(refs_json)),
 recorded_at INTEGER NOT NULL,policy_version TEXT NOT NULL,request_hash TEXT NOT NULL,
 UNIQUE(event_id,participation_id,operation_key)
);
CREATE INDEX IF NOT EXISTS measurement_events_event ON measurement_events(event_id,recorded_at,type);
CREATE INDEX IF NOT EXISTS measurement_events_consent ON measurement_events(participation_id,policy_version);
CREATE TABLE IF NOT EXISTS reporting_daily(
 event_id TEXT NOT NULL,day TEXT NOT NULL,source TEXT NOT NULL,type TEXT NOT NULL,dimension TEXT NOT NULL,
 count INTEGER NOT NULL CHECK(count>=0),expires_at INTEGER NOT NULL,PRIMARY KEY(event_id,day,source,type,dimension)
);
CREATE TABLE IF NOT EXISTS reporting_coverage(
 source TEXT PRIMARY KEY,since INTEGER NOT NULL,updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reporting_provider_snapshots(
 provider TEXT NOT NULL,resource TEXT NOT NULL,period_start INTEGER NOT NULL,period_end INTEGER NOT NULL,
 measured_at INTEGER NOT NULL,metrics_json TEXT NOT NULL CHECK(json_valid(metrics_json)),
 PRIMARY KEY(provider,resource,period_start,period_end)
);
CREATE TRIGGER IF NOT EXISTS reporting_request_created AFTER INSERT ON live_requests
 WHEN (SELECT enabled FROM reporting_settings WHERE id=1)=1 BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at,refs_json)
 VALUES('request-created-'||NEW.id,NEW.event_id,NEW.visitor_id,'request.created',NEW.id,NEW.id,NEW.created_at,json_object('stationId',NEW.station_id,'kind',NEW.kind,'clientKey',NEW.client_key));
END;
CREATE TRIGGER IF NOT EXISTS reporting_request_status AFTER UPDATE OF status,station_id ON live_requests
 WHEN (NEW.status!=OLD.status OR NEW.station_id!=OLD.station_id) AND (SELECT enabled FROM reporting_settings WHERE id=1)=1 BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,type,object_id,operation_key,recorded_at,refs_json)
 VALUES('request-status-'||NEW.id||'-'||NEW.revision,NEW.event_id,'request.changed',NEW.id,NEW.id||'-'||NEW.revision,NEW.updated_at,json_object('stationId',NEW.station_id,'status',NEW.status));
END;
CREATE TRIGGER IF NOT EXISTS reporting_request_reply AFTER INSERT ON live_messages
 WHEN NEW.direction='team' AND (SELECT enabled FROM reporting_settings WHERE id=1)=1 BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,type,object_id,operation_key,recorded_at,refs_json)
 SELECT 'reply-'||NEW.id,event_id,'request.replied',NEW.request_id,NEW.id,NEW.created_at,json_object('stationId',station_id) FROM live_requests WHERE id=NEW.request_id;
END;
CREATE TRIGGER IF NOT EXISTS reporting_round_created AFTER INSERT ON game_rounds
 WHEN (SELECT enabled FROM reporting_settings WHERE id=1)=1 BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at,refs_json)
 VALUES('round-create-'||NEW.id,NEW.event_id,NEW.host_visitor_id,'round.created',NEW.id,NEW.id,NEW.created_at,json_object('boothId',NEW.booth_id,'offerId',NEW.offer_id,'offerType',NEW.offer_type,'clientKey',NEW.client_key));
END;
CREATE TRIGGER IF NOT EXISTS reporting_round_joined AFTER INSERT ON game_round_members
 WHEN NEW.operation!='' AND (SELECT enabled FROM reporting_settings WHERE id=1)=1 BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at,refs_json)
 SELECT 'join-'||NEW.round_id||'-'||NEW.visitor_id||'-'||NEW.operation,event_id,NEW.visitor_id,'round.joined',id,NEW.round_id||'-'||NEW.visitor_id||'-'||NEW.operation,NEW.joined_at,json_object('boothId',booth_id,'offerId',offer_id,'offerType',offer_type,'clientKey',NEW.operation) FROM game_rounds WHERE id=NEW.round_id;
END;
CREATE TRIGGER IF NOT EXISTS reporting_round_left BEFORE DELETE ON game_round_members
 WHEN (SELECT enabled FROM reporting_settings WHERE id=1)=1 BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at,refs_json)
 SELECT 'left-'||OLD.round_id||'-'||OLD.visitor_id||'-'||OLD.operation,event_id,OLD.visitor_id,'round.left',id,OLD.round_id||'-'||OLD.visitor_id||'-'||OLD.operation,CAST(unixepoch('subsec')*1000 AS INTEGER),json_object('boothId',booth_id,'offerId',offer_id) FROM game_rounds WHERE id=OLD.round_id;
END;
CREATE TRIGGER IF NOT EXISTS reporting_round_status AFTER UPDATE OF status ON game_rounds
 WHEN NEW.status!=OLD.status AND (SELECT enabled FROM reporting_settings WHERE id=1)=1 BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at,refs_json)
 VALUES('round-status-'||NEW.id||'-'||NEW.revision,NEW.event_id,CASE WHEN json_valid(NEW.last_operation) THEN json_extract(NEW.last_operation,'$.guest') END,CASE NEW.status WHEN 'playing' THEN 'round.started' ELSE 'round.ended' END,NEW.id,NEW.id||'-'||NEW.revision,NEW.updated_at,json_object('boothId',NEW.booth_id,'offerId',NEW.offer_id));
END;
CREATE TRIGGER IF NOT EXISTS reporting_guest_started AFTER INSERT ON guest_participations
 WHEN (SELECT enabled FROM reporting_settings WHERE id=1)=1 BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 VALUES('guest-start-'||NEW.id,NEW.event_id,NEW.id,'guest.started',NEW.id,NEW.id,NEW.created_at);
END;
CREATE TRIGGER IF NOT EXISTS reporting_inbox_read AFTER UPDATE OF seen_seq ON live_reads
 WHEN NEW.seen_seq>OLD.seen_seq AND NEW.recipient LIKE 'v:%' AND (SELECT enabled FROM reporting_settings WHERE id=1)=1 BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 VALUES('read-'||NEW.recipient||'-'||NEW.request_id||'-'||NEW.seen_seq,NEW.event_id,substr(NEW.recipient,3),'inbox.read',NEW.request_id,NEW.recipient||'-'||NEW.request_id||'-'||NEW.seen_seq,CAST(unixepoch('subsec')*1000 AS INTEGER));
END;
CREATE TRIGGER IF NOT EXISTS reporting_inbox_first_read AFTER INSERT ON live_reads
 WHEN NEW.seen_seq>0 AND NEW.recipient LIKE 'v:%' AND (SELECT enabled FROM reporting_settings WHERE id=1)=1 BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,participation_id,type,object_id,operation_key,recorded_at)
 VALUES('read-'||NEW.recipient||'-'||NEW.request_id||'-'||NEW.seen_seq,NEW.event_id,substr(NEW.recipient,3),'inbox.read',NEW.request_id,NEW.recipient||'-'||NEW.request_id||'-'||NEW.seen_seq,CAST(unixepoch('subsec')*1000 AS INTEGER));
END;
CREATE TRIGGER IF NOT EXISTS reporting_push_accepted AFTER UPDATE OF last_status ON live_push_subscriptions
 WHEN NEW.cursor>OLD.cursor AND NEW.last_status BETWEEN 200 AND 299 AND (SELECT enabled FROM reporting_settings WHERE id=1)=1 BEGIN
 INSERT OR IGNORE INTO domain_events(id,event_id,type,object_id,operation_key,recorded_at,refs_json)
 VALUES('push-'||NEW.id||'-'||NEW.cursor,NEW.event_id,'push.accepted','',NEW.id||'-'||NEW.cursor,NEW.updated_at,json_object('audience',NEW.audience));
END;
CREATE TABLE IF NOT EXISTS reporting_periods(
 source TEXT NOT NULL,started_at INTEGER NOT NULL,ended_at INTEGER,
 PRIMARY KEY(source,started_at)
);
CREATE TRIGGER IF NOT EXISTS reporting_periods_changed AFTER UPDATE ON reporting_settings BEGIN
 INSERT OR IGNORE INTO reporting_periods(source,started_at) SELECT 'server',NEW.updated_at WHERE NEW.enabled=1 AND OLD.enabled=0;
 UPDATE reporting_periods SET ended_at=NEW.updated_at WHERE source='server' AND ended_at IS NULL AND NEW.enabled=0 AND OLD.enabled=1;
 INSERT OR IGNORE INTO reporting_periods(source,started_at) SELECT 'client',NEW.updated_at WHERE NEW.enabled=1 AND NEW.analysis_enabled=1 AND (OLD.enabled=0 OR OLD.analysis_enabled=0);
 UPDATE reporting_periods SET ended_at=NEW.updated_at WHERE source='client' AND ended_at IS NULL AND (NEW.enabled=0 OR NEW.analysis_enabled=0) AND OLD.enabled=1 AND OLD.analysis_enabled=1;
END;
CREATE TABLE IF NOT EXISTS reporting_provider_settings(
 id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL DEFAULT 0,
 token_cipher TEXT NOT NULL DEFAULT '',revision INTEGER NOT NULL DEFAULT 1,
 last_sync INTEGER NOT NULL DEFAULT 0,last_status TEXT NOT NULL DEFAULT 'not-connected',
 updated_at INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO reporting_provider_settings(id) VALUES(1);
CREATE TABLE IF NOT EXISTS reporting_jobs(id TEXT PRIMARY KEY,last_run INTEGER NOT NULL DEFAULT 0,lease_until INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO reporting_jobs(id) VALUES('retention');
