export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  BOT_USERNAME: string;
  ADMIN_IDS: string;
  WEBAPP_URL: string;
  DEV_AUTH: string;
  APP_ENV: string;
}

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export interface UserRow {
  tg_id: number;
  username: string | null;
  first_name: string | null;
  photo_url: string | null;
  stars: number;
  xp: number;
  is_admin: number;
  is_banned: number;
  referred_by: number | null;
  daily_last: number;
  daily_streak: number;
  total_opened: number;
  total_spent: number;
  total_won: number;
  best_drop: number;
  games_played: number;
  games_won: number;
  upgrades_won: number;
  upgrades_lost: number;
  gift_upgrades: number;
  rocket_flights: number;
  rocket_cashed: number;
  market_sales: number;
  market_purchases: number;
  created_at: number;
  last_seen: number;
}

export interface InventoryRow {
  id: string;
  tg_id: number;
  item_key: string;
  value: number;
  serial: string;
  status: string;
  favorite: number;
  source: string;
  gift_level: number;
  gift_model: string | null;
  gift_backdrop: string | null;
  gift_symbol: string | null;
  created_at: number;
  updated_at: number;
}

export interface ListingRow {
  id: string;
  item_id: string;
  seller_id: number;
  price: number;
  created_at: number;
}

export interface AuctionRow {
  id: string;
  item_id: string;
  seller_id: number;
  min_bid: number;
  buyout: number | null;
  current_bid: number;
  current_bidder: number | null;
  ends_at: number;
  status: string;
  created_at: number;
}

export interface RocketRow {
  id: string;
  tg_id: number;
  item_id: string;
  item_value: number;
  started_at: number;
  crash_at: number;
  status: string;
  cashed_multiplier: number | null;
  settled_at: number | null;
}

export type AppEnv = {
  Bindings: Env;
  Variables: {
    tgUser: TelegramUser;
    dbUser: UserRow;
  };
};
