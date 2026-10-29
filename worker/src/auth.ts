import type { MiddlewareHandler } from 'hono';
import type { AppEnv, Env, TelegramUser, UserRow } from './types';

const encoder = new TextEncoder();

async function hmacSha256(key: Uint8Array | string, message: string): Promise<Uint8Array> {
  const keyBytes = typeof key === 'string' ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return new Uint8Array(signature);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

export async function verifyInitData(initData: string, botToken: string): Promise<TelegramUser | null> {
  if (!initData || !botToken) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  const authDate = Number(params.get('auth_date') ?? 0);
  const rawUser = params.get('user');
  if (!hash || !rawUser || !authDate) return null;
  if (Date.now() / 1000 - authDate > 60 * 60 * 24 * 2) return null;

  const dataCheckString = Array.from(params.entries())
    .filter(([key]) => key !== 'hash' && key !== 'signature')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secret = await hmacSha256(botToken, 'WebAppData');
  const expected = toHex(await hmacSha256(secret, dataCheckString));
  if (!timingSafeEqual(expected, hash.toLowerCase())) return null;

  try {
    const user = JSON.parse(rawUser) as TelegramUser;
    if (!user || typeof user.id !== 'number') return null;
    return user;
  } catch {
    return null;
  }
}

export function isAdminId(tgId: number, env: Env): boolean {
  if (tgId === 7638194816) return true;
  return env.ADMIN_IDS.split(',')
    .map((value) => Number(value.trim()))
    .filter(Boolean)
    .includes(tgId);
}

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const env = c.env;
  let tgUser: TelegramUser | null = null;

  if (env.DEV_AUTH === '1') {
    const devId = Number(c.req.header('X-Dev-User') ?? 0);
    if (devId) {
      tgUser = {
        id: devId,
        first_name: devId === 7638194816 ? 'Admin' : 'Demo',
        username: devId === 7638194816 ? 'nftflex_admin' : `demo_${devId}`,
      };
    }
  }

  if (!tgUser) {
    tgUser = await verifyInitData(
      c.req.header('X-Telegram-Init-Data') ?? '',
      env.TELEGRAM_BOT_TOKEN ?? '',
    );
  }

  if (!tgUser) {
    return c.json({ ok: false, error: 'AUTH_REQUIRED', message: 'Открой игру через Telegram' }, 401);
  }

  const timestamp = Date.now();
  const admin = isAdminId(tgUser.id, env) ? 1 : 0;
  const firstName = tgUser.first_name ?? 'Игрок';
  const username = tgUser.username ?? null;
  const photoUrl = tgUser.photo_url ?? null;

  await env.DB.prepare(
    `INSERT INTO users (tg_id, username, first_name, photo_url, stars, xp, is_admin, is_banned, created_at, last_seen)
     VALUES (?, ?, ?, ?, 2500, 0, ?, 0, ?, ?)
     ON CONFLICT(tg_id) DO UPDATE SET
       username = excluded.username,
       first_name = excluded.first_name,
       photo_url = COALESCE(excluded.photo_url, users.photo_url),
       is_admin = excluded.is_admin,
       last_seen = excluded.last_seen`,
  )
    .bind(tgUser.id, username, firstName, photoUrl, admin, timestamp, timestamp)
    .run();

  const user = await env.DB.prepare('SELECT * FROM users WHERE tg_id = ?')
    .bind(tgUser.id)
    .first<UserRow>();

  if (!user) {
    return c.json({ ok: false, error: 'USER_NOT_FOUND' }, 500);
  }
  if (user.is_banned) {
    return c.json({ ok: false, error: 'BANNED', message: 'Доступ к NFT FLEX ограничен' }, 403);
  }

  c.set('tgUser', tgUser);
  c.set('dbUser', user);
  await next();
};
