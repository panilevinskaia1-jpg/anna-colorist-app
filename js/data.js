// ============================================================
// app.js — Главный файл приложения
// Роутер, рендеринг экранов, обработка событий
// ============================================================

// Глобальный перехватчик ошибок — показывает сообщение вместо «Загрузка...»
window.onerror = function(msg, src, line, col, err) {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.innerHTML =
      '<div style="text-align:center;padding:20px">' +
      '<div style="font-size:32px;margin-bottom:12px">⚠️</div>' +
      '<div style="font-size:15px;margin-bottom:8px;color:#333">Ошибка JS</div>' +
      '<div style="font-size:12px;color:#888;word-break:break-all">' +
      (msg || '') + '<br>' + (src ? src.split('/').pop() : '') + ':' + line +
      '</div></div>';
  }
};

/* ══════════════════════════════════════════════════════════
   СОСТОЯНИЕ ПРИЛОЖЕНИЯ
   ══════════════════════════════════════════════════════════ */

const State = {
  currentScreen: 'home',
  screenHistory: [],          // стек навигации
  selectedService: null,      // объект выбранной услуги
  selectedDate: null,         // 'YYYY-MM-DD'
  selectedTime: null,         // 'HH:MM'
  userPhone: null,            // телефон клиента
  userName: 'Клиент',         // имя из Telegram
  comment: '',                // комментарий к записи
  activeCategory: 'all',      // текущий фильтр каталога
  calendarYear: null,         // год в виджете календаря
  calendarMonth: null,        // месяц (0-11) в виджете
  services: [],               // загружаются из /api/services (fallback: SERVICES_FALLBACK)
  master: null,               // загружаются из /api/settings  (fallback: MASTER)
};

// Получить актуальный список услуг (API или fallback из data.js)
function _getServices() {
  if (State.services.length) return State.services;
  return (typeof SERVICES_FALLBACK !== 'undefined') ? SERVICES_FALLBACK : [];
}

// Получить профиль мастера (API или fallback из data.js)
function _getMaster() {
  if (State.master) return State.master;
  return (typeof MASTER !== 'undefined') ? MASTER : {};
}

/* ══════════════════════════════════════════════════════════
   УТИЛИТЫ
   ══════════════════════════════════════════════════════════ */

// Форматирование цены: 9500 → '9 500 ₽'
function fmtPrice(p) {
  return p.toLocaleString('ru-RU') + '\u00a0₽';
}

// Форматирование даты в русской локали: '2026-03-04' → 'Ср, 4 марта'
function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  const months = [
    'января','февраля','марта','апреля','мая','июня',
    'июля','августа','сентября','октября','ноября','декабря',
  ];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

// Название месяца в именительном падеже
function monthName(month) {
  return [
    'Январь','Февраль','Март','Апрель','Май','Июнь',
    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
  ][month];
}

// Генерация короткого ID записи
function makeBookingId() {
  return '#' + (Math.floor(Math.random() * 9000) + 1000);
}

// ── Хранилище записей (API + localStorage fallback) ───────────

async function loadBookings() {
  try {
    const res = await fetch('/api/bookings/my', {
      headers: { 'X-Telegram-Init-Data': TG.getInitData() },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.length) return data; // Если API вернул записи — используем их
    }
  } catch { /* нет связи с сервером */ }
  // Fallback: localStorage
  try {
    return JSON.parse(localStorage.getItem('tg_bookings') || '[]');
  } catch { return []; }
}

function saveBookingToStorage(booking) {
  try {
    const list = JSON.parse(localStorage.getItem('tg_bookings') || '[]');
    list.unshift(booking);
    localStorage.setItem('tg_bookings', JSON.stringify(list));
  } catch { /* ignore */ }
}

// Инициализация: добавляем демо-прошедшую запись при первом открытии
function initBookingsStorage() {
  if (localStorage.getItem('tg_bookings_initialized')) return;
  localStorage.setItem('tg_bookings', JSON.stringify(DEMO_PAST_BOOKINGS));
  localStorage.setItem('tg_bookings_initialized', '1');
}

/* ══════════════════════════════════════════════════════════
   РОУТЕР / НАВИГАЦИЯ
   ══════════════════════════════════════════════════════════ */

const Router = {
  // Перейти на экран (анимация slide слева направо)
  navigate(screenId) {
    const current = document.getElementById('screen-' + State.currentScreen);
    const next = document.getElementById('screen-' + screenId);
    if (!next || screenId === State.currentScreen) return;

    State.screenHistory.push(State.currentScreen);
    State.currentScreen = screenId;

    // Рендерим экран перед показом
    renderScreen(screenId);

    // Анимация: текущий уходит влево, новый приходит справа
    current?.classList.add('slide-out-left');
    next.classList.add('active');

    requestAnimationFrame(() => {
      setTimeout(() => {
        current?.classList.remove('active', 'slide-out-left');
        next.scrollTop = 0;
        bindScreenEvents(screenId);
      }, 270);
    });
  },

  // Назад (анимация slide справа налево)
  back() {
    if (State.screenHistory.length === 0) return;
    const prevId = State.screenHistory.pop();
    const current = document.getElementById('screen-' + State.currentScreen);
    const prev = document.getElementById('screen-' + prevId);

    State.currentScreen = prevId;

    // Перерисовываем предыдущий экран чтобы он был актуальным
    renderScreen(prevId);

    current?.classList.add('slide-out-right');
    prev?.classList.add('active');

    requestAnimationFrame(() => {
      setTimeout(() => {
        current?.classList.remove('active', 'slide-out-right');
        if (prev) prev.scrollTop = 0;
        bindScreenEvents(prevId);
      }, 270);
    });
  },
};

/* ══════════════════════════════════════════════════════════
   КОМПОНЕНТЫ (HTML-генераторы)
   ══════════════════════════════════════════════════════════ */

// Возвращает CSS-строку для фона: URL → background-image, градиент → background
function bgStyle(src, pos) {
  if (!src) return '';
  if (src.startsWith('http') || src.startsWith('/') || src.startsWith('.') || src.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
    return `background-image:url('${src}');background-size:cover;background-position:${pos || 'center'};`;
  }
  return `background:${src};`;
}

// Карточка услуги (используется на главной и в каталоге)
function renderServiceCard(service) {
  return `
    <div class="service-card" data-tap data-service-id="${service.id}">
      <div class="service-card__photo"
           style="${bgStyle(service.photos[0])}"></div>
      <div class="service-card__body">
        <div class="service-card__info">
          <h3 class="service-card__title">${service.title}</h3>
          <p class="service-card__subtitle">${service.subtitle}</p>
          <div class="service-card__meta">
            <span class="service-card__duration">⏱ ${service.duration}</span>
            <span class="service-card__price">от ${fmtPrice(service.priceFrom)}</span>
          </div>
        </div>
        <button class="btn btn-primary service-card__btn"
                data-book-service="${service.id}">Записаться</button>
      </div>
    </div>
  `;
}

// Чипы категорий
function renderCategoryChips() {
  return CATEGORIES.map(c => `
    <button class="chip ${State.activeCategory === c.id ? 'active' : ''}"
            data-category="${c.id}">${c.label}</button>
  `).join('');
}

// Карусель фото услуги
function renderCarousel(photos) {
  const items = photos.map(bg => `
    <div class="carousel-item" style="${bgStyle(bg)}"></div>
  `).join('');
  const dots = photos.map((_, i) => `
    <div class="carousel-dot ${i === 0 ? 'active' : ''}"></div>
  `).join('');
  return `
    <div class="carousel" id="carousel">${items}</div>
    <div class="carousel-dots" id="carousel-dots">${dots}</div>
  `;
}

// Матрица цен
function renderPriceMatrix(prices) {
  return HAIR_LENGTHS.map(l => `
    <div class="price-row">
      <div>
        <div class="price-row__name">${l.label}</div>
        <div class="price-row__note">${l.note}</div>
      </div>
      <div class="price-row__amount">${fmtPrice(prices[l.id])}</div>
    </div>
  `).join('');
}

// Прогресс-бар шагов записи (step: 1 или 2, total: 2)
function renderProgress(step) {
  return `
    <div class="progress-bar">
      ${[1, 2].map(s => `
        <div class="progress-dot ${s < step ? 'done' : ''} ${s === step ? 'active' : ''}"></div>
      `).join('')}
    </div>
  `;
}

// Календарь на заданный месяц
function renderCalendar(year, month) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Начало недели — Понедельник
  let startDow = firstDay.getDay(); // 0=Вс
  startDow = startDow === 0 ? 6 : startDow - 1; // 0=Пн, 6=Вс

  const weekDays = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  const isPrevDisabled = year === today.getFullYear() && month === today.getMonth();

  let cells = '';
  // Пустые ячейки перед первым днём
  for (let i = 0; i < startDow; i++) cells += '<div class="cal-day empty"></div>';

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const d = new Date(year, month, day);
    const dateStr = d.toISOString().split('T')[0];
    const isPast = d < today;
    const isToday = d.toDateString() === today.toDateString();
    const hasSlots = (WORK_SCHEDULE[d.getDay()] || []).length > 0;
    const available = !isPast && hasSlots;
    const selected = State.selectedDate === dateStr;

    let cls = 'cal-day';
    if (selected)   cls += ' selected';
    else if (!available) cls += ' disabled';
    else             cls += ' available';
    if (isToday && !selected) cls += ' today';

    cells += `<div class="${cls}"
                   ${available ? `data-date="${dateStr}"` : ''}>${day}</div>`;
  }

  return `
    <div class="calendar">
      <div class="cal-nav">
        <button class="cal-nav-btn" id="cal-prev" ${isPrevDisabled ? 'disabled' : ''}>‹</button>
        <span class="cal-month-title">${monthName(month)} ${year}</span>
        <button class="cal-nav-btn" id="cal-next">›</button>
      </div>
      <div class="cal-weekdays">
        ${weekDays.map(d => `<div class="cal-weekday">${d}</div>`).join('')}
      </div>
      <div class="cal-grid">${cells}</div>
    </div>
  `;
}

// Слоты времени для выбранной даты
function renderTimeSlots(dateStr) {
  if (!dateStr) return '<div class="time-empty">Сначала выберите дату</div>';

  const available = getAvailableSlots(dateStr);
  const all = WORK_SCHEDULE[new Date(dateStr + 'T00:00:00').getDay()] || [];
  if (all.length === 0) return '<div class="time-empty">В этот день мастер не работает</div>';

  const morning   = all.filter(t => parseInt(t) < 12);
  const afternoon = all.filter(t => parseInt(t) >= 12 && parseInt(t) < 17);
  const evening   = all.filter(t => parseInt(t) >= 17);

  function group(label, slots) {
    if (!slots.length) return '';
    return `
      <div class="time-group">
        <div class="time-group-label">${label}</div>
        <div class="time-slots-grid">
          ${slots.map(t => {
            const free = available.includes(t);
            const sel = State.selectedTime === t;
            return `<button class="time-slot
                      ${!free ? 'time-slot--disabled' : ''}
                      ${sel ? 'time-slot--selected' : ''}"
                    ${free ? `data-time="${t}"` : 'disabled'}>${t}</button>`;
          }).join('')}
        </div>
      </div>`;
  }

  return `
    <div class="time-sections">
      ${group('Утро', morning)}
      ${group('День', afternoon)}
      ${group('Вечер', evening)}
    </div>`;
}

// Карточка завершённой/предстоящей записи
function renderBookingCard(b) {
  const isUpcoming = b.status === 'upcoming';
  const badge = isUpcoming
    ? '<span class="booking-badge booking-badge--upcoming">Подтверждено</span>'
    : '<span class="booking-badge booking-badge--completed">✓ Выполнено</span>';

  const actions = isUpcoming
    ? `<button class="btn btn-destructive" data-cancel="${b.id}">Отменить</button>`
    : `<button class="btn btn-secondary" data-rebook="${b.serviceId}">Записаться снова</button>`;

  return `
    <div class="booking-card">
      <div class="booking-card__header">
        ${badge}
        <span style="font-size:13px;color:var(--tg-hint);">${b.id}</span>
      </div>
      <div class="booking-card__body">
        <div class="booking-card__title">${b.serviceTitle}</div>
        <div class="booking-card__detail">📅 ${b.dateLabel} в ${b.time}</div>
        <div class="booking-card__detail">⏱ ${b.duration}</div>
        <div class="booking-card__detail">💰 ${fmtPrice(b.price)} — оплата на месте</div>
      </div>
      <div class="booking-card__actions">${actions}</div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════
   РЕНДЕРИНГ ЭКРАНОВ
   ══════════════════════════════════════════════════════════ */

function renderScreen(id) {
  const el = document.getElementById('screen-' + id);
  if (!el) return;
  const map = {
    home:       renderHome,
    catalog:    renderCatalog,
    service:    renderService,
    timepicker: renderTimePicker,
    summary:    renderSummary,
    success:    renderSuccess,
    bookings:   renderBookings,
  };
  if (map[id]) el.innerHTML = map[id]();
}

// ── Экран 1: Главная ─────────────────────────────────────────

function renderHome() {
  const m        = _getMaster();
  const services = _getServices().slice(0, 4); // показываем первые 4
  return `
    <div class="hero">
      <div class="hero__bg" style="${bgStyle(m.photo, '50% 25%') || bgStyle(m.heroBg) || 'background:linear-gradient(135deg,#667eea,#764ba2)'}"></div>
      <div class="hero__overlay">
        <div class="hero__info">
          <div class="hero__name">${m.name || 'Мастер'}</div>
          <div class="hero__specialty">${m.specialty || 'Парикмахер-колорист'} · ${m.city || ''}</div>
        </div>
        <button class="hero__bookings-btn" id="btn-bookings" title="Мои записи">📋</button>
      </div>
    </div>

    <div class="rating-strip">
      <div class="rating-item">
        <div class="rating-item__value">★ ${m.rating || '—'}</div>
        <div class="rating-item__label">${m.reviewsCount || 0} отзывов</div>
      </div>
      <div class="rating-sep"></div>
      <div class="rating-item">
        <div class="rating-item__value">${m.worksCount || '—'}</div>
        <div class="rating-item__label">работ</div>
      </div>
      <div class="rating-sep"></div>
      <div class="rating-item">
        <div class="rating-item__value">${m.experience || '—'}</div>
        <div class="rating-item__label">опыт</div>
      </div>
    </div>

    <div class="section-header">Популярные услуги</div>
    <div class="content-pad">
      ${services.map(renderServiceCard).join('')}
    </div>
  `;
}

// ── Экран 2: Каталог ─────────────────────────────────────────

function renderCatalog() {
  const filtered = State.activeCategory === 'all'
    ? _getServices()
    : _getServices().filter(s => s.category === State.activeCategory);
  return `
    <div class="screen-header">
      <div class="screen-header__title">Все услуги</div>
    </div>
    <div class="chips-scroll">${renderCategoryChips()}</div>
    <div class="content-pad" style="padding-top:8px;">
      ${filtered.length
        ? filtered.map(renderServiceCard).join('')
        : `<div class="empty-state">
             <div class="empty-state__icon">✂️</div>
             <div class="empty-state__title">Услуг нет</div>
             <div class="empty-state__sub">Попробуйте другую категорию</div>
           </div>`}
    </div>
  `;
}

// ── Экран 3: Страница услуги ──────────────────────────────────

function renderService() {
  const s = State.selectedService;
  if (!s) return '<div class="empty-state"><div class="empty-state__title">Услуга не выбрана</div></div>';

  return `
    ${renderCarousel(s.photos)}

    <div class="service-screen__header">
      <h1 class="service-screen__title">${s.title}</h1>
      <p class="service-screen__subtitle">${s.subtitle}</p>
    </div>

    <p class="service-desc">${s.description}</p>

    <div class="info-block">
      <div class="info-block__label">Цена (зависит от длины волос)</div>
      ${renderPriceMatrix(s.prices)}
    </div>

    <div class="info-block">
      <div class="info-block__label">Длительность</div>
      <div class="duration-row">
        <span>⏱</span>
        <span>${s.duration}</span>
      </div>
    </div>

    <div class="info-block">
      <div class="info-block__label">Этапы процедуры</div>
      ${s.process.map((step, i) => `
        <div class="process-item">
          <div class="process-item__num">${i + 1}</div>
          <div class="process-item__text">${step}</div>
        </div>
      `).join('')}
    </div>

    <div class="cancel-note">
      <span>ℹ️</span>
      <span>${s.cancelPolicy}</span>
    </div>
  `;
}

// ── Экран 4: Выбор времени ────────────────────────────────────

function renderTimePicker() {
  const today = new Date();
  if (!State.calendarYear)  State.calendarYear  = today.getFullYear();
  if (State.calendarMonth === null) State.calendarMonth = today.getMonth();

  const slotsHtml = State.selectedDate
    ? renderTimeSlots(State.selectedDate)
    : '<div class="time-empty">Выберите дату выше</div>';

  return `
    ${renderProgress(1)}
    <div class="picker-title">Выберите дату</div>
    <div id="calendar-wrap">
      ${renderCalendar(State.calendarYear, State.calendarMonth)}
    </div>
    <div class="picker-title mt-sm">Выберите время</div>
    <div id="slots-wrap">${slotsHtml}</div>
    <div style="height: var(--spacing);"></div>
  `;
}

// ── Экран 5: Сводка записи ────────────────────────────────────

function renderSummary() {
  const s = State.selectedService;
  const phoneBlock = State.userPhone
    ? `<div class="phone-confirmed">${State.userPhone}</div>`
    : `<button class="phone-btn" id="btn-phone">
         📱 Поделиться номером
       </button>
       <div id="phone-input-wrap" style="display:none; padding: 0 var(--spacing) var(--spacing-sm);">
         <input type="tel" id="phone-input" class="form-field__input"
                placeholder="+7 999 000-00-00"
                style="border:var(--border);border-radius:var(--radius-sm);
                       padding:12px var(--spacing);width:100%;font-size:16px;
                       background:var(--tg-secondary-bg);"
                value="${State.userPhone || ''}">
       </div>`;

  return `
    ${renderProgress(2)}
    <div class="picker-title">Проверьте запись</div>

    <div class="summary-card">
      <div class="summary-row">
        <span class="summary-row__label">Услуга</span>
        <span class="summary-row__value">${s?.title || '—'}</span>
      </div>
      <div class="summary-row">
        <span class="summary-row__label">Дата</span>
        <span class="summary-row__value">${State.selectedDate ? fmtDate(State.selectedDate) : '—'}</span>
      </div>
      <div class="summary-row">
        <span class="summary-row__label">Время</span>
        <span class="summary-row__value">${State.selectedTime || '—'}</span>
      </div>
      <div class="summary-row">
        <span class="summary-row__label">Длительность</span>
        <span class="summary-row__value">${s?.duration || '—'}</span>
      </div>
      <div class="summary-row">
        <span class="summary-row__label">Стоимость</span>
        <span class="summary-row__value accent">от ${s ? fmtPrice(s.priceFrom) : '—'}</span>
      </div>
    </div>

    <div class="section-header" style="padding-top:var(--spacing-sm);">Ваши данные</div>

    <div class="form-block">
      <div class="form-field">
        <div class="form-field__label">Имя</div>
        <div class="form-field__value">${State.userName}</div>
      </div>
      <div class="form-field" id="phone-field">
        <div class="form-field__label">Телефон</div>
        ${phoneBlock}
      </div>
      <div class="form-field">
        <div class="form-field__label">Комментарий (необязательно)</div>
        <textarea class="form-field__textarea" id="comment-input"
                  placeholder="Особые пожелания, цвет сейчас, желаемый результат..."
                  >${State.comment}</textarea>
      </div>
    </div>

    <div class="note-text">💳 Оплата на месте после процедуры</div>
    <div class="note-text">🔄 ${s?.cancelPolicy || 'Бесплатная отмена за 24 часа'}</div>
    <div style="height:var(--spacing);"></div>
  `;
}

// ── Экран 6: Успех ────────────────────────────────────────────

function renderSuccess() {
  const id = State.lastBookingId || makeBookingId();
  const s  = State.selectedService;
  const m  = _getMaster();

  return `
    <div class="success-screen">
      <div class="success-icon">
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r="42" fill="#34C759"/>
          <polyline
            points="24,44 37,57 64,30"
            fill="none" stroke="white"
            stroke-width="6" stroke-linecap="round" stroke-linejoin="round"
            stroke-dasharray="66" stroke-dashoffset="66"
            class="success-check"/>
        </svg>
      </div>

      <div class="success-title">Вы записаны!</div>
      <div class="success-sub">Подтверждение отправлено в чат</div>

      <div class="success-card">
        <div class="summary-row">
          <span class="summary-row__label">Услуга</span>
          <span class="summary-row__value">${s?.title || '—'}</span>
        </div>
        <div class="summary-row">
          <span class="summary-row__label">Дата и время</span>
          <span class="summary-row__value">
            ${State.selectedDate ? fmtDate(State.selectedDate) : '—'} в ${State.selectedTime || '—'}
          </span>
        </div>
        <div class="summary-row">
          <span class="summary-row__label">Адрес</span>
          <span class="summary-row__value">${m.address || '—'}</span>
        </div>
        <div class="summary-row">
          <span class="summary-row__label">№ записи</span>
          <span class="summary-row__value">${id}</span>
        </div>
      </div>

      <div class="success-actions">
        <button class="btn btn-secondary" id="btn-map">
          🗺 Как добраться
        </button>
        <button class="btn btn-secondary" id="btn-calendar">
          📅 Добавить в календарь
        </button>
      </div>

      <div class="success-note">
        ⏰ Напоминание придёт за 24 часа до визита<br>
        Вопросы? Напишите мастеру в этом чате
      </div>
    </div>
  `;
}

// ── Экран 7: Мои записи ───────────────────────────────────────

function renderBookings() {
  const all = State._bookingsList || [];
  const upcoming  = all.filter(b => b.status === 'upcoming');
  const completed = all.filter(b => b.status === 'completed');

  const activeTab = State._bookingsTab || 'upcoming';

  const listHtml = (items, emptyIcon, emptyText, emptySubText) =>
    items.length
      ? items.map(renderBookingCard).join('')
      : `<div class="empty-state">
           <div class="empty-state__icon">${emptyIcon}</div>
           <div class="empty-state__title">${emptyText}</div>
           <div class="empty-state__sub">${emptySubText}</div>
         </div>`;

  return `
    <div class="screen-header">
      <div class="screen-header__title">Мои записи</div>
    </div>
    <div class="tab-bar">
      <button class="tab-btn ${activeTab === 'upcoming' ? 'active' : ''}"
              data-tab="upcoming">Предстоящие (${upcoming.length})</button>
      <button class="tab-btn ${activeTab === 'completed' ? 'active' : ''}"
              data-tab="completed">Прошедшие</button>
    </div>
    <div id="bookings-list" style="padding-top:var(--spacing-sm);">
      ${activeTab === 'upcoming'
        ? listHtml(upcoming, '📅', 'Нет предстоящих записей', 'Запишитесь к мастеру прямо сейчас')
        : listHtml(completed, '✓', 'Нет прошедших записей', 'Здесь появится история ваших визитов')}
    </div>
  `;
}

/* ══════════════════════════════════════════════════════════
   ПРИВЯЗКА СОБЫТИЙ ПО ЭКРАНАМ
   ══════════════════════════════════════════════════════════ */

function bindScreenEvents(id) {
  const map = {
    home:       bindHome,
    catalog:    bindCatalog,
    service:    bindService,
    timepicker: bindTimePicker,
    summary:    bindSummary,
    success:    bindSuccess,
    bookings:   bindBookings,
  };
  if (map[id]) map[id]();
}

// ── Главная ───────────────────────────────────────────────────

function bindHome() {
  TG.BackButton.hide();
  TG.MainButton.show('Все услуги', () => Router.navigate('catalog'));

  const screen = document.getElementById('screen-home');

  // Кнопка "Мои записи"
  screen.querySelector('#btn-bookings')?.addEventListener('click', () => {
    TG.Haptic.light();
    Router.navigate('bookings');
  });

  // Тап на карточку → детальная страница
  screen.querySelectorAll('[data-service-id]').forEach(el => {
    el.addEventListener('click', e => {
      // Кнопка "Записаться" внутри карточки
      const bookBtn = e.target.closest('[data-book-service]');
      const cardId = bookBtn
        ? bookBtn.dataset.bookService
        : el.dataset.serviceId;
      const service = _getServices().find(s => s.id === cardId);
      if (!service) return;
      TG.Haptic.light();
      State.selectedService = service;
      State.selectedDate = null;
      State.selectedTime = null;
      Router.navigate('service');
    });
  });
}

// ── Каталог ───────────────────────────────────────────────────

function bindCatalog() {
  TG.MainButton.hide();
  TG.BackButton.show(() => Router.back());

  const screen = document.getElementById('screen-catalog');

  // Фильтры-чипы
  screen.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      TG.Haptic.light();
      State.activeCategory = chip.dataset.category;
      screen.innerHTML = renderCatalog();
      bindCatalog();
    });
  });

  // Карточки услуг
  screen.querySelectorAll('[data-service-id]').forEach(el => {
    el.addEventListener('click', e => {
      const bookBtn = e.target.closest('[data-book-service]');
      const id = bookBtn ? bookBtn.dataset.bookService : el.dataset.serviceId;
      const service = _getServices().find(s => s.id === id);
      if (!service) return;
      TG.Haptic.light();
      State.selectedService = service;
      State.selectedDate = null;
      State.selectedTime = null;
      Router.navigate('service');
    });
  });
}

// ── Страница услуги ───────────────────────────────────────────

function bindService() {
  TG.BackButton.show(() => Router.back());
  TG.MainButton.show('Выбрать время →', () => {
    TG.Haptic.medium();
    Router.navigate('timepicker');
  });

  // Карусель: обновляем точки при скролле
  const carousel = document.getElementById('carousel');
  const dots = document.querySelectorAll('.carousel-dot');
  if (carousel && dots.length) {
    carousel.addEventListener('scroll', () => {
      const idx = Math.round(carousel.scrollLeft / carousel.clientWidth);
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
      TG.Haptic.selection();
    }, { passive: true });
  }
}

// ── Выбор времени ─────────────────────────────────────────────

function bindTimePicker() {
  TG.BackButton.show(() => Router.back());

  // MainButton неактивна пока не выбраны дата и время
  if (State.selectedDate && State.selectedTime) {
    TG.MainButton.show('Продолжить →', () => {
      TG.Haptic.medium();
      Router.navigate('summary');
    });
  } else {
    TG.MainButton.show('Выбрать время', () => {});
    TG.MainButton.disable();
  }

  const screen = document.getElementById('screen-timepicker');

  // Навигация по месяцам
  screen.querySelector('#cal-prev')?.addEventListener('click', () => {
    TG.Haptic.light();
    if (State.calendarMonth === 0) { State.calendarMonth = 11; State.calendarYear--; }
    else State.calendarMonth--;
    _refreshCalendar();
  });

  screen.querySelector('#cal-next')?.addEventListener('click', () => {
    TG.Haptic.light();
    if (State.calendarMonth === 11) { State.calendarMonth = 0; State.calendarYear++; }
    else State.calendarMonth++;
    _refreshCalendar();
  });

  // Выбор дня
  screen.querySelectorAll('.cal-day.available').forEach(cell => {
    cell.addEventListener('click', () => {
      TG.Haptic.light();
      State.selectedDate = cell.dataset.date;
      State.selectedTime = null;
      _refreshCalendar();
      _refreshSlots();
      // Сбросить MainButton
      TG.MainButton.disable();
    });
  });

  // Выбор слота
  _bindSlotEvents();
}

function _refreshCalendar() {
  const wrap = document.getElementById('calendar-wrap');
  if (!wrap) return;
  wrap.innerHTML = renderCalendar(State.calendarYear, State.calendarMonth);
  const screen = document.getElementById('screen-timepicker');
  // Перепривязать навигацию
  screen.querySelector('#cal-prev')?.addEventListener('click', () => {
    TG.Haptic.light();
    if (State.calendarMonth === 0) { State.calendarMonth = 11; State.calendarYear--; }
    else State.calendarMonth--;
    _refreshCalendar();
  });
  screen.querySelector('#cal-next')?.addEventListener('click', () => {
    TG.Haptic.light();
    if (State.calendarMonth === 11) { State.calendarMonth = 0; State.calendarYear++; }
    else State.calendarMonth++;
    _refreshCalendar();
  });
  screen.querySelectorAll('.cal-day.available').forEach(cell => {
    cell.addEventListener('click', () => {
      TG.Haptic.light();
      State.selectedDate = cell.dataset.date;
      State.selectedTime = null;
      _refreshCalendar();
      _refreshSlots();
      TG.MainButton.disable();
    });
  });
}

function _refreshSlots() {
  const wrap = document.getElementById('slots-wrap');
  if (!wrap) return;
  wrap.innerHTML = renderTimeSlots(State.selectedDate);
  _bindSlotEvents();
}

function _bindSlotEvents() {
  document.querySelectorAll('.time-slot:not(.time-slot--disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      TG.Haptic.medium();
      State.selectedTime = btn.dataset.time;
      // Перерисовать слоты для обновления выделения
      _refreshSlots();
      // Активировать MainButton
      TG.MainButton.show('Продолжить →', () => {
        TG.Haptic.medium();
        Router.navigate('summary');
      });
      TG.MainButton.enable();
    });
  });
}

// ── Сводка записи ─────────────────────────────────────────────

function bindSummary() {
  TG.BackButton.show(() => Router.back());

  const priceTxt = State.selectedService
    ? `· от ${fmtPrice(State.selectedService.priceFrom)}`
    : '';
  TG.MainButton.show(`Подтвердить запись ${priceTxt}`, _confirmBooking);

  const screen = document.getElementById('screen-summary');

  // Кнопка "Поделиться номером"
  screen.querySelector('#btn-phone')?.addEventListener('click', () => {
    TG.Haptic.light();
    TG.requestContact(phone => {
      if (phone) {
        State.userPhone = phone;
        _updatePhoneField(phone);
      } else {
        // В браузере: показать поле ввода
        screen.querySelector('#phone-input-wrap')?.style.setProperty('display', 'block');
        screen.querySelector('#phone-input')?.focus();
      }
    });
  });

  // Ручной ввод телефона в браузере
  screen.querySelector('#phone-input')?.addEventListener('input', e => {
    State.userPhone = e.target.value;
  });

  // Textarea комментария
  const ta = screen.querySelector('#comment-input');
  ta?.addEventListener('input', e => { State.comment = e.target.value; });
  ta?.addEventListener('focus', () => {
    setTimeout(() => ta.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
  });
}

function _updatePhoneField(phone) {
  const field = document.getElementById('phone-field');
  if (field) {
    field.innerHTML = `
      <div class="form-field__label">Телефон</div>
      <div class="phone-confirmed">${phone}</div>
    `;
  }
}

async function _confirmBooking() {
  TG.Haptic.heavy();
  TG.MainButton.showProgress();

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'X-Telegram-Init-Data': TG.getInitData(),
      },
      body: JSON.stringify({
        serviceId:    State.selectedService?.id,
        serviceTitle: State.selectedService?.title,
        bookingDate:  State.selectedDate,
        bookingTime:  State.selectedTime,
        duration:     State.selectedService?.duration,
        price:        State.selectedService?.priceFrom,
        userPhone:    State.userPhone,
        userName:     State.userName,
        comment:      State.comment,
      }),
    });

    if (!res.ok) throw new Error('server_error');
    const { id } = await res.json();
    State.lastBookingId = id;

  } catch {
    // Fallback: сохранить локально, чтобы запись не потерялась
    const id = makeBookingId();
    State.lastBookingId = id;
    const booking = {
      id,
      serviceId:    State.selectedService?.id,
      serviceTitle: State.selectedService?.title,
      dateLabel:    State.selectedDate ? fmtDate(State.selectedDate) : '—',
      time:         State.selectedTime,
      duration:     State.selectedService?.duration,
      price:        State.selectedService?.priceFrom,
      status:       'upcoming',
      createdAt:    new Date().toISOString(),
    };
    saveBookingToStorage(booking);
  }

  TG.MainButton.hideProgress();
  TG.Haptic.success();
  Router.navigate('success');
}

// ── Успех ─────────────────────────────────────────────────────

function bindSuccess() {
  TG.BackButton.hide();
  TG.MainButton.show('Готово', () => {
    TG.Haptic.light();
    TG.close();
  });

  const screen = document.getElementById('screen-success');

  screen.querySelector('#btn-map')?.addEventListener('click', () => {
    TG.Haptic.light();
    TG.openLink(_getMaster().addressMapUrl || '#');
  });

  screen.querySelector('#btn-calendar')?.addEventListener('click', () => {
    TG.Haptic.light();
    // Формируем ссылку на Google Calendar
    const s = State.selectedService;
    const m = _getMaster();
    const d = State.selectedDate?.replace(/-/g, '');
    const t = State.selectedTime?.replace(':', '') + '00';
    const title = encodeURIComponent(`${s?.title} — ${m.name || 'Мастер'}`);
    const details = encodeURIComponent(`Адрес: ${m.address || ''}`);
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${d}T${t}/${d}T${t}&details=${details}`;
    TG.openLink(url);
  });
}

// ── Мои записи ────────────────────────────────────────────────

async function bindBookings() {
  TG.BackButton.show(() => Router.back());
  TG.MainButton.hide();

  // Загружаем записи (API или localStorage)
  State._bookingsList = await loadBookings();
  const screen = document.getElementById('screen-bookings');
  screen.innerHTML = renderBookings();

  // Переключение табов
  screen.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      TG.Haptic.light();
      State._bookingsTab = btn.dataset.tab;
      screen.innerHTML = renderBookings();
      _bindBookingsEvents(screen);
    });
  });

  _bindBookingsEvents(screen);
}

function _bindBookingsEvents(screen) {

  // Кнопка "Записаться снова"
  screen.querySelectorAll('[data-rebook]').forEach(btn => {
    btn.addEventListener('click', () => {
      TG.Haptic.light();
      const service = _getServices().find(s => s.id === btn.dataset.rebook);
      if (!service) return;
      State.selectedService = service;
      State.selectedDate = null;
      State.selectedTime = null;
      Router.navigate('service');
    });
  });

  // Кнопка "Отменить"
  screen.querySelectorAll('[data-cancel]').forEach(btn => {
    btn.addEventListener('click', () => {
      TG.Haptic.light();
      showCancelSheet(btn.dataset.cancel);
    });
  });
}


/* ══════════════════════════════════════════════════════════
   BOTTOM SHEET: подтверждение отмены
   ══════════════════════════════════════════════════════════ */

function showCancelSheet(bookingId) {
  const overlay = document.getElementById('overlay');
  const sheet = document.getElementById('bottom-sheet');
  const content = document.getElementById('bs-content');

  content.innerHTML = `
    <div class="bs-title">Отменить запись?</div>
    <div class="bs-sub">Это действие нельзя отменить</div>
    <div class="bs-actions">
      <button class="btn btn-destructive" id="bs-confirm">Да, отменить</button>
      <button class="btn btn-secondary"   id="bs-cancel">Оставить запись</button>
    </div>
  `;

  overlay.classList.add('visible');
  sheet.classList.add('visible');

  const close = () => {
    overlay.classList.remove('visible');
    sheet.classList.remove('visible');
  };

  overlay.addEventListener('click', close, { once: true });
  document.getElementById('bs-cancel').addEventListener('click', close, { once: true });

  document.getElementById('bs-confirm').addEventListener('click', async () => {
    TG.Haptic.medium();
    // Попытка отменить через API
    const booking = (State._bookingsList || []).find(b => b.id === bookingId);
    if (booking) {
      await fetch(`/api/bookings/my`, { // нет endpoint отмены клиентом — просто обновим localStorage
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': TG.getInitData() },
        body: JSON.stringify({ status: 'cancelled' }),
      }).catch(() => {});
    }
    // Обновляем localStorage
    const bookings = JSON.parse(localStorage.getItem('tg_bookings') || '[]').filter(b => b.id !== bookingId);
    localStorage.setItem('tg_bookings', JSON.stringify(bookings));
    State._bookingsList = (State._bookingsList || []).filter(b => b.id !== bookingId);
    close();
    // Перерисовать экран записей
    const screen = document.getElementById('screen-bookings');
    screen.innerHTML = renderBookings();
    _bindBookingsEvents(screen);
  }, { once: true });
}

/* ══════════════════════════════════════════════════════════
   ИНИЦИАЛИЗАЦИЯ
   ══════════════════════════════════════════════════════════ */

async function init() {
  TG.init();
  State.userName = TG.getUser().name;
  initBookingsStorage();

  const now = new Date();
  State.calendarYear = now.getFullYear();
  State.calendarMonth = now.getMonth();

  await loadAppData();

  // Убираем индикатор загрузки
  const loading = document.getElementById('loading');
  if (loading) loading.remove();

  // Рендерим и показываем главный экран
  const homeScreen = document.getElementById('screen-home');
  homeScreen.innerHTML = renderHome();
  homeScreen.classList.add('active');
  bindHome();
}

async function loadAppData() {
  // При открытии через file:// (без сервера) — пропускаем API, используем data.js
  if (window.location.protocol === 'file:') return;

  try {
    const ctrl    = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 4000); // таймаут 4 сек

    const [servicesRes, settingsRes] = await Promise.all([
      fetch('/api/services', { signal: ctrl.signal }),
      fetch('/api/settings', { signal: ctrl.signal }),
    ]);
    clearTimeout(timeout);

    if (servicesRes.ok) {
      const services = await servicesRes.json();
      if (Array.isArray(services) && services.length) {
        State.services = services;
      }
    }

    if (settingsRes.ok) {
      const settings = await settingsRes.json();
      if (settings && typeof settings === 'object') {
        State.master = settings;
      }
    }
  } catch {
    // Нет связи с сервером — используем данные из data.js
    console.info('[app] Сервер недоступен, используем локальные данные');
  }
}

// Запуск — ждём DOM или запускаем сразу если уже готов
function _startApp() {
  init().catch(err => {
    console.error('[app] Ошибка инициализации:', err);
    const loading = document.getElementById('loading');
    if (loading) loading.innerHTML =
      '<div style="text-align:center;padding:20px">' +
      '<div style="font-size:32px;margin-bottom:12px">⚠️</div>' +
      '<div style="font-size:15px;margin-bottom:8px;color:#333">Ошибка загрузки</div>' +
      '<div style="font-size:12px;color:#888;word-break:break-all">' + (err.message || String(err)) + '</div>' +
      '</div>';
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _startApp);
} else {
  _startApp();
}
