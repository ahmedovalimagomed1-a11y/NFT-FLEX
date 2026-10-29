PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  tg_id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  photo_url TEXT,
  stars INTEGER NOT NULL DEFAULT 2500,
  xp INTEGER NOT NULL DEFAULT 0,
  is_admin INTEGER NOT NULL DEFAULT 0,
  is_banned INTEGER NOT NULL DEFAULT 0,
  referred_by INTEGER,
  daily_last INTEGER NOT NULL DEFAULT 0,
  daily_streak INTEGER NOT NULL DEFAULT 0,
  total_opened INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  total_won INTEGER NOT NULL DEFAULT 0,
  best_drop INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  upgrades_won INTEGER NOT NULL DEFAULT 0,
  upgrades_lost INTEGER NOT NULL DEFAULT 0,
  rocket_flights INTEGER NOT NULL DEFAULT 0,
  rocket_cashed INTEGER NOT NULL DEFAULT 0,
  market_sales INTEGER NOT NULL DEFAULT 0,
  market_purchases INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_stars ON users(stars DESC);

CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  tg_id INTEGER NOT NULL,
  item_key TEXT NOT NULL,
  value INTEGER NOT NULL,
  serial TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inventory',
  favorite INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'case',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_owner ON inventory(tg_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_value ON inventory(value DESC);

CREATE TABLE IF NOT EXISTS market_listings (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL UNIQUE,
  seller_id INTEGER NOT NULL,
  price INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_listings_price ON market_listings(price ASC);

CREATE TABLE IF NOT EXISTS auctions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL UNIQUE,
  seller_id INTEGER NOT NULL,
  min_bid INTEGER NOT NULL,
  buyout INTEGER,
  current_bid INTEGER NOT NULL DEFAULT 0,
  current_bidder INTEGER,
  ends_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auctions_ends ON auctions(status, ends_at);

CREATE TABLE IF NOT EXISTS rocket_rounds (
  id TEXT PRIMARY KEY,
  tg_id INTEGER NOT NULL,
  item_id TEXT NOT NULL UNIQUE,
  item_value INTEGER NOT NULL,
  started_at INTEGER NOT NULL,
  crash_at REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  cashed_multiplier REAL,
  settled_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_rocket_owner ON rocket_rounds(tg_id, status);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  tg_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  meta TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_owner ON transactions(tg_id, created_at DESC);

CREATE TABLE IF NOT EXISTS event_log (
  id TEXT PRIMARY KEY,
  tg_id INTEGER,
  type TEXT NOT NULL,
  payload TEXT,
  created_at INTEGER NOT NULL
);
