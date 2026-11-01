-- Each wizard keeps one stable operation ID, so retries never duplicate a member.
CREATE TABLE IF NOT EXISTS app_member_onboarding (
 id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, person_id TEXT NOT NULL,
 payload_hash TEXT NOT NULL, input_json TEXT NOT NULL,
 account_id TEXT NOT NULL DEFAULT '', state TEXT NOT NULL DEFAULT 'pending',
 result_json TEXT NOT NULL DEFAULT '{}', lease_until INTEGER NOT NULL DEFAULT 0,
 profile_revision TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS app_content_ownership (
 content_id TEXT PRIMARY KEY, owner_account_id TEXT NOT NULL REFERENCES app_accounts(id), created_at INTEGER NOT NULL
);
