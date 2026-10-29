const tg = window.Telegram?.WebApp;
const launchHash = new URLSearchParams(location.hash.slice(1));
const launchQuery = new URLSearchParams(location.search);
const telegramInitData = tg?.initData || launchHash.get('tgWebAppData') || launchQuery.get('tgWebAppData') || sessionStorage.getItem('nftflex_init_data') || '';
const authToken = launchQuery.get('t') || launchHash.get('t') || sessionStorage.getItem('nftflex_auth_token') || '';
try { if (telegramInitData) sessionStorage.setItem('nftflex_init_data', telegramInitData); } catch {}
try { if (authToken) sessionStorage.setItem('nftflex_auth_token', authToken); } catch {}
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const RARITY = {
  common: { label: 'Обычный', order: 1, color: '#9aa4b2' },
  uncommon: { label: 'Необычный', order: 2, color: '#43d17a' },
  rare: { label: 'Редкий', order: 3, color: '#3fa7ff' },
  epic: { label: 'Эпический', order: 4, color: '#b06bff' },
  legendary: { label: 'Легендарный', order: 5, color: '#ffb020' },
  mythic: { label: 'Мифический', order: 6, color: '#ff4d8d' },
};

const ICON_LABELS = {
  case_open: ['Кейс', 'box'],
  daily: ['Ежедневный бонус', 'calendar'],
  market_buy: ['Покупка NFT', 'market'],
  market_sale: ['Продажа NFT', 'tag'],
  auction_bid: ['Ставка на аукционе', 'gavel'],
  auction_refund: ['Возврат ставки', 'refresh'],
  auction_sale: ['Аукцион продан', 'gavel'],
  auction_buyout: ['Выкуп лота', 'bolt'],
  admin_grant: ['Начисление админа', 'shield'],
};

const state = {
  data: null,
  route: launchHash.has('tgWebAppData') ? 'cases' : location.hash.replace('#', '') || 'cases',
  marketTab: 'market',
  inventoryFilter: 'all',
  inventorySort: 'value',
  giftFilter: 'all',
  upgradeStakes: [],
  upgradeTarget: null,
  activeRocket: null,
  rocketFrame: null,
  rocketPoll: null,
  busy: false,
  authDiagSent: false,
  settings: {
    sound: JSON.parse(localStorage.getItem('nftflex_sound') ?? 'true'),
    haptics: JSON.parse(localStorage.getItem('nftflex_haptics') ?? 'true'),
  },
  devUser: localStorage.getItem('nftflex_dev_user') || (['localhost', '127.0.0.1'].includes(location.hostname) ? '7638194816' : ''),
  targetPickerReturn: null,
};

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function icon(name, cls = '') {
  return `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

function fmt(value) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(Number(value) || 0));
}

function rarityOf(item) {
  return RARITY[item?.item?.rarity] || RARITY.common;
}

function timeLeft(timestamp) {
  const diff = Number(timestamp) - Date.now();
  if (diff <= 0) return 'завершён';
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}д ${hours % 24}ч`;
  if (hours > 0) return `${hours}ч ${minutes % 60}м`;
  return `${Math.max(1, minutes)}м`;
}

function timeAgo(timestamp) {
  const diff = Math.max(0, Date.now() - Number(timestamp));
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes}м назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}ч назад`;
  return `${Math.floor(hours / 24)}д назад`;
}

function initials(user) {
  const name = user?.firstName || user?.username || 'NF';
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'NF';
}

function avatar(user, className = '') {
  if (user?.photoUrl) {
    return `<span class="${className}"><img src="${esc(user.photoUrl)}" alt="" loading="lazy"></span>`;
  }
  return `<span class="${className}">${esc(initials(user))}</span>`;
}

function nftCard(item, options = {}) {
  const rarity = rarityOf(item);
  const fromMarket = options.market;
  const gift = item.item.gift;
  return `<button class="nft-card rarity-${item.item.rarity}" data-rarity="${item.item.rarity}" data-action="${fromMarket ? 'market-item' : 'item-sheet'}" data-id="${esc(item.id)}" style="--rarity-color:${rarity.color}">
    <div class="nft-art-wrap">
      <img class="nft-art" src="${esc(item.item.art)}" alt="${esc(item.item.name)}" loading="lazy">
      ${!fromMarket ? `<span class="nft-fav ${item.favorite ? 'on' : ''}" data-action="favorite" data-id="${esc(item.id)}">${icon('heart')}</span>` : ''}
      ${gift ? `<span class="nft-level">LVL ${item.giftLevel || 1}</span>` : ''}
    </div>
    <div class="nft-meta">
      <div class="nft-name">${esc(item.item.name)}</div>
      <div class="nft-sub"><span class="nft-rarity">${rarity.label}</span><span class="nft-value">${icon('star')}${fmt(item.value)}</span></div>
      <div class="nft-collection">${gift ? esc(item.giftModel || 'Classic') + ' · ' : ''}${esc(item.item.collection)} / #${esc(item.serial)}</div>
      ${gift ? `<div class="nft-traits"><span>${esc(item.giftBackdrop || '—')}</span><span>${esc(item.giftSymbol || '—')}</span></div>` : ''}
    </div>
  </button>`;
}

function giftUpgradeCost(value) {
  return Math.max(120, Math.round(Number(value) * 0.28));
}

function giftNextValue(value) {
  return Math.round(Number(value) * 1.2);
}

function emptyState(iconName, title, text, action = '') {
  return `<div class="empty-state">${icon(iconName)}<h3>${title}</h3><p>${text}</p>${action}</div>`;
}

function toast(message, type = 'info') {
  const root = $('#toast-root');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(type === 'error' ? 'alert' : type === 'success' ? 'check' : 'info')}<span>${esc(message)}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 260);
  }, 2800);
}

function haptic(style = 'light') {
  if (!state.settings.haptics || !tg?.HapticFeedback) return;
  try {
    if (style === 'success' || style === 'error') tg.HapticFeedback.notificationOccurred(style);
    else tg.HapticFeedback.impactOccurred(style);
  } catch {}
}

let audioContext;
function tone(frequency = 440, duration = 0.06, type = 'sine', volume = 0.03) {
  if (!state.settings.sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {}
}

function burst(x, y, color = '#8b5cf6', count = 14) {
  const root = $('#fx-root');
  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement('span');
    const angle = (Math.PI * 2 * index) / count;
    const distance = 30 + Math.random() * 70;
    particle.className = 'fx-particle';
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.background = color;
    particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
    root.appendChild(particle);
    setTimeout(() => particle.remove(), 950);
  }
}

function authHeaders() {
  const headers = { 'content-type': 'application/json' };
  if (telegramInitData) headers['X-Telegram-Init-Data'] = telegramInitData;
  if (authToken) headers['X-Auth-Token'] = authToken;
  if (state.devUser) headers['X-Dev-User'] = state.devUser;
  return headers;
}

class ApiError extends Error {
  constructor(payload, status) {
    super(payload?.message || payload?.error || 'Ошибка запроса');
    this.payload = payload;
    this.status = status;
  }
}

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    method: options.method || 'GET',
    headers: authHeaders(),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {}
  if (response.status === 401) {
    if (!state.authDiagSent) {
      state.authDiagSent = true;
      sendAuthDiag(path);
    }
    showAuth();
    throw new ApiError(payload, 401);
  }
  if (!response.ok || payload?.ok === false) {
    throw new ApiError(payload, response.status);
  }
  return payload?.data ?? payload;
}

function showAuth() {
  $('#splash')?.classList.add('gone');
  $('#app')?.setAttribute('hidden', '');
  $('#auth-screen')?.removeAttribute('hidden');
  const debug = $('#auth-debug');
  if (debug) {
    debug.textContent = `build v5 · SDK: ${window.Telegram ? 'да' : 'нет'} · initData: ${telegramInitData.length} · token: ${authToken ? 'да' : 'нет'}`;
  }
}

async function sendAuthDiag(stage) {
  try {
    await fetch('/api/public/auth-diag', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        stage,
        href: location.href,
        hasTelegram: Boolean(window.Telegram),
        hasWebApp: Boolean(tg),
        initDataLength: telegramInitData.length,
        hasUrlToken: Boolean(authToken),
        hashKeys: Array.from(launchHash.keys()),
        searchKeys: Array.from(launchQuery.keys()),
        hasStored: Boolean(sessionStorage.getItem('nftflex_init_data')),
      }),
    });
  } catch {}
}

function initTelegram() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#07080e');
    tg.setBackgroundColor('#07080e');
    tg.setBottomBarColor?.('#07080e');
    if (tg.BackButton) {
      tg.BackButton.onClick(() => {
        if ($('#modal-root').classList.contains('open')) closeModal();
      });
    }
  } catch {}
}

async function boot() {
  initTelegram();
  $('#splash-status').textContent = 'Синхронизируем коллекцию';
  try {
    if (!telegramInitData && !authToken && !state.devUser) {
      sendAuthDiag('no-initdata');
      await sleep(500);
      showAuth();
      return;
    }
    const data = await api('/bootstrap');
    state.data = data;
    state.upgradeTarget ||= data.catalog.find((item) => item.key === 'durov_cap_classic') || data.catalog[0];
    await sleep(650);
    $('#splash').classList.add('gone');
    $('#app').removeAttribute('hidden');
    updateTopbar();
    renderRoute();
    if (data.activeRocket) {
      state.activeRocket = data.activeRocket;
      toast('У тебя активен полёт ракеты', 'info');
    }
  } catch (error) {
    if (error.status !== 401) {
      $('#splash-status').textContent = 'Не удалось загрузить игру';
      setTimeout(showAuth, 1200);
    }
  }
}

function updateTopbar() {
  const user = state.data?.user;
  if (!user) return;
  $('#top-balance').textContent = fmt(user.stars);
  $('#daily-dot').classList.toggle('on', Boolean(state.data?.daily?.available));
  const avatarEl = $('#top-avatar');
  if (user.photoUrl) {
    avatarEl.outerHTML = `<img class="avatar-img" id="top-avatar" src="${esc(user.photoUrl)}" alt="">`;
  } else {
    avatarEl.textContent = initials(user);
  }
  $$('#tabbar .tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.route === state.route));
}

async function refresh(silent = true, rerender = true) {
  try {
    const data = await api('/bootstrap');
    state.data = data;
    if (!state.upgradeTarget) state.upgradeTarget = data.catalog.find((item) => item.key === 'durov_cap_classic') || data.catalog[0];
    state.upgradeStakes = state.upgradeStakes.filter((id) => data.inventory.some((item) => item.id === id));
    updateTopbar();
    if (rerender) renderRoute();
  } catch (error) {
    if (!silent && error.status !== 401) toast(error.message, 'error');
  }
}

function go(route) {
  state.route = route;
  if (location.hash !== `#${route}`) history.replaceState(null, '', `#${route}`);
  updateTopbar();
  renderRoute();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderRoute() {
  if (!state.data) return;
  const routes = {
    cases: renderCases,
    inventory: renderInventory,
    gifts: renderGifts,
    upgrade: renderUpgrade,
    games: renderGames,
    market: renderMarket,
    profile: renderProfile,
  };
  const renderer = routes[state.route] || renderCases;
  $('#view').innerHTML = renderer();
  updateTopbar();
  if (state.route === 'games' && state.activeRocket) requestAnimationFrame(() => resumeRocketView());
}

function pageHead(eyebrow, title, subtitle, metric = '', metricLabel = '') {
  return `<div class="page-head">
    <div><div class="eyebrow">${esc(eyebrow)}</div><h1 class="page-title">${title}</h1><p class="page-sub">${subtitle}</p></div>
    ${metric ? `<div class="head-metric"><b>${metric}</b><small>${metricLabel}</small></div>` : ''}
  </div>`;
}

function renderCases() {
  const data = state.data;
  const featured = data.cases.find((item) => item.featured) || data.cases[0];
  const rest = data.cases.filter((item) => item.key !== featured.key);
  const canDaily = data.daily.available;
  const drops = data.recentDrops.slice(0, 10);
  return `<section class="page">
    ${pageHead('CASE DROP / 01', 'Кейсы', 'Открывай по одному или сразу пять. Внутри — NFT с собственной графикой, редкостью и рыночной ценой.', fmt(data.user.stars), 'баланс')}
    ${canDaily ? `<button class="daily-panel" data-action="daily" style="width:100%;text-align:left;margin-bottom:12px">
      <span class="daily-icon">${icon('gift')}</span>
      <span class="daily-copy"><h3>Ежедневный бонус готов</h3><p>Забери <span class="reward">${fmt(data.daily.reward)} звёзд</span> и продолжи флекс</p></span>
      <span class="chip warn">ЗАБРАТЬ ${icon('arrow')}</span>
    </button>` : ''}
    <button class="case-card featured" data-action="case-detail" data-case="${featured.key}" style="--case-bg:${featured.gradient}">
      <span class="case-badge">${esc(featured.badge)}</span>
      <img class="case-img" src="${featured.art}" alt="${esc(featured.name)}">
      <span class="case-body">
        <span class="case-name">${esc(featured.name)}</span>
        <span class="case-tagline">${esc(featured.tagline)}</span>
        <span class="case-price">${icon('star')}${fmt(featured.price)}</span>
      </span>
      <span class="case-open-fab">${icon('arrow')}</span>
    </button>
    <div class="r-case-grid" style="margin-top:10px">
      ${rest.map((item) => `<button class="case-card" data-action="case-detail" data-case="${item.key}" style="--case-bg:${item.gradient}">
        <span class="case-badge">${esc(item.badge)}</span>
        <img class="case-img" src="${item.art}" alt="${esc(item.name)}">
        <span class="case-body">
          <span class="case-name">${esc(item.name)}</span>
          <span class="case-price">${icon('star')}${fmt(item.price)}</span>
        </span>
        <span class="case-open-fab">${icon('arrow')}</span>
      </button>`).join('')}
    </div>
    <div class="section-head"><h2>Последние дропы</h2><span class="link">LIVE ${icon('bolt')}</span></div>
    ${drops.length ? `<div class="hero-fall"><div class="hero-fall-head"><b>Последние 7 дней</b><span class="chip live">LIVE</span></div><div class="fall-track">
      ${drops.map((drop) => `<div class="fall-item"><img src="${drop.item.art}" alt=""><span>${esc(drop.item.name)}</span></div>`).join('')}
    </div></div>` : `<div class="panel" style="padding:18px;text-align:center;color:var(--muted);font-size:10px">Стань первым, кто откроет кейс сегодня.</div>`}
    <div class="section-head"><h2>Быстрый старт</h2></div>
    <div class="game-card-grid">
      <button class="game-card" data-route="gifts" style="--game-color:var(--blue);--game-glow:rgba(63,167,255,.25)">${icon('gift')}<h3>Подарки</h3><p>Кепки Дурова, очки и улучшения</p><span class="go">${icon('arrow')}</span></button>
      <button class="game-card" data-route="inventory" style="--game-color:var(--cyan);--game-glow:rgba(34,211,238,.25)">${icon('layers')}<h3>Коллекция</h3><p>Все твои NFT в одном месте</p><span class="go">${icon('arrow')}</span></button>
      <button class="game-card" data-route="upgrade" style="--game-color:var(--violet);--game-glow:rgba(139,92,246,.25)">${icon('upgrade')}<h3>Апгрейдер</h3><p>Обменяй до 5 NFT на одну цель</p><span class="go">${icon('arrow')}</span></button>
    </div>
  </section>`;
}

function renderGifts() {
  const data = state.data;
  const gifts = data.inventory.filter((item) => item.item.gift);
  const total = gifts.reduce((sum, item) => sum + item.value, 0);
  const catalog = data.catalog.filter((item) => item.gift);
  const collections = ['all', ...new Set(catalog.map((item) => item.collection))];
  const visible = catalog.filter((item) => state.giftFilter === 'all' || item.collection === state.giftFilter);
  const ownedByKey = new Map(gifts.map((item) => [item.itemKey, item]));
  const ownedCollections = new Set(gifts.map((item) => item.item.collection));
  return `<section class="page">
    ${pageHead('GIFT LAB / 03', 'Подарки Telegram', 'Кепки и очки Дурова, Plush Pepe, Heart Locket и другие коллекционные подарки. Улучшай уровень, меняй фон и узор, поднимай стоимость.', fmt(total), 'стоимость')}
    <div class="gift-hero">
      <div class="gift-hero-copy">
        <span class="eyebrow">DUROV COLLECTION</span>
        <h2>Улучшай подарки</h2>
        <p>Каждый подарок имеет модель, фон и узор. Каждый уровень повышает ценность и может открыть новые детали.</p>
        <div class="gift-hero-stats"><span><b>${gifts.length}</b> моих</span><span><b>${catalog.length}</b> моделей</span><span><b>${ownedCollections.size}</b> коллекций</span></div>
      </div>
      <img src="/assets/nfts/durov_cap_classic.svg" alt="Durov's Cap">
    </div>
    <div class="section-head"><h2>Мои подарки</h2><span class="link">${gifts.length} шт</span></div>
    ${gifts.length ? `<div class="nft-grid">${gifts.map((item) => nftCard(item)).join('')}</div>` : emptyState('gift', 'Подарков пока нет', 'Открой «Кейс Дурова» или «Кейс Telegram», чтобы получить первый коллекционный подарок.', `<button class="btn btn-primary btn-sm" style="margin-top:14px" data-route="cases">К кейсам</button>`)}
    <div class="section-head"><h2>Каталог подарков</h2><span class="link">${visible.length} моделей</span></div>
    <div class="chip-row" style="margin-bottom:12px">
      ${collections.map((key) => `<button class="chip-btn ${state.giftFilter === key ? 'active' : ''}" data-action="gift-filter" data-value="${key}">${key === 'all' ? 'Все' : esc(key)}</button>`).join('')}
    </div>
    <div class="gift-catalog">
      ${visible.map((item) => {
        const owned = ownedByKey.get(item.key);
        return `<button class="gift-catalog-card rarity-${item.rarity} ${owned ? 'owned' : ''}" data-action="gift-info" data-key="${item.key}" style="--rarity-color:${RARITY[item.rarity].color}">
          <img src="${item.art}" alt="${esc(item.name)}" loading="lazy">
          <span class="gift-catalog-body"><b>${esc(item.name)}</b><small>${esc(item.collection)} · ${esc(item.model)}</small><span class="gift-catalog-status">${owned ? `LVL ${owned.giftLevel} · ${fmt(owned.value)}` : 'Выпадает из кейсов'}</span></span>
        </button>`;
      }).join('')}
    </div>
    <p class="upgrade-note" style="text-align:center;margin-top:18px">Подарки вдохновлены коллекциями Telegram Gifts: Durov's Cap, Durov's Glasses, Plush Pepe и другими.</p>
  </section>`;
}

function showGiftInfo(key) {
  const item = state.data.catalog.find((entry) => entry.key === key);
  if (!item) return;
  const owned = state.data.inventory.find((entry) => entry.itemKey === key);
  const cases = state.data.cases.filter((entry) => entry.pool.some((slot) => slot.itemKey === key));
  openSheet(`${modalHead('Подарок Telegram', esc(item.name))}
    <div class="modal-body">
      <img class="item-sheet-art" src="${item.art}" alt="${esc(item.name)}">
      <div class="item-sheet-head"><div><h2>${esc(item.name)}</h2><p style="color:${RARITY[item.rarity].color}">${RARITY[item.rarity].label} / ${esc(item.collection)}</p></div><div class="item-sheet-price"><b>${icon('star')}${fmt(item.value)}</b><small>БАЗА</small></div></div>
      <p class="item-desc">${esc(item.description)}</p>
      <div class="item-facts"><div class="fact"><small>МОДЕЛЬ</small><b>${esc(item.model)}</b></div><div class="fact"><small>УРОВЕНЬ</small><b>${owned ? 'LVL ' + owned.giftLevel : '—'}</b></div><div class="fact"><small>В КЕЙСАХ</small><b>${cases.length}</b></div></div>
      ${cases.length ? `<div class="gift-source-list">${cases.map((entry) => `<span class="chip">${icon('box')} ${esc(entry.name)}</span>`).join('')}</div>` : ''}
      ${owned ? `<button class="btn btn-gold btn-block" style="margin-top:14px" data-action="item-sheet" data-id="${owned.id}">${icon('gift')} ОТКРЫТЬ МОЙ ПОДАРОК</button>` : `<p class="hint" style="text-align:center;margin-top:12px">Этот подарок можно получить из кейсов выше.</p>`}
    </div>`);
}

function showGiftUpgrade(itemId) {
  const item = state.data.inventory.find((entry) => entry.id === itemId);
  if (!item || !item.item.gift) return;
  const level = item.giftLevel || 1;
  const maxed = level >= 10;
  const cost = giftUpgradeCost(item.value);
  const next = giftNextValue(item.value);
  const canAfford = state.data.user.stars >= cost;
  closeModal();
  openSheet(`${modalHead('Улучшение подарка', esc(item.item.name))}
    <div class="modal-body">
      <img class="item-sheet-art" src="${item.item.art}" alt="${esc(item.item.name)}">
      <div class="gift-upgrade-preview">
        <div><small>СЕЙЧАС</small><b>LVL ${level}</b><span>${icon('star')}${fmt(item.value)}</span></div>
        <span class="gift-upgrade-arrow">${icon('arrow')}</span>
        <div><small>ПОСЛЕ</small><b>LVL ${Math.min(10, level + 1)}</b><span>${icon('star')}${fmt(next)}</span></div>
      </div>
      <div class="gift-traits">
        <span class="trait-chip"><small>МОДЕЛЬ</small>${esc(item.giftModel || item.item.model)}</span>
        <span class="trait-chip"><small>ФОН</small>${esc(item.giftBackdrop || '—')}</span>
        <span class="trait-chip"><small>УЗОР</small>${esc(item.giftSymbol || '—')}</span>
      </div>
      <p class="hint" style="text-align:center">${maxed ? 'Подарок уже максимального уровня.' : 'При улучшении фон или узор могут измениться. Стоимость подарка вырастет на ' + fmt(next - item.value) + ' звёзд.'}</p>
      <button class="btn ${maxed ? 'btn-ghost' : 'btn-gold'} btn-block" data-action="confirm-gift-upgrade" data-id="${item.id}" ${maxed || !canAfford ? 'disabled' : ''}>${maxed ? 'МАКСИМАЛЬНЫЙ УРОВЕНЬ' : `${icon('upgrade')} УЛУЧШИТЬ · ${fmt(cost)} ЗВЁЗД`}</button>
      ${!maxed && !canAfford ? '<p class="hint" style="text-align:center;color:var(--red);margin-top:8px">Недостаточно звёзд</p>' : ''}
    </div>`);
}

async function confirmGiftUpgrade(itemId) {
  const item = state.data.inventory.find((entry) => entry.id === itemId);
  if (!item) return;
  try {
    const result = await api('/gifts/upgrade', { method: 'POST', body: { itemId } });
    const index = state.data.inventory.findIndex((entry) => entry.id === itemId);
    if (index >= 0) state.data.inventory[index] = result.item;
    state.data.user.stars -= result.cost;
    updateTopbar();
    haptic('success');
    tone(660, 0.1);
    openSheet(`${modalHead('Подарок улучшен', esc(result.item.item.name))}
      <div class="modal-body">
        <img class="item-sheet-art" src="${result.item.item.art}" alt="">
        <div class="gift-result-badge">LVL ${result.level}</div>
        <h2 style="text-align:center;margin-top:4px">${esc(result.item.item.name)}</h2>
        <p style="text-align:center;color:var(--muted);font-size:11px;margin-top:5px">Стоимость выросла на ${fmt(result.valueGain)} звёзд</p>
        <div class="gift-traits" style="margin-top:14px">
          <span class="trait-chip"><small>МОДЕЛЬ</small>${esc(result.item.giftModel || result.item.item.model)}</span>
          <span class="trait-chip"><small>ФОН</small>${esc(result.item.giftBackdrop || '—')}</span>
          <span class="trait-chip"><small>УЗОР</small>${esc(result.item.giftSymbol || '—')}</span>
        </div>
        <button class="btn btn-primary btn-block" style="margin-top:16px" data-action="close-modal">ГОТОВО</button>
      </div>`);
    renderRoute();
  } catch (error) {
    toast(error.message, 'error');
  }
}

function renderInventory() {
  const data = state.data;
  const items = data.inventory.filter((item) => {
    if (state.inventoryFilter === 'all') return true;
    if (state.inventoryFilter === 'favorite') return item.favorite;
    return item.item.rarity === state.inventoryFilter;
  });
  items.sort((a, b) => {
    if (state.inventorySort === 'value') return b.value - a.value;
    if (state.inventorySort === 'new') return b.createdAt - a.createdAt;
    return RARITY[b.item.rarity].order - RARITY[a.item.rarity].order || b.value - a.value;
  });
  const total = data.inventory.reduce((sum, item) => sum + item.value, 0);
  return `<section class="page">
    ${pageHead('COLLECTION / 02', 'Коллекция', 'Каждый NFT уникален: своя графика, серийный номер и текущая стоимость. Управляй, продавай, рискуй.', fmt(total), 'стоимость')}
    <div class="chip-row" style="margin-bottom:8px">
      ${[['all', 'Все'], ['favorite', 'Избранные'], ['mythic', 'Мифические'], ['legendary', 'Легендарные'], ['epic', 'Эпические'], ['rare', 'Редкие']].map(([key, label]) => `<button class="chip-btn ${state.inventoryFilter === key ? 'active' : ''}" data-action="inv-filter" data-value="${key}">${label}</button>`).join('')}
    </div>
    <div class="chip-row" style="margin-bottom:14px">
      ${[['value', 'По цене'], ['new', 'Новые'], ['rarity', 'По редкости']].map(([key, label]) => `<button class="chip-btn ${state.inventorySort === key ? 'active' : ''}" data-action="inv-sort" data-value="${key}">${label}</button>`).join('')}
      <span class="chip dim" style="margin-left:auto">${items.length} NFT</span>
    </div>
    ${items.length ? `<div class="nft-grid">${items.map((item) => nftCard(item)).join('')}</div>` : emptyState('layers', 'Пока пусто', 'Открой кейс, чтобы получить первый NFT в коллекцию.', `<button class="btn btn-primary btn-sm" style="margin-top:14px" data-route="cases">К кейсам</button>`)}
  </section>`;
}

function upgradeChance() {
  const stakes = state.data.inventory.filter((item) => state.upgradeStakes.includes(item.id));
  const total = stakes.reduce((sum, item) => sum + item.value, 0);
  const target = state.upgradeTarget;
  if (!target) return { stakes, total, target: null, chance: 0 };
  const chance = Math.min(0.9, Math.max(0.04, (total / target.value) * 0.9));
  return { stakes, total, target, chance };
}

function renderUpgrade() {
  const { stakes, total, target, chance } = upgradeChance();
  const slots = Array.from({ length: 5 }, (_, index) => {
    const item = stakes[index];
    if (!item) return `<button class="slot" data-action="upgrade-add">${icon('plus')}</button>`;
    return `<button class="slot filled" data-action="upgrade-remove" data-id="${item.id}">
      <img src="${item.item.art}" alt="">
      <span class="slot-value">${fmt(item.value)}</span>
      <span class="slot-remove">${icon('close')}</span>
    </button>`;
  }).join('');
  return `<section class="page">
    ${pageHead('UPGRADE / 03', 'Апгрейдер', 'Загружай до пяти NFT и попробуй получить более дорогую цель. Успех — новая NFT. Провал — всё сгорает.', `${Math.round(chance * 100)}%`, 'шанс')}
    <div class="upgrade-layout">
      <button class="upgrade-target" data-action="choose-target" style="width:100%;text-align:left">
        ${target ? `<img class="upgrade-target-art" src="${target.art}" alt="${esc(target.name)}">` : ''}
        <span class="upgrade-target-info">
          <span class="eyebrow">ЦЕЛЬ АПГРЕЙДА</span>
          <h3>${target ? esc(target.name) : 'Выбери цель'}</h3>
          <p>${target ? RARITY[target.rarity].label + ' / ' + target.collection : 'Нажми, чтобы выбрать'}</p>
          <span class="nft-value">${icon('star')}${target ? fmt(target.value) : '—'}</span>
        </span>
        <span class="chip">${icon('refresh')} ИЗМЕНИТЬ</span>
      </button>
      <div class="panel" style="padding:13px">
        <div class="section-head" style="margin:0 0 9px"><h2>Твои NFT</h2><span class="tiny muted">${fmt(total)} сумма</span></div>
        <div class="slots">${slots}</div>
        <p class="upgrade-note" style="margin-top:9px">Чем выше сумма загруженных NFT к цене цели, тем выше шанс. При успехе цель создаётся новой коллекционной картой.</p>
      </div>
      <div class="panel upgrade-chance">
        <div class="chance-ring" style="--chance:${(chance * 100).toFixed(1)}"><div class="chance-ring-inner"><b>${Math.round(chance * 100)}%</b><small>успех</small></div></div>
        <div class="chance-info"><h4>${chance < 0.25 ? 'Высокий риск' : chance < 0.55 ? 'Средний риск' : 'Хороший шанс'}</h4><p>Цель: <b>${target ? esc(target.name) : '—'}</b><br>Сумма NFT: <b>${fmt(total)}</b> звёзд<br><span class="risk">При провале все загруженные NFT сгорают.</span></p></div>
      </div>
      <button class="btn btn-primary btn-block" data-action="do-upgrade" ${!target || !stakes.length ? 'disabled' : ''}>${icon('upgrade')} ЗАПУСТИТЬ АПГРЕЙД</button>
    </div>
  </section>`;
}

function renderGames() {
  return `<section class="page">
    ${pageHead('RISK ZONE / 04', 'Игры', 'Ставь NFT против системы. Ракета даёт иксы, мини-игры — честные 50/50. Везде есть шанс потерять карту.', '50/50', 'риск')}
    ${state.activeRocket ? `<button class="daily-panel" data-action="resume-rocket" style="width:100%;text-align:left;margin-bottom:12px;border-color:rgba(34,211,238,.3);background:linear-gradient(120deg,rgba(34,211,238,.1),rgba(15,16,25,.8))">
      <span class="daily-icon" style="color:var(--cyan);background:rgba(34,211,238,.13);border-color:rgba(34,211,238,.3)">${icon('rocket')}</span>
      <span class="daily-copy"><h3>Полёт активен</h3><p>Ракета уже в воздухе. Вернись и забери иксы до краша.</p></span>
      <span class="chip live">ВЕРНУТЬСЯ</span>
    </button>` : ''}
    <div class="games-hero">
      <span class="eyebrow">ROCKET MODE</span>
      <h2 style="margin-top:7px">Забери иксы до краша</h2>
      <p>Поставь NFT и следи за множителем. Нажми «Забрать» в любой момент. Не успел — NFT сгорает.</p>
      <button class="btn btn-gold" data-action="open-game" data-game="rocket">${icon('rocket')} ЗАПУСТИТЬ РАКЕТУ</button>
      <svg class="games-hero-art" viewBox="0 0 200 200" aria-hidden="true"><defs><linearGradient id="heroRocket" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset=".5" stop-color="#8b5cf6"/><stop offset="1" stop-color="#ff4d8d"/></linearGradient></defs><path d="M100 18c26 18 39 48 39 88l-39 52-39-52c0-40 13-70 39-88z" fill="url(#heroRocket)"/><circle cx="100" cy="82" r="16" fill="#071019" opacity=".8"/><path d="M61 116 30 150l31-2zM139 116l31 34-31-2z" fill="#8b5cf6"/><path d="M82 158c4 23 12 35 18 40 6-5 14-17 18-40l-18 10z" fill="#ff9f43"/></svg>
    </div>
    <div class="section-head"><h2>50/50</h2><span class="link">ЧЕСТНЫЙ РИСК</span></div>
    <div class="game-card-grid">
      <button class="game-card" data-action="open-game" data-game="coin" style="--game-color:var(--gold);--game-glow:rgba(255,176,32,.28)">${icon('coin')}<h3>Орёл / Решка</h3><p>Угадай сторону монеты и удвой NFT</p><span class="go">${icon('arrow')}</span></button>
      <button class="game-card" data-action="open-game" data-game="color" style="--game-color:var(--red);--game-glow:rgba(255,91,110,.26)">${icon('sparkles')}<h3>Красное / Чёрное</h3><p>Цвет карты решает судьбу NFT</p><span class="go">${icon('arrow')}</span></button>
      <button class="game-card" data-action="open-game" data-game="parity" style="--game-color:var(--cyan);--game-glow:rgba(34,211,238,.25)">${icon('bolt')}<h3>Чёт / Нечет</h3><p>Число от 1 до 100. Шанс ровно 50%</p><span class="go">${icon('arrow')}</span></button>
      <button class="game-card" data-route="inventory" style="--game-color:var(--violet);--game-glow:rgba(139,92,246,.24)">${icon('layers')}<h3>Выбрать NFT</h3><p>Сначала выбери карту для риска</p><span class="go">${icon('arrow')}</span></button>
    </div>
  </section>`;
}

function renderMarket() {
  const data = state.data;
  const tabs = [
    ['market', 'Рынок'],
    ['auction', 'Аукционы'],
    ['mine', 'Мои лоты'],
  ];
  let content = '';
  if (state.marketTab === 'market') {
    content = data.market.listings.length ? `<div class="lot-list">${data.market.listings.map((listing) => {
      const own = listing.seller.id === data.user.id;
      return `<div class="lot-card">
        <img class="lot-art" src="${listing.item.item.art}" alt="">
        <div class="lot-info"><h4>${esc(listing.item.item.name)}</h4><div class="lot-seller">${icon('user')} ${esc(listing.seller.firstName || listing.seller.username || 'Игрок')}</div><div class="lot-price">${icon('star')}${fmt(listing.price)}</div></div>
        <div class="lot-side"><span class="chip" style="color:${RARITY[listing.item.item.rarity].color}">${RARITY[listing.item.item.rarity].label}</span>
        ${own ? `<button class="btn btn-danger-ghost btn-sm" data-action="market-cancel" data-id="${listing.id}">Снять</button>` : `<button class="btn btn-primary btn-sm" data-action="market-buy" data-id="${listing.id}">Купить</button>`}</div>
      </div>`;
    }).join('')}</div>` : emptyState('market', 'Рынок пуст', 'Выставь свой NFT на продажу — другие игроки увидят его здесь.', `<button class="btn btn-primary btn-sm" style="margin-top:14px" data-route="inventory">В коллекцию</button>`);
  } else if (state.marketTab === 'auction') {
    content = data.market.auctions.length ? `<div class="lot-list">${data.market.auctions.map((auction) => {
      const own = auction.seller.id === data.user.id;
      const bid = auction.currentBid || auction.minBid;
      return `<div class="lot-card">
        <img class="lot-art" src="${auction.item.item.art}" alt="">
        <div class="lot-info"><h4>${esc(auction.item.item.name)}</h4><div class="lot-seller">${icon('clock')} ${timeLeft(auction.endsAt)} · ${esc(auction.seller.firstName || 'Игрок')}</div><div class="lot-price">${icon('star')}${fmt(bid)} <span class="bid-badge">${auction.currentBid ? 'СТАВКА' : 'СТАРТ'}</span></div></div>
        <div class="lot-side">${own ? `<button class="btn btn-danger-ghost btn-sm" data-action="auction-cancel" data-id="${auction.id}">Снять</button>` : `<button class="btn btn-soft btn-sm" data-action="auction-bid" data-id="${auction.id}">Ставка</button>${auction.buyout ? `<button class="btn btn-primary btn-sm" data-action="auction-buyout" data-id="${auction.id}">${fmt(auction.buyout)}</button>` : ''}`}</div>
      </div>`;
    }).join('')}</div>` : emptyState('gavel', 'Аукционов нет', 'Создай лот с минимальной ставкой и таймером.', `<button class="btn btn-primary btn-sm" style="margin-top:14px" data-route="inventory">Выбрать NFT</button>`);
  } else {
    const lots = data.myListings.map((listing) => `<div class="lot-card">
      <img class="lot-art" src="${listing.item.item.art}" alt="">
      <div class="lot-info"><h4>${esc(listing.item.item.name)}</h4><div class="lot-seller">${icon('tag')} Фиксированная цена</div><div class="lot-price">${icon('star')}${fmt(listing.price)}</div></div>
      <div class="lot-side"><button class="btn btn-danger-ghost btn-sm" data-action="market-cancel" data-id="${listing.id}">Снять</button></div>
    </div>`).concat(data.myAuctions.map((auction) => `<div class="lot-card">
      <img class="lot-art" src="${auction.item.item.art}" alt="">
      <div class="lot-info"><h4>${esc(auction.item.item.name)}</h4><div class="lot-seller">${icon('gavel')} ${auction.status === 'active' ? timeLeft(auction.endsAt) : auction.status}</div><div class="lot-price">${icon('star')}${fmt(auction.currentBid || auction.minBid)}</div></div>
      <div class="lot-side">${auction.status === 'active' && !auction.currentBid ? `<button class="btn btn-danger-ghost btn-sm" data-action="auction-cancel" data-id="${auction.id}">Снять</button>` : `<span class="chip dim">${auction.status === 'active' ? 'ТОРГИ' : 'АРХИВ'}</span>`}</div>
    </div>`));
    content = lots.length ? `<div class="lot-list">${lots.join('')}</div>` : emptyState('tag', 'Своих лотов нет', 'Выставь NFT на рынок или создай аукцион из карточки коллекции.', `<button class="btn btn-primary btn-sm" style="margin-top:14px" data-route="inventory">В коллекцию</button>`);
  }
  return `<section class="page">
    ${pageHead('PLAYER MARKET / 05', 'Рынок', 'Покупай и продавай NFT между игроками. Фиксированная цена или аукцион с таймером и ставками.', fmt(data.market.listings.length + data.market.auctions.length), 'лотов')}
    <div style="display:flex;gap:7px;align-items:center;margin-bottom:12px">
      <div class="segment" style="flex:1">${tabs.map(([key, label]) => `<button class="${state.marketTab === key ? 'active' : ''}" data-action="market-tab" data-value="${key}">${label}</button>`).join('')}</div>
      <button class="btn btn-ghost btn-icon" data-action="refresh-market" aria-label="Обновить">${icon('refresh')}</button>
    </div>
    ${content}
  </section>`;
}

function renderProfile() {
  const data = state.data;
  const user = data.user;
  const inventoryValue = data.inventory.reduce((sum, item) => sum + item.value, 0);
  const netWorth = user.stars + inventoryValue;
  const achievements = data.achievements;
  const unlocked = achievements.filter((item) => item.unlocked).length;
  const txMap = {
    daily: ['Ежедневный бонус', 'calendar'],
    case_open: ['Открытие кейса', 'box'],
    market_buy: ['Покупка на рынке', 'market'],
    market_sale: ['Продажа NFT', 'tag'],
    auction_bid: ['Ставка', 'gavel'],
    auction_refund: ['Возврат ставки', 'refresh'],
    auction_sale: ['Аукцион', 'gavel'],
    auction_buyout: ['Выкуп', 'bolt'],
    admin_grant: ['Начисление', 'shield'],
    gift_upgrade: ['Улучшение подарка', 'gift'],
  };
  return `<section class="page">
    ${pageHead('PROFILE / 06', 'Профиль', 'Твоя статистика, уровень, достижения и место среди игроков.', fmt(netWorth), 'капитал')}
    <div class="profile-hero">
      <div class="profile-top">
        ${avatar(user, 'profile-avatar')}
        <div class="profile-name-wrap"><div class="profile-name">${esc(user.firstName || 'Игрок')}</div><div class="profile-handle">${user.username ? '@' + esc(user.username) : 'ID ' + user.id}</div>
          <div class="level-line"><span class="level-badge">LVL ${user.level}</span><div class="xp-bar"><span style="width:${Math.round(user.xpProgress * 100)}%"></span></div><span class="tiny muted">${fmt(user.xp)} XP</span></div>
        </div>
      </div>
      <div class="profile-stats">
        <div class="profile-stat"><b>${fmt(user.stars)}</b><small>звёзды</small></div>
        <div class="profile-stat"><b>${fmt(data.inventory.length)}</b><small>NFT</small></div>
        <div class="profile-stat"><b>${fmt(user.stats.bestDrop)}</b><small>лучший дроп</small></div>
      </div>
    </div>
    <div class="section-head"><h2>Ежедневный бонус</h2><span class="link">${data.daily.available ? 'ДОСТУПЕН' : '24 ЧАСА'}</span></div>
    <div class="daily-panel">
      <span class="daily-icon">${icon('calendar')}</span>
      <span class="daily-copy"><h3>${data.daily.available ? 'Бонус готов' : 'Стрик ' + data.daily.streak + ' дней'}</h3><p>${data.daily.available ? 'Забери ' + fmt(data.daily.reward) + ' звёзд' : 'Следующий через ' + timeLeft(data.daily.nextAt)}</p></span>
      <button class="btn ${data.daily.available ? 'btn-gold' : 'btn-ghost'} btn-sm" data-action="daily" ${data.daily.available ? '' : 'disabled'}>${data.daily.available ? 'Забрать' : 'Ждать'}</button>
    </div>
    <div class="section-head"><h2>Статистика</h2><span class="link">${fmt(user.xp)} XP</span></div>
    <div class="stats-grid">
      <div class="stat-box"><small>Открыто кейсов</small><b>${fmt(user.stats.totalOpened)}</b></div>
      <div class="stat-box"><small>Потрачено звёзд</small><b>${fmt(user.stats.totalSpent)}</b></div>
      <div class="stat-box"><small>Апгрейды</small><b>${fmt(user.stats.upgradesWon)} / ${fmt(user.stats.upgradesWon + user.stats.upgradesLost)}</b></div>
      <div class="stat-box"><small>Игры 50/50</small><b>${fmt(user.stats.gamesWon)} / ${fmt(user.stats.gamesPlayed)}</b></div>
      <div class="stat-box"><small>Ракета</small><b>${fmt(user.stats.rocketCashed)} / ${fmt(user.stats.rocketFlights)}</b></div>
      <div class="stat-box"><small>Сделки</small><b>${fmt(user.stats.marketSales + user.stats.marketPurchases)}</b></div>
      <div class="stat-box"><small>Улучшено подарков</small><b>${fmt(user.stats.giftUpgrades || 0)}</b></div>
    </div>
    <div class="section-head"><h2>Достижения</h2><span class="link">${unlocked}/${achievements.length}</span></div>
    <div class="ach-grid">${achievements.map((achievement) => `<div class="ach ${achievement.unlocked ? 'unlocked' : 'locked'}"><span class="ach-icon">${icon(achievement.icon)}</span><span><b>${esc(achievement.name)}</b><small>${esc(achievement.description)}</small></span></div>`).join('')}</div>
    <div class="section-head"><h2>Топ игроков</h2><span class="link">NET WORTH</span></div>
    <div class="panel" style="padding:0 10px">${data.leaderboard.map((player) => `<div class="leader-row"><span class="leader-rank ${player.rank <= 3 ? 'top' : ''}">${player.rank}</span>${avatar({ photoUrl: player.photoUrl, firstName: player.firstName, username: player.username }, 'leader-avatar')}<span class="leader-name">${esc(player.firstName || player.username || 'Игрок')}<small>LVL ${Math.max(1, Math.floor(Math.sqrt(player.xp / 100)) + 1)}</small></span><span class="leader-worth">${fmt(player.netWorth)}</span></div>`).join('')}</div>
    <div class="section-head"><h2>Активность</h2></div>
    <div class="panel" style="padding:0 12px">${data.transactions.length ? data.transactions.map((tx) => {
      const [label, ic] = txMap[tx.type] || [tx.type, 'chart'];
      return `<div class="tx-row"><span class="tx-icon">${icon(ic)}</span><span class="tx-copy"><b>${esc(label)}</b><small>${timeAgo(tx.createdAt)}</small></span><span class="tx-amount ${tx.amount >= 0 ? 'plus' : 'minus'}">${tx.amount >= 0 ? '+' : ''}${fmt(tx.amount)}</span></div>`;
    }).join('') : '<div style="padding:18px;text-align:center;color:var(--muted);font-size:10px">Активность появится после первых действий.</div>'}</div>
    <div class="section-head"><h2>Настройки</h2></div>
    <div class="panel" style="padding:2px 12px">
      <div class="settings-row"><span><b>Звук</b><small>Короткие звуки интерфейса</small></span><button class="toggle ${state.settings.sound ? 'on' : ''}" data-action="toggle-sound" aria-label="Звук"></button></div>
      <div class="settings-row"><span><b>Вибрация</b><small>Тактильный отклик Telegram</small></span><button class="toggle ${state.settings.haptics ? 'on' : ''}" data-action="toggle-haptics" aria-label="Вибрация"></button></div>
      ${user.isAdmin ? `<div class="settings-row"><span><b>Админ-панель</b><small>Только для владельца NFT FLEX</small></span><button class="btn btn-soft btn-sm" data-action="admin">${icon('shield')} Открыть</button></div>` : ''}
    </div>
    <p class="upgrade-note" style="text-align:center;margin-top:18px">NFT FLEX · цифровая коллекция · звёзды не являются реальной валютой</p>
  </section>`;
}

function openSheet(content, options = {}) {
  clearTimeout(window.__modalCloseTimer);
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-backdrop" data-action="close-modal"></div><div class="modal-sheet ${options.full ? 'full' : ''}"><div class="modal-grab"></div>${content}</div>`;
  root.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (tg?.BackButton) tg.BackButton.show();
  const sheet = $('.modal-sheet', root);
  if (options.onMount) requestAnimationFrame(() => options.onMount(sheet));
}

function closeModal() {
  const root = $('#modal-root');
  const sheet = $('.modal-sheet', root);
  if (sheet) {
    sheet.style.transform = 'translate(-50%, 105%)';
    window.__modalCloseTimer = setTimeout(() => {
      root.innerHTML = '';
      root.classList.remove('open');
      document.body.style.overflow = '';
      if (tg?.BackButton) tg.BackButton.hide();
    }, 220);
  } else {
    root.classList.remove('open');
    if (tg?.BackButton) tg.BackButton.hide();
  }
}

function modalHead(title, subtitle = '', close = true) {
  return `<div class="modal-head"><div><h2>${title}</h2>${subtitle ? `<small>${subtitle}</small>` : ''}</div>${close ? `<button class="modal-close" data-action="close-modal">${icon('close')}</button>` : ''}</div>`;
}

function showCaseDetail(caseKey) {
  const item = state.data.cases.find((entry) => entry.key === caseKey);
  if (!item) return;
  const pool = [...item.pool].sort((a, b) => b.chance - a.chance);
  openSheet(`${modalHead(esc(item.name), esc(item.tagline))}
    <div class="modal-body">
      <img class="case-sheet-art" src="${item.art}" alt="${esc(item.name)}">
      <div class="case-odds"><div class="odds-head"><b>Содержимое и шансы</b><span class="tiny muted">${pool.length} NFT</span></div><div class="odds-list">${pool.map((entry) => `<div class="odds-row rarity-${entry.item.rarity}" style="--rarity-color:${RARITY[entry.item.rarity].color}"><img src="${entry.item.art}" alt=""><span class="odds-name"><b>${esc(entry.item.name)}</b><small>${RARITY[entry.item.rarity].label}</small></span><span class="odds-chance">${(entry.chance * 100).toFixed(entry.chance < 0.01 ? 2 : 1)}%</span></div>`).join('')}</div></div>
      <div class="case-buy-row">
        <button class="btn btn-ghost" data-action="open-case" data-case="${item.key}" data-count="1">${icon('box')} ОТКРЫТЬ 1 <small>${fmt(item.price)} звёзд</small></button>
        <button class="btn btn-primary" data-action="open-case" data-case="${item.key}" data-count="5">${icon('sparkles')} ОТКРЫТЬ 5 <small>${fmt(item.price * 5)} звёзд</small></button>
      </div>
      <p class="hint" style="text-align:center;margin-top:10px">В наборе из 5 гарантирован минимум один NFT редкости «Редкий» или выше.</p>
    </div>`);
}

async function openCase(caseKey, count) {
  if (state.busy) return;
  const item = state.data.cases.find((entry) => entry.key === caseKey);
  if (!item) return;
  if (state.data.user.stars < item.price * count) {
    toast('Недостаточно звёзд. Забери ежедневный бонус или продай NFT.', 'error');
    return;
  }
  state.busy = true;
  closeModal();
  try {
    tone(220, 0.08, 'triangle');
    const result = await api('/cases/open', { method: 'POST', body: { caseKey, count } });
    state.data.user.stars = result.user.stars;
    updateTopbar();
    showReveal(result);
    await refresh(true, false);
    state.busy = false;
  } catch (error) {
    state.busy = false;
    toast(error.message, 'error');
  }
}

function showReveal(result) {
  const items = result.items;
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const rarity = RARITY[items.reduce((best, item) => (RARITY[item.item.rarity].order > RARITY[best.item.rarity].order ? item : best), items[0]).item.rarity];
  const cards = items.map((item, index) => `<div class="reveal-card rarity-${item.item.rarity}" style="--rarity-color:${RARITY[item.item.rarity].color};--rarity-glow:${RARITY[item.item.rarity].color}55;animation-delay:${index * 0.12}s"><img src="${item.item.art}" alt=""><div class="reveal-copy"><b>${esc(item.item.name)}</b><small>${RARITY[item.item.rarity].label} · ${fmt(item.value)}</small></div></div>`).join('');
  const overlay = document.createElement('div');
  overlay.className = 'reveal-overlay';
  overlay.id = 'reveal-overlay';
  overlay.innerHTML = `<div class="reveal-rays"></div>
    <button class="reveal-skip" data-action="close-reveal">${icon('close')}</button>
    <div class="reveal-title">ДРОП ПОЛУЧЕН</div>
    <div class="reveal-case">${esc(result.case.name)}</div>
    <div class="reveal-stage">${items.length === 1 ? `<div class="reveal-single">${cards}</div>` : `<div class="reveal-multi">${cards}</div>`}</div>
    <div class="reveal-total"><small>СУММАРНАЯ СТОИМОСТЬ</small><b>${icon('star')}${fmt(total)}</b></div>
    <div class="reveal-actions">
      <button class="btn btn-primary btn-block" data-action="case-again" data-case="${result.case.key}" data-count="${items.length}">${icon('refresh')} ОТКРЫТЬ ЕЩЁ ${items.length}</button>
      <button class="btn btn-ghost btn-block" data-action="close-reveal">ЗАБРАТЬ В КОЛЛЕКЦИЮ</button>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  tone(520, 0.08, 'sine');
  setTimeout(() => tone(780, 0.12, 'sine'), 120);
  haptic(items.some((item) => RARITY[item.item.rarity].order >= 5) ? 'success' : 'medium');
  for (let index = 0; index < 26; index += 1) {
    const confetti = document.createElement('span');
    confetti.className = 'confetti';
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.background = rarity.color;
    confetti.style.animationDuration = `${1.6 + Math.random() * 2.4}s`;
    confetti.style.animationDelay = `${Math.random() * 0.6}s`;
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    overlay.appendChild(confetti);
  }
}

function closeReveal() {
  const overlay = $('#reveal-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity .3s';
    setTimeout(() => {
      overlay.remove();
      document.body.style.overflow = '';
      refresh(true, true);
    }, 300);
  }
}

function showItemSheet(itemId) {
  const item = state.data.inventory.find((entry) => entry.id === itemId);
  if (!item) return;
  const rarity = rarityOf(item);
  openSheet(`${modalHead('NFT', 'Управление картой')}
    <div class="modal-body">
      <img class="item-sheet-art" src="${item.item.art}" alt="${esc(item.item.name)}">
      <div class="item-sheet-head"><div><h2>${esc(item.item.name)}</h2><p class="rarity-${item.item.rarity}" style="color:${rarity.color}">${rarity.label} / ${esc(item.item.collection)}</p></div><div class="item-sheet-price"><b>${icon('star')}${fmt(item.value)}</b><small>ОЦЕНКА</small></div></div>
      <p class="item-desc">${esc(item.item.description)}</p>
      <div class="item-facts"><div class="fact"><small>СЕРИЯ</small><b>#${esc(item.serial)}</b></div><div class="fact"><small>ИСТОЧНИК</small><b>${esc(item.source.startsWith('case:') ? 'Кейс' : item.source === 'daily' ? 'Бонус' : 'Игра')}</b></div><div class="fact"><small>В КОЛЛЕКЦИИ</small><b>${item.favorite ? 'Избранное' : 'Актив'}</b></div></div>
      ${item.item.gift ? `<div class="gift-sheet-panel">
        <div class="gift-sheet-head"><span class="gift-level-badge">LVL ${item.giftLevel || 1}</span><span class="tiny muted">${esc(item.item.model)} · ${esc(item.giftBackdrop || '—')} · ${esc(item.giftSymbol || '—')}</span></div>
        <div class="gift-level-track"><span style="width:${Math.round(((item.giftLevel || 1) / 10) * 100)}%"></span></div>
        <button class="btn btn-gold btn-block btn-sm" data-action="gift-upgrade" data-id="${item.id}" ${(item.giftLevel || 1) >= 10 ? 'disabled' : ''}>${icon('upgrade')} ${(item.giftLevel || 1) >= 10 ? 'МАКСИМАЛЬНЫЙ УРОВЕНЬ' : 'УЛУЧШИТЬ · ' + fmt(giftUpgradeCost(item.value)) + ' ЗВЁЗД'}</button>
      </div>` : ''}
      <div class="item-actions">
        ${item.item.gift ? `<button class="btn btn-gold" data-action="gift-upgrade" data-id="${item.id}">${icon('gift')} Улучшить подарок</button>` : ''}
        <button class="btn ${item.favorite ? 'btn-soft' : 'btn-ghost'}" data-action="favorite" data-id="${item.id}">${icon('heart')} ${item.favorite ? 'В избранном' : 'В избранное'}</button>
        <button class="btn btn-ghost" data-action="item-upgrade" data-id="${item.id}">${icon('upgrade')} В апгрейд</button>
        <button class="btn btn-ghost" data-action="item-rocket" data-id="${item.id}">${icon('rocket')} Ракета</button>
        <button class="btn btn-ghost" data-action="item-game" data-id="${item.id}">${icon('dice')} 50/50</button>
        <button class="btn btn-soft" data-action="item-sell" data-id="${item.id}">${icon('tag')} Продать</button>
        <button class="btn btn-soft" data-action="item-auction" data-id="${item.id}">${icon('gavel')} Аукцион</button>
      </div>
    </div>`);
}

function showSellForm(itemId) {
  const item = state.data.inventory.find((entry) => entry.id === itemId);
  if (!item) return;
  closeModal();
  openSheet(`${modalHead('Продажа NFT', esc(item.item.name))}
    <div class="modal-body"><img class="item-sheet-art" src="${item.item.art}" alt="" style="aspect-ratio:1.7"><div class="big-price">${icon('star')}<span id="sell-price-label">${fmt(Math.round(item.value * 1.1))}</span></div><p class="hint" style="text-align:center">Комиссия рынка отсутствует. Звёзды получаешь сразу после покупки.</p>
      <div class="form-row"><label>Цена в звёздах</label><input class="input" id="sell-price" type="number" min="1" max="1000000" value="${Math.round(item.value * 1.1)}" inputmode="numeric"></div>
      <div class="modal-actions"><button class="btn btn-primary btn-block" data-action="confirm-sell" data-id="${item.id}">${icon('tag')} ВЫСТАВИТЬ НА РЫНОК</button></div>
    </div>`);
}

function showAuctionForm(itemId) {
  const item = state.data.inventory.find((entry) => entry.id === itemId);
  if (!item) return;
  closeModal();
  openSheet(`${modalHead('Аукцион', esc(item.item.name))}
    <div class="modal-body"><img class="item-sheet-art" src="${item.item.art}" alt="" style="aspect-ratio:1.7">
      <div class="form-row"><label>Минимальная ставка</label><input class="input" id="auction-min" type="number" min="1" max="1000000" value="${Math.max(1, Math.round(item.value * 0.7))}" inputmode="numeric"></div>
      <div class="form-row"><label>Выкуп, необязательно</label><input class="input" id="auction-buyout" type="number" min="1" max="1000000" value="${Math.round(item.value * 1.25)}" inputmode="numeric"></div>
      <div class="form-row"><label>Длительность</label><div class="segment" id="auction-hours">${[1, 6, 24].map((hours) => `<button type="button" class="${hours === 6 ? 'active' : ''}" data-action="auction-hours" data-value="${hours}">${hours} ч</button>`).join('')}</div></div>
      <div class="modal-actions"><button class="btn btn-primary btn-block" data-action="confirm-auction" data-id="${item.id}">${icon('gavel')} СОЗДАТЬ АУКЦИОН</button></div>
    </div>`);
}

function pickItem(title, items, callback, options = {}) {
  if (!items.length) {
    toast('Нет доступных NFT для выбора', 'error');
    return;
  }
  openSheet(`${modalHead(title, options.subtitle || 'Выбери одну карту')}
    <div class="modal-body"><div class="picker-list">${items.map((item) => `<button class="picker-item" data-action="pick-item" data-id="${item.id}"><img src="${item.item.art}" alt=""><span class="info"><b>${esc(item.item.name)}</b><small class="rarity-${item.item.rarity}" style="color:${RARITY[item.item.rarity].color}">${RARITY[item.item.rarity].label} · #${esc(item.serial)}</small></span><span class="value">${fmt(item.value)}</span></button>`).join('')}</div></div>`, { onMount: () => { state.targetPickerReturn = callback; } });
}

function showTargetPicker() {
  const items = state.data.catalog;
  openSheet(`${modalHead('Цель апгрейда', 'Что хочешь получить?')}<div class="modal-body"><div class="picker-list">${items.map((item) => `<button class="picker-item" data-action="pick-target" data-key="${item.key}"><img src="${item.art}" alt=""><span class="info"><b>${esc(item.name)}</b><small class="rarity-${item.rarity}" style="color:${RARITY[item.rarity].color}">${RARITY[item.rarity].label} · ${esc(item.collection)}</small></span><span class="value">${fmt(item.value)}</span></button>`).join('')}</div></div>`);
}

async function doUpgrade() {
  if (state.busy) return;
  const { stakes, target, chance } = upgradeChance();
  if (!stakes.length || !target) return;
  state.busy = true;
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'upgrade-anim';
  overlay.innerHTML = `<div class="upgrade-anim-ring"><svg viewBox="0 0 160 160"><defs><linearGradient id="upgradeGrad"><stop offset="0" stop-color="#22d3ee"/><stop offset=".5" stop-color="#8b5cf6"/><stop offset="1" stop-color="#ff4d8d"/></linearGradient></defs><circle class="track" cx="80" cy="80" r="70"/><circle class="bar" cx="80" cy="80" r="70" style="--chance:${chance}"/></svg><div class="upgrade-anim-center"><b>${Math.round(chance * 100)}%</b><small>шанс</small></div></div><div class="upgrade-anim-status">Проверяем контракт</div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  try {
    tone(300, 0.12, 'sawtooth', 0.02);
    const result = await api('/upgrade', { method: 'POST', body: { itemIds: stakes.map((item) => item.id), targetKey: target.key } });
    await sleep(1900);
    overlay.innerHTML = `<div class="upgrade-result ${result.won ? 'win' : 'lose'}"><div class="result-mark">${icon(result.won ? 'check' : 'skull')}</div>${result.won && result.newItem ? `<img src="${result.newItem.item.art}" alt="">` : ''}<h2>${result.won ? 'Апгрейд успешен' : 'NFT сгорел'}</h2><p>${result.won ? `${esc(result.target.name)} теперь в твоей коллекции` : `Шанс ${Math.round(result.chance * 100)}% не сработал. Загруженные NFT уничтожены.`}</p><div class="modal-actions" style="max-width:320px;margin:18px auto 0"><button class="btn btn-primary btn-block" data-action="close-upgrade-anim">ЗАБРАТЬ</button></div></div>`;
    haptic(result.won ? 'success' : 'error');
    tone(result.won ? 880 : 120, 0.2, result.won ? 'sine' : 'sawtooth');
    state.busy = false;
    state.upgradeStakes = [];
  } catch (error) {
    overlay.remove();
    document.body.style.overflow = '';
    state.busy = false;
    toast(error.message, 'error');
  }
}

function showGamePicker(game) {
  const labels = { rocket: 'Ракета', coin: 'Орёл / Решка', color: 'Красное / Чёрное', parity: 'Чёт / Нечет' };
  pickItem(`Ставка для «${labels[game]}»`, state.data.inventory, (item) => {
    closeModal();
    if (game === 'rocket') startRocket(item);
    else openMiniGame(game, item);
  }, { subtitle: 'NFT будет поставлен на кон. При проигрыше сгорит.' });
  // replace callback mechanism with direct handler
  state.targetPickerReturn = (item) => {
    closeModal();
    if (game === 'rocket') startRocket(item);
    else openMiniGame(game, item);
  };
}

function startRocket(item) {
  if (state.activeRocket) {
    toast('Сначала заверши текущий полёт', 'error');
    return;
  }
  openSheet(`${modalHead('Запуск ракеты', esc(item.item.name))}<div class="modal-body"><img class="item-sheet-art" src="${item.item.art}" alt="" style="aspect-ratio:1.25"><div class="panel" style="padding:13px;margin-top:12px"><div class="settings-row" style="padding-top:0"><span><b>Ставка</b><small>NFT уйдёт в полёт</small></span><b style="color:var(--gold)">${fmt(item.value)}</b></div><div class="settings-row"><span><b>Правило</b><small>Забери до краша — стоимость умножится</small></span></div><div class="settings-row" style="border-bottom:0"><span><b>При краше</b><small>NFT сгорает без возврата</small></span></div></div><div class="modal-actions row"><button class="btn btn-ghost" data-action="close-modal">Отмена</button><button class="btn btn-gold" data-action="confirm-rocket" data-id="${item.id}">${icon('rocket')} ВЗЛЕТЕТЬ</button></div></div>`);
}

async function confirmRocket(itemId) {
  if (state.busy) return;
  const item = state.data.inventory.find((entry) => entry.id === itemId);
  if (!item) return;
  state.busy = true;
  try {
    const round = await api('/rocket/start', { method: 'POST', body: { itemId } });
    state.data.inventory = state.data.inventory.filter((entry) => entry.id !== itemId);
    state.activeRocket = { ...round, status: 'active' };
    closeModal();
    openRocketStage(round);
    haptic('medium');
    state.busy = false;
  } catch (error) {
    state.busy = false;
    toast(error.message, 'error');
  }
}

function rocketMarkup(round) {
  return `${modalHead('Ракета', 'Забери иксы до краша', false)}
    <div class="modal-body"><div class="rocket-stage" id="rocket-stage">
      <div class="stars" id="rocket-stars"></div>
      <div class="rocket-stage-top"><span class="chip live">${icon('bolt')} В ПОЛЁТЕ</span><span class="chip" id="rocket-time">0.0 сек</span></div>
      <div class="rocket-center"><div class="rocket-multiplier" id="rocket-multiplier">1.00x</div><div class="rocket-label">ТЕКУЩИЙ МНОЖИТЕЛЬ</div></div>
      <div class="rocket-vehicle" id="rocket-vehicle"><svg viewBox="0 0 100 150"><defs><linearGradient id="rocketBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#a5f3fc"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs><path d="M50 4c20 15 30 40 30 70l-30 42-30-42C20 44 30 19 50 4z" fill="url(#rocketBody)"/><circle cx="50" cy="54" r="12" fill="#071019" opacity=".8"/><path d="M20 90 3 120l20-4zM80 90l17 30-20-4z" fill="#8b5cf6"/><path class="rocket-flame" d="M36 122c4 14 10 22 14 26 4-4 10-12 14-26l-14 8z" fill="#ff9f43"/></svg></div>
      <div class="rocket-stake"><img src="${round.item.item.art}" alt=""><div><b>${esc(round.item.item.name)}</b><small>ставка: ${fmt(round.item.value)} звёзд</small></div><button class="btn btn-gold" id="rocket-cashout" data-action="rocket-cashout">ЗАБРАТЬ</button></div>
    </div></div>`;
}

function openRocketStage(round) {
  openSheet(rocketMarkup(round), { full: true, onMount: () => mountRocket(round) });
}

function mountRocket(round) {
  const stage = $('#rocket-stage');
  if (!stage) return;
  const stars = $('#rocket-stars');
  stars.innerHTML = Array.from({ length: 48 }, () => `<span class="star" style="left:${Math.random() * 100}%;top:${Math.random() * 100}%;animation-duration:${1.4 + Math.random() * 2.8}s;animation-delay:${-Math.random() * 4}s"></span>`).join('');
  const startedAt = round.startedAt;
  const item = round.item;
  const tick = () => {
    if (!$('#rocket-multiplier')) return;
    const multiplier = Math.min(100, 1 + ((Date.now() - startedAt) / 1000) * 0.16);
    const el = $('#rocket-multiplier');
    el.textContent = `${multiplier.toFixed(2)}x`;
    el.classList.toggle('warm', multiplier >= 1.8);
    el.classList.toggle('hot', multiplier >= 3);
    const vehicle = $('#rocket-vehicle');
    if (vehicle) vehicle.style.bottom = `${124 + Math.min(220, (multiplier - 1) * 52)}px`;
    const time = $('#rocket-time');
    if (time) time.textContent = `${((Date.now() - startedAt) / 1000).toFixed(1)} сек`;
    state.rocketFrame = requestAnimationFrame(tick);
  };
  tick();
  const poll = async () => {
    if (!state.activeRocket || state.activeRocket.id !== round.id) return;
    try {
      const status = await api('/rocket/status', { method: 'POST', body: { roundId: round.id } });
      if (status.status === 'crashed') {
        state.activeRocket = null;
        cancelAnimationFrame(state.rocketFrame);
        showRocketCrash(status);
        return;
      }
      if (status.status === 'cashed') return;
    } catch {}
    state.rocketPoll = setTimeout(poll, 650);
  };
  state.rocketPoll = setTimeout(poll, 500);
  state.activeRocket = { ...round, status: 'active' };
  if (tg?.BackButton) tg.BackButton.hide();
}

function showRocketCrash(status) {
  const stage = $('#rocket-stage');
  if (!stage) return;
  stage.insertAdjacentHTML('beforeend', `<div class="rocket-crash">${icon('skull')}<h3>КРАШ</h3><p>Ракета взорвалась на ${Number(status.currentMultiplier || status.multiplier || 1).toFixed(2)}x. NFT сгорел.</p><button class="btn btn-ghost" data-action="close-rocket" style="margin-top:20px">ЗАКРЫТЬ</button></div>`);
  haptic('error');
  tone(90, 0.5, 'sawtooth', 0.05);
}

async function cashoutRocket() {
  if (!state.activeRocket || state.busy) return;
  state.busy = true;
  const button = $('#rocket-cashout');
  if (button) { button.disabled = true; button.textContent = 'ЗАБИРАЕМ'; }
  try {
    const result = await api('/rocket/cashout', { method: 'POST', body: { roundId: state.activeRocket.id } });
    cancelAnimationFrame(state.rocketFrame);
    state.activeRocket = null;
    if (result.crashed) {
      showRocketCrash(result);
      state.busy = false;
      return;
    }
    haptic('success');
    tone(880, 0.15, 'sine');
    const stage = $('#rocket-stage');
    if (stage) stage.insertAdjacentHTML('beforeend', `<div class="rocket-crash" style="background:radial-gradient(circle,rgba(67,209,122,.2),rgba(5,7,13,.94) 65%)">${icon('check', 'success-icon')}<h3 style="color:var(--green)">${result.multiplier.toFixed(2)}x</h3><p>Ты забрал NFT со стоимостью <b style="color:var(--gold)">${fmt(result.newValue)} звёзд</b>.</p><button class="btn btn-primary" data-action="close-rocket" style="margin-top:20px">ЗАБРАТЬ</button></div>`);
    state.busy = false;
    await refresh(true, false);
  } catch (error) {
    state.busy = false;
    toast(error.message, 'error');
    if (button) { button.disabled = false; button.textContent = 'ЗАБРАТЬ'; }
  }
}

function closeRocket() {
  cancelAnimationFrame(state.rocketFrame);
  clearTimeout(state.rocketPoll);
  state.activeRocket = null;
  closeModal();
  refresh(true, true);
}

function resumeRocketView() {
  if (!state.activeRocket) return;
  if ($('#rocket-stage')) return;
  const round = state.activeRocket;
  if (round.status === 'crashed') { state.activeRocket = null; refresh(); return; }
  openRocketStage({ ...round, startedAt: round.startedAt || round.started_at, item: round.item });
}

function openMiniGame(game, item) {
  const meta = {
    coin: { title: 'Орёл / Решка', icon: 'coin', options: [['heads', 'Орёл'], ['tails', 'Решка']] },
    color: { title: 'Красное / Чёрное', icon: 'sparkles', options: [['red', 'Красное'], ['black', 'Чёрное']] },
    parity: { title: 'Чёт / Нечет', icon: 'bolt', options: [['even', 'Чёт'], ['odd', 'Нечет']] },
  }[game];
  openSheet(`${modalHead(meta.title, 'Шанс 50 / 50')}<div class="modal-body">
    <div class="coin-stage" id="minigame-stage">
      <div class="coin ${game === 'coin' ? '' : 'hidden'}" id="game-coin"><div class="coin-face coin-front">${icon('star')}</div><div class="coin-face coin-back">${icon('bolt')}</div></div>
      ${game !== 'coin' ? `<div class="rocket-multiplier" id="game-number" style="font-size:64px">?</div><div class="rocket-label">${game === 'color' ? 'ЦВЕТ КАРТЫ' : 'ЧИСЛО 1–100'}</div>` : ''}
      <div style="display:flex;align-items:center;gap:9px;margin-top:18px;padding:8px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.03);width:100%"><img src="${item.item.art}" style="width:42px;height:42px;border-radius:8px;object-fit:cover" alt=""><div style="flex:1;min-width:0"><b style="font-size:10px;display:block">${esc(item.item.name)}</b><small style="font-size:9px;color:var(--gold)">${fmt(item.value)} звёзд</small></div><span class="chip">НА КОНУ</span></div>
      <div class="choice-row" id="game-choices">${meta.options.map(([value, label]) => `<button class="choice-btn ${game === 'color' ? value : ''}" data-action="game-choice" data-game="${game}" data-choice="${value}" data-id="${item.id}"><span class="dot"></span>${label}</button>`).join('')}</div>
      <div id="game-result"></div>
    </div>
  </div>`);
}

async function playMiniGame(game, choice, itemId) {
  if (state.busy) return;
  state.busy = true;
  const resultBox = $('#game-result');
  const coin = $('#game-coin');
  const number = $('#game-number');
  const buttons = $$('#game-choices .choice-btn');
  buttons.forEach((button) => button.disabled = true);
  if (coin) coin.classList.add('flip');
  if (number) {
    let counter = 0;
    const interval = setInterval(() => {
      number.textContent = String(Math.floor(Math.random() * 100) + 1);
      counter += 1;
      if (counter > 12) clearInterval(interval);
    }, 70);
  }
  tone(440, 0.05, 'triangle');
  try {
    const result = await api('/games/play', { method: 'POST', body: { game, choice, itemId } });
    await sleep(950);
    if (number) number.textContent = result.outcome === 'even' ? 'Чёт' : result.outcome === 'odd' ? 'Нечет' : result.outcome === 'red' ? 'Красное' : result.outcome === 'black' ? 'Чёрное' : result.outcome === 'heads' ? 'Орёл' : 'Решка';
    if (coin) coin.classList.remove('flip');
    resultBox.innerHTML = `<div class="minigame-result"><b style="color:${result.won ? 'var(--green)' : 'var(--red)'}">${result.won ? 'ПОБЕДА' : 'ПРОИГРЫШ'}</b><span>${result.won ? `Стоимость NFT: ${fmt(result.newValue)} звёзд` : 'NFT сгорел. В следующий раз повезёт.'}</span></div><div class="modal-actions row"><button class="btn btn-ghost" data-action="close-modal">${result.won ? 'ЗАБРАТЬ' : 'ЗАКРЫТЬ'}</button>${result.won ? `<button class="btn btn-primary" data-action="minigame-again" data-game="${game}" data-id="${itemId}">ЕЩЁ РАЗ</button>` : ''}</div>`;
    haptic(result.won ? 'success' : 'error');
    tone(result.won ? 880 : 110, 0.2, result.won ? 'sine' : 'sawtooth');
    await refresh(true, false);
    state.busy = false;
  } catch (error) {
    buttons.forEach((button) => (button.disabled = false));
    state.busy = false;
    toast(error.message, 'error');
  }
}

function showListingsForMarket() {}

function buyListing(listingId) {
  const listing = state.data.market.listings.find((entry) => entry.id === listingId);
  if (!listing) return;
  openSheet(`${modalHead('Купить NFT', esc(listing.item.item.name))}<div class="modal-body"><img class="item-sheet-art" src="${listing.item.item.art}" alt="" style="aspect-ratio:1.3"><div class="big-price">${icon('star')}${fmt(listing.price)}</div><p class="hint" style="text-align:center">Продавец: ${esc(listing.seller.firstName || listing.seller.username || 'Игрок')}</p><div class="modal-actions row"><button class="btn btn-ghost" data-action="close-modal">Отмена</button><button class="btn btn-primary" data-action="confirm-buy" data-id="${listing.id}">Купить</button></div></div>`);
}

async function confirmBuy(listingId) {
  if (state.busy) return;
  state.busy = true;
  try {
    const result = await api('/market/buy', { method: 'POST', body: { listingId } });
    state.data.user.stars = result.balance;
    updateTopbar();
    closeModal();
    toast('NFT куплен и добавлен в коллекцию', 'success');
    haptic('success');
    tone(700, 0.12, 'sine');
    await refresh(true, true);
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    state.busy = false;
  }
}

function showBidForm(auctionId) {
  const auction = state.data.market.auctions.find((entry) => entry.id === auctionId);
  if (!auction) return;
  const minimum = Math.max(auction.minBid, auction.currentBid + Math.max(10, Math.ceil(auction.currentBid * 0.05)));
  openSheet(`${modalHead('Ставка', esc(auction.item.item.name))}<div class="modal-body"><img class="item-sheet-art" src="${auction.item.item.art}" alt="" style="aspect-ratio:1.5"><div class="settings-row"><span><b>Текущая ставка</b><small>${auction.currentBid ? 'лидирует ' + esc(auction.currentBidder?.firstName || 'игрок') : 'ставок пока нет'}</small></span><b style="color:var(--gold)">${fmt(auction.currentBid || auction.minBid)}</b></div><div class="form-row"><label>Твоя ставка</label><input class="input" id="bid-amount" type="number" min="${minimum}" value="${minimum}" inputmode="numeric"></div><p class="hint">Минимум: ${fmt(minimum)} звёзд. Предыдущая ставка вернётся игроку.</p><div class="modal-actions"><button class="btn btn-primary btn-block" data-action="confirm-bid" data-id="${auction.id}">СДЕЛАТЬ СТАВКУ</button></div></div>`);
}

async function confirmBid(auctionId) {
  const amount = Number($('#bid-amount')?.value || 0);
  if (!amount || state.busy) return;
  state.busy = true;
  try {
    await api('/auction/bid', { method: 'POST', body: { auctionId, amount } });
    closeModal();
    toast('Ставка принята', 'success');
    haptic('success');
    await refresh(true, true);
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    state.busy = false;
  }
}

async function cancelListing(listingId) {
  if (state.busy) return;
  state.busy = true;
  try {
    await api('/market/cancel', { method: 'POST', body: { listingId } });
    toast('Лот снят', 'success');
    await refresh(true, true);
  } catch (error) { toast(error.message, 'error'); }
  finally { state.busy = false; }
}

async function cancelAuction(auctionId) {
  if (state.busy) return;
  state.busy = true;
  try {
    await api('/auction/cancel', { method: 'POST', body: { auctionId } });
    toast('Аукцион отменён', 'success');
    await refresh(true, true);
  } catch (error) { toast(error.message, 'error'); }
  finally { state.busy = false; }
}

async function claimDaily() {
  if (state.busy) return;
  state.busy = true;
  try {
    const result = await api('/daily/claim', { method: 'POST' });
    state.data.user.stars = result.balance;
    state.data.daily.available = false;
    state.data.daily.streak = result.streak;
    updateTopbar();
    toast(`Бонус получен: +${fmt(result.reward)} звёзд`, 'success');
    haptic('success');
    tone(620, 0.1, 'sine');
    setTimeout(() => tone(880, 0.12, 'sine'), 100);
    await refresh(true, true);
  } catch (error) { toast(error.message, 'error'); }
  finally { state.busy = false; }
}

function showAdmin() {
  openSheet(`${modalHead('Админ-панель', 'Только для владельца NFT FLEX')}<div class="modal-body"><div id="admin-overview"><div class="loader-line"><span></span></div></div><div class="form-row"><label>Поиск игрока</label><input class="input" id="admin-search" placeholder="ID, username или имя" inputmode="search"></div><div style="margin-top:12px" id="admin-users"><div class="loader-line"><span></span></div></div></div>`);
  loadAdmin();
  setTimeout(() => {
    const input = $('#admin-search');
    if (input) input.addEventListener('keydown', (event) => { if (event.key === 'Enter') loadAdmin(input.value.trim()); });
    if (input) input.addEventListener('input', () => { clearTimeout(window.__adminSearchTimer); window.__adminSearchTimer = setTimeout(() => loadAdmin(input.value.trim()), 500); });
  }, 50);
}

async function loadAdmin(search = '') {
  const overview = $('#admin-overview');
  const users = $('#admin-users');
  if (!overview || !users) return;
  try {
    const [stats, list] = await Promise.all([api('/admin/overview'), api('/admin/users' + (search ? `?search=${encodeURIComponent(search)}` : ''))]);
    overview.innerHTML = `<div class="admin-stat-grid"><div class="stat-box"><small>Игроков</small><b>${fmt(stats.users)}</b></div><div class="stat-box"><small>NFT в игре</small><b>${fmt(stats.inventoryItems)}</b></div><div class="stat-box"><small>Стоимость NFT</small><b>${fmt(stats.inventoryValue)}</b></div><div class="stat-box"><small>Активные лоты</small><b>${fmt(stats.listings + stats.activeAuctions)}</b></div></div>`;
    users.innerHTML = list.length ? list.map((player) => `<div class="admin-user"><span class="leader-avatar">${esc(initials(player))}</span><span class="info"><b>${esc(player.firstName || player.username || 'Игрок')} ${player.banned ? '· бан' : ''}</b><small>ID ${player.id} · ${fmt(player.stars)} звёзд · LVL ${player.level}</small></span><span class="admin-tools"><button class="btn btn-ghost" data-action="admin-stars" data-tg="${player.id}" data-name="${esc(player.firstName || player.username || '')}">Звёзды</button><button class="btn btn-ghost" data-action="admin-item" data-tg="${player.id}" data-name="${esc(player.firstName || player.username || '')}">NFT</button><button class="btn ${player.banned ? 'btn-ghost' : 'btn-danger-ghost'}" data-action="admin-ban" data-tg="${player.id}" data-banned="${player.banned ? '1' : '0'}">${player.banned ? 'Разбан' : 'Бан'}</button></span></div>`).join('') : '<div class="picker-empty">Игроки не найдены</div>';
  } catch (error) {
    overview.innerHTML = `<div class="picker-empty">${esc(error.message)}</div>`;
  }
}

function openAdminStars(tgId, name) {
  openSheet(`${modalHead('Начислить звёзды', esc(name || 'Игрок') + ' · ' + tgId)}<div class="modal-body"><div class="form-row"><label>Сумма</label><input class="input" id="admin-stars-amount" type="number" value="1000" inputmode="numeric"></div><div class="modal-actions row"><button class="btn btn-ghost" data-action="close-modal">Отмена</button><button class="btn btn-primary" data-action="confirm-admin-stars" data-tg="${tgId}">Начислить</button></div></div>`);
}

function openAdminItem(tgId, name) {
  openSheet(`${modalHead('Выдать NFT', esc(name || 'Игрок') + ' · ' + tgId)}<div class="modal-body"><div class="picker-list">${state.data.catalog.map((item) => `<button class="picker-item" data-action="confirm-admin-item" data-tg="${tgId}" data-key="${item.key}"><img src="${item.art}" alt=""><span class="info"><b>${esc(item.name)}</b><small style="color:${RARITY[item.rarity].color}">${RARITY[item.rarity].label}</small></span><span class="value">${fmt(item.value)}</span></button>`).join('')}</div></div>`);
}

async function confirmAdminStars(tgId) {
  const amount = Number($('#admin-stars-amount')?.value || 0);
  if (!amount) return;
  try {
    await api('/admin/grant-stars', { method: 'POST', body: { tgId: Number(tgId), amount } });
    toast('Звёзды начислены', 'success');
    closeModal();
    await refresh(true, false);
    setTimeout(showAdmin, 250);
  } catch (error) { toast(error.message, 'error'); }
}

async function confirmAdminItem(tgId, itemKey) {
  try {
    await api('/admin/grant-item', { method: 'POST', body: { tgId: Number(tgId), itemKey } });
    toast('NFT выдан', 'success');
    closeModal();
    setTimeout(showAdmin, 250);
  } catch (error) { toast(error.message, 'error'); }
}

async function toggleBan(tgId, banned) {
  try {
    await api('/admin/ban', { method: 'POST', body: { tgId: Number(tgId), banned: !banned } });
    toast(banned ? 'Игрок разбанен' : 'Игрок забанен', 'success');
    loadAdmin($('#admin-search')?.value?.trim() || '');
  } catch (error) { toast(error.message, 'error'); }
}

function goUpgradeWithItem(itemId) {
  state.upgradeStakes = [itemId];
  closeModal();
  go('upgrade');
}

function handleAction(action, el) {
  const id = el.dataset.id;
  switch (action) {
    case 'close-modal': closeModal(); break;
    case 'daily': claimDaily(); break;
    case 'case-detail': showCaseDetail(el.dataset.case); break;
    case 'open-case': openCase(el.dataset.case, Number(el.dataset.count)); break;
    case 'close-reveal': closeReveal(); break;
    case 'case-again': closeReveal(); setTimeout(() => openCase(el.dataset.case, Number(el.dataset.count)), 340); break;
    case 'item-sheet': showItemSheet(id); break;
    case 'gift-info': showGiftInfo(el.dataset.key); break;
    case 'gift-filter': state.giftFilter = el.dataset.value; renderRoute(); break;
    case 'gift-upgrade': showGiftUpgrade(id); break;
    case 'confirm-gift-upgrade': confirmGiftUpgrade(id); break;
    case 'favorite': toggleFavorite(id); break;
    case 'inv-filter': state.inventoryFilter = el.dataset.value; renderRoute(); break;
    case 'inv-sort': state.inventorySort = el.dataset.value; renderRoute(); break;
    case 'item-upgrade': goUpgradeWithItem(id); break;
    case 'item-rocket': {
      const item = state.data.inventory.find((entry) => entry.id === id);
      if (item) { closeModal(); setTimeout(() => startRocket(item), 160); }
      break;
    }
    case 'item-game': {
      const item = state.data.inventory.find((entry) => entry.id === id);
      if (item) { closeModal(); setTimeout(() => openGameChoiceForItem(item), 160); }
      break;
    }
    case 'item-sell': showSellForm(id); break;
    case 'item-auction': showAuctionForm(id); break;
    case 'confirm-sell': confirmSell(id); break;
    case 'confirm-auction': confirmAuction(id); break;
    case 'choose-target': showTargetPicker(); break;
    case 'pick-target': state.upgradeTarget = state.data.catalog.find((item) => item.key === el.dataset.key) || state.upgradeTarget; closeModal(); renderRoute(); break;
    case 'upgrade-add': openStakePicker(); break;
    case 'upgrade-remove': state.upgradeStakes = state.upgradeStakes.filter((itemId) => itemId !== id); renderRoute(); break;
    case 'pick-item': {
      const item = state.data.inventory.find((entry) => entry.id === id);
      if (item && state.targetPickerReturn) state.targetPickerReturn(item);
      break;
    }
    case 'do-upgrade': doUpgrade(); break;
    case 'close-upgrade-anim': closeUpgradeAnim(); break;
    case 'open-game': showGamePicker(el.dataset.game); break;
    case 'confirm-rocket': confirmRocket(id); break;
    case 'rocket-cashout': cashoutRocket(); break;
    case 'close-rocket': closeRocket(); break;
    case 'resume-rocket': resumeRocketView(); break;
    case 'game-choice': playMiniGame(el.dataset.game, el.dataset.choice, id); break;
    case 'minigame-again': {
      const item = state.data.inventory.find((entry) => entry.id === id);
      if (item) { closeModal(); setTimeout(() => openMiniGame(el.dataset.game, item), 160); }
      break;
    }
    case 'market-tab': state.marketTab = el.dataset.value; renderRoute(); break;
    case 'refresh-market': refresh(false, true).then(() => toast('Рынок обновлён')); break;
    case 'market-buy': buyListing(id); break;
    case 'confirm-buy': confirmBuy(id); break;
    case 'market-cancel': cancelListing(id); break;
    case 'auction-bid': showBidForm(id); break;
    case 'confirm-bid': confirmBid(id); break;
    case 'auction-cancel': cancelAuction(id); break;
    case 'auction-buyout': buyoutAuction(id); break;
    case 'auction-hours': $$('#auction-hours button').forEach((button) => button.classList.toggle('active', button === el)); break;
    case 'toggle-sound': {
      state.settings.sound = !state.settings.sound;
      localStorage.setItem('nftflex_sound', JSON.stringify(state.settings.sound));
      el.classList.toggle('on', state.settings.sound);
      if (state.settings.sound) tone(520, 0.08);
      break;
    }
    case 'toggle-haptics': {
      state.settings.haptics = !state.settings.haptics;
      localStorage.setItem('nftflex_haptics', JSON.stringify(state.settings.haptics));
      el.classList.toggle('on', state.settings.haptics);
      haptic('light');
      break;
    }
    case 'admin': showAdmin(); break;
    case 'admin-stars': openAdminStars(el.dataset.tg, el.dataset.name); break;
    case 'admin-item': openAdminItem(el.dataset.tg, el.dataset.name); break;
    case 'confirm-admin-stars': confirmAdminStars(el.dataset.tg); break;
    case 'confirm-admin-item': confirmAdminItem(el.dataset.tg, el.dataset.key); break;
    case 'admin-ban': toggleBan(el.dataset.tg, el.dataset.banned === '1'); break;
    case 'market-item': {
      const listing = [...state.data.market.listings, ...state.data.market.auctions].find((entry) => entry.id === id);
      if (listing) showMysteryItem(listing.item);
      break;
    }
    default: break;
  }
}

function showMysteryItem(item) {
  openSheet(`${modalHead('NFT на рынке', esc(item.item.name))}<div class="modal-body"><img class="item-sheet-art" src="${item.item.art}" alt=""><p class="item-desc" style="text-align:center">Этот NFT выставлен другим игроком. Открой раздел «Рынок», чтобы купить его или сделать ставку.</p></div>`);
}

async function toggleFavorite(itemId) {
  try {
    await api('/inventory/favorite', { method: 'POST', body: { itemId } });
    const item = state.data.inventory.find((entry) => entry.id === itemId);
    if (item) item.favorite = !item.favorite;
    toast(item?.favorite ? 'Добавлено в избранное' : 'Убрано из избранного');
    haptic('light');
    renderRoute();
    if ($('#modal-root').classList.contains('open')) closeModal();
  } catch (error) { toast(error.message, 'error'); }
}

async function confirmSell(itemId) {
  const price = Number($('#sell-price')?.value || 0);
  if (!price) return;
  try {
    await api('/market/list', { method: 'POST', body: { itemId, price } });
    closeModal();
    toast('Лот выставлен на рынок', 'success');
    haptic('success');
    await refresh(true, true);
  } catch (error) { toast(error.message, 'error'); }
}

async function confirmAuction(itemId) {
  const minBid = Number($('#auction-min')?.value || 0);
  const buyout = Number($('#auction-buyout')?.value || 0) || null;
  const active = $('#auction-hours button.active');
  const hours = Number(active?.dataset.value || 6);
  try {
    await api('/auction/create', { method: 'POST', body: { itemId, minBid, buyout, hours } });
    closeModal();
    toast('Аукцион создан', 'success');
    haptic('success');
    await refresh(true, true);
  } catch (error) { toast(error.message, 'error'); }
}

async function buyoutAuction(auctionId) {
  if (state.busy) return;
  state.busy = true;
  try {
    const result = await api('/auction/buyout', { method: 'POST', body: { auctionId } });
    state.data.user.stars = result.balance;
    updateTopbar();
    toast('NFT выкуплен', 'success');
    haptic('success');
    await refresh(true, true);
  } catch (error) { toast(error.message, 'error'); }
  finally { state.busy = false; }
}

function openStakePicker() {
  const available = state.data.inventory.filter((item) => !state.upgradeStakes.includes(item.id));
  if (!available.length) { toast('Все NFT уже загружены или коллекция пуста', 'error'); return; }
  pickItem('Добавить NFT в апгрейд', available, (item) => {
    if (state.upgradeStakes.length >= 5) return;
    state.upgradeStakes.push(item.id);
    closeModal();
    renderRoute();
  }, { subtitle: 'Можно загрузить до 5 карт' });
}

function openGameChoiceForItem(item) {
  openSheet(`${modalHead('Игра 50/50', esc(item.item.name))}<div class="modal-body"><div class="game-card-grid">
    <button class="game-card" data-action="start-nft-game" data-game="coin" data-id="${item.id}" style="--game-color:var(--gold);--game-glow:rgba(255,176,32,.28)">${icon('coin')}<h3>Орёл / Решка</h3><p>Монета решит судьбу NFT</p><span class="go">${icon('arrow')}</span></button>
    <button class="game-card" data-action="start-nft-game" data-game="color" data-id="${item.id}" style="--game-color:var(--red);--game-glow:rgba(255,91,110,.26)">${icon('sparkles')}<h3>Красное / Чёрное</h3><p>50% на удвоение стоимости</p><span class="go">${icon('arrow')}</span></button>
    <button class="game-card" data-action="start-nft-game" data-game="parity" data-id="${item.id}" style="--game-color:var(--cyan);--game-glow:rgba(34,211,238,.25)">${icon('bolt')}<h3>Чёт / Нечет</h3><p>Число от 1 до 100</p><span class="go">${icon('arrow')}</span></button>
  </div></div>`);
}

function closeUpgradeAnim() {
  const overlay = $('.upgrade-anim');
  if (overlay) overlay.remove();
  document.body.style.overflow = '';
  refresh(true, true);
}

document.addEventListener('click', (event) => {
  const routeEl = event.target.closest('[data-route]');
  if (routeEl) {
    event.preventDefault();
    go(routeEl.dataset.route);
    return;
  }
  const actionEl = event.target.closest('[data-action]');
  if (actionEl) {
    const action = actionEl.dataset.action;
    if (action === 'favorite' && event.target.closest('[data-action="item-sheet"]')) {
      event.stopPropagation();
    }
    if (action === 'start-nft-game') {
      const item = state.data.inventory.find((entry) => entry.id === actionEl.dataset.id);
      if (item) { closeModal(); setTimeout(() => openMiniGame(actionEl.dataset.game, item), 160); }
      return;
    }
    if (action === 'close-modal') { closeModal(); return; }
    handleAction(action, actionEl);
  }
});

document.addEventListener('input', (event) => {
  if (event.target.id === 'sell-price') {
    const label = $('#sell-price-label');
    if (label) label.textContent = fmt(Number(event.target.value || 0));
  }
});

window.addEventListener('hashchange', () => {
  const route = location.hash.replace('#', '') || 'cases';
  if (route !== state.route) { state.route = route; renderRoute(); }
});

boot();
