-- Application-owned requests only. This is not the provider's account quota.
CREATE TABLE IF NOT EXISTS app_provider_budget(
 id TEXT PRIMARY KEY,day_window TEXT NOT NULL,month_window TEXT NOT NULL,
 day_attempts INTEGER NOT NULL,month_attempts INTEGER NOT NULL,updated_at INTEGER NOT NULL
);
