// ============================================================
// telegram.js — Обёртка над Telegram Web App SDK
// Обеспечивает корректную работу как в Telegram, так и в браузере
// ============================================================

const TG = (function () {
  // Объект Telegram WebApp (null, если открыто в браузере)
  const tgApp = window.Telegram?.WebApp || null;
  const isTelegram = !!tgApp;

  // ── Инициализация ────────────────────────────────────────

  function init() {
    if (isTelegram) {
      tgApp.ready();
      tgApp.expand(); // Развернуть на весь экран
      _applyTelegramTheme();
    } else {
      console.info('[TG] Открыт в браузере — используются fallback-значения');
      _applySystemTheme();
    }
  }

  // Применить цвета из темы Telegram как CSS-переменные
  function _applyTelegramTheme() {
    const p = tgApp.themeParams || {};
    const root = document.documentElement;
    const map = {
      'bg_color':            '--tg-bg',
      'secondary_bg_color':  '--tg-secondary-bg',
      'text_color':          '--tg-text',
      'hint_color':          '--tg-hint',
      'link_color':          '--tg-link',
      'button_color':        '--tg-button',
      'button_text_color':   '--tg-button-text',
      'destructive_text_color': '--tg-destructive',
    };
    Object.entries(map).forEach(([key, cssVar]) => {
      if (p[key]) root.style.setProperty(cssVar, p[key]);
    });
    if (tgApp.colorScheme === 'dark') {
      document.body.classList.add('dark-theme');
    }
  }

  // Применить системную тему браузера
  function _applySystemTheme() {
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('dark-theme');
    }
  }

  // ── Данные пользователя ──────────────────────────────────

  function getUser() {
    if (isTelegram && tgApp.initDataUnsafe?.user) {
      const u = tgApp.initDataUnsafe.user;
      return {
        id: u.id,
        name: [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Клиент',
        username: u.username || null,
      };
    }
    // Заглушка для браузерного тестирования
    return { id: 0, name: 'Клиент (тест)', username: null };
  }

  // ── MainButton ───────────────────────────────────────────
  // Нативная синяя кнопка Telegram внизу экрана.
  // В браузере — используется fallback-кнопка из index.html.

  const MainButton = {
    _activeCallback: null,
    _fallback: null,

    _btn() {
      if (!this._fallback) this._fallback = document.getElementById('main-btn-fallback');
      return this._fallback;
    },

    show(text, callback) {
      // Снять предыдущий обработчик перед установкой нового
      if (this._activeCallback && isTelegram) {
        tgApp.MainButton.offClick(this._activeCallback);
      }
      this._activeCallback = callback;

      if (isTelegram) {
        tgApp.MainButton.setText(text);
        tgApp.MainButton.onClick(callback);
        tgApp.MainButton.enable();
        tgApp.MainButton.show();
      } else {
        const btn = this._btn();
        if (!btn) return;
        btn.textContent = text;
        btn.onclick = callback;
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.display = 'block';
        document.body.classList.add('has-main-btn');
      }
    },

    hide() {
      if (isTelegram) {
        if (this._activeCallback) tgApp.MainButton.offClick(this._activeCallback);
        tgApp.MainButton.hide();
      } else {
        const btn = this._btn();
        if (btn) btn.style.display = 'none';
        document.body.classList.remove('has-main-btn');
      }
      this._activeCallback = null;
    },

    setText(text) {
      if (isTelegram) {
        tgApp.MainButton.setText(text);
      } else {
        const btn = this._btn();
        if (btn) btn.textContent = text;
      }
    },

    enable() {
      if (isTelegram) {
        tgApp.MainButton.enable();
      } else {
        const btn = this._btn();
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
      }
    },

    disable() {
      if (isTelegram) {
        tgApp.MainButton.disable();
      } else {
        const btn = this._btn();
        if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
      }
    },

    showProgress() {
      if (isTelegram) {
        tgApp.MainButton.showProgress(true);
      } else {
        const btn = this._btn();
        if (btn) { btn.textContent = 'Загрузка...'; btn.disabled = true; }
      }
    },

    hideProgress() {
      if (isTelegram) tgApp.MainButton.hideProgress();
    },
  };

  // ── BackButton ───────────────────────────────────────────
  // Кнопка «назад» в шапке Telegram + системная кнопка Android.

  const BackButton = {
    _handler: null,
    _popHandler: null,
    _fallback: null,

    _btn() {
      if (!this._fallback) this._fallback = document.getElementById('back-btn-fallback');
      return this._fallback;
    },

    show(callback) {
      // Снять старые обработчики
      if (this._handler && isTelegram) {
        tgApp.BackButton.offClick(this._handler);
      }
      if (this._popHandler) {
        window.removeEventListener('popstate', this._popHandler);
      }

      this._handler = callback;
      this._popHandler = () => {
        window.removeEventListener('popstate', this._popHandler);
        this._popHandler = null;
        callback();
      };

      if (isTelegram) {
        tgApp.BackButton.show();
        tgApp.BackButton.onClick(callback);
      } else {
        // В браузере — показываем fallback-кнопку
        const btn = this._btn();
        if (btn) {
          btn.onclick = callback;
          btn.classList.add('visible');
        }
      }

      // Системная кнопка назад Android (pushState + popstate)
      window.history.pushState({ tgScreen: Date.now() }, '');
      window.addEventListener('popstate', this._popHandler, { once: true });
    },

    hide() {
      if (this._handler && isTelegram) {
        tgApp.BackButton.offClick(this._handler);
        tgApp.BackButton.hide();
      } else {
        // В браузере — скрываем fallback-кнопку
        const btn = this._btn();
        if (btn) btn.classList.remove('visible');
      }
      if (this._popHandler) {
        window.removeEventListener('popstate', this._popHandler);
        this._popHandler = null;
      }
      this._handler = null;
    },
  };

  // ── HapticFeedback ────────────────────────────────────────

  const Haptic = {
    light()     { if (isTelegram) tgApp.HapticFeedback.impactOccurred('light'); },
    medium()    { if (isTelegram) tgApp.HapticFeedback.impactOccurred('medium'); },
    heavy()     { if (isTelegram) tgApp.HapticFeedback.impactOccurred('heavy'); },
    success()   { if (isTelegram) tgApp.HapticFeedback.notificationOccurred('success'); },
    error()     { if (isTelegram) tgApp.HapticFeedback.notificationOccurred('error'); },
    selection() { if (isTelegram) tgApp.HapticFeedback.selectionChanged(); },
  };

  // ── requestContact ────────────────────────────────────────
  // В браузере callback получает null — приложение покажет поле ввода.

  function requestContact(callback) {
    if (isTelegram) {
      tgApp.requestContact((sent, contact) => {
        callback(sent && contact ? contact.phone_number : null);
      });
    } else {
      callback(null); // В браузере — показать input
    }
  }

  // ── openLink ──────────────────────────────────────────────

  function openLink(url) {
    if (isTelegram) tgApp.openLink(url);
    else window.open(url, '_blank', 'noopener');
  }

  // ── close ─────────────────────────────────────────────────

  function close() {
    if (isTelegram) tgApp.close();
    else alert('Приложение закрыто (симуляция в браузере)');
  }

  // ── initData ──────────────────────────────────────────────
  // Возвращает сырую строку initData для отправки серверу.
  // В браузере возвращает 'test_init_data'.

  function getInitData() {
    return isTelegram ? (tgApp.initData || '') : 'test_init_data';
  }

  // Публичный API модуля
  return { init, getUser, getInitData, MainButton, BackButton, Haptic, requestContact, openLink, close, isTelegram };
})();
