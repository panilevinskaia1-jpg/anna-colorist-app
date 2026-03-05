/* ════════════════════════════════════════════════════════════════
   admin.js — логика панели управления мастера
   ════════════════════════════════════════════════════════════════ */
'use strict';

// ── API helper ───────────────────────────────────────────────────────────────

const API_BASE = '/api';

function getInitData() {
  if (window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }
  return 'test_init_data';
}

async function fetchAdmin(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type':         'application/json',
      'X-Telegram-Init-Data': getInitData(),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  return res;
}

// ── Состояние ────────────────────────────────────────────────────────────────

const State = {
  tab:            'bookings',
  bookingsStatus: 'upcoming',
  bookings:       [],
  services:       [],
  editServiceId:  null,
};

// ── Инициализация ────────────────────────────────────────────────────────────

async function init() {
  // Применить тему Telegram
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.expand();
    const p = tg.themeParams || {};
    const root = document.documentElement.style;
    if (p.bg_color)            root.setProperty('--tg-bg',           p.bg_color);
    if (p.secondary_bg_color)  root.setProperty('--tg-secondary-bg', p.secondary_bg_color);
    if (p.text_color)          root.setProperty('--tg-text',         p.text_color);
    if (p.hint_color)          root.setProperty('--tg-hint',         p.hint_color);
    if (p.button_color)        root.setProperty('--tg-button',       p.button_color);
    if (p.button_text_color)   root.setProperty('--tg-button-text',  p.button_text_color);
    if (tg.colorScheme === 'dark') document.body.classList.add('dark-theme');
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add('dark-theme');
  }

  // Проверить доступ
  const res = await fetchAdmin('/admin/bookings?status=upcoming');
  if (res.status === 401 || res.status === 403) {
    showAccessDenied();
    return;
  }

  bindTabs();
  bindBookingFilter();
  bindAddForm();
  bindModal();

  // Загрузить первую вкладку
  State.bookings = await res.json();
  renderBookings();
}

function showAccessDenied() {
  document.getElementById('admin-tabs').style.display = 'none';
  document.getElementById('admin-main').innerHTML = `
    <div class="access-denied">
      <div class="access-denied__icon">⛔</div>
      <div class="access-denied__title">Доступ запрещён</div>
      <div class="access-denied__text">Эта панель только для мастера.<br>Откройте её через бота командой /admin</div>
    </div>`;
}

// ── Табы ─────────────────────────────────────────────────────────────────────

function bindTabs() {
  document.getElementById('admin-tabs').addEventListener('click', async (e) => {
    const btn = e.target.closest('.admin-tab');
    if (!btn) return;

    document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    State.tab = btn.dataset.tab;

    const panel = document.getElementById(`panel-${State.tab}`);
    if (panel) panel.classList.add('active');

    if (State.tab === 'services' && State.services.length === 0) {
      await loadServices();
    }
  });
}

// ── Записи ───────────────────────────────────────────────────────────────────

function bindBookingFilter() {
  document.getElementById('bookings-filter').addEventListener('click', async (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    State.bookingsStatus = btn.dataset.status;
    await loadBookings();
  });
}

async function loadBookings() {
  const list = document.getElementById('bookings-list');
  list.innerHTML = skeletonCards(3);
  const res = await fetchAdmin(`/admin/bookings?status=${State.bookingsStatus}`);
  if (!res.ok) { list.innerHTML = '<div class="empty-state"><div class="empty-state__text">Ошибка загрузки</div></div>'; return; }
  State.bookings = await res.json();
  renderBookings();
}

function renderBookings() {
  const list = document.getElementById('bookings-list');
  if (!State.bookings.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📅</div>
        <div class="empty-state__text">Нет записей</div>
      </div>`;
    return;
  }

  const STATUS_LABELS = {
    upcoming:  'Предстоящая',
    pending:   'Ожидает',
    completed: 'Завершена',
    cancelled: 'Отменена',
  };

  list.innerHTML = State.bookings.map(b => {
    const label = STATUS_LABELS[b.status] || b.status;
    const actions = buildBookingActions(b);
    return `
      <div class="admin-card">
        <div class="booking-card__head">
          <div class="booking-card__name">${esc(b.user_name || 'Клиент')}</div>
          <span class="booking-card__status status-${b.status}">${label}</span>
        </div>
        <div class="booking-card__row"><span class="booking-card__label">Услуга:</span>${esc(b.service_title)}</div>
        <div class="booking-card__row"><span class="booking-card__label">Дата:</span>${esc(b.booking_date)} в ${esc(b.booking_time)}</div>
        ${b.user_phone ? `<div class="booking-card__row"><span class="booking-card__label">Телефон:</span>${esc(b.user_phone)}</div>` : ''}
        ${b.price ? `<div class="booking-card__row"><span class="booking-card__label">Сумма:</span>${Number(b.price).toLocaleString('ru-RU')} ₽</div>` : ''}
        ${b.comment ? `<div class="booking-card__row"><span class="booking-card__label">Комментарий:</span>${esc(b.comment)}</div>` : ''}
        ${actions}
      </div>`;
  }).join('');

  // Навешиваем события на кнопки
  list.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { action, id } = btn.dataset;
      await changeBookingStatus(id, action === 'confirm' ? 'upcoming' : 'cancelled');
    });
  });
}

function buildBookingActions(b) {
  if (b.status === 'pending') {
    return `
      <div class="booking-card__actions">
        <button class="admin-btn admin-btn--primary admin-btn--sm" data-action="confirm" data-id="${b.id}">✅ Подтвердить</button>
        <button class="admin-btn admin-btn--danger  admin-btn--sm" data-action="cancel"  data-id="${b.id}">❌ Отменить</button>
      </div>`;
  }
  if (b.status === 'upcoming') {
    return `
      <div class="booking-card__actions">
        <button class="admin-btn admin-btn--danger admin-btn--sm" data-action="cancel" data-id="${b.id}">❌ Отменить</button>
      </div>`;
  }
  return '';
}

async function changeBookingStatus(id, status) {
  const res = await fetchAdmin(`/admin/bookings/${id}`, 'PATCH', { status });
  if (res.ok) await loadBookings();
}

// ── Услуги ───────────────────────────────────────────────────────────────────

async function loadServices() {
  const list = document.getElementById('services-list');
  list.innerHTML = skeletonCards(4);
  const res = await fetchAdmin('/admin/services');
  if (!res.ok) { list.innerHTML = '<div class="empty-state"><div class="empty-state__text">Ошибка загрузки</div></div>'; return; }
  State.services = await res.json();
  renderServices();
}

function renderServices() {
  const list = document.getElementById('services-list');
  if (!State.services.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">💇</div>
        <div class="empty-state__text">Услуги не найдены</div>
      </div>`;
    return;
  }

  list.innerHTML = State.services.map(s => {
    const photo  = s.photos?.[0] || 'linear-gradient(135deg,#667eea,#764ba2)';
    const active = s.active !== false && s.active !== 0;
    const photoStyle = photo.startsWith('linear-') || photo.startsWith('radial-')
      ? `background:${photo}`
      : `background-image:url(${photo});background-size:cover;background-position:center`;
    const priceLabel = s.prices
      ? `от ${Math.min(...Object.values(s.prices).filter(Boolean)).toLocaleString('ru-RU')} ₽`
      : (s.price_from ? `от ${Number(s.price_from).toLocaleString('ru-RU')} ₽` : '');

    return `
      <div class="admin-card">
        <div class="service-card__head">
          <div class="service-card__photo" style="${photoStyle}"></div>
          <div class="service-card__info">
            <div class="service-card__title">${esc(s.title)}</div>
            <div class="service-card__subtitle">${esc(s.subtitle || '')}</div>
          </div>
          <span class="service-card__badge ${active ? 'badge-active' : 'badge-inactive'}">${active ? 'Активна' : 'Скрыта'}</span>
        </div>
        <div class="service-card__price">${priceLabel} · ${esc(s.duration || '')}</div>
        <div class="service-card__actions">
          <button class="admin-btn admin-btn--ghost admin-btn--sm" data-svc-action="edit-price" data-id="${s.id}">✏️ Цены</button>
          <button class="admin-btn admin-btn--sm ${active ? 'admin-btn--toggle-on' : 'admin-btn--toggle-off'}" data-svc-action="toggle" data-id="${s.id}">
            ${active ? '🙈 Скрыть' : '👁 Показать'}
          </button>
          <button class="admin-btn admin-btn--danger admin-btn--sm" data-svc-action="delete" data-id="${s.id}">🗑</button>
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('[data-svc-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { svcAction, id } = btn.dataset;
      if (svcAction === 'edit-price') openPriceModal(id);
      if (svcAction === 'toggle')     toggleService(id);
      if (svcAction === 'delete')     deleteService(id);
    });
  });
}

async function toggleService(id) {
  const res = await fetchAdmin(`/admin/services/${id}/toggle`, 'PATCH');
  if (res.ok) await loadServices();
}

async function deleteService(id) {
  const service = State.services.find(s => s.id === id);
  if (!confirm(`Удалить услугу «${service?.title || id}»? Это действие нельзя отменить.`)) return;
  const res = await fetchAdmin(`/admin/services/${id}`, 'DELETE');
  if (res.ok) await loadServices();
}

// ── Редактирование цен (модальное окно) ──────────────────────────────────────

const HAIR_LABELS = {
  short:    'Короткие',
  medium:   'Средние',
  long:     'Длинные',
  verylong: 'Очень длинные',
};

function openPriceModal(id) {
  State.editServiceId = id;
  const service = State.services.find(s => s.id === id);
  if (!service) return;

  const prices = service.prices || {
    short:    service.price_short    || 0,
    medium:   service.price_medium   || 0,
    long:     service.price_long     || 0,
    verylong: service.price_verylong || 0,
  };

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-prices">
      ${Object.entries(HAIR_LABELS).map(([key, label]) => `
        <div class="modal-price-row">
          <span class="modal-price-label">${label}</span>
          <input class="modal-price-input" type="number" min="0" step="100"
                 data-price-key="${key}" value="${prices[key] || ''}">
        </div>`).join('')}
    </div>`;

  document.getElementById('edit-price-modal').classList.remove('hidden');
}

function bindModal() {
  document.getElementById('modal-cancel').addEventListener('click', () => {
    document.getElementById('edit-price-modal').classList.add('hidden');
  });
  document.getElementById('modal-backdrop').addEventListener('click', () => {
    document.getElementById('edit-price-modal').classList.add('hidden');
  });
  document.getElementById('modal-save').addEventListener('click', savePrices);
}

async function savePrices() {
  const id     = State.editServiceId;
  const inputs = document.querySelectorAll('[data-price-key]');
  const prices = {};
  let priceFrom = Infinity;

  inputs.forEach(inp => {
    const val = Number(inp.value) || 0;
    prices[inp.dataset.priceKey] = val;
    if (val > 0) priceFrom = Math.min(priceFrom, val);
  });

  const body = {
    prices,
    price_from: isFinite(priceFrom) ? priceFrom : 0,
  };

  const res = await fetchAdmin(`/admin/services/${id}`, 'PUT', body);
  if (res.ok) {
    document.getElementById('edit-price-modal').classList.add('hidden');
    await loadServices();
  }
}

// ── Форма добавления услуги ───────────────────────────────────────────────────

function bindAddForm() {
  document.getElementById('add-service-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form  = e.target;
    const error = document.getElementById('add-service-error');
    error.classList.add('hidden');

    const data = Object.fromEntries(new FormData(form));

    if (!data.id || !data.title || !data.category) {
      error.textContent = 'Заполните обязательные поля (ID, название, категория)';
      error.classList.remove('hidden');
      return;
    }

    const prices = {
      short:    Number(data.price_short)    || 0,
      medium:   Number(data.price_medium)   || 0,
      long:     Number(data.price_long)     || 0,
      verylong: Number(data.price_verylong) || 0,
    };

    const priceValues = Object.values(prices).filter(v => v > 0);
    const priceFrom   = priceValues.length ? Math.min(...priceValues) : 0;

    const body = {
      id:           data.id.trim(),
      title:        data.title.trim(),
      subtitle:     data.subtitle.trim(),
      description:  data.description.trim(),
      category:     data.category,
      duration:     data.duration.trim(),
      cancelPolicy: data.cancelPolicy.trim(),
      priceFrom,
      prices,
      photos:  [],
      process: [],
    };

    const res = await fetchAdmin('/admin/services', 'POST', body);

    if (res.status === 409) {
      error.textContent = 'Услуга с таким ID уже существует';
      error.classList.remove('hidden');
      return;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      error.textContent = err.error || 'Ошибка при создании услуги';
      error.classList.remove('hidden');
      return;
    }

    form.reset();
    // Переключиться на вкладку Услуги
    document.querySelector('[data-tab="services"]').click();
    State.services = []; // сбросить кеш
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function skeletonCards(n) {
  return Array.from({length: n}, () => '<div class="skeleton skeleton-card"></div>').join('');
}

// ── Старт ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
