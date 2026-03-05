# CLAUDE.md — Справка по проекту: Telegram Mini App колориста

## Что это

Telegram Mini App для записи к парикмахеру-колористу.
Открывается кнопкой в Telegram-боте. Без регистрации, без сторонних библиотек.

## Структура файлов

```
tg-app/
├── index.html          — точка входа (HTML-оболочка, скрипты)
├── css/
│   └── main.css        — ВСЕ стили: переменные, темы, экраны, компоненты
└── js/
    ├── data.js         — данные мастера, услуги, расписание (РЕДАКТИРУЙ ЗДЕСЬ)
    ├── telegram.js     — обёртка над window.Telegram.WebApp
    └── app.js          — роутер, рендеринг экранов, вся логика
```

## Что менять для реального мастера

### Изменить профиль мастера
**Файл:** `js/data.js`, объект `MASTER`
```js
const MASTER = {
  name:         'Имя мастера',
  specialty:    'Парикмахер-колорист',
  city:         'Город',
  address:      'Адрес студии',
  addressMapUrl:'https://yandex.ru/maps/?text=...', // ссылка на Яндекс.Карты
  experience:   '5 лет',
  rating:       4.8,
  reviewsCount: 95,
  worksCount:   210,
  heroBg:       'linear-gradient(...)', // градиент hero-баннера
};
```

### Добавить / изменить услугу
**Файл:** `js/data.js`, массив `SERVICES`

Каждая услуга — объект:
```js
{
  id:         'unique_id',      // уникальный ID, латиница
  category:   'coloring',       // 'coloring' | 'care' | 'cut'
  title:      'Название',
  subtitle:   'Краткое описание для карточки',
  description:'Полное описание для страницы услуги',
  duration:   '2–3 часа',
  priceFrom:  5000,             // минимальная цена (для карточки)
  prices: {                     // матрица по длине волос
    short:    5000,
    medium:   7000,
    long:     9500,
    verylong: 12000,
  },
  process: [                    // этапы процедуры
    'Шаг 1',
    'Шаг 2',
  ],
  cancelPolicy: 'Бесплатная отмена за 24 часа',
  photos: [                     // 3 градиента или URL реальных фото
    'linear-gradient(...)',
    'url(../images/service1.jpg)', // если есть реальные фото
  ],
}
```

### Изменить расписание
**Файл:** `js/data.js`, объект `WORK_SCHEDULE`
```js
const WORK_SCHEDULE = {
  0: [],             // Воскресенье — выходной (пустой массив)
  1: ['10:00','12:00','14:00'],  // Понедельник — рабочие слоты
  // ...
};
```

## Навигация между экранами

```
home → catalog → service → timepicker → summary → success
home → bookings
bookings → service (кнопка «Записаться снова»)
```

Роутер в `app.js`:
- `Router.navigate('screenId')` — перейти вперёд (анимация slide справа)
- `Router.back()` — вернуться назад (анимация slide влево)

Каждый экран:
1. **render\*()** — генерирует HTML строкой, пишет в `.screen` через innerHTML
2. **bind\*()** — навешивает события (вызывается после рендера)

## Telegram API (telegram.js)

| Вызов | Что делает |
|-------|-----------|
| `TG.MainButton.show(text, callback)` | Показать синюю кнопку внизу |
| `TG.MainButton.hide()` | Скрыть кнопку |
| `TG.MainButton.disable()` | Сделать неактивной |
| `TG.MainButton.showProgress()` | Показать спиннер загрузки |
| `TG.BackButton.show(callback)` | Показать кнопку «назад» в хедере |
| `TG.BackButton.hide()` | Скрыть кнопку «назад» |
| `TG.Haptic.light/medium/heavy()` | Тактильный отклик |
| `TG.Haptic.success/error()` | Haptic для уведомлений |
| `TG.requestContact(cb)` | Запросить номер телефона |
| `TG.openLink(url)` | Открыть ссылку (карта, календарь) |
| `TG.close()` | Закрыть Mini App |

В браузере все функции работают через fallback (console.info, alert, input).

## Тёмная тема

Реализована через CSS-переменные (`--tg-bg`, `--tg-text`, и т.д.).
При открытии в Telegram: берёт цвета из `tg.themeParams`.
В браузере: следует `prefers-color-scheme: dark`.
Никаких хардкодных цветов — только `var(--tg-*)`.

## Хранилище данных

Записи хранятся в `localStorage` (ключ `tg_bookings`).
В production нужно заменить на POST-запрос к backend API.
Место замены: функция `_confirmBooking()` в `app.js`.

## Запуск в браузере (разработка)

Просто открой `tg-app/index.html` в браузере.
Fallback MainButton появится внизу экрана.
Симуляция Telegram: никаких настроек не нужно.

## Подключение к реальному боту (production)

1. Создать бота через @BotFather
2. Зарегистрировать Mini App: `/newapp` → указать URL хостинга
3. Разместить `tg-app/` на HTTPS-хостинге (Railway, Vercel, Netlify)
4. В боте добавить кнопку с `web_app: { url: "https://..." }`

## Что планируется в v2

- Backend API (Node.js / Fastify) вместо localStorage
- Онлайн-оплата через ЮKassa (Telegram Payments)
- Кнопка «Перенести запись»
- Запрос отзыва через бота через 2 дня после визита
- Автоматический follow-up через 5–6 недель
