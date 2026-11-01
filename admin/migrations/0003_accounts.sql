-- Identity is independent from Sanity person profiles and from event participation.
CREATE TABLE IF NOT EXISTS app_accounts (
 id TEXT PRIMARY KEY, person_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 email TEXT NOT NULL COLLATE NOCASE UNIQUE, enabled INTEGER NOT NULL DEFAULT 1,
 roles_json TEXT NOT NULL DEFAULT '[]', revision INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS app_identities (
 issuer TEXT NOT NULL, subject TEXT NOT NULL, account_id TEXT NOT NULL UNIQUE REFERENCES app_accounts(id),
 verified_email TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(issuer,subject)
);
CREATE TABLE IF NOT EXISTS app_invitations (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES app_accounts(id),
 token_hash TEXT NOT NULL UNIQUE, email TEXT NOT NULL COLLATE NOCASE,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER, revoked INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS app_sessions (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES app_accounts(id),
 token_hash TEXT NOT NULL UNIQUE, csrf TEXT NOT NULL, created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS app_sessions_account ON app_sessions(account_id);
CREATE TABLE IF NOT EXISTS app_auth_flows (
 id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, state TEXT NOT NULL,
 verifier TEXT NOT NULL, nonce TEXT NOT NULL, invitation_hash TEXT NOT NULL DEFAULT '',
 return_path TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS app_audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT NOT NULL, actor_name TEXT NOT NULL,
 action TEXT NOT NULL, target_id TEXT NOT NULL, detail_json TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL
);
