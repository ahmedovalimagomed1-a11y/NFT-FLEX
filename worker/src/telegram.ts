import { Hono } from 'hono';
import type { Env } from './types';

type Bindings = { Bindings: Env };
const telegram = new Hono<Bindings>();

function appUrl(env: Env): string {
  const url = new URL(env.WEBAPP_URL || 'https://nft-flex.workers.dev');
  url.searchParams.set('v', '4');
  return url.toString();
}

async function sendMessage(env: Env, chatId: number, text: string, extra: Record<string, unknown> = {}) {
  if (!env.TELEGRAM_BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...extra,
    }),
  });
}

function startKeyboard(env: Env) {
  return {
    inline_keyboard: [
      [{ text: 'Играть', web_app: { url: appUrl(env) } }],
      [
        { text: 'Мой профиль', callback_data: 'profile' },
        { text: 'Как играть', callback_data: 'help' },
      ],
    ],
  };
}

telegram.post('/webhook', async (c) => {
  const secret = c.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && c.req.header('X-Telegram-Bot-Api-Secret-Token') !== secret) {
    return c.json({ ok: false }, 401);
  }
  const update = await c.req.json<{
    message?: {
      text?: string;
      chat?: { id: number };
      from?: { id: number; first_name?: string };
    };
    callback_query?: {
      id: string;
      data?: string;
      from?: { id: number; first_name?: string };
      message?: { chat?: { id: number } };
    };
  }>().catch(() => null);
  if (!update) return c.json({ ok: true });

  if (update.message?.chat?.id) {
    const chatId = update.message.chat.id;
    const text = update.message.text ?? '';
    const name = update.message.from?.first_name ?? 'игрок';
    if (text.startsWith('/start')) {
      await sendMessage(
        c.env,
        chatId,
        `<b>NFT FLEX</b>\n\n` +
          `Привет, ${escapeHtml(name)}. Это твой цифровой флекс.\n\n` +
          `Открывай кейсы, собирай NFT, апгрейди их как в CS, запускай ракету, играй 50/50 и торгуй с другими игроками.\n\n` +
          `На старте — <b>2 500 звёзд</b>. Ежедневный бонус уже ждёт внутри.`,
        { reply_markup: startKeyboard(c.env) },
      );
    } else if (text.startsWith('/app')) {
      await sendMessage(c.env, chatId, '<b>NFT FLEX</b>\nТвоя коллекция уже загружается.', {
        reply_markup: startKeyboard(c.env),
      });
    } else if (text.startsWith('/help')) {
      await sendMessage(
        c.env,
        chatId,
        `<b>Как играть</b>\n\n` +
          `1. Открывай кейсы и получай NFT разных редкостей.\n` +
          `2. Апгрейди до 5 NFT сразу в цель дороже.\n` +
          `3. Запускай ракету: забери иксы до краша или потеряй NFT.\n` +
          `4. Играй 50/50 в мини-играх и удваивай стоимость NFT.\n` +
          `5. Выставляй лоты на рынок и аукцион.\n\n` +
          `Валюта — звёзды. Админ — только владелец NFT FLEX.`,
        { reply_markup: startKeyboard(c.env) },
      );
    } else {
      await sendMessage(c.env, chatId, 'Открой приложение, чтобы продолжить флекс.', {
        reply_markup: startKeyboard(c.env),
      });
    }
  }

  if (update.callback_query?.message?.chat?.id) {
    const chatId = update.callback_query.message.chat.id;
    const data = update.callback_query.data;
    await fetch(`https://api.telegram.org/bot${c.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ callback_query_id: update.callback_query.id }),
    });
    if (data === 'help') {
      await sendMessage(c.env, chatId, 'Открой NFT FLEX и выбери нужный раздел в нижнем меню.');
    } else {
      await sendMessage(c.env, chatId, 'Профиль доступен внутри приложения.', {
        reply_markup: startKeyboard(c.env),
      });
    }
  }

  return c.json({ ok: true });
});

telegram.get('/set-webhook', async (c) => {
  const admin = c.req.query('key');
  if (!c.env.TELEGRAM_WEBHOOK_SECRET || admin !== c.env.TELEGRAM_WEBHOOK_SECRET) {
    return c.json({ ok: false, error: 'FORBIDDEN' }, 403);
  }
  const url = `${new URL(c.req.url).origin}/telegram/webhook`;
  const result = await fetch(`https://api.telegram.org/bot${c.env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      url,
      secret_token: c.env.TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ['message', 'callback_query'],
    }),
  });
  return c.json(await result.json());
});

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default telegram;
