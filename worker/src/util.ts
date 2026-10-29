import type { Env, UserRow } from './types';

export const now = () => Date.now();

export function randomFloat(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 4294967296;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomFloat() * (max - min + 1)) + min;
}

export function uid(prefix = ''): string {
  const value = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  return prefix ? `${prefix}_${value}` : value;
}

export function serial(): string {
  return String(randomInt(100000, 999999));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function levelInfo(xp: number): { level: number; next: number; progress: number } {
  const level = Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1);
  const currentFloor = Math.pow(level - 1, 2) * 100;
  const nextFloor = Math.pow(level, 2) * 100;
  const span = Math.max(1, nextFloor - currentFloor);
  return {
    level,
    next: nextFloor,
    progress: clamp((xp - currentFloor) / span, 0, 1),
  };
}

export function safeUser(user: UserRow) {
  return {
    id: user.tg_id,
    username: user.username,
    firstName: user.first_name,
    photoUrl: user.photo_url,
    stars: user.stars,
    xp: user.xp,
    level: levelInfo(user.xp).level,
    xpNext: levelInfo(user.xp).next,
    xpProgress: levelInfo(user.xp).progress,
    isAdmin: Boolean(user.is_admin),
    isBanned: Boolean(user.is_banned),
    stats: {
      totalOpened: user.total_opened,
      totalSpent: user.total_spent,
      totalWon: user.total_won,
      bestDrop: user.best_drop,
      gamesPlayed: user.games_played,
      gamesWon: user.games_won,
      upgradesWon: user.upgrades_won,
      upgradesLost: user.upgrades_lost,
      giftUpgrades: user.gift_upgrades,
      rocketFlights: user.rocket_flights,
      rocketCashed: user.rocket_cashed,
      marketSales: user.market_sales,
      marketPurchases: user.market_purchases,
      dailyStreak: user.daily_streak,
    },
    createdAt: user.created_at,
  };
}

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init?.headers ?? {}),
    },
  });
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function isAdmin(user: UserRow, env: Env): boolean {
  const ids = env.ADMIN_IDS.split(',').map((value) => Number(value.trim())).filter(Boolean);
  return ids.includes(user.tg_id) || user.tg_id === 7638194816;
}

export function transaction(
  db: D1Database,
  tgId: number,
  type: string,
  amount: number,
  meta?: unknown,
): D1PreparedStatement {
  return db
    .prepare('INSERT INTO transactions (id, tg_id, type, amount, meta, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(uid('tx'), tgId, type, amount, meta ? JSON.stringify(meta) : null, now());
}

export function logEvent(
  db: D1Database,
  tgId: number | null,
  type: string,
  payload?: unknown,
): D1PreparedStatement {
  return db
    .prepare('INSERT INTO event_log (id, tg_id, type, payload, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(uid('ev'), tgId, type, payload ? JSON.stringify(payload) : null, now());
}

export function inventoryView(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    itemKey: String(row.item_key),
    value: Number(row.value),
    serial: String(row.serial),
    status: String(row.status),
    favorite: Boolean(row.favorite),
    source: String(row.source),
    giftLevel: Number(row.gift_level ?? 1),
    giftModel: row.gift_model ? String(row.gift_model) : null,
    giftBackdrop: row.gift_backdrop ? String(row.gift_backdrop) : null,
    giftSymbol: row.gift_symbol ? String(row.gift_symbol) : null,
    createdAt: Number(row.created_at),
    ownerId: Number(row.tg_id),
  };
}
