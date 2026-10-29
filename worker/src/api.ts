import { Hono } from 'hono';
import type { Context } from 'hono';
import {
  ACHIEVEMENTS,
  CASES,
  CASE_BY_KEY,
  GIFT_MAX_LEVEL,
  GIFT_TRAITS,
  ITEMS,
  ITEM_BY_KEY,
  RARITIES,
  giftNextValue,
  giftUpgradeCost,
  type CaseDef,
  type NftItem,
} from './catalog';
import { diagnoseInitData, isAdminId, requireAuth } from './auth';
import type { AppEnv, AuctionRow, InventoryRow, ListingRow, RocketRow, UserRow } from './types';
import {
  clamp,
  inventoryView,
  isAdmin,
  levelInfo,
  logEvent,
  now,
  randomFloat,
  randomInt,
  readJson,
  safeUser,
  serial,
  transaction,
  uid,
} from './util';

const api = new Hono<AppEnv>();
api.get('/health', (c) => c.json({ ok: true, name: 'NFT FLEX', time: now() }));
api.post('/public/auth-diag', async (c) => {
  const body = await readJson<Record<string, unknown>>(c.req.raw);
  const initData = c.req.header('X-Telegram-Init-Data') ?? '';
  const diagnostics = await diagnoseInitData(initData, c.env.TELEGRAM_BOT_TOKEN ?? '');
  await logEvent(c.env.DB, diagnostics.userId, 'auth_diag', {
    ...diagnostics,
    client: body ?? {},
    userAgent: (c.req.header('user-agent') ?? '').slice(0, 300),
  });
  return c.json({ ok: true, data: diagnostics });
});
api.use('*', requireAuth);

const ROCKET_RATE = 0.16;
const ROCKET_LIMIT = 100;

type InventoryItem = ReturnType<typeof inventoryView> & { item: NftItem };

async function allRows<T>(db: D1Database, sql: string, ...bindings: unknown[]): Promise<T[]> {
  const result = await db.prepare(sql).bind(...bindings).all<T>();
  return result.results ?? [];
}

function itemFor(key: string): NftItem | null {
  return ITEM_BY_KEY.get(key) ?? null;
}

function mapItem(row: InventoryRow | Record<string, unknown>): InventoryItem | null {
  const base = inventoryView(row as Record<string, unknown>);
  const item = itemFor(base.itemKey);
  if (!item) return null;
  return { ...base, item };
}

function caseView(definition: CaseDef) {
  const total = definition.pool.reduce((sum, entry) => sum + entry.weight, 0);
  return {
    ...definition,
    totalWeight: total,
    pool: definition.pool
      .map((entry) => {
        const item = itemFor(entry.itemKey);
        if (!item) return null;
        return { item, weight: entry.weight, chance: entry.weight / total };
      })
      .filter(Boolean),
  };
}

function pickCaseItem(definition: CaseDef, minRarity = 0): NftItem {
  const pool = definition.pool.filter((entry) => {
    const item = itemFor(entry.itemKey);
    return item && RARITIES[item.rarity].order >= minRarity;
  });
  const weighted = pool.length ? pool : definition.pool;
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = randomFloat() * total;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return itemFor(entry.itemKey)!;
  }
  return itemFor(weighted[weighted.length - 1].itemKey)!;
}

function itemValue(base: number): number {
  return Math.max(1, Math.round(base * (0.92 + randomFloat() * 0.16)));
}

function pickTrait(list: string[]): string {
  return list[randomInt(0, Math.max(0, list.length - 1))] ?? 'Classic';
}

function giftTraits(item: NftItem) {
  return {
    model: item.model || 'Classic',
    backdrop: pickTrait(GIFT_TRAITS.backdrops),
    symbol: pickTrait(GIFT_TRAITS.symbols),
  };
}

function dropXp(rarity: string): number {
  if (rarity === 'mythic') return 80;
  if (rarity === 'legendary') return 50;
  if (rarity === 'epic') return 30;
  return 18;
}

function rocketMultiplier(startedAt: number, at = now()): number {
  return clamp(1 + ((at - startedAt) / 1000) * ROCKET_RATE, 1, ROCKET_LIMIT);
}

function crashPoint(): number {
  const roll = randomFloat();
  const value = 0.96 / Math.max(0.0001, 1 - roll);
  return Math.round(clamp(value, 1.05, 40) * 100) / 100;
}

function dailyState(user: UserRow) {
  const current = now();
  const elapsed = current - user.daily_last;
  const available = elapsed >= 24 * 60 * 60 * 1000;
  const continued = elapsed < 48 * 60 * 60 * 1000;
  const nextStreak = available ? (continued ? Math.min(7, user.daily_streak + 1) : 1) : user.daily_streak;
  const reward = 200 + Math.min(7, nextStreak) * 100;
  return {
    available,
    streak: user.daily_streak,
    nextStreak,
    reward,
    nextAt: available ? current : user.daily_last + 24 * 60 * 60 * 1000,
  };
}

function achievementsFor(user: UserRow, inventoryCount: number) {
  const unlocked: Record<string, boolean> = {
    first_drop: user.total_opened >= 1,
    collector: inventoryCount >= 5,
    upgrader: user.upgrades_won >= 1,
    gift_master: user.gift_upgrades >= 1,
    risk_taker: user.games_played >= 5,
    rocket_man: user.rocket_cashed >= 1,
    trader: user.market_sales + user.market_purchases >= 1,
    rich: user.stars >= 10000,
    flexer: user.best_drop >= 5000,
    daily_7: user.daily_streak >= 7,
    legend: levelInfo(user.xp).level >= 10,
  };
  return ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: Boolean(unlocked[achievement.key]),
  }));
}

async function insertItem(
  db: D1Database,
  tgId: number,
  item: NftItem,
  source: string,
  value = itemValue(item.value),
): Promise<InventoryRow> {
  const time = now();
  const traits = giftTraits(item);
  const row: InventoryRow = {
    id: uid('nft'),
    tg_id: tgId,
    item_key: item.key,
    value,
    serial: serial(),
    status: 'inventory',
    favorite: 0,
    source,
    gift_level: 1,
    gift_model: traits.model,
    gift_backdrop: traits.backdrop,
    gift_symbol: traits.symbol,
    created_at: time,
    updated_at: time,
  };
  await db
    .prepare(
      `INSERT INTO inventory (id, tg_id, item_key, value, serial, status, favorite, source, gift_level, gift_model, gift_backdrop, gift_symbol, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'inventory', 0, ?, 1, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.tg_id,
      row.item_key,
      row.value,
      row.serial,
      row.source,
      row.gift_model,
      row.gift_backdrop,
      row.gift_symbol,
      row.created_at,
      row.updated_at,
    )
    .run();
  return row;
}

async function settleAuctions(db: D1Database) {
  const ended = await allRows<AuctionRow>(
    db,
    "SELECT * FROM auctions WHERE status = 'active' AND ends_at <= ?",
    now(),
  );
  for (const auction of ended) {
    if (auction.current_bidder) {
      await db.batch([
        db
          .prepare(
            "UPDATE inventory SET tg_id = ?, status = 'inventory', updated_at = ? WHERE id = ? AND status = 'auction'",
          )
          .bind(auction.current_bidder, now(), auction.item_id),
        db
          .prepare('UPDATE users SET stars = stars + ?, market_sales = market_sales + 1 WHERE tg_id = ?')
          .bind(auction.current_bid, auction.seller_id),
        db
          .prepare('UPDATE users SET market_purchases = market_purchases + 1 WHERE tg_id = ?')
          .bind(auction.current_bidder),
        db.prepare("UPDATE auctions SET status = 'sold' WHERE id = ?").bind(auction.id),
        transaction(db, auction.seller_id, 'auction_sale', auction.current_bid, { auction: auction.id }),
        logEvent(db, auction.seller_id, 'auction_sold', { auction: auction.id, bid: auction.current_bid }),
      ]);
    } else {
      await db.batch([
        db
          .prepare("UPDATE inventory SET status = 'inventory', updated_at = ? WHERE id = ? AND status = 'auction'")
          .bind(now(), auction.item_id),
        db.prepare("UPDATE auctions SET status = 'expired' WHERE id = ?").bind(auction.id),
        logEvent(db, auction.seller_id, 'auction_expired', { auction: auction.id }),
      ]);
    }
  }
}

async function settleRockets(db: D1Database, tgId?: number) {
  const rounds = tgId
    ? await allRows<RocketRow>(
        db,
        "SELECT * FROM rocket_rounds WHERE status = 'active' AND tg_id = ?",
        tgId,
      )
    : await allRows<RocketRow>(db, "SELECT * FROM rocket_rounds WHERE status = 'active'");
  const time = now();
  for (const round of rounds) {
    if (rocketMultiplier(round.started_at, time) >= round.crash_at) {
      await db.batch([
        db.prepare("UPDATE rocket_rounds SET status = 'crashed', settled_at = ? WHERE id = ? AND status = 'active'").bind(time, round.id),
        db.prepare("UPDATE inventory SET status = 'burned', updated_at = ? WHERE id = ? AND status = 'rocket'").bind(time, round.item_id),
        db
          .prepare("UPDATE users SET total_spent = total_spent + ? WHERE tg_id = ?")
          .bind(round.item_value, round.tg_id),
        logEvent(db, round.tg_id, 'rocket_crash', { round: round.id, value: round.item_value }),
      ]);
    }
  }
}

async function loadInventory(db: D1Database, tgId: number): Promise<InventoryItem[]> {
  const rows = await allRows<InventoryRow>(
    db,
    "SELECT * FROM inventory WHERE tg_id = ? AND status = 'inventory' ORDER BY value DESC, created_at DESC",
    tgId,
  );
  return rows.map(mapItem).filter((item): item is InventoryItem => Boolean(item));
}

async function loadMarket(db: D1Database) {
  const listingRows = await allRows<Record<string, unknown>>(
    db,
    `SELECT l.id AS listing_id, l.price, l.created_at AS listed_at,
            i.id AS item_id, i.item_key, i.value, i.serial, i.favorite, i.source, i.created_at AS item_created_at,
            u.tg_id AS seller_id, u.username AS seller_username, u.first_name AS seller_name, u.photo_url AS seller_photo
     FROM market_listings l
     JOIN inventory i ON i.id = l.item_id
     JOIN users u ON u.tg_id = l.seller_id
     ORDER BY l.created_at DESC LIMIT 80`,
  );
  const listings = listingRows
    .map((row) => {
      const item = itemFor(String(row.item_key));
      if (!item) return null;
      return {
        id: String(row.listing_id),
        price: Number(row.price),
        createdAt: Number(row.listed_at),
        seller: {
          id: Number(row.seller_id),
          username: row.seller_username,
          firstName: row.seller_name,
          photoUrl: row.seller_photo,
        },
        item: {
          ...inventoryView({
            id: row.item_id,
            item_key: row.item_key,
            value: row.value,
            serial: row.serial,
            status: 'listed',
            favorite: row.favorite,
            source: row.source,
            created_at: row.item_created_at,
            tg_id: row.seller_id,
          }),
          item,
        },
      };
    })
    .filter(Boolean);

  const auctionRows = await allRows<Record<string, unknown>>(
    db,
    `SELECT a.*, i.item_key, i.value, i.serial, i.favorite, i.source, i.created_at AS item_created_at,
            u.username AS seller_username, u.first_name AS seller_name, u.photo_url AS seller_photo,
            b.username AS bidder_username, b.first_name AS bidder_name
     FROM auctions a
     JOIN inventory i ON i.id = a.item_id
     JOIN users u ON u.tg_id = a.seller_id
     LEFT JOIN users b ON b.tg_id = a.current_bidder
     WHERE a.status = 'active'
     ORDER BY a.ends_at ASC LIMIT 60`,
  );
  const auctions = auctionRows
    .map((row) => {
      const item = itemFor(String(row.item_key));
      if (!item) return null;
      return {
        id: String(row.id),
        minBid: Number(row.min_bid),
        buyout: row.buyout ? Number(row.buyout) : null,
        currentBid: Number(row.current_bid ?? 0),
        currentBidder: row.current_bidder
          ? { id: Number(row.current_bidder), username: row.bidder_username, firstName: row.bidder_name }
          : null,
        endsAt: Number(row.ends_at),
        createdAt: Number(row.created_at),
        seller: {
          id: Number(row.seller_id),
          username: row.seller_username,
          firstName: row.seller_name,
          photoUrl: row.seller_photo,
        },
        item: {
          ...inventoryView({
            id: row.item_id,
            item_key: row.item_key,
            value: row.value,
            serial: row.serial,
            status: 'auction',
            favorite: row.favorite,
            source: row.source,
            created_at: row.item_created_at,
            tg_id: row.seller_id,
          }),
          item,
        },
      };
    })
    .filter(Boolean);

  return { listings, auctions };
}

async function rocketView(db: D1Database, round: RocketRow) {
  const itemRow = await db.prepare('SELECT * FROM inventory WHERE id = ?').bind(round.item_id).first<InventoryRow>();
  const item = itemRow ? mapItem(itemRow) : null;
  return {
    id: round.id,
    startedAt: round.started_at,
    currentMultiplier: rocketMultiplier(round.started_at),
    item,
    status: round.status,
    cashedMultiplier: round.cashed_multiplier,
  };
}

async function bootstrapData(c: Context<AppEnv>) {
  const db = c.env.DB;
  const user = c.get('dbUser');
  await settleAuctions(db);
  await settleRockets(db, user.tg_id);

  const fresh = await db.prepare('SELECT * FROM users WHERE tg_id = ?').bind(user.tg_id).first<UserRow>();
  const currentUser = fresh ?? user;
  const inventory = await loadInventory(db, user.tg_id);
  const market = await loadMarket(db);
  const activeRow = await db
    .prepare("SELECT * FROM rocket_rounds WHERE tg_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1")
    .bind(user.tg_id)
    .first<RocketRow>();
  const recentRows = await allRows<Record<string, unknown>>(
    db,
    `SELECT i.*, u.username, u.first_name, u.photo_url FROM inventory i JOIN users u ON u.tg_id = i.tg_id
     WHERE i.created_at > ? AND i.source != 'admin'
     ORDER BY i.created_at DESC LIMIT 12`,
    now() - 1000 * 60 * 60 * 24 * 7,
  );
  const recentDrops = recentRows
    .map((row) => {
      const item = itemFor(String(row.item_key));
      if (!item) return null;
      return {
        ...inventoryView(row),
        item,
        user: { id: Number(row.tg_id), username: row.username, firstName: row.first_name, photoUrl: row.photo_url },
      };
    })
    .filter(Boolean);

  const leaderboardRows = await allRows<Record<string, unknown>>(
    db,
    `SELECT u.tg_id, u.username, u.first_name, u.photo_url, u.stars, u.xp,
            COALESCE(SUM(CASE WHEN i.status = 'inventory' THEN i.value ELSE 0 END), 0) AS inventory_value
     FROM users u LEFT JOIN inventory i ON i.tg_id = u.tg_id
     WHERE u.is_banned = 0
     GROUP BY u.tg_id
     ORDER BY (u.stars + COALESCE(SUM(CASE WHEN i.status = 'inventory' THEN i.value ELSE 0 END), 0) + u.xp * 4) DESC
     LIMIT 10`,
  );
  const leaderboard = leaderboardRows.map((row, index) => ({
    rank: index + 1,
    id: Number(row.tg_id),
    username: row.username,
    firstName: row.first_name,
    photoUrl: row.photo_url,
    stars: Number(row.stars),
    xp: Number(row.xp),
    netWorth: Number(row.stars) + Number(row.inventory_value) + Number(row.xp) * 4,
  }));

  const myListingsRows = await allRows<Record<string, unknown>>(
    db,
    `SELECT l.id AS listing_id, l.price, l.created_at AS listed_at, i.*
     FROM market_listings l JOIN inventory i ON i.id = l.item_id
     WHERE l.seller_id = ? ORDER BY l.created_at DESC`,
    user.tg_id,
  );
  const myListings = myListingsRows
    .map((row) => {
      const item = itemFor(String(row.item_key));
      if (!item) return null;
      return {
        id: String(row.listing_id),
        price: Number(row.price),
        createdAt: Number(row.listed_at),
        item: {
          ...inventoryView({ ...row, id: row.id, status: 'listed', created_at: row.created_at }),
          item,
        },
      };
    })
    .filter(Boolean);

  const myAuctionsRows = await allRows<Record<string, unknown>>(
    db,
    `SELECT a.*, i.item_key, i.value, i.serial, i.favorite, i.source, i.created_at AS item_created_at
     FROM auctions a JOIN inventory i ON i.id = a.item_id
     WHERE a.seller_id = ? ORDER BY a.created_at DESC`,
    user.tg_id,
  );
  const myAuctions = myAuctionsRows
    .map((row) => {
      const item = itemFor(String(row.item_key));
      if (!item) return null;
      return {
        id: String(row.id),
        minBid: Number(row.min_bid),
        buyout: row.buyout ? Number(row.buyout) : null,
        currentBid: Number(row.current_bid ?? 0),
        endsAt: Number(row.ends_at),
        status: String(row.status),
        item: {
          ...inventoryView({
            id: row.item_id,
            item_key: row.item_key,
            value: row.value,
            serial: row.serial,
            status: 'auction',
            favorite: row.favorite,
            source: row.source,
            created_at: row.item_created_at,
            tg_id: row.seller_id,
          }),
          item,
        },
      };
    })
    .filter(Boolean);

  const transactions = await allRows<Record<string, unknown>>(
    db,
    'SELECT * FROM transactions WHERE tg_id = ? ORDER BY created_at DESC LIMIT 12',
    user.tg_id,
  );
  const activeRocket = activeRow ? await rocketView(db, activeRow) : null;

  return {
    user: safeUser(currentUser),
    inventory,
    cases: CASES.map(caseView),
    catalog: ITEMS,
    market,
    myListings,
    myAuctions,
    daily: dailyState(currentUser),
    achievements: achievementsFor(currentUser, inventory.length),
    leaderboard,
    recentDrops,
    transactions: transactions.map((row) => ({
      id: row.id,
      type: row.type,
      amount: Number(row.amount),
      meta: row.meta ? JSON.parse(String(row.meta)) : null,
      createdAt: Number(row.created_at),
    })),
    activeRocket,
    config: {
      botUsername: c.env.BOT_USERNAME,
      webappUrl: c.env.WEBAPP_URL,
      adminId: 7638194816,
      currency: 'звёзды',
    },
  };
}

api.get('/bootstrap', async (c) => {
  return c.json({ ok: true, data: await bootstrapData(c) });
});

api.post('/cases/open', async (c) => {
  const body = await readJson<{ caseKey?: string; count?: number }>(c.req.raw);
  const definition = CASE_BY_KEY.get(body?.caseKey ?? '');
  const count = body?.count === 5 ? 5 : 1;
  if (!definition) return c.json({ ok: false, error: 'CASE_NOT_FOUND' }, 404);
  const user = c.get('dbUser');
  const cost = definition.price * count;
  if (user.stars < cost) {
    return c.json({ ok: false, error: 'NOT_ENOUGH_STARS', message: 'Недостаточно звёзд' }, 400);
  }

  const rewards: InventoryRow[] = [];
  for (let index = 0; index < count; index += 1) {
    let item = pickCaseItem(definition);
    if (count === 5 && index === 4 && !rewards.some((reward) => RARITIES[itemFor(reward.item_key)!.rarity].order >= 3)) {
      item = pickCaseItem(definition, 3);
    }
    rewards.push(await insertItem(c.env.DB, user.tg_id, item, `case:${definition.key}`));
  }

  const bestValue = Math.max(0, ...rewards.map((reward) => reward.value));
  const xpGain = rewards.reduce((sum, reward) => sum + dropXp(itemFor(reward.item_key)!.rarity), 0);
  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE users SET stars = stars - ?, xp = xp + ?, total_opened = total_opened + ?,
       total_spent = total_spent + ?, total_won = total_won + ?, best_drop = MAX(best_drop, ?) WHERE tg_id = ?`,
    ).bind(cost, xpGain, count, cost, bestValue, bestValue, user.tg_id),
    transaction(c.env.DB, user.tg_id, 'case_open', -cost, { caseKey: definition.key, count }),
    logEvent(c.env.DB, user.tg_id, 'case_open', {
      caseKey: definition.key,
      count,
      rewards: rewards.map((reward) => reward.item_key),
    }),
  ]);

  const items = rewards.map((row) => mapItem(row)).filter(Boolean);
  return c.json({
    ok: true,
    data: {
      case: caseView(definition),
      items,
      cost,
      bestValue,
      xpGain,
      user: safeUser({ ...user, stars: user.stars - cost, xp: user.xp + xpGain, total_opened: user.total_opened + count }),
    },
  });
});

api.post('/upgrade', async (c) => {
  const body = await readJson<{ itemIds?: string[]; targetKey?: string }>(c.req.raw);
  const ids = Array.from(new Set((body?.itemIds ?? []).filter((value) => typeof value === 'string'))).slice(0, 5);
  const target = itemFor(body?.targetKey ?? '');
  if (!ids.length || !target) return c.json({ ok: false, error: 'BAD_REQUEST' }, 400);
  const user = c.get('dbUser');
  const placeholders = ids.map(() => '?').join(',');
  const stakeRows = await allRows<InventoryRow>(
    c.env.DB,
    `SELECT * FROM inventory WHERE id IN (${placeholders}) AND tg_id = ? AND status = 'inventory'`,
    ...ids,
    user.tg_id,
  );
  if (stakeRows.length !== ids.length) {
    return c.json({ ok: false, error: 'ITEM_NOT_AVAILABLE', message: 'Один из NFT уже занят' }, 400);
  }
  const total = stakeRows.reduce((sum, row) => sum + row.value, 0);
  const chance = clamp((total / target.value) * 0.9, 0.04, 0.9);
  const won = randomFloat() <= chance;
  const time = now();
  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(
      `UPDATE inventory SET status = 'burned', updated_at = ? WHERE id IN (${placeholders}) AND status = 'inventory'`,
    ).bind(time, ...ids),
    c.env.DB.prepare(
      `UPDATE users SET xp = xp + ?, upgrades_won = upgrades_won + ?, upgrades_lost = upgrades_lost + ? WHERE tg_id = ?`,
    ).bind(won ? 55 : 20, won ? 1 : 0, won ? 0 : 1, user.tg_id),
    logEvent(c.env.DB, user.tg_id, 'upgrade', { ids, targetKey: target.key, chance, won, total }),
  ];

  let newItem: InventoryItem | null = null;
  if (won) {
    const newRow = await insertItem(c.env.DB, user.tg_id, target, 'upgrade', target.value);
    newItem = mapItem(newRow);
    statements.push(
      c.env.DB.prepare('UPDATE users SET total_won = total_won + ?, best_drop = MAX(best_drop, ?) WHERE tg_id = ?').bind(
        target.value,
        target.value,
        user.tg_id,
      ),
    );
  } else {
    statements.push(
      c.env.DB.prepare('UPDATE users SET total_spent = total_spent + ? WHERE tg_id = ?').bind(total, user.tg_id),
    );
  }
  await c.env.DB.batch(statements);
  return c.json({
    ok: true,
    data: {
      won,
      chance,
      total,
      target,
      newItem,
      roll: Math.round(randomFloat() * 1000) / 1000,
    },
  });
});

api.post('/gifts/upgrade', async (c) => {
  const body = await readJson<{ itemId?: string }>(c.req.raw);
  const user = c.get('dbUser');
  const row = await c.env.DB.prepare(
    "SELECT * FROM inventory WHERE id = ? AND tg_id = ? AND status = 'inventory'",
  )
    .bind(body?.itemId ?? '', user.tg_id)
    .first<InventoryRow>();
  if (!row) return c.json({ ok: false, error: 'ITEM_NOT_AVAILABLE', message: 'Подарок не найден' }, 400);
  const item = itemFor(row.item_key);
  if (!item?.gift) return c.json({ ok: false, error: 'NOT_A_GIFT', message: 'Это не подарок' }, 400);
  const level = Number(row.gift_level ?? 1);
  if (level >= GIFT_MAX_LEVEL) {
    return c.json({ ok: false, error: 'MAX_LEVEL', message: 'Подарок уже максимального уровня' }, 400);
  }
  const cost = giftUpgradeCost(Number(row.value));
  if (user.stars < cost) {
    return c.json({ ok: false, error: 'INSUFFICIENT_STARS', message: `Нужно ${cost} звёзд` }, 400);
  }
  const nextLevel = level + 1;
  const nextValue = giftNextValue(Number(row.value));
  const backdrop = level % 2 === 0 ? pickTrait(GIFT_TRAITS.backdrops) : row.gift_backdrop || pickTrait(GIFT_TRAITS.backdrops);
  const symbol = nextLevel % 2 === 0 ? pickTrait(GIFT_TRAITS.symbols) : row.gift_symbol || pickTrait(GIFT_TRAITS.symbols);
  const time = now();
  await c.env.DB.batch([
    c.env.DB.prepare(
      'UPDATE users SET stars = stars - ?, xp = xp + 30, gift_upgrades = gift_upgrades + 1, last_seen = ? WHERE tg_id = ?',
    ).bind(cost, time, user.tg_id),
    c.env.DB.prepare(
      'UPDATE inventory SET value = ?, gift_level = ?, gift_model = ?, gift_backdrop = ?, gift_symbol = ?, updated_at = ? WHERE id = ? AND status = ?',
    ).bind(nextValue, nextLevel, item.model || row.gift_model || 'Classic', backdrop, symbol, time, row.id, 'inventory'),
    transaction(c.env.DB, user.tg_id, 'gift_upgrade', -cost, {
      itemId: row.id,
      itemKey: row.item_key,
      level: nextLevel,
    }),
    logEvent(c.env.DB, user.tg_id, 'gift_upgrade', {
      itemId: row.id,
      itemKey: row.item_key,
      from: level,
      to: nextLevel,
      cost,
    }),
  ]);
  return c.json({
    ok: true,
    data: {
      item: mapItem({
        ...row,
        value: nextValue,
        gift_level: nextLevel,
        gift_model: item.model || row.gift_model || 'Classic',
        gift_backdrop: backdrop,
        gift_symbol: symbol,
      }),
      cost,
      level: nextLevel,
      maxLevel: GIFT_MAX_LEVEL,
      nextCost: giftUpgradeCost(nextValue),
      valueGain: nextValue - Number(row.value),
    },
  });
});

api.post('/games/play', async (c) => {
  const body = await readJson<{ game?: string; choice?: string; itemId?: string }>(c.req.raw);
  const game = body?.game ?? '';
  const choice = body?.choice ?? '';
  const allowed: Record<string, string[]> = {
    coin: ['heads', 'tails'],
    color: ['red', 'black'],
    parity: ['even', 'odd'],
  };
  if (!allowed[game]?.includes(choice)) return c.json({ ok: false, error: 'BAD_GAME' }, 400);
  const user = c.get('dbUser');
  const row = await c.env.DB.prepare(
    "SELECT * FROM inventory WHERE id = ? AND tg_id = ? AND status = 'inventory'",
  )
    .bind(body?.itemId ?? '', user.tg_id)
    .first<InventoryRow>();
  if (!row) return c.json({ ok: false, error: 'ITEM_NOT_AVAILABLE' }, 400);

  const roll = randomFloat();
  const outcome =
    game === 'coin'
      ? roll < 0.5
        ? 'heads'
        : 'tails'
      : game === 'color'
        ? roll < 0.5
          ? 'red'
          : 'black'
        : roll < 0.5
          ? 'even'
          : 'odd';
  const won = outcome === choice;
  const newValue = won ? row.value * 2 : row.value;
  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(
      `UPDATE users SET xp = xp + ?, games_played = games_played + 1, games_won = games_won + ? WHERE tg_id = ?`,
    ).bind(won ? 30 : 12, won ? 1 : 0, user.tg_id),
    logEvent(c.env.DB, user.tg_id, 'minigame', { game, choice, outcome, won, item: row.id }),
  ];
  if (won) {
    statements.push(
      c.env.DB.prepare('UPDATE inventory SET value = ?, updated_at = ? WHERE id = ? AND status = ?').bind(
        newValue,
        now(),
        row.id,
        'inventory',
      ),
      c.env.DB.prepare('UPDATE users SET total_won = total_won + ?, best_drop = MAX(best_drop, ?) WHERE tg_id = ?').bind(
        newValue,
        newValue,
        user.tg_id,
      ),
    );
  } else {
    statements.push(
      c.env.DB.prepare("UPDATE inventory SET status = 'burned', updated_at = ? WHERE id = ? AND status = 'inventory'").bind(
        now(),
        row.id,
      ),
      c.env.DB.prepare('UPDATE users SET total_spent = total_spent + ? WHERE tg_id = ?').bind(row.value, user.tg_id),
    );
  }
  await c.env.DB.batch(statements);
  return c.json({
    ok: true,
    data: {
      won,
      outcome,
      choice,
      oldValue: row.value,
      newValue: won ? newValue : 0,
      item: mapItem({ ...row, value: newValue, status: won ? 'inventory' : 'burned' }),
    },
  });
});

api.post('/rocket/start', async (c) => {
  const body = await readJson<{ itemId?: string }>(c.req.raw);
  const user = c.get('dbUser');
  await settleRockets(c.env.DB, user.tg_id);
  const active = await c.env.DB.prepare("SELECT id FROM rocket_rounds WHERE tg_id = ? AND status = 'active'")
    .bind(user.tg_id)
    .first();
  if (active) return c.json({ ok: false, error: 'ROCKET_ACTIVE', message: 'Сначала заверши текущий полёт' }, 400);

  const row = await c.env.DB.prepare(
    "SELECT * FROM inventory WHERE id = ? AND tg_id = ? AND status = 'inventory'",
  )
    .bind(body?.itemId ?? '', user.tg_id)
    .first<InventoryRow>();
  if (!row) return c.json({ ok: false, error: 'ITEM_NOT_AVAILABLE' }, 400);

  const round: RocketRow = {
    id: uid('rocket'),
    tg_id: user.tg_id,
    item_id: row.id,
    item_value: row.value,
    started_at: now(),
    crash_at: crashPoint(),
    status: 'active',
    cashed_multiplier: null,
    settled_at: null,
  };
  await c.env.DB.batch([
    c.env.DB
      .prepare("UPDATE inventory SET status = 'rocket', updated_at = ? WHERE id = ? AND status = 'inventory'")
      .bind(now(), row.id),
    c.env.DB.prepare(
      `INSERT INTO rocket_rounds (id, tg_id, item_id, item_value, started_at, crash_at, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
    ).bind(round.id, round.tg_id, round.item_id, round.item_value, round.started_at, round.crash_at),
    c.env.DB.prepare('UPDATE users SET rocket_flights = rocket_flights + 1 WHERE tg_id = ?').bind(user.tg_id),
    logEvent(c.env.DB, user.tg_id, 'rocket_start', { round: round.id, itemValue: round.item_value }),
  ]);

  return c.json({
    ok: true,
    data: {
      id: round.id,
      startedAt: round.started_at,
      currentMultiplier: 1,
      item: mapItem(row),
    },
  });
});

api.post('/rocket/cashout', async (c) => {
  const body = await readJson<{ roundId?: string }>(c.req.raw);
  const user = c.get('dbUser');
  const round = await c.env.DB.prepare(
    "SELECT * FROM rocket_rounds WHERE id = ? AND tg_id = ? AND status = 'active'",
  )
    .bind(body?.roundId ?? '', user.tg_id)
    .first<RocketRow>();
  if (!round) return c.json({ ok: false, error: 'ROUND_NOT_FOUND' }, 404);

  const multiplier = rocketMultiplier(round.started_at);
  if (multiplier >= round.crash_at) {
    await c.env.DB.batch([
      c.env.DB.prepare("UPDATE rocket_rounds SET status = 'crashed', settled_at = ? WHERE id = ? AND status = 'active'").bind(
        now(),
        round.id,
      ),
      c.env.DB.prepare("UPDATE inventory SET status = 'burned', updated_at = ? WHERE id = ? AND status = 'rocket'").bind(
        now(),
        round.item_id,
      ),
      c.env.DB.prepare('UPDATE users SET total_spent = total_spent + ? WHERE tg_id = ?').bind(
        round.item_value,
        user.tg_id,
      ),
      logEvent(c.env.DB, user.tg_id, 'rocket_crash', { round: round.id, multiplier }),
    ]);
    return c.json({ ok: true, data: { crashed: true, multiplier, crashAt: round.crash_at } });
  }

  const newValue = Math.max(1, Math.round(round.item_value * multiplier));
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE rocket_rounds SET status = 'cashed', cashed_multiplier = ?, settled_at = ? WHERE id = ? AND status = 'active'").bind(
      multiplier,
      now(),
      round.id,
    ),
    c.env.DB
      .prepare("UPDATE inventory SET status = 'inventory', value = ?, updated_at = ? WHERE id = ? AND status = 'rocket'")
      .bind(newValue, now(), round.item_id),
    c.env.DB.prepare(
      'UPDATE users SET rocket_cashed = rocket_cashed + 1, xp = xp + 25, total_won = total_won + ?, best_drop = MAX(best_drop, ?) WHERE tg_id = ?',
    ).bind(newValue, newValue, user.tg_id),
    logEvent(c.env.DB, user.tg_id, 'rocket_cashout', { round: round.id, multiplier, newValue }),
  ]);
  const itemRow = await c.env.DB.prepare('SELECT * FROM inventory WHERE id = ?').bind(round.item_id).first<InventoryRow>();
  return c.json({
    ok: true,
    data: {
      crashed: false,
      multiplier,
      crashAt: round.crash_at,
      newValue,
      item: itemRow ? mapItem(itemRow) : null,
    },
  });
});

api.post('/rocket/status', async (c) => {
  const body = await readJson<{ roundId?: string }>(c.req.raw);
  const user = c.get('dbUser');
  await settleRockets(c.env.DB, user.tg_id);
  const round = await c.env.DB.prepare('SELECT * FROM rocket_rounds WHERE id = ? AND tg_id = ?')
    .bind(body?.roundId ?? '', user.tg_id)
    .first<RocketRow>();
  if (!round) return c.json({ ok: false, error: 'ROUND_NOT_FOUND' }, 404);
  return c.json({
    ok: true,
    data: {
      status: round.status,
      currentMultiplier: round.status === 'active' ? rocketMultiplier(round.started_at) : round.cashed_multiplier,
      itemValue: round.item_value,
    },
  });
});

api.post('/market/list', async (c) => {
  const body = await readJson<{ itemId?: string; price?: number }>(c.req.raw);
  const user = c.get('dbUser');
  const price = Math.round(Number(body?.price ?? 0));
  if (!Number.isFinite(price) || price < 1 || price > 1000000) {
    return c.json({ ok: false, error: 'BAD_PRICE', message: 'Цена должна быть от 1 до 1 000 000' }, 400);
  }
  const row = await c.env.DB.prepare(
    "SELECT * FROM inventory WHERE id = ? AND tg_id = ? AND status = 'inventory'",
  )
    .bind(body?.itemId ?? '', user.tg_id)
    .first<InventoryRow>();
  if (!row) return c.json({ ok: false, error: 'ITEM_NOT_AVAILABLE' }, 400);
  const id = uid('lot');
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE inventory SET status = 'listed', updated_at = ? WHERE id = ? AND status = 'inventory'").bind(
      now(),
      row.id,
    ),
    c.env.DB.prepare('INSERT INTO market_listings (id, item_id, seller_id, price, created_at) VALUES (?, ?, ?, ?, ?)').bind(
      id,
      row.id,
      user.tg_id,
      price,
      now(),
    ),
    logEvent(c.env.DB, user.tg_id, 'market_list', { listing: id, item: row.id, price }),
  ]);
  return c.json({ ok: true, data: { id, price } });
});

api.post('/market/buy', async (c) => {
  const body = await readJson<{ listingId?: string }>(c.req.raw);
  const user = c.get('dbUser');
  const listing = await c.env.DB.prepare('SELECT * FROM market_listings WHERE id = ?')
    .bind(body?.listingId ?? '')
    .first<ListingRow>();
  if (!listing) return c.json({ ok: false, error: 'LISTING_NOT_FOUND' }, 404);
  if (listing.seller_id === user.tg_id) return c.json({ ok: false, error: 'OWN_LISTING' }, 400);
  if (user.stars < listing.price) return c.json({ ok: false, error: 'NOT_ENOUGH_STARS' }, 400);
  const item = await c.env.DB.prepare('SELECT * FROM inventory WHERE id = ?')
    .bind(listing.item_id)
    .first<InventoryRow>();
  if (!item || item.status !== 'listed') return c.json({ ok: false, error: 'ITEM_NOT_AVAILABLE' }, 400);

  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET stars = stars - ?, market_purchases = market_purchases + 1 WHERE tg_id = ?').bind(
      listing.price,
      user.tg_id,
    ),
    c.env.DB.prepare('UPDATE users SET stars = stars + ?, market_sales = market_sales + 1 WHERE tg_id = ?').bind(
      listing.price,
      listing.seller_id,
    ),
    c.env.DB.prepare("UPDATE inventory SET tg_id = ?, status = 'inventory', favorite = 0, updated_at = ? WHERE id = ?").bind(
      user.tg_id,
      now(),
      listing.item_id,
    ),
    c.env.DB.prepare('DELETE FROM market_listings WHERE id = ?').bind(listing.id),
    transaction(c.env.DB, user.tg_id, 'market_buy', -listing.price, { listing: listing.id, item: listing.item_id }),
    transaction(c.env.DB, listing.seller_id, 'market_sale', listing.price, {
      listing: listing.id,
      item: listing.item_id,
    }),
    logEvent(c.env.DB, user.tg_id, 'market_buy', { listing: listing.id, price: listing.price }),
  ]);
  return c.json({ ok: true, data: { balance: user.stars - listing.price } });
});

api.post('/market/cancel', async (c) => {
  const body = await readJson<{ listingId?: string }>(c.req.raw);
  const user = c.get('dbUser');
  const listing = await c.env.DB.prepare('SELECT * FROM market_listings WHERE id = ? AND seller_id = ?')
    .bind(body?.listingId ?? '', user.tg_id)
    .first<ListingRow>();
  if (!listing) return c.json({ ok: false, error: 'LISTING_NOT_FOUND' }, 404);
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE inventory SET status = 'inventory', updated_at = ? WHERE id = ? AND status = 'listed'").bind(
      now(),
      listing.item_id,
    ),
    c.env.DB.prepare('DELETE FROM market_listings WHERE id = ?').bind(listing.id),
  ]);
  return c.json({ ok: true });
});

api.post('/auction/create', async (c) => {
  const body = await readJson<{ itemId?: string; minBid?: number; buyout?: number; hours?: number }>(c.req.raw);
  const user = c.get('dbUser');
  const minBid = Math.round(Number(body?.minBid ?? 0));
  const buyout = body?.buyout ? Math.round(Number(body.buyout)) : null;
  const hours = clamp(Math.round(Number(body?.hours ?? 6)), 1, 72);
  if (!Number.isFinite(minBid) || minBid < 1 || minBid > 1000000) {
    return c.json({ ok: false, error: 'BAD_PRICE' }, 400);
  }
  if (buyout !== null && (buyout <= minBid || buyout > 1000000)) {
    return c.json({ ok: false, error: 'BAD_BUYOUT' }, 400);
  }
  const row = await c.env.DB.prepare(
    "SELECT * FROM inventory WHERE id = ? AND tg_id = ? AND status = 'inventory'",
  )
    .bind(body?.itemId ?? '', user.tg_id)
    .first<InventoryRow>();
  if (!row) return c.json({ ok: false, error: 'ITEM_NOT_AVAILABLE' }, 400);
  const id = uid('auc');
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE inventory SET status = 'auction', updated_at = ? WHERE id = ? AND status = 'inventory'").bind(
      now(),
      row.id,
    ),
    c.env.DB.prepare(
      `INSERT INTO auctions (id, item_id, seller_id, min_bid, buyout, current_bid, ends_at, status, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, 'active', ?)`,
    ).bind(id, row.id, user.tg_id, minBid, buyout, now() + hours * 3600000, now()),
    logEvent(c.env.DB, user.tg_id, 'auction_create', { auction: id, minBid, buyout, hours }),
  ]);
  return c.json({ ok: true, data: { id } });
});

api.post('/auction/bid', async (c) => {
  const body = await readJson<{ auctionId?: string; amount?: number }>(c.req.raw);
  const user = c.get('dbUser');
  const auction = await c.env.DB.prepare("SELECT * FROM auctions WHERE id = ? AND status = 'active'")
    .bind(body?.auctionId ?? '')
    .first<AuctionRow>();
  if (!auction) return c.json({ ok: false, error: 'AUCTION_NOT_FOUND' }, 404);
  if (auction.ends_at <= now()) return c.json({ ok: false, error: 'AUCTION_ENDED' }, 400);
  if (auction.seller_id === user.tg_id) return c.json({ ok: false, error: 'OWN_AUCTION' }, 400);
  if (auction.current_bidder === user.tg_id) return c.json({ ok: false, error: 'ALREADY_LEADING' }, 400);
  const minimum = Math.max(auction.min_bid, auction.current_bid + Math.max(10, Math.ceil(auction.current_bid * 0.05)));
  const amount = Math.round(Number(body?.amount ?? 0));
  if (!Number.isFinite(amount) || amount < minimum) {
    return c.json({ ok: false, error: 'BID_TOO_LOW', message: `Минимальная ставка: ${minimum}` }, 400);
  }
  if (user.stars < amount) return c.json({ ok: false, error: 'NOT_ENOUGH_STARS' }, 400);

  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare('UPDATE users SET stars = stars - ? WHERE tg_id = ?').bind(amount, user.tg_id),
    c.env.DB.prepare(
      "UPDATE auctions SET current_bid = ?, current_bidder = ? WHERE id = ? AND status = 'active'",
    ).bind(amount, user.tg_id, auction.id),
    transaction(c.env.DB, user.tg_id, 'auction_bid', -amount, { auction: auction.id }),
    logEvent(c.env.DB, user.tg_id, 'auction_bid', { auction: auction.id, amount }),
  ];
  if (auction.current_bidder && auction.current_bid > 0) {
    statements.push(
      c.env.DB.prepare('UPDATE users SET stars = stars + ? WHERE tg_id = ?').bind(
        auction.current_bid,
        auction.current_bidder,
      ),
      transaction(c.env.DB, auction.current_bidder, 'auction_refund', auction.current_bid, {
        auction: auction.id,
      }),
    );
  }
  await c.env.DB.batch(statements);
  return c.json({ ok: true, data: { currentBid: amount } });
});

api.post('/auction/buyout', async (c) => {
  const body = await readJson<{ auctionId?: string }>(c.req.raw);
  const user = c.get('dbUser');
  const auction = await c.env.DB.prepare("SELECT * FROM auctions WHERE id = ? AND status = 'active'")
    .bind(body?.auctionId ?? '')
    .first<AuctionRow>();
  if (!auction || !auction.buyout) return c.json({ ok: false, error: 'BUYOUT_NOT_AVAILABLE' }, 400);
  if (auction.ends_at <= now()) return c.json({ ok: false, error: 'AUCTION_ENDED' }, 400);
  if (auction.seller_id === user.tg_id) return c.json({ ok: false, error: 'OWN_AUCTION' }, 400);
  if (user.stars < auction.buyout) return c.json({ ok: false, error: 'NOT_ENOUGH_STARS' }, 400);

  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare('UPDATE users SET stars = stars - ?, market_purchases = market_purchases + 1 WHERE tg_id = ?').bind(
      auction.buyout,
      user.tg_id,
    ),
    c.env.DB.prepare('UPDATE users SET stars = stars + ?, market_sales = market_sales + 1 WHERE tg_id = ?').bind(
      auction.buyout,
      auction.seller_id,
    ),
    c.env.DB.prepare("UPDATE inventory SET tg_id = ?, status = 'inventory', favorite = 0, updated_at = ? WHERE id = ?").bind(
      user.tg_id,
      now(),
      auction.item_id,
    ),
    c.env.DB.prepare("UPDATE auctions SET status = 'sold' WHERE id = ?").bind(auction.id),
    transaction(c.env.DB, user.tg_id, 'auction_buyout', -auction.buyout, { auction: auction.id }),
    transaction(c.env.DB, auction.seller_id, 'auction_sale', auction.buyout, { auction: auction.id }),
    logEvent(c.env.DB, user.tg_id, 'auction_buyout', { auction: auction.id, price: auction.buyout }),
  ];
  if (auction.current_bidder && auction.current_bid > 0) {
    statements.push(
      c.env.DB.prepare('UPDATE users SET stars = stars + ? WHERE tg_id = ?').bind(
        auction.current_bid,
        auction.current_bidder,
      ),
      transaction(c.env.DB, auction.current_bidder, 'auction_refund', auction.current_bid, {
        auction: auction.id,
      }),
    );
  }
  await c.env.DB.batch(statements);
  return c.json({ ok: true, data: { balance: user.stars - auction.buyout } });
});

api.post('/auction/cancel', async (c) => {
  const body = await readJson<{ auctionId?: string }>(c.req.raw);
  const user = c.get('dbUser');
  const auction = await c.env.DB.prepare('SELECT * FROM auctions WHERE id = ? AND seller_id = ?')
    .bind(body?.auctionId ?? '', user.tg_id)
    .first<AuctionRow>();
  if (!auction) return c.json({ ok: false, error: 'AUCTION_NOT_FOUND' }, 404);
  if (auction.current_bid > 0) return c.json({ ok: false, error: 'HAS_BIDS', message: 'Нельзя отменить лот со ставками' }, 400);
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE inventory SET status = 'inventory', updated_at = ? WHERE id = ? AND status = 'auction'").bind(
      now(),
      auction.item_id,
    ),
    c.env.DB.prepare("UPDATE auctions SET status = 'cancelled' WHERE id = ?").bind(auction.id),
  ]);
  return c.json({ ok: true });
});

api.post('/daily/claim', async (c) => {
  const user = c.get('dbUser');
  const state = dailyState(user);
  if (!state.available) {
    return c.json({ ok: false, error: 'DAILY_COOLDOWN', nextAt: state.nextAt }, 400);
  }
  const current = now();
  const newStreak = state.nextStreak;
  const reward = state.reward;
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET stars = stars + ?, xp = xp + 20, daily_last = ?, daily_streak = ? WHERE tg_id = ?').bind(
      reward,
      current,
      newStreak,
      user.tg_id,
    ),
    transaction(c.env.DB, user.tg_id, 'daily', reward, { streak: newStreak }),
  ]);
  return c.json({ ok: true, data: { reward, streak: newStreak, balance: user.stars + reward } });
});

api.post('/inventory/favorite', async (c) => {
  const body = await readJson<{ itemId?: string }>(c.req.raw);
  const user = c.get('dbUser');
  const row = await c.env.DB.prepare("SELECT * FROM inventory WHERE id = ? AND tg_id = ? AND status = 'inventory'")
    .bind(body?.itemId ?? '', user.tg_id)
    .first<InventoryRow>();
  if (!row) return c.json({ ok: false, error: 'ITEM_NOT_FOUND' }, 404);
  await c.env.DB.prepare('UPDATE inventory SET favorite = ? WHERE id = ?')
    .bind(row.favorite ? 0 : 1, row.id)
    .run();
  return c.json({ ok: true, data: { favorite: !row.favorite } });
});

api.get('/leaderboard', async (c) => {
  const data = await bootstrapData(c);
  return c.json({ ok: true, data: data.leaderboard });
});

api.get('/profile/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const row = await c.env.DB.prepare('SELECT * FROM users WHERE tg_id = ?').bind(id).first<UserRow>();
  if (!row) return c.json({ ok: false, error: 'USER_NOT_FOUND' }, 404);
  const inventory = await loadInventory(c.env.DB, id);
  const netWorth = row.stars + inventory.reduce((sum, item) => sum + item.value, 0);
  return c.json({
    ok: true,
    data: {
      user: safeUser(row),
      inventoryValue: inventory.reduce((sum, item) => sum + item.value, 0),
      netWorth,
      inventoryCount: inventory.length,
      favorite: inventory.filter((item) => item.favorite).slice(0, 6),
    },
  });
});

api.get('/admin/overview', async (c) => {
  const user = c.get('dbUser');
  if (!isAdmin(user, c.env)) return c.json({ ok: false, error: 'FORBIDDEN' }, 403);
  const [users, inventory, listings, auctions, rockets] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) AS count FROM users').first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS count, COALESCE(SUM(value),0) AS value FROM inventory WHERE status = 'inventory'").first<{
      count: number;
      value: number;
    }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS count FROM market_listings').first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM auctions WHERE status = 'active'").first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS count FROM rocket_rounds').first<{ count: number }>(),
  ]);
  return c.json({
    ok: true,
    data: {
      users: Number(users?.count ?? 0),
      inventoryItems: Number(inventory?.count ?? 0),
      inventoryValue: Number(inventory?.value ?? 0),
      listings: Number(listings?.count ?? 0),
      activeAuctions: Number(auctions?.count ?? 0),
      rocketRounds: Number(rockets?.count ?? 0),
    },
  });
});

api.get('/admin/users', async (c) => {
  const user = c.get('dbUser');
  if (!isAdmin(user, c.env)) return c.json({ ok: false, error: 'FORBIDDEN' }, 403);
  const search = (c.req.query('search') ?? '').trim();
  const rows = search
    ? await allRows<UserRow>(
        c.env.DB,
        'SELECT * FROM users WHERE CAST(tg_id AS TEXT) LIKE ? OR username LIKE ? OR first_name LIKE ? ORDER BY last_seen DESC LIMIT 30',
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
      )
    : await allRows<UserRow>(c.env.DB, 'SELECT * FROM users ORDER BY last_seen DESC LIMIT 30');
  return c.json({
    ok: true,
    data: rows.map((row) => ({
      ...safeUser(row),
      banned: Boolean(row.is_banned),
      lastSeen: row.last_seen,
    })),
  });
});

api.post('/admin/grant-stars', async (c) => {
  const user = c.get('dbUser');
  if (!isAdmin(user, c.env)) return c.json({ ok: false, error: 'FORBIDDEN' }, 403);
  const body = await readJson<{ tgId?: number; amount?: number; note?: string }>(c.req.raw);
  const targetId = Number(body?.tgId ?? 0);
  const amount = Math.round(Number(body?.amount ?? 0));
  if (!targetId || !Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 10000000) {
    return c.json({ ok: false, error: 'BAD_REQUEST' }, 400);
  }
  const target = await c.env.DB.prepare('SELECT * FROM users WHERE tg_id = ?').bind(targetId).first<UserRow>();
  if (!target) return c.json({ ok: false, error: 'USER_NOT_FOUND' }, 404);
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET stars = MAX(0, stars + ?) WHERE tg_id = ?').bind(amount, targetId),
    transaction(c.env.DB, targetId, 'admin_grant', amount, { note: body?.note ?? 'admin' }),
    logEvent(c.env.DB, user.tg_id, 'admin_grant_stars', { targetId, amount }),
  ]);
  return c.json({ ok: true, data: { balance: Math.max(0, target.stars + amount) } });
});

api.post('/admin/grant-item', async (c) => {
  const user = c.get('dbUser');
  if (!isAdmin(user, c.env)) return c.json({ ok: false, error: 'FORBIDDEN' }, 403);
  const body = await readJson<{ tgId?: number; itemKey?: string }>(c.req.raw);
  const targetId = Number(body?.tgId ?? 0);
  const item = itemFor(body?.itemKey ?? '');
  if (!targetId || !item) return c.json({ ok: false, error: 'BAD_REQUEST' }, 400);
  const target = await c.env.DB.prepare('SELECT * FROM users WHERE tg_id = ?').bind(targetId).first<UserRow>();
  if (!target) return c.json({ ok: false, error: 'USER_NOT_FOUND' }, 404);
  const row = await insertItem(c.env.DB, targetId, item, 'admin', item.value);
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET total_won = total_won + ?, best_drop = MAX(best_drop, ?) WHERE tg_id = ?').bind(
      item.value,
      item.value,
      targetId,
    ),
    logEvent(c.env.DB, user.tg_id, 'admin_grant_item', { targetId, itemKey: item.key }),
  ]);
  return c.json({ ok: true, data: { item: mapItem(row) } });
});

api.post('/admin/ban', async (c) => {
  const user = c.get('dbUser');
  if (!isAdmin(user, c.env)) return c.json({ ok: false, error: 'FORBIDDEN' }, 403);
  const body = await readJson<{ tgId?: number; banned?: boolean }>(c.req.raw);
  const targetId = Number(body?.tgId ?? 0);
  if (!targetId || targetId === 7638194816) return c.json({ ok: false, error: 'BAD_TARGET' }, 400);
  await c.env.DB.prepare('UPDATE users SET is_banned = ? WHERE tg_id = ?').bind(body?.banned ? 1 : 0, targetId).run();
  await logEvent(c.env.DB, user.tg_id, 'admin_ban', { targetId, banned: Boolean(body?.banned) }).run();
  return c.json({ ok: true });
});

api.post('/admin/cleanup', async (c) => {
  const user = c.get('dbUser');
  if (!isAdmin(user, c.env)) return c.json({ ok: false, error: 'FORBIDDEN' }, 403);
  await settleAuctions(c.env.DB);
  await settleRockets(c.env.DB);
  return c.json({ ok: true });
});

export default api;
