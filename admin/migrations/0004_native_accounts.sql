-- Additive transition: legacy Redaktion and existing sessions remain intact.
CREATE TABLE IF NOT EXISTS app_credentials (
 account_id TEXT PRIMARY KEY REFERENCES app_accounts(id), password_json TEXT NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS app_password_links (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES app_accounts(id), token_hash TEXT NOT NULL UNIQUE,
 purpose TEXT NOT NULL CHECK(purpose IN ('invite','reset')), email TEXT NOT NULL COLLATE NOCASE,
 account_revision INTEGER NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
 used_at INTEGER, completion_id TEXT, revoked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS app_password_links_account ON app_password_links(account_id);
CREATE TABLE IF NOT EXISTS app_auth_limits (
 bucket TEXT PRIMARY KEY, window_start INTEGER NOT NULL, attempts INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS app_mail_settings (
 id INTEGER PRIMARY KEY CHECK(id=1), enabled INTEGER NOT NULL DEFAULT 0, password_cipher TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS app_mail_attempts (
 id TEXT PRIMARY KEY, email_hash TEXT NOT NULL, purpose TEXT NOT NULL,
 state TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS app_mail_attempts_time ON app_mail_attempts(created_at);
