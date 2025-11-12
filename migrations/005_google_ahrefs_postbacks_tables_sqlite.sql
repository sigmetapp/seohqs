-- Миграция для таблиц данных сайтов в SQLite

-- Таблица данных Google Search Console
CREATE TABLE IF NOT EXISTS google_search_console_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr REAL DEFAULT 0,
  position REAL DEFAULT 0,
  date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(site_id, date)
);

-- Таблица данных Ahrefs
CREATE TABLE IF NOT EXISTS ahrefs_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  domain_rating INTEGER DEFAULT 0,
  backlinks INTEGER DEFAULT 0,
  referring_domains INTEGER DEFAULT 0,
  organic_keywords INTEGER DEFAULT 0,
  organic_traffic INTEGER DEFAULT 0,
  date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(site_id, date)
);

-- Таблица постбеков
CREATE TABLE IF NOT EXISTS postbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  network TEXT NOT NULL,
  event TEXT NOT NULL,
  amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  data TEXT, -- JSON хранится как TEXT в SQLite
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_google_data_site_id ON google_search_console_data(site_id);
CREATE INDEX IF NOT EXISTS idx_google_data_date ON google_search_console_data(date);
CREATE INDEX IF NOT EXISTS idx_ahrefs_data_site_id ON ahrefs_data(site_id);
CREATE INDEX IF NOT EXISTS idx_ahrefs_data_date ON ahrefs_data(date);
CREATE INDEX IF NOT EXISTS idx_postbacks_site_id ON postbacks(site_id);
CREATE INDEX IF NOT EXISTS idx_postbacks_date ON postbacks(date);
CREATE INDEX IF NOT EXISTS idx_postbacks_network ON postbacks(network);
