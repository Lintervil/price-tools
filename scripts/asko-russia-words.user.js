// ==UserScript==
// @name         Asko-Russia: проверка английских слов
// @namespace    asko-russia-content-check
// @version      0.45
// @description  Поиск английских слов на asko-russia.ru: 1 строка на товар в CSV, чистое описание и HTML-отчёт
// @match        *://asko-russia.ru/*
// @match        *://www.asko-russia.ru/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const SCRIPT_VERSION = '0.45';

  /* =====================================================================
     НАСТРОЙКИ И СЕЛЕКТОРЫ ASKO-RUSSIA
  ===================================================================== */
  const CONFIG = {
    links: [
      // === ГЛАВНЫЕ ССЫЛКИ ===
      { name: 'Главная', url: '/' },
      { name: 'Каталог стиральных машин', url: '/catalog/stiralnye_mashiny/' },
      { name: 'Карточка товара (пример)', url: '/catalog/stiralnye_mashiny/stiralnaya-mashina-asko-w1094w.html' },
      { name: 'Глоссарий', url: '/glossary/' },
      { name: 'Статьи', url: '/news/?type=all' },
      { name: 'Акции и скидки', url: '/catalog/type-akcii/' },
      { name: 'Рейтинги', url: '/ratings/reytingi-tekhniki-asko-2026-goda/' },

      // === УХОД ЗА БЕЛЬЁМ ===
      { name: 'Уход за бельём', section: true, id: 'laundry' },
      { name: 'Стиральные машины', url: '/catalog/stiralnye_mashiny/' },
      { name: 'Сушильные машины', url: '/catalog/sushilnye_mashiny/' },
      { name: 'Сушильные шкафы', url: '/catalog/sushilnye_shkafy/' },
      { name: 'Домашняя прачечная', url: '/catalog/complects-asko/domashnyaya-prachechnaya/' },

      // === ТЕХНИКА ДЛЯ КУХНИ ===
      { name: 'Техника для кухни', section: true, id: 'kitchen' },
      { name: 'Посудомоечные машины', url: '/catalog/posudomoechnye_mashiny/' },
      { name: 'Духовые шкафы', url: '/catalog/dukhovye-shkafy/' },
      { name: 'Компактные духовые шкафы', url: '/catalog/kompaktnye-dukhovye-shkafy/' },
      { name: 'Варочные панели', url: '/catalog/varochnye-paneli/' },
      { name: 'Вытяжки', url: '/catalog/vytyazhki/' },
      { name: 'Холодильники', url: '/catalog/kholodilniki/' },
      { name: 'Комплекты КБТ', url: '/catalog/complects-asko/komplekty-kbt/' },

      // === КОМПАКТНЫЕ ПРИБОРЫ ===
      { name: 'Компактные приборы', section: true, id: 'compact' },
      { name: 'Кофемашины', url: '/catalog/kofemashiny/' },
      { name: 'Микроволновые печи', url: '/catalog/mikrovolnovye_pechi/' },
      { name: 'Подогреватели посуды', url: '/catalog/podogrevateli_posudy/' },
      { name: 'Вакууматоры', url: '/catalog/vakuumatory/' },

      // === СЕРИИ И КОЛЛЕКЦИИ ===
      { name: 'Серии Asko', section: true, id: 'collections' },
      { name: 'Классика (Classic)', url: '/catalog/collections/classic/' },
      { name: 'Лоджик (Logic)', url: '/catalog/collections/logic/' },
      { name: 'Стайл (Style)', url: '/catalog/collections/style/' },
      { name: 'Стайл+ (Style+)', url: '/catalog/collections/style-/' },
      { name: 'Профессионал (Professional)', url: '/catalog/collections/professional/' },
      { name: 'НУАКРАФТ (NYACRAFT)', url: '/catalog/collections/nyacraft/' },
      { name: 'КРАФТ (CRAFT)', url: '/catalog/collections/craft/' },
      { name: 'Элементы (Elements)', url: '/catalog/collections/elements/' },
      { name: 'Эссенция (Essence)', url: '/catalog/collections/essence/' },
      { name: 'Эксклюзив (Exclusive)', url: '/catalog/collections/exclusive/' },
      { name: 'Премиум (Premium)', url: '/catalog/collections/premium/' },

      // === АКСЕССУАРЫ ===
      { name: 'Аксессуары', section: true, id: 'accessories' },
      { name: 'Все аксессуары', url: '/catalog/aksessuary/' },

      // === МИР ASKO И СЕРВИС ===
      { name: 'Мир Asko и сервис', section: true, id: 'info' },
      { name: 'Глоссарий', url: '/glossary/' },
      { name: 'Шоу-румы Asko', url: '/showrooms/' },
      { name: 'Доставка и оплата', url: '/delivery-and-payment/' },
      { name: 'Подключение', url: '/services/' },
      { name: 'Гарантия и сервис', url: '/guarantee/' },
      { name: 'Инструкции к технике', url: '/technical-documentation/' },
      { name: 'Ремонт Asko', url: '/kbt/' },
      { name: 'Возврат и обмен', url: '/kachestvo/' },
      { name: 'Кредит', url: '/credit/' },
      { name: 'Вопросы и ответы (FAQ)', url: '/faq/' },
      { name: 'О компании', url: '/about/' },
      { name: 'Контакты', url: '/contacts/' },
      { name: 'Видео', url: '/video/' },
    ],

    catalogs: [
      { name: '📰 Все статьи и публикации (/news/)', url: '/news/?type=all', isArticles: true },
      { name: 'Стиральные машины', url: '/catalog/stiralnye_mashiny/' },
      { name: 'Сушильные машины', url: '/catalog/sushilnye_mashiny/' },
      { name: 'Сушильные шкафы', url: '/catalog/sushilnye_shkafy/' },
      { name: 'Посудомоечные машины', url: '/catalog/posudomoechnye_mashiny/' },
      { name: 'Духовые шкафы', url: '/catalog/dukhovye-shkafy/' },
      { name: 'Компактные духовые шкафы', url: '/catalog/kompaktnye-dukhovye-shkafy/' },
      { name: 'Варочные панели', url: '/catalog/varochnye-paneli/' },
      { name: 'Вытяжки', url: '/catalog/vytyazhki/' },
      { name: 'Холодильники', url: '/catalog/kholodilniki/' },
      { name: 'Кофемашины', url: '/catalog/kofemashiny/' },
      { name: 'Микроволновые печи', url: '/catalog/mikrovolnovye_pechi/' },
      { name: 'Подогреватели посуды', url: '/catalog/podogrevateli_posudy/' },
      { name: 'Вакууматоры', url: '/catalog/vakuumatory/' },
      { name: 'Аксессуары', url: '/catalog/aksessuary/' },
      { name: 'Домашняя прачечная', url: '/catalog/complects-asko/domashnyaya-prachechnaya/' },
    ],

    bulk: {
      concurrency: 3,
      delayMs: 250,
      maxPages: 100,
      paginationRe: /(?:PAGEN_\d+|[?&]page|[?&]PAGE)=\d+/i,
    },

    exclude: [
      'header', 'footer', 'nav', 'script', 'style', 'noscript', 'textarea', 'select',
      '#fwc-panel', '[class*="cookie"]', '.sidebar-documentation',
      '.sidebar-certificates-slider', '.sidebar-credit', '.sidebar-control',
      '.card-info__product-code', '.page-breadcrumbs',
      '.read-more', '.product-description__read-more', '.product-description__title',
    ].join(', '),

    wholePage: { id: 'page', name: 'Вся страница целиком', selector: 'body' },

    pages: [
      // 1. КАРТОЧКА ТОВАРА
      {
        id: 'product',
        name: 'Карточка товара Asko',
        urlRe: /^\/catalog\/.+\.html/i,
        blocks: [
          { id: 'desc', name: 'Описание модели', selector: '.product-description__text' },
          { id: 'short', name: 'Ключевые особенности (шапка)', selector: '.card-info__description' },
          { id: 'specs', name: 'Характеристики (таблица)', selector: '.characteristics' },
          { id: 'overlook', name: 'Обзор модели (статья)', selector: '#overlook_item, .simple-text' },
          { id: 'reviews', name: 'Отзывы покупателей', selector: '.reviews' },
        ],
      },
      // 2. СТАТЬЯ
      {
        id: 'article',
        name: 'Статья (страница публикации)',
        urlRe: /^\/news\/.+\.html/i,
        blocks: [
          { id: 'art_title', name: 'Заголовок статьи (H1)', selector: 'h1.page-title, h1' },
          { id: 'art_text', name: 'Текст статьи', selector: '.article-single' },
        ],
      },
      // 3. СПИСОК СТАТЕЙ
      {
        id: 'articles',
        name: 'Статьи (список)',
        urlRe: /^\/news\//i,
        blocks: [
          { id: 'cards', name: 'Карточки статей на экране', selector: '.article-link, .article-link__link, a[class*="article-link"]' },
        ],
      },
      // 4. КАТАЛОГ
      {
        id: 'catalog',
        name: 'Каталог (текущая страница)',
        urlRe: /^\/catalog\//i,
        blocks: [
          { id: 'cat_banner', name: 'Текст и баннер каталога (без товаров)', selector: '.banner__content, .banner__text' },
          { id: 'cat_tags', name: 'Теги и подборки над каталогом', selector: '.catalog-tags' },
          { id: 'cat_filter', name: 'Параметры фильтра (слева)', selector: '.filter, .bx-filter' },
          { id: 'cat_cards', name: 'Товары на экране (карточки)', selector: '.catalog-card' },
        ],
      },
      // 5. ГЛОССАРИЙ
      {
        id: 'glossary',
        name: 'Глоссарий',
        urlRe: /^\/glossary/i,
        blocks: [
          { id: 'text', name: 'Текст глоссария', selector: '[class*="glossary"], article, main' },
        ],
      },
      // 6. ОТЗЫВЫ
      {
        id: 'reviews',
        name: 'Отзывы',
        urlRe: /^\/reviews/i,
        blocks: [
          { id: 'cards', name: 'Отзывы', selector: '.review, [class*="review-card"], [class*="reviews__list"]' },
        ],
      },
      // 7. АКЦИИ
      {
        id: 'sales',
        name: 'Акции',
        urlRe: /^\/catalog\/type-akcii/i,
        blocks: [
          { id: 'cards', name: 'Карточки акций', selector: '.catalog-card, [class*="sale-card"]' },
        ],
      },
      // 8. РЕЙТИНГИ
      {
        id: 'ratings',
        name: 'Рейтинги',
        urlRe: /^\/ratings\//i,
        blocks: [
          { id: 'text', name: 'Текст рейтинга', selector: 'article, [class*="rating-content"], main' },
        ],
      },
      // 9. ГЛАВНАЯ СТРАНИЦА
      {
        id: 'home',
        name: 'Главная страница',
        urlRe: /^\/?(?:index\.php)?$/i,
        blocks: [
          { id: 'main', name: 'Основной контент', selector: 'main, [role="main"]' },
        ],
      },
    ],

    brands: [
      'Asko', 'Classic', 'Logic', 'Style', 'Professional', 'ProHome', 'Home',
      'Craft', 'Elements', 'Essence', 'Nyacraft', 'Exclusive', 'Premium',
      'ActiveDrum', 'SoftDrum', 'Quattro', 'Construction', 'SteelSeal', 'Steel', 'Seal',
      'SmartSeal', 'ProWash', 'Butterfly', 'Drying', 'Sensidry', 'SensiDry',
      'DoseAssist', 'AquaSafe', 'AquaStop', 'AquaBlockSystem', 'ConnectLife',
      'EasyControl', 'QuickPro', 'SuperRinse',
      'BLDC', 'FSTN', 'TFT', 'LCD', 'LED', 'PEX', 'Eco',
      'Wi-Fi', 'WiFi', 'USB', 'HDMI', 'jpg', 'pdf', 'mb', 'kb', 'mp4', 'webp',
    ],

    forceFlag: ['wok'],
    ignoreWordsWithDigits: true,
    ignoreInParentheses: true,
    ignoreUrlsAndEmails: true,
    minLength: 2,
  };

  /* ===================== ХРАНИЛИЩЕ И СОСТОЯНИЕ ===================== */
  const STORE_ALLOW = 'fwc_asko_allowlist';
  const STORE_COLLAPSED = 'fwc_asko_collapsed';
  const STORE_SECTIONS = 'fwc_asko_sections';
  const STORE_REPORT = 'fwc_asko_report';
  const STORE_TAB = 'fwc_asko_tab';
  const LS_BACKUP = 'fwc_asko_allowlist_backup';

  function getUserWords() {
    let list = GM_getValue(STORE_ALLOW, []);
    if (!Array.isArray(list)) list = [];
    if (!list.length) {
      try {
        const b = JSON.parse(localStorage.getItem(LS_BACKUP) || '[]');
        if (Array.isArray(b) && b.length) {
          list = b;
          GM_setValue(STORE_ALLOW, list);
        }
      } catch (e) { /* ignore */ }
    }
    return list;
  }

  function saveUserWords(list) {
    GM_setValue(STORE_ALLOW, list);
    try {
      localStorage.setItem(LS_BACKUP, JSON.stringify(list));
    } catch (e) { /* ignore */ }
  }

  const getAllow = () => new Set([...CONFIG.brands, ...getUserWords()].map(w => w.toLowerCase()));

  function addWords(str) {
    const list = getUserWords();
    const have = new Set(list.map(w => w.toLowerCase()));
    const all = [];
    const added = [];

    String(str)
      .split(/[\s,;]+/)
      .map(w => w.replace(/^[\s"'`\[\]()]+|[\s"'`\[\](),]+$/g, '').trim())
      .filter(Boolean)
      .forEach(w => {
        const lower = w.toLowerCase();
        all.push(lower);
        if (!have.has(lower)) {
          list.push(w);
          have.add(lower);
          added.push(w);
        }
      });

    saveUserWords(list);
    return { all, added };
  }

  function removeWord(w) {
    saveUserWords(getUserWords().filter(x => x.toLowerCase() !== w.toLowerCase()));
  }

  const esc = s =>
    String(s || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c]));

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ===================== СТИЛИ ===================== */
  GM_addStyle(`
    #fwc-panel{position:fixed;right:16px;bottom:16px;z-index:2147483647;width:380px;max-height:86vh;overflow:auto;background:#fff;color:#222;font:13px/1.4 Arial,sans-serif;border:1px solid #7a8b9e;border-radius:8px;box-shadow:0 4px 22px rgba(0,0,0,.32)}
    #fwc-panel *{box-sizing:border-box}
    #fwc-panel header{padding:9px 12px;background:#243242;color:#fff;cursor:pointer;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:2}
    .fwc-badge{background:#2d7ff9;color:#fff;padding:2px 7px;border-radius:10px;font-size:11px;font-weight:bold;margin-left:6px;vertical-align:middle}
    #fwc-tabs{display:flex;background:#eaf0f7;border-bottom:1px solid #c8d4e2;position:sticky;top:38px;z-index:2}
    .fwc-tab-btn{flex:1;padding:8px 4px;border:none;background:transparent;cursor:pointer;font-size:11px;font-weight:bold;color:#49617d;text-align:center;border-bottom:2px solid transparent;transition:all .15s}
    .fwc-tab-btn:hover{background:#dfe8f2;color:#1e2b3a}
    .fwc-tab-btn.active{background:#fff;color:#2d7ff9;border-bottom-color:#2d7ff9}
    #fwc-body{padding:10px}
    #fwc-panel h4{margin:10px 0 4px;font-size:11px;color:#6b7c93;text-transform:uppercase;letter-spacing:.04em}
    #fwc-panel .fwc-help-tip{font-size:11px;color:#555;background:#f3f6fa;border-left:3px solid #2d7ff9;padding:6px 8px;margin-bottom:8px;border-radius:0 4px 4px 0}
    #fwc-panel label{display:block;margin:3px 0;cursor:pointer}
    #fwc-panel label.fwc-sw-row{display:flex!important;align-items:center;gap:10px;margin:6px 0;cursor:pointer}
    #fwc-panel .fwc-sw-row input{position:absolute!important;opacity:0!important;width:0!important;height:0!important;margin:0!important;pointer-events:none}
    #fwc-panel .fwc-sw{flex:none;display:block;width:36px;height:20px;border-radius:10px;background:#bbb!important;position:relative;transition:background .15s}
    #fwc-panel .fwc-sw::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s;box-shadow:0 1px 3px rgba(0,0,0,.35)}
    #fwc-panel .fwc-sw-row input:checked + .fwc-sw{background:#2d7ff9!important}
    #fwc-panel .fwc-sw-row input:checked + .fwc-sw::after{left:18px}
    #fwc-panel .fwc-sw-row input:disabled + .fwc-sw{opacity:.45}
    #fwc-panel .fwc-sw-t{flex:1}
    #fwc-panel button{cursor:pointer;font:inherit}
    #fwc-panel select,#fwc-panel input[type=number],#fwc-panel input[type=text]{width:100%;padding:5px;border:1px solid #bbb;border-radius:4px;margin:3px 0;font:inherit}
    .fwc-btn{width:100%;padding:7px;margin:3px 0;border:1px solid #2d7ff9;background:#2d7ff9;color:#fff;border-radius:4px;font-weight:bold}
    .fwc-btn.sec{background:#fff;color:#2d7ff9}
    .fwc-btn.gray{background:#f4f5f7;color:#333;border-color:#ccc}
    .fwc-btn.red{background:#d33;border-color:#d33}
    .fwc-links a{display:inline-block;margin:2px 8px 2px 0;color:#2d7ff9;text-decoration:none}
    .fwc-links a:hover{text-decoration:underline}
    .fwc-row{display:flex;justify-content:space-between;align-items:center;gap:6px;padding:3px 0;border-bottom:1px dashed #ddd}
    .fwc-word{cursor:pointer;color:#c00;word-break:break-all}
    .fwc-small{padding:1px 6px;border:1px solid #bbb;background:#f7f7f7;border-radius:3px;font-size:11px;white-space:nowrap}
    .fwc-warn{color:#b36b00;font-size:11px;margin:4px 0}
    .fwc-ok{color:#2a8a2a}
    .fwc-prod{padding:5px 0;border-bottom:1px solid #eee}
    .fwc-prod a{color:#2d7ff9;font-weight:bold;text-decoration:none}
    .fwc-prod a:hover{text-decoration:underline}
    .fwc-prod small{color:#555;display:block}
    #fwc-progress{margin:6px 0;padding:6px;background:#eef5ff;border-radius:4px;font-weight:bold}
    #fwc-panel textarea{width:100%;height:60px;font:11px monospace}
    #fwc-panel .fwc-ex{margin:10px 0;padding:8px;border:1px solid #ddd;border-radius:6px;background:#fafafa}
    #fwc-panel .fwc-ex-h{font-weight:bold;color:#444;font-size:12px;margin-bottom:2px}
    #fwc-panel .fwc-ex-sub{font-size:11px;color:#666;margin:3px 0}
    #fwc-panel .fwc-ex-list{max-height:140px;overflow:auto;background:#fff;border:1px solid #e3e3e3;border-radius:4px;padding:2px 6px;margin:4px 0}
    #fwc-panel .fwc-ret{border-color:#bbb;color:#444;background:#f7f7f7}
    #fwc-panel .fwc-undo{position:sticky;top:72px;z-index:3;display:flex;align-items:center;gap:6px;padding:6px 8px;margin:0 0 8px;background:#2b8a3e;color:#fff;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,.3)}
    #fwc-panel .fwc-undo{overflow:hidden}
    #fwc-panel .fwc-undo span{flex:1;word-break:break-all}
    #fwc-panel .fwc-undo button{background:#fff;color:#2b8a3e;border:0;border-radius:4px;padding:3px 8px;font-weight:bold}
    mark.fwc-mark{background:#ffe600!important;color:#000!important;outline:1px solid #e0a000;border-radius:2px}
    body.fwc-picking,body.fwc-picking *{cursor:crosshair!important}
    .fwc-section-header{display:flex;align-items:center;gap:6px;padding:5px 8px;margin:6px 0 2px;background:#eef2f7;border:1px solid #d0d8e4;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;color:#3a5070;text-transform:uppercase;letter-spacing:.03em;user-select:none}
    .fwc-section-header:hover{background:#e0e8f2}
    .fwc-section-header .fwc-arrow{transition:transform .15s;font-size:10px;color:#888}
    .fwc-section-header.collapsed .fwc-arrow{transform:rotate(-90deg)}
    .fwc-section-body{padding:2px 0 2px 4px}
    .fwc-section-body.hidden{display:none}
  `);

  /* ===================== ПОИСК СЛОВ ===================== */
  const WORD_RE = /[A-Za-z0-9][A-Za-z0-9''-]*/g;
  const URL_RE = /(?:https?:\/\/|www\.)\S+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
  const BLOCK_PARENT = 'p,li,div,tr,td,th,h1,h2,h3,h4,h5,h6,dd,dt,section,article';

  function isAllowedWord(w, allow) {
    if (allow.has(w.toLowerCase())) return true;
    return w.includes('-') && w.split('-').every(p => !p || allow.has(p.toLowerCase()) || /^\d+$/.test(p));
  }

  function findForeign(text, allow, st) {
    const skip = new Uint8Array(text.length);

    if (CONFIG.ignoreInParentheses) {
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '(' || c === '（') st.depth++;
        if (st.depth > 0) skip[i] = 1;
        if (c === ')' || c === '）') st.depth = Math.max(0, st.depth - 1);
      }
    }

    if (CONFIG.ignoreUrlsAndEmails) {
      for (const m of text.matchAll(URL_RE)) {
        skip.fill(1, m.index, m.index + m[0].length);
      }
    }

    const res = [];

    for (const m of text.matchAll(WORD_RE)) {
      const w = m[0].replace(/[-'']+$/, '');
      const start = m.index;
      const end = start + w.length;

      if (!/[A-Za-z]/.test(w)) continue;
      if (w.length < CONFIG.minLength) continue;
      if (CONFIG.ignoreWordsWithDigits && /\d/.test(w)) continue;

      const isForced = CONFIG.forceFlag && CONFIG.forceFlag.some(f => w.toLowerCase() === f.toLowerCase());

      if (!isForced) {
        if (skip[start] || skip[end - 1]) continue;
        if (isAllowedWord(w, allow)) continue;
      } else {
        if (allow.has(w.toLowerCase())) continue;
      }

      res.push({ word: w, start, end });
    }

    return res;
  }

  function clearMarks() {
    document.querySelectorAll('mark.fwc-mark').forEach(m => m.replaceWith(document.createTextNode(m.textContent)));
    document.body.normalize();
  }

  function scanElement(root, allow, found, blockId, st, highlight = true) {
    const doc = root.ownerDocument;

    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || p.closest('script, style, noscript, mark.fwc-mark, #fwc-panel')) return NodeFilter.FILTER_REJECT;

        const isExcluded = p.closest(CONFIG.exclude);
        if (isExcluded) {
          if (root === isExcluded || isExcluded.contains(root)) {
            // Разрешено (блок запрашивался явно)
          } else {
            const hasForced = CONFIG.forceFlag && CONFIG.forceFlag.some(f => new RegExp('\\b' + f + '\\b', 'i').test(n.nodeValue));
            if (!hasForced) return NodeFilter.FILTER_REJECT;
          }
        }

        return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    let lastBp = null;

    for (const node of nodes) {
      const bp = node.parentElement.closest(BLOCK_PARENT);
      if (bp !== lastBp) {
        st.depth = 0;
        lastBp = bp;
      }

      const text = node.nodeValue;
      const hits = findForeign(text, allow, st);
      if (!hits.length) continue;

      if (!highlight) {
        hits.forEach(h => found.push({ word: h.word, block: blockId }));
        continue;
      }

      const frag = doc.createDocumentFragment();
      let pos = 0;

      for (const h of hits) {
        if (h.start > pos) frag.append(text.slice(pos, h.start));

        const mark = doc.createElement('mark');
        mark.className = 'fwc-mark';
        mark.textContent = h.word;
        frag.append(mark);

        found.push({ word: h.word, el: mark, block: blockId });
        pos = h.end;
      }

      if (pos < text.length) frag.append(text.slice(pos));

      node.replaceWith(frag);
    }
  }

  function getRoots(block, doc = document) {
    if (block.selector) {
      const els = [...doc.querySelectorAll(block.selector)].filter(e => !e.closest('#fwc-panel'));
      return els.filter(a => !els.some(b => b !== a && b.contains(a)));
    }
    return [];
  }

  /* ===================== ДИНАМИЧЕСКИЙ ТИП СТРАНИЦЫ ===================== */
  function getPageType() {
    const path = location.pathname;
    return CONFIG.pages.find(p => p.urlRe.test(path)) || null;
  }

  const productBlocks = () => CONFIG.pages.find(p => p.id === 'product').blocks;
  const articleBlocks = () => CONFIG.pages.find(p => p.id === 'article').blocks;

  const selected = new Set();
  let lastCheckedPath = '';

  function ensureSelected() {
    if (location.pathname !== lastCheckedPath) {
      lastCheckedPath = location.pathname;
      selected.clear();
      const p = getPageType();
      if (p) {
        p.blocks.forEach(b => selected.add(b.id));
      }
      result = null;
    }
  }

  let collapsed = GM_getValue(STORE_COLLAPSED, false);
  let currentTab = GM_getValue(STORE_TAB, 'page');
  let result = null;
  let picking = false;
  let pickText = '';

  let sectionsState = GM_getValue(STORE_SECTIONS, {});
  if (typeof sectionsState !== 'object' || sectionsState === null) sectionsState = {};

  const bulk = {
    sel: new Set(productBlocks().map(b => b.id)),
    paging: true,
    whole: false,
    limit: 0,
    catalog: CONFIG.catalogs[0].url,
    running: false,
    cancel: false,
    progress: '',
    report: null,
  };

  function saveReport() {
    try {
      GM_setValue(STORE_REPORT, bulk.report ? JSON.stringify(bulk.report) : '');
    } catch (e) {
      console.warn('[fwc] не удалось сохранить отчёт', e);
    }
  }

  try {
    const saved = GM_getValue(STORE_REPORT, '');
    if (saved) bulk.report = JSON.parse(saved);
  } catch (e) {
    bulk.report = null;
  }

  const blocksByIds = ids =>
    ids.includes('page')
      ? [CONFIG.wholePage]
      : [...productBlocks(), ...articleBlocks()].filter(b => ids.includes(b.id));

  const panel = document.createElement('div');
  panel.id = 'fwc-panel';
  document.body.appendChild(panel);

  /* ===================== ПРОВЕРКА ЭТОЙ СТРАНИЦЫ ===================== */
  function run(blocks, title) {
    clearMarks();
    const allow = getAllow();
    const found = [];
    const stats = [];

    for (const b of blocks) {
      const roots = getRoots(b);
      const st = { depth: 0 };
      roots.forEach(r => scanElement(r, allow, found, b.id, st));

      stats.push({
        id: b.id,
        name: b.name,
        count: roots.length,
        hits: found.filter(f => f.block === b.id).length,
      });
    }

    result = { found, stats, title, blocks };
    render();
  }

  function runSelected() {
    const pType = getPageType();
    if (!pType) return;
    const blocks = pType.blocks.filter(b => selected.has(b.id));
    if (blocks.length) run(blocks, pType.name);
  }

  const runWhole = () => run([CONFIG.wholePage], 'Вся страница');
  const rerun = () => result && run(result.blocks, result.title);

  /* ===================== МАССОВАЯ ПРОВЕРКА ===================== */
  async function fetchDoc(url) {
    const r = await fetch(url, { credentials: 'same-origin' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return new DOMParser().parseFromString(await r.text(), 'text/html');
  }

  const pageKey = u => {
    const x = new URL(u);
    return x.pathname + x.search;
  };

  function collectLinks(doc, baseUrl, targetPath, links, isArticles) {
    doc.querySelectorAll('a[href]').forEach(a => {
      if (a.closest(CONFIG.exclude)) return;
      let u;
      try {
        u = new URL(a.getAttribute('href'), baseUrl);
      } catch (e) {
        return;
      }
      if (u.origin !== location.origin) return;

      if (isArticles) {
        if (!/^\/news\/.+\.html$/i.test(u.pathname)) return;
      } else {
        if (!/^\/catalog\/.+\.html$/i.test(u.pathname)) return;
        if (!u.pathname.startsWith(targetPath)) return;
      }
      links.add(u.pathname);
    });
  }

  function paginationUrls(doc, baseUrl) {
    const basePath = new URL(baseUrl).pathname;
    const out = [];

    doc.querySelectorAll('a[href]').forEach(a => {
      let u;
      try {
        u = new URL(a.getAttribute('href'), baseUrl);
      } catch (e) {
        return;
      }
      if (u.origin !== location.origin || u.pathname !== basePath) return;
      if (CONFIG.bulk.paginationRe.test(u.search)) out.push(u.href);
    });

    return out;
  }

  const RAW_ALLOW = new Set();
  const visibleHits = (p, allow) => p.hits.filter(h => !isAllowedWord(h.word, allow));

  // Извлечение чистого описания и поиск слов
  function analyzeDoc(doc, path, blocks, isArticles) {
    const hits = [];
    const found = {};
    let descText = '';

    for (const b of blocks) {
      const roots = getRoots(b, doc);
      found[b.id] = roots.length > 0;
      const st = { depth: 0 };
      const tmp = [];
      roots.forEach(r => scanElement(r, RAW_ALLOW, tmp, b.id, st, false));
      tmp.forEach(t => hits.push({ block: b.id, word: t.word }));

      // Сохраняем текст только если это карточка товара (блок desc или аналогичный)
      if (!isArticles && (b.id === 'desc' || b.id === 'page')) {
        const textNodes = roots.map(r => (r.textContent || '').trim()).filter(Boolean);
        if (textNodes.length) {
          descText = textNodes.join('\n\n');
        }
      }
    }

    const h1 = doc.querySelector('h1');
    return {
      url: path,
      title: h1 ? h1.textContent.trim() : path,
      hits,
      found,
      descText,
    };
  }

  function setProgress(text) {
    bulk.progress = text;
    const el = panel.querySelector('#fwc-progress');
    if (el) el.textContent = text;
  }

  async function runBulk() {
    if (bulk.running) return;

    const isArticles = bulk.catalog.startsWith('/news/');
    let blocks = [];

    if (bulk.whole) {
      blocks = [{ id: 'page', name: isArticles ? 'Вся статья целиком' : 'Вся карточка целиком', selector: 'body' }];
    } else if (isArticles) {
      blocks = articleBlocks().filter(b => bulk.sel.has(b.id));
      if (!blocks.length) blocks = articleBlocks();
    } else {
      blocks = productBlocks().filter(b => bulk.sel.has(b.id));
    }

    if (!blocks.length) {
      bulk.progress = 'Выберите хотя бы один блок для проверки';
      render();
      return;
    }

    bulk.running = true;
    bulk.cancel = false;
    bulk.report = null;
    bulk.progress = 'Старт…';

    clearMarks();
    result = null;
    render();

    const errors = [];
    const startUrl = bulk.catalog === 'current' ? location.href : new URL(bulk.catalog, location.origin).href;
    const targetPath = new URL(startUrl).pathname;

    let sectionName;
    if (bulk.catalog === 'current') {
      const h1el = document.querySelector('h1');
      sectionName = h1el ? h1el.textContent.trim() : targetPath;
    } else {
      const cat = CONFIG.catalogs.find(c => c.url === bulk.catalog);
      sectionName = cat ? cat.name : targetPath;
    }

    try {
      const links = new Set();
      const visited = new Set([pageKey(startUrl)]);
      const queue = [];

      queue.push({
        doc: bulk.catalog === 'current' ? document : await fetchDoc(startUrl),
        url: startUrl,
      });

      let pages = 0;

      while (queue.length && !bulk.cancel) {
        const item = queue.shift();
        const doc = item.doc;
        const url = item.url;

        pages++;
        collectLinks(doc, url, targetPath, links, isArticles);

        if (bulk.paging) {
          for (const pu of paginationUrls(doc, url)) {
            const k = pageKey(pu);
            if (visited.has(k) || visited.size >= CONFIG.bulk.maxPages) continue;

            visited.add(k);
            try {
              queue.push({ doc: await fetchDoc(pu), url: pu });
            } catch (e) {
              errors.push('Страница ' + k + ': ' + e.message);
            }
            await sleep(CONFIG.bulk.delayMs);
          }
        }

        setProgress(`Сбор ссылок: страниц ${pages}, найдено ${isArticles ? 'статей' : 'товаров'}: ${links.size}`);
      }

      let urls = [...links];
      if (bulk.limit > 0) urls = urls.slice(0, bulk.limit);

      const items = [];
      let done = 0;
      let idx = 0;

      async function worker() {
        while (!bulk.cancel) {
          const i = idx++;
          if (i >= urls.length) return;

          const path = urls[i];
          try {
            items[i] = analyzeDoc(await fetchDoc(location.origin + path), path, blocks, isArticles);
          } catch (e) {
            items[i] = { url: path, title: path, hits: [], found: {}, descText: '', error: e.message };
            errors.push(path + ': ' + e.message);
          }

          done++;
          setProgress(`Проверено: ${done} из ${urls.length}`);
          await sleep(CONFIG.bulk.delayMs);
        }
      }

      await Promise.all(Array.from({ length: CONFIG.bulk.concurrency }, worker));

      bulk.report = {
        catalogName: sectionName,
        sourceUrl: startUrl,
        isArticles,
        pages,
        blocks: blocks.map(b => ({ id: b.id, name: b.name })),
        products: items.filter(Boolean),
        cancelled: bulk.cancel,
        errors,
        linksFound: links.size,
      };
    } catch (e) {
      bulk.report = {
        catalogName: sectionName,
        sourceUrl: startUrl,
        isArticles,
        pages: 0,
        blocks: blocks.map(b => ({ id: b.id, name: b.name })),
        products: [],
        cancelled: false,
        errors: [String(e && e.message ? e.message : e)],
        linksFound: 0,
      };
    }

    bulk.running = false;
    bulk.progress = '';
    saveReport();
    render();
  }

  const UNDO_MS = 8000;
  let lastExcluded = null;
  let undoTimer = null;
  let exMsg = '';

  function clearUndo() {
    clearTimeout(undoTimer);
    lastExcluded = null;
  }

  function afterAllowChange(res) {
    exMsg = '';
    clearUndo();

    if (res.added.length) {
      const mine = lastExcluded = { words: res.added, t: Date.now() };

      undoTimer = setTimeout(() => {
        if (lastExcluded !== mine) return;
        lastExcluded = null;
        const el = panel.querySelector('.fwc-undo');
        if (el) el.remove();
      }, UNDO_MS);
    }

    if (result) rerun();
    else render();
  }

  function undoExclusion() {
    if (!lastExcluded) return;
    const words = lastExcluded.words;
    clearUndo();
    words.forEach(removeWord);
    if (result) rerun();
    else render();
  }

  function exportProfile() {
    const data = {
      type: 'fwc-asko-exceptions',
      version: 1,
      exported: new Date().toISOString(),
      words: getUserWords(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'asko-russia-exceptions-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    exMsg = 'Профиль сохранён (слов: ' + data.words.length + ')';
    render();
  }

  function importProfile(file) {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      const txt = String(fr.result || '');
      let words;
      try {
        const j = JSON.parse(txt);
        words = Array.isArray(j) ? j : (Array.isArray(j.words) ? j.words : []);
      } catch (e) {
        words = txt.split(/[\s,;]+/);
      }
      const res = addWords(words.join(' '));
      exMsg = 'Загружено: новых ' + res.added.length + ' (всего в файле: ' + res.all.length + ')';
      clearUndo();
      if (result) rerun();
      else render();
    };
    fr.readAsText(file, 'utf-8');
  }

  /* ===================== ФОРМАТИРОВАНИЕ СПИСКА СЛОВ (x2, x3) ===================== */
  function formatWordsSummary(hits) {
    const counts = new Map();
    hits.forEach(h => {
      const k = h.word.toLowerCase();
      if (!counts.has(k)) {
        counts.set(k, { word: h.word, n: 0 });
      }
      counts.get(k).n++;
    });

    return [...counts.values()]
      .sort((a, b) => b.n - a.n)
      .map(item => item.n > 1 ? `${item.word} x${item.n}` : item.word)
      .join(', ');
  }

  /* ===================== ЭКСПОРТ В CSV (1 КАРТОЧКА = 1 СТРОКА) ===================== */
  function downloadCsv() {
    const rep = bulk.report;
    if (!rep) return;

    const q = v => '"' + String(v || '').replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
    const names = Object.fromEntries(rep.blocks.map(b => [b.id, b.name]));
    const allow = getAllow();

    // Заголовки таблицы: для статей колонка описания не нужна
    const headers = ['Страница', 'Название', 'Проверенные блоки', 'Найденные слова'];
    if (!rep.isArticles) {
      headers.push('Текст описания');
    }

    const rows = [headers.map(q).join(';')];

    rep.products.forEach(p => {
      const vh = visibleHits(p, allow);
      if (!vh.length) return; // Экспортируем только строки с ошибками

      const wordsFormatted = formatWordsSummary(vh);
      const blockNames = [...new Set(vh.map(h => names[h.block] || h.block))].join(', ');

      const row = [
        location.origin + p.url,
        p.title,
        blockNames,
        wordsFormatted,
      ];

      if (!rep.isArticles) {
        row.push(p.descText || '');
      }

      rows.push(row.map(q).join(';'));
    });

    const blob = new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (rep.isArticles ? 'asko-articles-' : 'asko-products-') + rep.catalogName.replace(/[^\wА-Яа-я]+/g, '_') + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  /* ===================== ОТКРЫТИЕ HTML-ОТЧЁТА ===================== */
  function openHtmlReport() {
    const rep = bulk.report;
    if (!rep) return;

    const allow = getAllow();
    const names = Object.fromEntries(rep.blocks.map(b => [b.id, b.name]));
    const prods = rep.products.map(p => ({ ...p, hits: visibleHits(p, allow) }));
    const withHits = prods.filter(p => p.hits.length);
    const totalHits = prods.reduce((s, p) => s + p.hits.length, 0);

    const map = new Map();
    withHits.forEach(p => {
      p.hits.forEach(x => {
        const k = x.word.toLowerCase();
        if (!map.has(k)) map.set(k, { word: x.word, count: 0, prods: new Set() });
        const v = map.get(k);
        v.count++;
        v.prods.add(p.url);
      });
    });
    const words = [...map.values()].sort((a, b) => b.count - a.count);

    function highlightWordsInText(text, hits) {
      if (!text) return '';
      let safe = esc(text);
      const uniqueWords = [...new Set(hits.map(h => h.word))].sort((a, b) => b.length - a.length);
      uniqueWords.forEach(w => {
        const regex = new RegExp('(\\b' + w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b)', 'gi');
        safe = safe.replace(regex, '<mark class="highlight">$1</mark>');
      });
      return safe;
    }

    let html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Отчёт: ${esc(rep.catalogName)}</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f4f6fa;color:#1e293b;margin:0;padding:24px 16px}
    .wrapper{max-width:1200px;margin:0 auto;background:#fff;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.08);padding:24px 30px}
    header{border-bottom:2px solid #e2e8f0;padding-bottom:16px;margin-bottom:20px}
    h1{font-size:22px;margin:0 0 6px;color:#0f172a}
    .meta{color:#64748b;font-size:13px}
    .stats-grid{display:flex;gap:14px;flex-wrap:wrap;margin:18px 0}
    .stat-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 18px;min-width:140px;flex:1}
    .stat-card .num{font-size:24px;font-weight:bold;color:#2563eb}
    .stat-card .label{font-size:11px;text-transform:uppercase;color:#64748b;font-weight:600;margin-top:2px}
    .words-box{margin:20px 0;background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:16px}
    .words-box h3{margin:0 0 10px;font-size:14px;color:#334155;text-transform:uppercase}
    .word-cloud{display:flex;flex-wrap:wrap;gap:8px}
    .word-badge{background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;padding:4px 10px;border-radius:16px;font-size:13px;font-weight:bold}
    .word-badge span{color:#b91c1c;font-size:11px;font-weight:normal;margin-left:4px}
    .search-input{width:100%;box-sizing:border-box;padding:12px 16px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;margin:18px 0;outline:none}
    .search-input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
    .items-list{margin-top:16px}
    .item-card{border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:14px;background:#fff;transition:border-color .15s}
    .item-card:hover{border-color:#94a3b8}
    .item-card.hidden{display:none}
    .item-title{font-size:16px;font-weight:bold;margin-bottom:8px}
    .item-title a{color:#2563eb;text-decoration:none}
    .item-title a:hover{text-decoration:underline}
    .words-line{margin:8px 0;font-size:13px;color:#b91c1c;background:#fff1f2;padding:6px 12px;border-radius:6px;display:inline-block}
    .item-text{margin-top:10px;padding:12px 16px;background:#f8fafc;border-left:4px solid #3b82f6;font-size:13px;line-height:1.6;color:#334155;border-radius:0 6px 6px 0;white-space:pre-wrap;max-height:300px;overflow-y:auto}
    mark.highlight{background:#fef08a;color:#854d0e;padding:2px 6px;border-radius:4px;font-weight:bold;margin:0 2px;border:1px solid #fde047}
    .empty-msg{padding:24px;text-align:center;color:#15803d;font-weight:bold;font-size:16px}
  </style>
</head>
<body>
  <div class="wrapper">
    <header>
      <h1>Отчёт: ${esc(rep.catalogName)} ${rep.cancelled ? '<span style="color:#ef4444;font-size:14px">(Прервано)</span>' : ''}</h1>
      <div class="meta">Сайт: <b>asko-russia.ru</b> · Проверено материалов: <b>${rep.products.length}</b> · С ошибками: <b>${withHits.length}</b></div>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="num">${rep.products.length}</div>
        <div class="label">Всего страниц</div>
      </div>
      <div class="stat-card">
        <div class="num" style="color:${withHits.length ? '#dc2626' : '#16a34a'}">${withHits.length}</div>
        <div class="label">С ошибками</div>
      </div>
      <div class="stat-card">
        <div class="num" style="color:${totalHits ? '#dc2626' : '#16a34a'}">${totalHits}</div>
        <div class="label">Всего слов</div>
      </div>
      <div class="stat-card">
        <div class="num">${words.length}</div>
        <div class="label">Уникальных слов</div>
      </div>
    </div>`;

    if (words.length) {
      html += `
    <div class="words-box">
      <h3>Топ найденных слов (${words.length}):</h3>
      <div class="word-cloud">
        ${words.map(w => `<div class="word-badge">${esc(w.word)}<span>×${w.count}</span></div>`).join('')}
      </div>
    </div>

    <input type="text" id="reportSearch" class="search-input" placeholder="🔍 Быстрый поиск по названию карточки, слову или тексту описания...">

    <div class="items-list" id="itemsList">`;

      withHits.sort((a, b) => b.hits.length - a.hits.length);

      withHits.forEach(p => {
        const wordsFormatted = formatWordsSummary(p.hits);
        const highlightedText = highlightWordsInText(p.descText || '', p.hits);

        html += `
      <div class="item-card" data-search="${esc(p.title.toLowerCase())} ${esc(p.hits.map(h => h.word).join(' ').toLowerCase())} ${esc((p.descText || '').toLowerCase())}">
        <div class="item-title"><a href="${esc(location.origin + p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a></div>
        <div class="words-line">🚨 <b>Найденные слова:</b> ${esc(wordsFormatted)}</div>
        ${highlightedText ? `<div class="item-text">${highlightedText}</div>` : ''}
      </div>`;
      });

      html += `</div>`;
    } else {
      html += `<div class="empty-msg">✔ Английских слов не найдено! Все материалы чистые.</div>`;
    }

    html += `
  </div>
  <script>
    const inp = document.getElementById('reportSearch');
    if (inp) {
      inp.addEventListener('input', () => {
        const q = inp.value.trim().toLowerCase();
        document.querySelectorAll('.item-card').forEach(el => {
          el.classList.toggle('hidden', q && !el.dataset.search.includes(q));
        });
      });
    }
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const tabUrl = URL.createObjectURL(blob);
    window.open(tabUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(tabUrl), 60000);
  }

  const sw = (attr, checked, disabled, text) =>
    `<label class="fwc-sw-row"><input type="checkbox" ${attr} ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}>` +
    `<span class="fwc-sw"></span><span class="fwc-sw-t">${text}</span></label>`;

  /* ===================== ВКЛАДКА 1: СТРАНИЦА ===================== */
  function renderTabPage() {
    let h = '';
    const pType = getPageType();

    if (pType) {
      h += `<h4>Тип страницы: ${esc(pType.name)}</h4>`;

      if (pType.id === 'catalog') {
        h += `<div class="fwc-help-tip">💡 <b>Совет:</b> чтобы проверить <u>только сам каталог</u> (описание и баннер раздела), снимите галочку с товаров.</div>`;
      } else if (pType.id === 'articles') {
        h += `<div class="fwc-help-tip">💡 <b>Совет:</b> на этой странице проверяются <u>краткие анонсы</u> статей. Чтобы робот обошёл и проверил <u>полные тексты всех статей</u>, откройте вкладку <b>«🚀 Массовая»</b>.</div>`;
      }

      h += pType.blocks.map(b => sw(`data-block="${b.id}"`, selected.has(b.id), false, esc(b.name))).join('');
      h += `<button class="fwc-btn" data-act="run">Проверить выбранные блоки</button>`;
    } else {
      h += `<h4>Эта страница</h4><p style="color:#666">Тип страницы не определён в шаблоне, можно проверить её целиком:</p>`;
    }

    h += `<button class="fwc-btn sec" data-act="whole">Проверить всю страницу целиком</button>` +
         `<button class="fwc-btn gray" data-act="clear">Сбросить подсветку</button>`;

    if (result) {
      h += `<h4>Результат проверки</h4>`;
      h += result.stats.map(s => {
        if (!s.count) return `<div class="fwc-warn">⚠ ${esc(s.name)}: блок не найден на странице</div>`;
        return `<div style="margin-bottom:3px">` +
          `<b>${esc(s.name)}</b>: проверено элементов: <b>${s.count} шт.</b> ` +
          `(найдено замечаний: <b>${s.hits}</b> ${s.hits ? '' : '<span class="fwc-ok">✔</span>'})` +
          `</div>`;
      }).join('');

      h += `<div style="margin-top:6px;font-weight:bold">Всего английских слов: ${result.found.length}</div>`;

      const map = new Map();
      result.found.forEach(f => {
        const k = f.word.toLowerCase();
        if (!map.has(k)) map.set(k, { word: f.word, count: 0, el: f.el });
        map.get(k).count++;
      });

      h += [...map.values()].map(v =>
        `<div class="fwc-row"><span class="fwc-word" data-goto="${esc(v.word)}">${esc(v.word)} <small style="color:#888">×${v.count}</small></span>` +
        `<button class="fwc-small" data-allow="${esc(v.word)}">исключить</button></div>`
      ).join('');
    }

    return h;
  }

  /* ===================== ВКЛАДКА 2: МАССОВАЯ ПРОВЕРКА ===================== */
  function renderTabBulk() {
    const isArticles = bulk.catalog.startsWith('/news/');
    let h = `<div class="fwc-help-tip">Робот обойдёт все страницы выбранного раздела, скачает полный текст каждого элемента и составит отчёт с подсветкой.</div>`;
    h += `<h4>Раздел для массового обхода:</h4>`;

    const opts = [];
    const pType = getPageType();

    if (pType && (pType.id === 'catalog' || pType.id === 'articles')) {
      const h1el = document.querySelector('h1');
      const h1text = h1el ? h1el.textContent.trim() : location.pathname;
      opts.push(`<option value="current"${bulk.catalog === 'current' ? ' selected' : ''}>Текущая страница: ${esc(h1text)}</option>`);
    }

    CONFIG.catalogs.forEach(c => {
      opts.push(`<option value="${esc(c.url)}"${bulk.catalog === c.url ? ' selected' : ''}>${esc(c.name)}</option>`);
    });

    h += `<select data-bcatalog${bulk.running ? ' disabled' : ''}>${opts.join('')}</select>`;
    h += `<h4>Что проверять внутри каждого материала:</h4>`;

    h += sw('data-bwhole', bulk.whole, bulk.running, isArticles ? '<b>Вся статья целиком</b>' : '<b>Вся карточка товара целиком</b>');

    const availableBlocks = isArticles ? articleBlocks() : productBlocks();
    h += availableBlocks.map(b =>
      sw(`data-bblock="${b.id}"`, bulk.sel.has(b.id), bulk.running || bulk.whole, esc(b.name))
    ).join('');

    h += sw('data-bpaging', bulk.paging, bulk.running, 'Обходить все страницы пагинации (1, 2, 3...)');
    h += `<label>Лимит материалов (0 — все):<input type="number" min="0" data-blimit value="${bulk.limit}"${bulk.running ? ' disabled' : ''}></label>`;

    if (bulk.running) {
      h += `<div id="fwc-progress">${esc(bulk.progress)}</div><button class="fwc-btn red" data-act="bulk-stop">Остановить</button>`;
    } else {
      if (bulk.progress) h += `<div class="fwc-warn">${esc(bulk.progress)}</div>`;
      h += `<button class="fwc-btn" data-act="bulk-run">Запустить массовую проверку</button>`;
    }

    if (bulk.report) {
      const rep = bulk.report;
      const allow = getAllow();
      const prods = rep.products.map(p => ({ ...p, hits: visibleHits(p, allow) }));
      const withHits = prods.filter(p => p.hits.length);
      const totalHits = prods.reduce((s, p) => s + p.hits.length, 0);

      h += `<h4>Отчёт: ${esc(rep.catalogName)}${rep.cancelled ? ' (остановлено)' : ''}</h4>`;
      h += `<div>Проверено материалов: <b>${rep.products.length}</b>, с замечаниями: <b>${withHits.length}</b>, слов: <b>${totalHits}</b></div>`;

      if (withHits.length) {
        h += `<button class="fwc-btn" data-act="html" style="background:#243242;border-color:#243242;margin-top:6px">🌐 Открыть HTML-отчёт с текстом и подсветкой</button>`;
        h += `<button class="fwc-btn sec" data-act="csv">📥 Скачать CSV-отчёт (1 строка на товар)</button>`;
      }
      h += `<button class="fwc-btn gray" data-act="bulk-hide">Скрыть отчёт</button>`;
    }

    return h;
  }

  /* ===================== ВКЛАДКА 3: РАЗДЕЛЫ САЙТА ===================== */
  function renderTabLinks() {
    let h = '<h4>Навигатор по каталогу Asko</h4>';
    const groups = [];
    let currentGroup = null;

    CONFIG.links.forEach(link => {
      if (link.section) {
        currentGroup = { id: link.id, name: link.name, links: [] };
        groups.push(currentGroup);
      } else {
        if (!currentGroup) {
          currentGroup = { id: '__top', name: '', links: [], noHeader: true };
          groups.push(currentGroup);
        }
        currentGroup.links.push(link);
      }
    });

    groups.forEach(g => {
      if (g.noHeader) {
        h += `<div class="fwc-links">` + g.links.map(l => `<a href="${esc(l.url)}">${esc(l.name)}</a>`).join('') + `</div>`;
      } else {
        const isCollapsed = sectionsState[g.id] !== false;
        h += `<div class="fwc-section-header${isCollapsed ? ' collapsed' : ''}" data-section="${esc(g.id)}">` +
          `<span class="fwc-arrow">▼</span> ${esc(g.name)}</div>`;
        h += `<div class="fwc-section-body fwc-links${isCollapsed ? ' hidden' : ''}">`;
        g.links.forEach(l => {
          h += `<a href="${esc(l.url)}">${esc(l.name)}</a>`;
        });
        h += `</div>`;
      }
    });

    return h;
  }

  /* ===================== ВКЛАДКА 4: СЛОВАРЬ ===================== */
  function renderTabDict() {
    const user = getUserWords();
    let h = `<div class="fwc-ex">` +
      `<div class="fwc-ex-h">Исключения (слова Asko)</div>` +
      `<div class="fwc-ex-sub">Пользовательских: <b>${user.length}</b> · встроенных: ${CONFIG.brands.length}</div>` +
      `<input type="text" class="fwc-new" placeholder="добавить слова через пробел">` +
      `<button class="fwc-btn sec" data-act="add">Добавить в исключения</button>` +
      `<div class="fwc-ex-list">` +
      (user.length
        ? user.slice().reverse().map(w =>
            `<div class="fwc-row"><span>${esc(w)}</span><button class="fwc-small fwc-ret" data-del="${esc(w)}">↩ Вернуть</button></div>`
          ).join('')
        : `<div style="color:#888;padding:4px 0">Своих исключений пока нет</div>`) +
      `</div></div>`;

    h += `<h4>Резервная копия словаря</h4>` +
         `<button class="fwc-btn gray" data-act="ex-export">⬇ Сохранить исключения в файл</button>` +
         `<button class="fwc-btn gray" data-act="ex-import">⬆ Загрузить исключения из файла</button>` +
         `<input type="file" class="fwc-import" accept=".json,.txt" style="display:none">` +
         (exMsg ? `<div class="fwc-ok" style="margin-top:4px">${esc(exMsg)}</div>` : '');

    h += `<h4>Инструменты</h4><button class="fwc-btn gray" data-act="pick">🔍 Узнать класс блока (клик по странице)</button>`;
    if (pickText) h += `<textarea readonly>${esc(pickText)}</textarea>`;

    return h;
  }

  /* ===================== ОСНОВНОЙ РЕНДЕР ===================== */
  function render() {
    ensureSelected();

    let tabs = `
      <div id="fwc-tabs">
        <button class="fwc-tab-btn ${currentTab === 'page' ? 'active' : ''}" data-tab="page">📄 Страница</button>
        <button class="fwc-tab-btn ${currentTab === 'bulk' ? 'active' : ''}" data-tab="bulk">🚀 Массовая</button>
        <button class="fwc-tab-btn ${currentTab === 'links' ? 'active' : ''}" data-tab="links">📂 Разделы</button>
        <button class="fwc-tab-btn ${currentTab === 'dict' ? 'active' : ''}" data-tab="dict">⚙ Словарь</button>
      </div>
    `;

    let content = '';
    if (currentTab === 'page') content = renderTabPage();
    else if (currentTab === 'bulk') content = renderTabBulk();
    else if (currentTab === 'links') content = renderTabLinks();
    else if (currentTab === 'dict') content = renderTabDict();

    let undo = '';
    if (lastExcluded) {
      const w = lastExcluded.words;
      undo = `<div class="fwc-undo"><span>Исключено: <b>${esc(w.slice(0, 3).join(', '))}</b></span>` +
        `<button data-act="undo">↩ Вернуть</button><button data-act="undo-close">✕</button></div>`;
    }

    const keepScroll = panel.scrollTop;
    panel.innerHTML =
      `<header data-act="collapse">
         <span><b>Asko Check</b> <span class="fwc-badge">v${SCRIPT_VERSION}</span></span>
         <span style="font-size:11px">${collapsed ? '▲ Развернуть' : '▼ Свернуть'}</span>
       </header>` +
      `<div id="fwc-body" style="display:${collapsed ? 'none' : 'block'}">${tabs}${undo}${content}</div>`;
    panel.scrollTop = keepScroll;
  }

  /* ===================== ОБРАБОТЧИКИ ===================== */
  panel.addEventListener('change', e => {
    if (e.target.classList && e.target.classList.contains('fwc-import')) {
      importProfile(e.target.files[0]);
      return;
    }
    const d = e.target.dataset || {};
    if (d.block) {
      e.target.checked ? selected.add(d.block) : selected.delete(d.block);
    } else if (d.bblock) {
      e.target.checked ? bulk.sel.add(d.bblock) : bulk.sel.delete(d.bblock);
    } else if ('bwhole' in d) {
      bulk.whole = e.target.checked;
      render();
    } else if ('bpaging' in d) {
      bulk.paging = e.target.checked;
    } else if ('blimit' in d) {
      bulk.limit = Math.max(0, parseInt(e.target.value, 10) || 0);
    } else if ('bcatalog' in d) {
      bulk.catalog = e.target.value;
      const isArt = bulk.catalog.startsWith('/news/');
      bulk.sel.clear();
      (isArt ? articleBlocks() : productBlocks()).forEach(b => bulk.sel.add(b.id));
      render();
    }
  });

  panel.addEventListener('click', e => {
    const t = e.target.closest('[data-act],[data-tab],[data-allow],[data-del],[data-goto],[data-section]');
    if (!t) return;
    const d = t.dataset;

    if (d.tab) {
      currentTab = d.tab;
      GM_setValue(STORE_TAB, currentTab);
      render();
    } else if (d.section) {
      sectionsState[d.section] = sectionsState[d.section] === false;
      GM_setValue(STORE_SECTIONS, sectionsState);
      render();
    } else if (d.act === 'collapse') {
      collapsed = !collapsed;
      GM_setValue(STORE_COLLAPSED, collapsed);
      render();
    } else if (d.act === 'run') {
      runSelected();
    } else if (d.act === 'whole') {
      runWhole();
    } else if (d.act === 'clear') {
      clearMarks();
      result = null;
      render();
    } else if (d.act === 'add') {
      const blk = t.closest('.fwc-ex');
      const inp = blk && blk.querySelector('.fwc-new');
      if (inp && inp.value.trim()) afterAllowChange(addWords(inp.value));
    } else if (d.act === 'undo') {
      undoExclusion();
    } else if (d.act === 'undo-close') {
      clearUndo();
      render();
    } else if (d.act === 'ex-export') {
      exportProfile();
    } else if (d.act === 'ex-import') {
      const f = panel.querySelector('.fwc-import');
      if (f) f.click();
    } else if (d.act === 'pick') {
      picking = true;
      document.body.classList.add('fwc-picking');
      pickText = 'Кликните по нужному элементу на странице…';
      render();
    } else if (d.act === 'bulk-run') {
      runBulk();
    } else if (d.act === 'bulk-stop') {
      bulk.cancel = true;
      setProgress('Останавливаю…');
    } else if (d.act === 'bulk-hide') {
      bulk.report = null;
      saveReport();
      render();
    } else if (d.act === 'html') {
      openHtmlReport();
    } else if (d.act === 'csv') {
      downloadCsv();
    } else if (d.allow) {
      afterAllowChange(addWords(d.allow));
    } else if (d.del) {
      removeWord(d.del);
      clearUndo();
      exMsg = '';
      if (result) rerun();
      else render();
    } else if (d.goto && result) {
      const hit = result.found.find(f => f.word === d.goto);
      if (hit) hit.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  document.addEventListener('click', e => {
    if (!picking || e.target.closest('#fwc-panel')) return;
    e.preventDefault();
    e.stopPropagation();
    picking = false;
    document.body.classList.remove('fwc-picking');

    const path = [];
    let el = e.target;
    for (let i = 0; i < 6 && el && el !== document.body; i++, el = el.parentElement) {
      const cls = el.classList.length ? '.' + [...el.classList].join('.') : '';
      path.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + cls);
    }
    pickText = path.join('\n← ');
    currentTab = 'dict';
    render();
  }, true);

  console.log(
    `%c[Asko Check v${SCRIPT_VERSION}] Скрипт запущен! Страница: ${location.pathname}`,
    'background:#243242;color:#00ff88;font-size:12px;font-weight:bold;padding:4px 8px;border-radius:4px;'
  );

  render();
})();
