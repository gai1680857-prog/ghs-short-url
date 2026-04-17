-- Click analytics. URL mappings stay in KV (fast lookup, existing data).
CREATE TABLE IF NOT EXISTS clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  ts INTEGER NOT NULL,
  ip TEXT,
  country TEXT,
  city TEXT,
  ua TEXT,
  referer TEXT
);

CREATE INDEX IF NOT EXISTS idx_clicks_slug_ts ON clicks(slug, ts DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_ts ON clicks(ts);
CREATE INDEX IF NOT EXISTS idx_clicks_country ON clicks(country);
