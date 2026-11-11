-- Small change markers, never message/photo content. Updated in the transaction
-- that changes the source data, so a later connection can always catch up.
CREATE TABLE IF NOT EXISTS app_live_signal_clock(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO app_live_signal_clock(id) VALUES(1);
CREATE TABLE IF NOT EXISTS app_live_signals(
 event_id TEXT NOT NULL,audience TEXT NOT NULL CHECK(audience IN('guest','team','public')),
 recipient TEXT NOT NULL DEFAULT '',topic TEXT NOT NULL,
 revision INTEGER NOT NULL,changed_at INTEGER NOT NULL,
 PRIMARY KEY(event_id,audience,recipient,topic)
);
CREATE INDEX IF NOT EXISTS app_live_signals_changes ON app_live_signals(event_id,revision);
CREATE INDEX IF NOT EXISTS app_live_signals_expiry ON app_live_signals(changed_at);
CREATE TABLE IF NOT EXISTS app_live_signal_maintenance(id INTEGER PRIMARY KEY CHECK(id=1),last_run INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO app_live_signal_maintenance(id) VALUES(1);

CREATE TRIGGER IF NOT EXISTS app_signal_station_activity AFTER INSERT ON live_activity BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,NEW.audience,CASE WHEN NEW.audience='guest' THEN 'g:'||r.visitor_id ELSE '' END,'inbox',c.revision,NEW.created_at FROM live_requests r,app_live_signal_clock c WHERE r.id=NEW.request_id AND c.id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;
CREATE TRIGGER IF NOT EXISTS app_signal_context AFTER INSERT ON guest_context_events BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals VALUES(NEW.event_id,'guest','g:'||NEW.participation_id,'inbox',(SELECT revision FROM app_live_signal_clock WHERE id=1),NEW.created_at)
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;
CREATE TRIGGER IF NOT EXISTS app_signal_wall AFTER INSERT ON wall_audit BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'guest','g:'||p.participation_id,'inbox',c.revision,NEW.recorded_at FROM wall_posts p,app_live_signal_clock c WHERE p.id=NEW.post_id AND c.id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
 INSERT INTO app_live_signals VALUES(NEW.event_id,'team','','wall',(SELECT revision FROM app_live_signal_clock WHERE id=1),NEW.recorded_at)
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
 INSERT INTO app_live_signals VALUES(NEW.event_id,'public','','wall',(SELECT revision FROM app_live_signal_clock WHERE id=1),NEW.recorded_at)
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;
CREATE TRIGGER IF NOT EXISTS app_signal_round_chat AFTER INSERT ON guest_conversation_activity BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'guest','g:'||m.visitor_id,'inbox',c.revision,NEW.created_at FROM guest_conversations r JOIN game_round_members m ON m.round_id=r.reference_id JOIN app_live_signal_clock c ON c.id=1 WHERE r.id=NEW.conversation_id AND m.visitor_id!=NEW.sender_id
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;
CREATE TRIGGER IF NOT EXISTS app_signal_social_chat AFTER INSERT ON social_messages BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT r.event_id,'guest','p:'||CASE WHEN r.profile_a=NEW.sender_profile THEN r.profile_b ELSE r.profile_a END,'inbox',c.revision,NEW.created_at FROM social_contexts r,app_live_signal_clock c WHERE r.id=NEW.context_id AND c.id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_app_active_releases_insert AFTER INSERT ON app_active_releases BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'public','','configuration',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_app_active_releases_update AFTER UPDATE ON app_active_releases BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'public','','configuration',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_live_station_state_insert AFTER INSERT ON live_station_state BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'public','','configuration',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_live_station_state_update AFTER UPDATE ON live_station_state BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'public','','configuration',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_live_station_photos_insert AFTER INSERT ON live_station_photos BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'public','','configuration',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_live_station_photos_update AFTER UPDATE ON live_station_photos BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'public','','configuration',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_game_rounds_insert AFTER INSERT ON game_rounds BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'public','','rounds',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_game_rounds_update AFTER UPDATE ON game_rounds BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'public','','rounds',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_encounter_profiles_insert AFTER INSERT ON encounter_profiles BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'public','','encounters',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_encounter_profiles_update AFTER UPDATE ON encounter_profiles BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'public','','encounters',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_encounter_sessions_insert AFTER INSERT ON encounter_sessions BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'public','','encounters',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_encounter_sessions_update AFTER UPDATE ON encounter_sessions BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'public','','encounters',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_wall_posts_insert AFTER INSERT ON wall_posts BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'team','','wall',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_wall_posts_update AFTER UPDATE ON wall_posts BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'team','','wall',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_guest_content_reports_insert AFTER INSERT ON guest_content_reports BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'team','','moderation',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_guest_content_reports_update AFTER UPDATE ON guest_content_reports BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'team','','moderation',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_social_reports_insert AFTER INSERT ON social_reports BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'team','','moderation',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_social_reports_update AFTER UPDATE ON social_reports BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'team','','moderation',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_raffle_audit_insert AFTER INSERT ON raffle_audit BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT (SELECT event_id FROM raffle_campaigns WHERE id=NEW.campaign_id),'team','','raffle',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_raffle_audit_update AFTER UPDATE ON raffle_audit BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT (SELECT event_id FROM raffle_campaigns WHERE id=NEW.campaign_id),'team','','raffle',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_game_round_members_insert AFTER INSERT ON game_round_members BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT (SELECT event_id FROM game_rounds WHERE id=NEW.round_id),'public','','rounds',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_social_context_a_insert AFTER INSERT ON social_contexts BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'guest','p:'||NEW.profile_a,'inbox',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_social_context_b_insert AFTER INSERT ON social_contexts BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'guest','p:'||NEW.profile_b,'inbox',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_game_round_members_update AFTER UPDATE ON game_round_members BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT (SELECT event_id FROM game_rounds WHERE id=NEW.round_id),'public','','rounds',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_social_context_a_update AFTER UPDATE ON social_contexts BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'guest','p:'||NEW.profile_a,'inbox',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_social_context_b_update AFTER UPDATE ON social_contexts BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'guest','p:'||NEW.profile_b,'inbox',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_account_security_update AFTER UPDATE ON app_accounts WHEN NEW.enabled!=OLD.enabled OR NEW.revision!=OLD.revision BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT a.event_id,'team','u:'||NEW.id,'security',c.revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_active_releases a,app_live_signal_clock c WHERE c.id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_app_sessions_security_update AFTER UPDATE ON app_sessions WHEN NEW.revoked!=OLD.revoked BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT a.event_id,'team','u:'||NEW.account_id,'security',c.revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_active_releases a,app_live_signal_clock c WHERE c.id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_live_grants_security_update AFTER UPDATE ON live_grants WHEN NEW.revoked!=OLD.revoked BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT a.event_id,'team','p:'||NEW.person_id,'security',c.revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_active_releases a,app_live_signal_clock c WHERE c.id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_guest_session_security_update AFTER UPDATE ON guest_sessions WHEN NEW.revoked_at IS NOT OLD.revoked_at BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT (SELECT event_id FROM guest_participations WHERE id=NEW.participation_id),'guest','g:'||NEW.participation_id,'security',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_guest_participation_security_update AFTER UPDATE ON guest_participations WHEN NEW.closed_at IS NOT OLD.closed_at BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'guest','g:'||NEW.id,'security',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_projection_public_insert AFTER INSERT ON app_runtime_documents BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT a.event_id,'public','','configuration',c.revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_active_releases a,app_live_signal_clock c WHERE c.id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_projection_team_insert AFTER INSERT ON app_runtime_documents BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT a.event_id,'team','','configuration',c.revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_active_releases a,app_live_signal_clock c WHERE c.id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_projection_public_update AFTER UPDATE ON app_runtime_documents BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT a.event_id,'public','','configuration',c.revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_active_releases a,app_live_signal_clock c WHERE c.id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_projection_team_update AFTER UPDATE ON app_runtime_documents BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT a.event_id,'team','','configuration',c.revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_active_releases a,app_live_signal_clock c WHERE c.id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_wall_controls_public_insert AFTER INSERT ON wall_controls  BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'public','','wall',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_wall_controls_public_update AFTER UPDATE ON wall_controls  BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'public','','wall',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_wall_favorites_team_insert AFTER INSERT ON wall_favorites  BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'team','','wall',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_wall_favorites_team_delete AFTER DELETE ON wall_favorites  BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT OLD.event_id,'team','','wall',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_wall_posts_public_delete AFTER DELETE ON wall_posts  BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT OLD.event_id,'public','','wall',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_game_round_members_public_delete AFTER DELETE ON game_round_members  BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT (SELECT event_id FROM game_rounds WHERE id=OLD.round_id),'public','','rounds',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_encounter_session_members_public_insert AFTER INSERT ON encounter_session_members  BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT (SELECT event_id FROM encounter_sessions WHERE id=NEW.session_id),'public','','encounters',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_encounter_session_members_public_delete AFTER DELETE ON encounter_session_members  BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT (SELECT event_id FROM encounter_sessions WHERE id=OLD.session_id),'public','','encounters',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_encounter_interests_guest_insert AFTER INSERT ON encounter_interests  BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'guest','p:'||NEW.to_profile,'encounters',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_encounter_interests_guest_update AFTER UPDATE ON encounter_interests  BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'guest','p:'||NEW.to_profile,'encounters',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_raffle_campaigns_public_insert AFTER INSERT ON raffle_campaigns  BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'public','','raffle',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_raffle_campaigns_public_update AFTER UPDATE ON raffle_campaigns  BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'public','','raffle',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_raffle_draws_public_insert AFTER INSERT ON raffle_draws  BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT (SELECT event_id FROM raffle_campaigns WHERE id=NEW.campaign_id),'public','','raffle',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_raffle_draws_public_update AFTER UPDATE ON raffle_draws  BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT (SELECT event_id FROM raffle_campaigns WHERE id=NEW.campaign_id),'public','','raffle',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_raffle_entries_team_insert AFTER INSERT ON raffle_entries  BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'team','','raffle',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_raffle_entries_team_update AFTER UPDATE ON raffle_entries  BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT NEW.event_id,'team','','raffle',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_contact_activity AFTER INSERT ON guest_contact_activity  BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT 'contacts-'||NEW.profile_id,'guest','p:'||NEW.profile_id,'inbox',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_contact_pair_a AFTER UPDATE ON guest_contact_pairs  BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT 'contacts-'||NEW.profile_a,'guest','p:'||NEW.profile_a,'inbox',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_contact_pair_b AFTER UPDATE ON guest_contact_pairs  BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT 'contacts-'||NEW.profile_b,'guest','p:'||NEW.profile_b,'inbox',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_contact_revoked AFTER UPDATE ON guest_contact_sessions WHEN NEW.revoked_at IS NOT OLD.revoked_at BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT 'contacts-'||NEW.profile_id,'guest','c:'||NEW.id,'security',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_contact_account_closed AFTER UPDATE ON guest_contact_accounts WHEN NEW.closed_at IS NOT OLD.closed_at BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT 'contacts-'||NEW.profile_id,'guest','p:'||NEW.profile_id,'security',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_profile_contact_closed AFTER UPDATE ON guest_profiles WHEN NEW.closed_at IS NOT OLD.closed_at BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT 'contacts-'||NEW.id,'guest','p:'||NEW.id,'security',revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM app_live_signal_clock WHERE id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;

CREATE TRIGGER IF NOT EXISTS app_signal_profile_guest_closed AFTER UPDATE ON guest_profiles WHEN NEW.closed_at IS NOT OLD.closed_at BEGIN
 UPDATE app_live_signal_clock SET revision=revision+1 WHERE id=1;
 INSERT INTO app_live_signals(event_id,audience,recipient,topic,revision,changed_at)
 SELECT p.event_id,'guest','g:'||p.id,'security',c.revision,CAST(unixepoch('subsec')*1000 AS INTEGER) FROM guest_participations p,app_live_signal_clock c WHERE p.profile_id=NEW.id AND c.id=1
 ON CONFLICT(event_id,audience,recipient,topic) DO UPDATE SET revision=excluded.revision,changed_at=excluded.changed_at;
END;
