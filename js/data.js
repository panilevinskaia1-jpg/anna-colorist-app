// ============================================================
// data.js — Все данные приложения
// Чтобы изменить услуги, цены, мастера — редактируй этот файл
// ============================================================

// Профиль мастера
const MASTER = {
  name: 'Alena_hair_akvarel',
  specialty: 'Парикмахер-колорист',
  city: 'Новороссийск',
  address: 'Новороссийск',
  addressMapUrl: 'https://yandex.ru/maps/?text=Новороссийск',
  experience: '16 лет',
  rating: 4.9,
  reviewsCount: 127,
  worksCount: 8000,
  // Фото мастера — hero-баннер главного экрана
  photo: 'img/master.jpg.png',
  // Запасной градиент если фото не загрузилось
  heroBg: 'linear-gradient(160deg, #2d1b69 0%, #6b3fa0 40%, #c471ed 75%, #f64f59 100%)',
};

// Категории услуг (id совпадает с полем category в SERVICES)
const CATEGORIES = [
  { id: 'all',        label: 'Все' },
  { id: 'coloring',   label: 'Окрашивание' },
  { id: 'care',       label: 'Уход' },
  { id: 'extensions', label: 'Наращивание' },
];

// Длины волос для матрицы цен
const HAIR_LENGTHS = [
  { id: 'short',    label: 'Короткие',      note: 'до плеч' },
  { id: 'medium',   label: 'Средние',       note: 'до лопаток' },
  { id: 'long',     label: 'Длинные',       note: 'до пояса' },
  { id: 'verylong', label: 'Очень длинные', note: 'ниже пояса' },
];

// ─── Услуги ──────────────────────────────────────────────────
const SERVICES = [
  {
    id: 'airtouch',
    category: 'coloring',
    title: 'Аиртач',
    subtitle: 'Воздушное осветление феном',
    description:
      'Техника окрашивания с помощью фена — воздух сам выбирает какие пряди осветлять. ' +
      'Результат: мягкий, невесомый переход без чётких границ. ' +
      'Идеально для натурального и живого эффекта.',
    duration: '3–5 часов',
    priceFrom: 6000,
    prices: { short: 6000, medium: 9000, long: 12000, verylong: 16000 },
    process: [
      'Консультация и подбор оттенков',
      'Разделение волос феном на секции',
      'Осветление выбранных прядей',
      'Тонирование для мягкого перехода',
      'Укладка включена',
    ],
    cancelPolicy: 'Бесплатная отмена или перенос за 24 часа до записи',
    photos: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80',
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80',
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80',
    ],
  },
  {
    id: 'highlighting',
    category: 'coloring',
    title: 'Мелирование',
    subtitle: 'Классическое осветление прядей',
    description:
      'Осветление отдельных прядей для создания объёма и многогранности цвета. ' +
      'Классическое, калифорнийское или объёмное мелирование — ' +
      'подберём технику под ваш тип волос и желаемый результат.',
    duration: '2–4 часа',
    priceFrom: 4000,
    prices: { short: 4000, medium: 6000, long: 8500, verylong: 11000 },
    process: [
      'Консультация по технике и оттенкам',
      'Выделение прядей фольгой',
      'Осветление',
      'Тонирование при необходимости',
      'Укладка включена',
    ],
    cancelPolicy: 'Бесплатная отмена или перенос за 24 часа до записи',
    photos: [
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80',
      'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&q=80',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80',
    ],
  },
  {
    id: 'relief',
    category: 'coloring',
    title: 'Рельефное окрашивание',
    subtitle: 'Объём и игра света в волосах',
    description:
      'Техника многоуровневого окрашивания, которая создаёт эффект глубины и объёма. ' +
      'Волосы выглядят живыми, насыщенными и многогранными при любом освещении.',
    duration: '3–5 часов',
    priceFrom: 7000,
    prices: { short: 7000, medium: 10000, long: 13500, verylong: 17000 },
    process: [
      'Консультация и разбор желаемого результата',
      'Нанесение тёмных и светлых оттенков по технике',
      'Тонирование для финального эффекта',
      'Укладка включена',
    ],
    cancelPolicy: 'Бесплатная отмена или перенос за 24 часа до записи',
    photos: [
      'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=600&q=80',
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80',
      'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&q=80',
    ],
  },
  {
    id: 'dark-exit',
    category: 'coloring',
    title: 'Выход из тёмного',
    subtitle: 'Плавное осветление тёмных волос',
    description:
      'Бережное осветление волос после тёмного окрашивания или натурального тёмного цвета. ' +
      'Сохраняем здоровье волос на каждом этапе. ' +
      'Результат — равномерный желаемый оттенок без рыжины и желтизны.',
    duration: '4–6 часов',
    priceFrom: 8000,
    prices: { short: 8000, medium: 12000, long: 16000, verylong: 20000 },
    process: [
      'Диагностика волос и истории окрашивания',
      'Поэтапное осветление',
      'Нейтрализация нежелательных оттенков',
      'Тонирование в желаемый цвет',
      'Восстанавливающий уход',
    ],
    cancelPolicy: 'Бесплатная отмена или перенос за 24 часа до записи',
    photos: [
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80',
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80',
      'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=600&q=80',
    ],
  },
  {
    id: 'coloring',
    category: 'coloring',
    title: 'Окрашивание волос',
    subtitle: 'Равномерный насыщенный цвет',
    description:
      'Классическое окрашивание в один тон или сложное многоуровневое. ' +
      'Закрашивание седины, смена цвета, освежение оттенка. ' +
      'Используем только профессиональные краски.',
    duration: '1.5–3 часа',
    priceFrom: 3000,
    prices: { short: 3000, medium: 4500, long: 6000, verylong: 8000 },
    process: [
      'Консультация и подбор оттенка',
      'Нанесение краски',
      'Выдержка и смывание',
      'Укладка включена',
    ],
    cancelPolicy: 'Бесплатная отмена или перенос за 24 часа до записи',
    photos: [
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80',
      'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=600&q=80',
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80',
    ],
  },
  {
    id: 'totalbond',
    category: 'care',
    title: 'Тотал Бонд',
    subtitle: 'Защита волос при окрашивании',
    description:
      'Профессиональная система защиты волос во время химических процедур. ' +
      'Восстанавливает внутренние связи волоса, предотвращает ломкость и пересушивание. ' +
      'Добавляется к любой процедуре окрашивания.',
    duration: 'Добавляется к процедуре',
    priceFrom: 1500,
    prices: { short: 1500, medium: 2000, long: 2500, verylong: 3000 },
    process: [
      'Нанесение первой фазы перед окрашиванием',
      'Смешивание второй фазы с краской',
      'Финальное восстановление после смывания',
    ],
    cancelPolicy: 'Бесплатная отмена или перенос за 24 часа до записи',
    photos: [
      'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&q=80',
      'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=600&q=80',
      'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&q=80',
    ],
  },
  {
    id: 'reconstruction',
    category: 'care',
    title: 'Реконструкция волос',
    subtitle: 'Глубокое восстановление повреждённых волос',
    description:
      'Профессиональное восстановление структуры волоса изнутри. ' +
      'Устраняет ломкость, сечение, пористость и потерю блеска. ' +
      'Результат заметен сразу — волосы становятся мягкими и живыми.',
    duration: '1.5–2.5 часа',
    priceFrom: 3500,
    prices: { short: 3500, medium: 5000, long: 7000, verylong: 9000 },
    process: [
      'Диагностика состояния волос',
      'Глубокое очищение',
      'Нанесение восстанавливающего состава',
      'Запечатывание структуры волоса',
      'Финальный уход и блеск',
    ],
    cancelPolicy: 'Бесплатная отмена или перенос за 24 часа до записи',
    photos: [
      'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&q=80',
      'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=600&q=80',
      'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&q=80',
    ],
  },
  {
    id: 'extensions',
    category: 'extensions',
    title: 'Наращивание волос',
    subtitle: 'Длина и объём за одну процедуру',
    description:
      'Профессиональное наращивание волос. ' +
      'Натуральные волосы, незаметное крепление. ' +
      'Результат держится 3–4 месяца с правильным уходом.',
    duration: '3–6 часов',
    priceFrom: 15000,
    prices: { short: 15000, medium: 20000, long: 25000, verylong: 30000 },
    process: [
      'Консультация и подбор волос по цвету',
      'Подготовка натуральных волос',
      'Наращивание прядей',
      'Стрижка и выравнивание длины',
      'Укладка',
    ],
    cancelPolicy: 'Бесплатная отмена или перенос за 48 часов до записи',
    photos: [
      'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600&q=80',
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80',
      'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&q=80',
    ],
  },
];

// ─── Расписание ───────────────────────────────────────────────
const WORK_SCHEDULE = {
  0: [],
  1: ['10:00','10:30','12:00','12:30','14:00','16:00','16:30'],
  2: ['10:00','11:00','11:30','13:00','15:00','15:30','17:00'],
  3: [],
  4: ['10:00','10:30','12:00','14:00','14:30','16:00','18:00'],
  5: ['11:00','11:30','13:00','13:30','15:00','17:00'],
  6: ['10:00','10:30','11:00','12:00','13:00','14:00','15:00'],
};

function getAvailableSlots(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = date.getDay();
  const baseSlots = WORK_SCHEDULE[dayOfWeek] || [];
  if (baseSlots.length === 0) return [];
  const dayNum = date.getDate();
  return baseSlots.filter((_, idx) => (idx + dayNum) % 3 !== 0);
}

function getAvailableDates() {
  const dates = [];
  const today = new Date();
  for (let i = 1; i <= 45; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dow = d.getDay();
    if ((WORK_SCHEDULE[dow] || []).length > 0) {
      dates.push(d.toISOString().split('T')[0]);
    }
  }
  return dates;
}

const SERVICES_FALLBACK = SERVICES;

const DEMO_PAST_BOOKINGS = [
  {
    id: '#3891',
    serviceId: 'airtouch',
    serviceTitle: 'Аиртач',
    dateLabel: '14 февраля 2026',
    time: '11:00',
    duration: '4 часа',
    price: 9000,
    status: 'completed',
  },
];
