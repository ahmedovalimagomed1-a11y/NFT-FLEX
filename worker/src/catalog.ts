export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface NftItem {
  key: string;
  name: string;
  rarity: Rarity;
  value: number;
  collection: string;
  description: string;
  accent: string;
  art: string;
}

export interface CaseDef {
  key: string;
  name: string;
  tagline: string;
  price: number;
  badge: string;
  featured?: boolean;
  gradient: string;
  art: string;
  pool: { itemKey: string; weight: number }[];
}

export const RARITIES: Record<Rarity, { label: string; color: string; glow: string; order: number }> = {
  common: { label: 'Обычный', color: '#9aa4b2', glow: 'rgba(154,164,178,.45)', order: 1 },
  uncommon: { label: 'Необычный', color: '#43d17a', glow: 'rgba(67,209,122,.45)', order: 2 },
  rare: { label: 'Редкий', color: '#3fa7ff', glow: 'rgba(63,167,255,.5)', order: 3 },
  epic: { label: 'Эпический', color: '#b06bff', glow: 'rgba(176,107,255,.55)', order: 4 },
  legendary: { label: 'Легендарный', color: '#ffb020', glow: 'rgba(255,176,32,.55)', order: 5 },
  mythic: { label: 'Мифический', color: '#ff4d8d', glow: 'rgba(255,77,141,.6)', order: 6 },
};

const item = (
  key: string,
  name: string,
  rarity: Rarity,
  value: number,
  collection: string,
  description: string,
  accent: string,
): NftItem => ({ key, name, rarity, value, collection, description, accent, art: `/assets/nfts/${key}.svg` });

export const ITEMS: NftItem[] = [
  item('street_cap', 'Кепка с района', 'common', 90, 'Улица', 'Потёртая кепка, которая видела всё. Почти.', '#b6c2d1'),
  item('metro_token', 'Жетон метро', 'common', 85, 'Улица', 'Пропуск в подземный мир. Работает не всегда.', '#8f9bab'),
  item('old_phone', 'Кнопочный телефон', 'common', 110, 'Улица', 'Заряда хватает на неделю. NFT — навсегда.', '#a0adbb'),
  item('energy_drink', 'Энергетик 24/7', 'common', 95, 'Неон', 'Вкус ночной смены и бесконечного скролла.', '#7b8b9e'),
  item('scratched_card', 'Стёртая карта', 'common', 120, 'Крипто', 'Последние цифры уже не восстановить.', '#93a0b1'),
  item('paper_crown', 'Бумажная корона', 'common', 130, 'Легенды', 'Официальный символ временной власти.', '#aeb9c7'),

  item('neon_ramen', 'Неоновый рамен', 'uncommon', 260, 'Неон', 'Горячий, яркий и немного radioactive.', '#43d17a'),
  item('cassette', 'Кассета 1999', 'uncommon', 300, 'Улица', 'Плёнка помнит то, что не помнит никто.', '#5ed68b'),
  item('pigeon', 'Голубь-инвестор', 'uncommon', 240, 'Улица', 'Диверсифицировал крошки по трём районам.', '#61cf8f'),
  item('cyber_coin', 'Кибер-монета', 'uncommon', 380, 'Крипто', 'Первый токен, который всегда растёт вниз.', '#4bd98b'),
  item('gas_mask', 'Маска анонима', 'uncommon', 340, 'Неон', 'Твой кошелёк — твоё лицо.', '#50d98f'),
  item('street_mic', 'Уличный микрофон', 'uncommon', 290, 'Улица', 'Голос квартала. Иногда с помехами.', '#63d08a'),

  item('gold_chain', 'Золотая цепь', 'rare', 720, 'Олигарх', 'Чем тяжелее цепь, тем серьёзнее намерения.', '#3fa7ff'),
  item('glitch_cat', 'Глитч-кот', 'rare', 880, 'Неон', 'Он существует между пикселями и шумом.', '#48b4ff'),
  item('rocket_chip', 'Чип ракеты', 'rare', 950, 'Космос', 'Один клик до луны. Или до дна.', '#3d9dff'),
  item('neon_skull', 'Неоновый череп', 'rare', 650, 'Неон', 'Напоминание, что курс не гарантирован.', '#51b0ff'),
  item('bank_card', 'Карта без лимита', 'rare', 1050, 'Олигарх', 'Лимит есть. Но он очень далеко.', '#469eff'),
  item('pigeon_king', 'Король голубей', 'rare', 780, 'Улица', 'Правит всеми крышами города.', '#57b7ff'),

  item('luxury_watch', 'Часы олигарха', 'epic', 1900, 'Олигарх', 'Показывают время и твой социальный статус.', '#b06bff'),
  item('cyber_car', 'Кибер-тачка', 'epic', 2400, 'Космос', 'Едет на чистом адреналине.', '#a56bff'),
  item('diamond_fist', 'Алмазный кулак', 'epic', 2100, 'Крипто', 'Твёрдая рука. Очень твёрдая.', '#b874ff'),
  item('golden_pigeon', 'Золотой голубь', 'epic', 1700, 'Улица', 'Легенда, которая научилась копить.', '#ad6bff'),
  item('zero_day', 'Нулевой день', 'epic', 2600, 'Крипто', 'Уязвимость, которую невозможно пропатчить.', '#a967ff'),
  item('liquid_heart', 'Жидкое сердце', 'epic', 2300, 'Неон', 'Переливается всеми оттенками риска.', '#b46fff'),

  item('moon_rock', 'Лунный камень', 'legendary', 4800, 'Космос', 'Доказательство, что ты был выше всех.', '#ffb020'),
  item('obsidian_crown', 'Обсидиановая корона', 'legendary', 5900, 'Легенды', 'Тяжёлая голова, лёгкие решения.', '#ffb62d'),
  item('satoshi_shard', 'Осколок Сатоши', 'legendary', 6800, 'Крипто', 'Фрагмент кода, который изменил всё.', '#ffbe38'),
  item('neon_dragon', 'Неоновый дракон', 'legendary', 5200, 'Неон', 'Охраняет твой инвентарь. Почти всегда.', '#ffb224'),
  item('black_amex', 'Чёрная карта', 'legendary', 6400, 'Олигарх', 'Оплата без слов. Одобрение без вопросов.', '#ffb82a'),

  item('genesis_orb', 'Генезис', 'mythic', 18000, 'Космос', 'Сфера, с которой началась вся коллекция.', '#ff4d8d'),
  item('flex_core', 'Ядро FLEX', 'mythic', 24000, 'Легенды', 'Источник твоего цифрового превосходства.', '#ff5c92'),
  item('void_ticket', 'Билет в пустоту', 'mythic', 15000, 'Крипто', 'Один билет. Никаких гарантий возврата.', '#ff4f86'),
  item('god_pigeon', 'Голубь-бог', 'mythic', 13000, 'Улица', 'Смотрит на город с высоты пятого этажа.', '#ff6597'),
  item('infinity_chain', 'Цепь бесконечности', 'mythic', 21000, 'Олигарх', 'Стоит больше, чем весь квартал.', '#ff5b91'),
];

export const ITEM_BY_KEY = new Map(ITEMS.map((entry) => [entry.key, entry]));

export const CASES: CaseDef[] = [
  {
    key: 'bum',
    name: 'Кейс бомжа',
    tagline: 'С чего-то надо начинать',
    price: 500,
    badge: 'СТАРТ',
    gradient: 'linear-gradient(135deg,#3a4b3d,#79836a 55%,#c2b08b)',
    art: '/assets/cases/bum.svg',
    pool: [
      { itemKey: 'street_cap', weight: 26 },
      { itemKey: 'metro_token', weight: 24 },
      { itemKey: 'old_phone', weight: 20 },
      { itemKey: 'energy_drink', weight: 14 },
      { itemKey: 'pigeon', weight: 8 },
      { itemKey: 'cassette', weight: 5 },
      { itemKey: 'neon_skull', weight: 2.4 },
      { itemKey: 'pigeon_king', weight: 0.6 },
    ],
  },
  {
    key: 'night',
    name: 'Кейс 24/7',
    tagline: 'Город не спит. И ты тоже',
    price: 1200,
    badge: 'ХИТ',
    featured: true,
    gradient: 'linear-gradient(135deg,#06111f,#0b4e66 50%,#31d5e8)',
    art: '/assets/cases/night.svg',
    pool: [
      { itemKey: 'energy_drink', weight: 18 },
      { itemKey: 'gas_mask', weight: 17 },
      { itemKey: 'neon_ramen', weight: 15 },
      { itemKey: 'glitch_cat', weight: 16 },
      { itemKey: 'neon_skull', weight: 13 },
      { itemKey: 'cyber_car', weight: 12 },
      { itemKey: 'liquid_heart', weight: 6.5 },
      { itemKey: 'neon_dragon', weight: 2.2 },
      { itemKey: 'genesis_orb', weight: 0.3 },
    ],
  },
  {
    key: 'oligarch',
    name: 'Кейс олигарха',
    tagline: 'Деньги любят тишину. И большие кейсы',
    price: 5000,
    badge: 'ELITE',
    gradient: 'linear-gradient(135deg,#201603,#5e410d 48%,#ffc93c)',
    art: '/assets/cases/oligarch.svg',
    pool: [
      { itemKey: 'bank_card', weight: 20 },
      { itemKey: 'gold_chain', weight: 18 },
      { itemKey: 'golden_pigeon', weight: 16 },
      { itemKey: 'luxury_watch', weight: 15 },
      { itemKey: 'diamond_fist', weight: 10 },
      { itemKey: 'black_amex', weight: 11 },
      { itemKey: 'obsidian_crown', weight: 5.5 },
      { itemKey: 'infinity_chain', weight: 3.5 },
      { itemKey: 'flex_core', weight: 1 },
    ],
  },
  {
    key: 'neon',
    name: 'Кейс неоновой ночи',
    tagline: 'Ярче, чем твой будущий профит',
    price: 2200,
    badge: 'NEON',
    gradient: 'linear-gradient(135deg,#150726,#54177d 50%,#ed5cff)',
    art: '/assets/cases/neon.svg',
    pool: [
      { itemKey: 'neon_ramen', weight: 16 },
      { itemKey: 'gas_mask', weight: 15 },
      { itemKey: 'glitch_cat', weight: 18 },
      { itemKey: 'neon_skull', weight: 16 },
      { itemKey: 'liquid_heart', weight: 16 },
      { itemKey: 'neon_dragon', weight: 14 },
      { itemKey: 'genesis_orb', weight: 4 },
      { itemKey: 'void_ticket', weight: 1 },
    ],
  },
  {
    key: 'crypto',
    name: 'Кейс крипто-кита',
    tagline: 'Покупай страх. Продавай эйфорию',
    price: 8000,
    badge: 'WHALE',
    gradient: 'linear-gradient(135deg,#031b19,#04756b 50%,#55ffd0)',
    art: '/assets/cases/crypto.svg',
    pool: [
      { itemKey: 'cyber_coin', weight: 12 },
      { itemKey: 'zero_day', weight: 20 },
      { itemKey: 'diamond_fist', weight: 18 },
      { itemKey: 'satoshi_shard', weight: 20 },
      { itemKey: 'moon_rock', weight: 16 },
      { itemKey: 'void_ticket', weight: 10 },
      { itemKey: 'genesis_orb', weight: 3.5 },
      { itemKey: 'flex_core', weight: 0.5 },
    ],
  },
  {
    key: 'legends',
    name: 'Кейс легенд',
    tagline: 'Только те, о ком говорят в чатах',
    price: 15000,
    badge: 'MYTHIC',
    gradient: 'linear-gradient(135deg,#210714,#6f103b 48%,#ff8a3d)',
    art: '/assets/cases/legends.svg',
    pool: [
      { itemKey: 'moon_rock', weight: 20 },
      { itemKey: 'obsidian_crown', weight: 19 },
      { itemKey: 'satoshi_shard', weight: 17 },
      { itemKey: 'black_amex', weight: 16 },
      { itemKey: 'genesis_orb', weight: 12 },
      { itemKey: 'flex_core', weight: 8 },
      { itemKey: 'god_pigeon', weight: 5 },
      { itemKey: 'infinity_chain', weight: 3 },
    ],
  },
];

export const CASE_BY_KEY = new Map(CASES.map((entry) => [entry.key, entry]));

export const ACHIEVEMENTS = [
  { key: 'first_drop', name: 'Первый флекс', description: 'Открой первый кейс', icon: 'box' },
  { key: 'collector', name: 'Коллекционер', description: 'Собери 5 NFT', icon: 'layers' },
  { key: 'upgrader', name: 'Апгрейдер', description: 'Выиграй первый апгрейд', icon: 'upgrade' },
  { key: 'risk_taker', name: 'На грани', description: 'Сыграй 5 мини-игр', icon: 'dice' },
  { key: 'rocket_man', name: 'Космонавт', description: 'Забери NFT из ракеты', icon: 'rocket' },
  { key: 'trader', name: 'Торговец', description: 'Соверши первую сделку', icon: 'market' },
  { key: 'rich', name: 'Звёздный', description: 'Накопи 10 000 звёзд', icon: 'star' },
  { key: 'flexer', name: 'Флексер', description: 'Получи NFT дороже 5 000', icon: 'crown' },
  { key: 'daily_7', name: 'Верный', description: 'Забери ежедневный бонус 7 дней', icon: 'calendar' },
  { key: 'legend', name: 'Легенда FLEX', description: 'Достигни 10 уровня', icon: 'bolt' },
] as const;
