CREATE TABLE IF NOT EXISTS layout_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('load','change')),
  device TEXT NOT NULL CHECK (device IN ('desktop','mobile','tablet')),
  viewport_width INTEGER NOT NULL,
  viewport_height INTEGER NOT NULL,
  screen_width INTEGER NOT NULL,
  screen_height INTEGER NOT NULL,
  orientation TEXT NOT NULL,
  viewport_orientation TEXT NOT NULL,
  country TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS layout_observations_kind_time ON layout_observations(kind, created_at);

CREATE TABLE IF NOT EXISTS site_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('page_view','section','timeline_tab','year_reached','popup')),
  label TEXT NOT NULL,
  tab TEXT NOT NULL DEFAULT '',
  event_date TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS site_events_kind_time ON site_events(kind, created_at);
