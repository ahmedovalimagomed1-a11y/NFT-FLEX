import { Hono } from 'hono';
import api from './api';
import telegram from './telegram';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

app.route('/api', api);
app.route('/telegram', telegram);

app.get('/health', (c) => c.json({ ok: true, app: 'NFT FLEX', time: Date.now() }));

app.all('*', async (c) => {
  const response = await c.env.ASSETS.fetch(c.req.raw);
  if (response.status === 404) {
    const url = new URL(c.req.url);
    url.pathname = '/';
    return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
  }
  const path = new URL(c.req.url).pathname;
  if (path === '/' || path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.css')) {
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store, max-age=0');
    return new Response(response.body, { status: response.status, headers });
  }
  return response;
});

export default app;
