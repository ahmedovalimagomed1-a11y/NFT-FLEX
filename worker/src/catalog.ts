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
  model: string;
  gift: boolean;
}

export interface CaseDef { key: string; name: string; tagline: string; price: number; badge: string; featured?: boolean; gradient: string; art: string; pool: { itemKey: string; weight: number }[]; }

export const RARITIES: Record<Rarity, { label: string; color: string; glow: string; order: number }> = {
  common: { label: "Обычный", color: "#9aa4b2", glow: "rgba(154,164,178,.45)", order: 1 },
  uncommon: { label: "Необычный", color: "#43d17a", glow: "rgba(67,209,122,.45)", order: 2 },
  rare: { label: "Редкий", color: "#3fa7ff", glow: "rgba(63,167,255,.5)", order: 3 },
  epic: { label: "Эпический", color: "#b06bff", glow: "rgba(176,107,255,.55)", order: 4 },
  legendary: { label: "Легендарный", color: "#ffb020", glow: "rgba(255,176,32,.55)", order: 5 },
  mythic: { label: "Мифический", color: "#ff4d8d", glow: "rgba(255,77,141,.6)", order: 6 },
};

export const GIFT_TRAITS = {
  backdrops: ['Black', 'Turquoise', 'Cyberpunk', 'Pink Galaxy', 'Sunset', 'Matrix', 'Gold', 'Ice', 'Lava', 'Cloud', 'Neon', 'Vintage'],
  symbols: ['Tribal Shield', 'Star', 'Lightning', 'Crown', 'Heart', 'Skull', 'Diamond', 'Moon', 'Flame', 'Infinity', 'Anchor', 'Eye'],
};

export const GIFT_MAX_LEVEL = 10;
export const giftUpgradeCost = (value: number) => Math.max(120, Math.round(value * 0.28));
export const giftNextValue = (value: number) => Math.round(value * 1.2);

const item = (key: string, name: string, rarity: Rarity, value: number, collection: string, description: string, accent: string, model: string): NftItem => ({ key, name, rarity, value, collection, description, accent, model, gift: true, art: `/assets/nfts/${key}.svg` });

export const ITEMS: NftItem[] = [
  item("durov_cap_classic", "Durov's Cap · Classic", "legendary", 4800, "Дуров", "Классическая кепка Дурова. Тот самый подарок, с которого началась охота за коллекционными моделями.", "#3fa7ff", "Classic"),
  item("durov_cap_neon", "Durov's Cap · Neon", "epic", 2600, "Дуров", "Неоновая кепка с ярким свечением. В профиле выглядит как включённый RGB.", "#b06bff", "Neon"),
  item("durov_cap_rgb", "Durov's Cap · RGB Glitch", "mythic", 18000, "Дуров", "Кепка, в которой пиксели сломались красиво. Одна из самых редких моделей коллекции.", "#ff4d8d", "RGB Glitch"),
  item("durov_cap_asterix", "Durov's Cap · Asterix", "mythic", 24000, "Дуров", "Самая редкая модель кепки Дурова. Найти её — как поймать идеальный дроп.", "#ffb020", "Asterix"),
  item("durov_cap_black", "Durov's Cap · Black", "legendary", 6800, "Дуров", "Чёрная кепка с чёрным фоном. Минимализм, который стоит дороже всего.", "#ffb020", "Black"),
  item("durov_glasses_thug", "Durov's Glasses · Thug Life", "legendary", 5900, "Дуров", "Очки, которые надевают только для одного кадра. Самый редкий стиль коллекции.", "#ffb020", "Thug Life"),
  item("durov_glasses_neo", "Durov's Glasses · Neo", "epic", 2300, "Дуров", "Тысяча оттенков зелёного и полная уверенность, что ты избранный.", "#43d17a", "Neo"),
  item("durov_glasses_cyber", "Durov's Glasses · Cyberpunk", "rare", 1050, "Дуров", "Очки для города, который никогда не спит. Подсветка уже в комплекте.", "#3fa7ff", "Cyberpunk"),
  item("durov_glasses_ton", "Durov's Glasses · TON Vision", "legendary", 6400, "Дуров", "Смотришь на график — видишь будущее. Иногда ошибается, но красиво.", "#ffb020", "TON Vision"),
  item("durov_glasses_vamp", "Durov's Glasses · Vampire Gaze", "epic", 1900, "Дуров", "Взгляд, от которого холодеет кровь и растёт цена лота.", "#b06bff", "Vampire Gaze"),
  item("durov_figurine", "Фигурка Дурова", "epic", 2100, "Дуров", "Лимитированная фигурка к дню рождения Дурова. Пока без коллекционной версии — но уже легенда.", "#3fa7ff", "Classic"),
  item("minidurov", "MiniDurov", "mythic", 15000, "Дуров", "Мини-версия Дурова из будущей коллекции. В профиле смотрится как заявление.", "#ff4d8d", "MiniDurov"),
  item("plush_pepe", "Plush Pepe", "mythic", 24000, "Telegram", "Самый дорогой плюшевый Пепе. Дуров купил один из них за неприличную сумму.", "#ff4d8d", "Pink Galaxy"),
  item("heart_locket", "Heart Locket", "legendary", 5200, "Telegram", "Медальон с сердцем. Открывается только для тех, кто действительно флексит.", "#ffb020", "Love"),
  item("scared_cat", "Scared Cat", "epic", 2600, "Telegram", "Кот, который увидел твой портфель. Испуг застыл в вечности.", "#b06bff", "Scared"),
  item("resistance_dog", "Resistance Dog", "epic", 2400, "Telegram", "Пёс сопротивления. Не сдаётся даже когда рынок красный.", "#3fa7ff", "Rebel"),
  item("lol_pop", "Lol Pop", "uncommon", 380, "Telegram", "Леденец, который смеётся над твоими ставками.", "#43d17a", "Candy"),
  item("toy_bear", "Toy Bear", "rare", 880, "Telegram", "Плюшевый медведь с характером коллекционера.", "#3fa7ff", "Plush"),
  item("swiss_watch", "Swiss Watch", "epic", 2100, "Telegram", "Часы, которые показывают не время, а твой статус.", "#b06bff", "Swiss"),
  item("instant_ramen", "Instant Ramen", "common", 120, "Telegram", "Рамен за 3 минуты. NFT — навсегда.", "#9aa4b2", "Classic"),
  item("diamond_ring", "Diamond Ring", "legendary", 4800, "Telegram", "Кольцо с камнем, который дороже большинства кейсов.", "#ffb020", "Diamond"),
  item("eternal_rose", "Eternal Rose", "rare", 720, "Telegram", "Роза, которая не завянет. В отличие от твоего баланса после ракеты.", "#3fa7ff", "Eternal"),
  item("sakura_flower", "Sakura Flower", "uncommon", 300, "Telegram", "Сакура из подарков Telegram. Красиво, легко, коллекционно.", "#43d17a", "Sakura"),
  item("fresh_socks", "Fresh Socks", "common", 95, "Telegram", "Свежие носки. Самый недооценённый лакшери-предмет.", "#9aa4b2", "Fresh"),
  item("mighty_arm", "Mighty Arm", "epic", 1900, "Telegram", "Могучая рука для могучих апгрейдов.", "#b06bff", "Mighty"),
  item("nail_bracelet", "Nail Bracelet", "legendary", 4800, "Telegram", "Браслет с гвоздями. Осторожно, можно уколоться о цену.", "#ffb020", "Nail"),
  item("heroic_helmet", "Heroic Helmet", "legendary", 5900, "Telegram", "Шлем героя. Защищает от плохих решений примерно никак.", "#ffb020", "Heroic"),
  item("magic_potion", "Magic Potion", "rare", 1050, "Telegram", "Зелье удачи. Эффект не гарантирован, но выглядит убедительно.", "#3fa7ff", "Magic"),
  item("sharp_tongue", "Sharp Tongue", "epic", 1700, "Telegram", "Острый язык. В чате — оружие, в профиле — искусство.", "#b06bff", "Sharp"),
  item("crystal_ball", "Crystal Ball", "rare", 780, "Telegram", "Шар предсказывает дроп. Показывает не тот, который ты хотел.", "#3fa7ff", "Crystal"),
  item("input_key", "Input Key", "uncommon", 260, "Telegram", "Ключ входа в коллекцию. Без него никак.", "#43d17a", "Key"),
  item("loot_bag", "Loot Bag", "rare", 880, "Telegram", "Мешок лута. Внутри всегда что-то есть, но никогда то, что нужно.", "#3fa7ff", "Loot"),
  item("snow_globe", "Snow Globe", "uncommon", 340, "Праздник", "Снежный шар с идеальной зимой внутри.", "#43d17a", "Winter"),
  item("santa_hat", "Santa Hat", "uncommon", 290, "Праздник", "Шапка Санты. Новогоднее настроение в цифре.", "#43d17a", "Santa"),
  item("witch_hat", "Witch Hat", "rare", 650, "Праздник", "Шапка ведьмы. Подходит для тёмных схем и светлых сделок.", "#3fa7ff", "Witch"),
  item("mad_pumpkin", "Mad Pumpkin", "rare", 720, "Праздник", "Безумная тыква. Улыбается, даже когда ты теряешь NFT.", "#3fa7ff", "Mad"),
  item("electric_skull", "Electric Skull", "epic", 2300, "Артефакты", "Электрический череп. Напоминает, что риск — это стиль.", "#b06bff", "Electric"),
  item("genie_lamp", "Genie Lamp", "legendary", 5200, "Артефакты", "Лампа джинна. Три желания не входят в стоимость.", "#ffb020", "Genie"),
  item("stellar_rocket", "Stellar Rocket", "rare", 950, "Артефакты", "Звёздная ракета. Летит туда, где нет лимитов.", "#3fa7ff", "Stellar"),
  item("astral_shard", "Astral Shard", "mythic", 13000, "Артефакты", "Астральный осколок. Часть вселенной, которую можно положить в инвентарь.", "#ff4d8d", "Astral"),
];

export const ITEM_BY_KEY = new Map(ITEMS.map((entry) => [entry.key, entry]));

export const CASES: CaseDef[] = [
  {
    key: "starter", name: "Кейс новичка", tagline: "Первый подарок уже внутри", price: 500, badge: "START", featured: false,
    gradient: "linear-gradient(135deg,#14261f,#2d7d5a 55%,#9be8be)", art: '/assets/cases/starter.svg',
    pool: [
      { itemKey: "instant_ramen", weight: 26 },
      { itemKey: "fresh_socks", weight: 26 },
      { itemKey: "lol_pop", weight: 15 },
      { itemKey: "sakura_flower", weight: 15 },
      { itemKey: "input_key", weight: 15 },
      { itemKey: "snow_globe", weight: 15 },
      { itemKey: "santa_hat", weight: 15 },
      { itemKey: "toy_bear", weight: 8 },
    ],
  },
  {
    key: "telegram", name: "Кейс Telegram", tagline: "Оригинальные подарки и редкие модели", price: 1200, badge: "HOT", featured: false,
    gradient: "linear-gradient(135deg,#06111f,#0b4e66 50%,#31d5e8)", art: '/assets/cases/telegram.svg',
    pool: [
      { itemKey: "instant_ramen", weight: 26 },
      { itemKey: "lol_pop", weight: 15 },
      { itemKey: "sakura_flower", weight: 15 },
      { itemKey: "input_key", weight: 15 },
      { itemKey: "snow_globe", weight: 15 },
      { itemKey: "santa_hat", weight: 15 },
      { itemKey: "toy_bear", weight: 8 },
      { itemKey: "crystal_ball", weight: 8 },
      { itemKey: "witch_hat", weight: 8 },
      { itemKey: "durov_glasses_cyber", weight: 8 },
      { itemKey: "magic_potion", weight: 8 },
    ],
  },
  {
    key: "durov", name: "Кейс Дурова", tagline: "Кепки, очки и фигурки Дурова", price: 3000, badge: "DUROV", featured: true,
    gradient: "linear-gradient(135deg,#061426,#0b5ea8 50%,#43c6ff)", art: '/assets/cases/durov.svg',
    pool: [
      { itemKey: "durov_cap_neon", weight: 3 },
      { itemKey: "durov_glasses_neo", weight: 3 },
      { itemKey: "durov_glasses_cyber", weight: 8 },
      { itemKey: "durov_glasses_vamp", weight: 3 },
      { itemKey: "durov_figurine", weight: 3 },
      { itemKey: "durov_cap_classic", weight: 1.2 },
      { itemKey: "durov_cap_black", weight: 1.2 },
      { itemKey: "durov_glasses_ton", weight: 1.2 },
      { itemKey: "durov_glasses_thug", weight: 1.2 },
      { itemKey: "durov_cap_rgb", weight: 0.25 },
      { itemKey: "minidurov", weight: 0.25 },
      { itemKey: "durov_cap_asterix", weight: 0.25 },
    ],
  },
  {
    key: "collector", name: "Кейс коллекционера", tagline: "То, что достают из профиля", price: 5000, badge: "RARE", featured: false,
    gradient: "linear-gradient(135deg,#201603,#5e410d 48%,#ffc93c)", art: '/assets/cases/collector.svg',
    pool: [
      { itemKey: "toy_bear", weight: 8 },
      { itemKey: "swiss_watch", weight: 3 },
      { itemKey: "eternal_rose", weight: 8 },
      { itemKey: "magic_potion", weight: 8 },
      { itemKey: "sharp_tongue", weight: 3 },
      { itemKey: "electric_skull", weight: 3 },
      { itemKey: "durov_figurine", weight: 3 },
      { itemKey: "heart_locket", weight: 1.2 },
      { itemKey: "diamond_ring", weight: 1.2 },
      { itemKey: "nail_bracelet", weight: 1.2 },
      { itemKey: "heroic_helmet", weight: 1.2 },
      { itemKey: "genie_lamp", weight: 1.2 },
    ],
  },
  {
    key: "crypto", name: "Кейс инвестора", tagline: "Астральные осколки и Plush Pepe", price: 8000, badge: "WHALE", featured: false,
    gradient: "linear-gradient(135deg,#031b19,#04756b 50%,#55ffd0)", art: '/assets/cases/crypto.svg',
    pool: [
      { itemKey: "swiss_watch", weight: 3 },
      { itemKey: "mighty_arm", weight: 3 },
      { itemKey: "electric_skull", weight: 3 },
      { itemKey: "durov_cap_classic", weight: 1.2 },
      { itemKey: "durov_glasses_thug", weight: 1.2 },
      { itemKey: "heart_locket", weight: 1.2 },
      { itemKey: "diamond_ring", weight: 1.2 },
      { itemKey: "heroic_helmet", weight: 1.2 },
      { itemKey: "stellar_rocket", weight: 8 },
      { itemKey: "astral_shard", weight: 0.25 },
      { itemKey: "plush_pepe", weight: 0.25 },
      { itemKey: "minidurov", weight: 0.25 },
    ],
  },
  {
    key: "legends", name: "Кейс легенд", tagline: "Только самые дорогие подарки", price: 15000, badge: "MYTHIC", featured: false,
    gradient: "linear-gradient(135deg,#210714,#6f103b 48%,#ff8a3d)", art: '/assets/cases/legends.svg',
    pool: [
      { itemKey: "durov_cap_black", weight: 1.2 },
      { itemKey: "durov_glasses_ton", weight: 1.2 },
      { itemKey: "durov_glasses_thug", weight: 1.2 },
      { itemKey: "heart_locket", weight: 1.2 },
      { itemKey: "diamond_ring", weight: 1.2 },
      { itemKey: "nail_bracelet", weight: 1.2 },
      { itemKey: "heroic_helmet", weight: 1.2 },
      { itemKey: "genie_lamp", weight: 1.2 },
      { itemKey: "astral_shard", weight: 0.25 },
      { itemKey: "plush_pepe", weight: 0.25 },
      { itemKey: "durov_cap_rgb", weight: 0.25 },
      { itemKey: "durov_cap_asterix", weight: 0.25 },
      { itemKey: "minidurov", weight: 0.25 },
      { itemKey: "stellar_rocket", weight: 8 },
    ],
  },
];

export const CASE_BY_KEY = new Map(CASES.map((entry) => [entry.key, entry]));

export const ACHIEVEMENTS = [
  { key: "first_drop", name: "Первый флекс", description: "Открой первый кейс", icon: "box" },
  { key: "collector", name: "Коллекционер", description: "Собери 5 подарков", icon: "layers" },
  { key: "upgrader", name: "Апгрейдер", description: "Выиграй первый апгрейд", icon: "upgrade" },
  { key: "gift_master", name: "Мастер подарков", description: "Улучши подарок", icon: "gift" },
  { key: "risk_taker", name: "На грани", description: "Сыграй 5 мини-игр", icon: "dice" },
  { key: "rocket_man", name: "Космонавт", description: "Забери подарок из ракеты", icon: "rocket" },
  { key: "trader", name: "Торговец", description: "Соверши первую сделку", icon: "market" },
  { key: "rich", name: "Звёздный", description: "Накопи 10 000 звёзд", icon: "star" },
  { key: "flexer", name: "Флексер", description: "Получи подарок дороже 5 000", icon: "crown" },
  { key: "daily_7", name: "Верный", description: "Забери ежедневный бонус 7 дней", icon: "calendar" },
  { key: "legend", name: "Легенда FLEX", description: "Достигни 10 уровня", icon: "bolt" },
] as const;
