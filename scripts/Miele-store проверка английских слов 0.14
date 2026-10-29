// ==UserScript==
// @name         Miele-store: проверка английских слов
// @namespace    miele-store-content-check
// @version      0.14
// @description  Поиск английских слов: текущая страница, блоки карточки, массовая проверка всех карточек каталога
// @match        *://miele-store.ru/*
// @match        *://www.miele-store.ru/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  /* =====================================================================
     НАСТРОЙКИ
  ===================================================================== */
  const CONFIG = {
    links: [
      // === ГЛАВНЫЕ ССЫЛКИ (всегда видны) ===
      { name: 'Главная', url: '/' },
      { name: 'Карточка (пример)', url: '/market/washing-machine/frontalnaya-zagruzka/stiralnaya-mashina-miele-wei865-wps.html' },
      { name: 'Статьи', url: '/articles/' },
      { name: 'Глоссарий', url: '/glossary/' },
      { name: 'Отзывы магазина', url: '/reviews-store/' },
      { name: 'Акции', url: '/sales/' },
      { name: 'Рейтинги', url: '/ratings/reytingi-tekhniki-miele-2026-goda/' },

      // === МИР MIELE И СЕРВИС ===
      { name: 'Мир Miele и сервис', section: true, id: 'info' },
      { name: 'Глоссарий', url: '/glossary/' },
      { name: 'Шоу-рум', url: '/showroom/' },
      { name: 'Дизайнерам', url: '/dizayneram/' },
      { name: 'О Miele', url: '/about/' },
      { name: 'Доставка и оплата', url: '/delivery/' },
      { name: 'Подключение', url: '/podklyuchenie/' },
      { name: 'Гарантия', url: '/garantiya/' },
      { name: 'Инструкции', url: '/instructions/' },
      { name: 'Сервис', url: '/service/' },
      { name: 'Ремонт Miele', url: '/remont-miele/' },
      { name: 'Возврат и обмен', url: '/vozvrat/' },
      { name: 'Подборщик пылесосов', url: '/market/pylesosy/podbor/' },
      { name: 'Видео', url: '/video/' },
      { name: 'Контакты', url: '/contacts/' },

      // === СТИРАЛЬНАЯ И СУШИЛЬНАЯ ТЕХНИКА ===
      { name: 'Стиральная и сушильная техника', section: true, id: 'laundry' },
      { name: 'Стиральные машины', url: '/market/washing-machine/' },
      { name: 'Сушильные шкафы', url: '/market/sushilnye-shkafi/' },
      { name: 'Сушильные машины', url: '/market/sushilnye-mashiny/' },
      { name: 'Гладильные машины', url: '/market/gladilnye-mashiny/' },
      { name: 'Комплекты В/С', url: '/market/complects-miele/' },

      // === ВСТРАИВАЕМАЯ ТЕХНИКА ДЛЯ КУХНИ ===
      { name: 'Встраиваемая техника для кухни', section: true, id: 'kitchen' },
      { name: 'Духовые шкафы', url: '/market/duhovie-shkafy/' },
      { name: 'Посудомоечные машины', url: '/market/posudomojki/' },
      { name: 'Вытяжки', url: '/market/vytyazhki/' },
      { name: 'Пароварки', url: '/market/parovarki/' },
      { name: 'Микроволновые печи', url: '/market/mikrovolnovye-pechi/' },
      { name: 'Подогреватели посуды', url: '/market/podogrevateli/' },
      { name: 'Варочные центры', url: '/market/varochhnie-centri/' },
      { name: 'Варочные панели', url: '/market/varochnie-paneli/', hasSub: true, subId: 'varochnie' },
      { name: '└ Все варочные панели', url: '/market/varochnie-paneli/', sub: true, parent: 'varochnie' },
      { name: '└ Рекомендации', url: '/market/varochnie-paneli/recommend/', sub: true, parent: 'varochnie' },
      { name: '└ Серые варочные панели', url: '/market/varochnie-paneli/recommend/serye-varochnye-paneli/', sub: true, parent: 'varochnie' },

      // === ОТДЕЛЬНОСТОЯЩАЯ ТЕХНИКА ===
      { name: 'Отдельностоящая техника', section: true, id: 'standalone' },
      { name: 'Кофемашины', url: '/market/kofemashiny/' },
      { name: 'Холодильники', url: '/market/holodilniki/' },
      { name: 'Винные шкафы', url: '/market/vinnye-shkafy/' },
      { name: 'Пылесосы', url: '/market/pylesosy/', hasSub: true, subId: 'pylesosy' },
      { name: '└ Без мешка (Blizzard)', url: '/market/pylesosy/bezmeshkovye-pylesosy/', sub: true, parent: 'pylesosy' },
      { name: '└ Серия Classic C1', url: '/market/pylesosy/seriya-classic-c/', sub: true, parent: 'pylesosy' },
      { name: '└ Вертикальные беспроводные', url: '/market/pylesosy/vertikalnye-besprovodnye/', sub: true, parent: 'pylesosy' },
      { name: '└ Роботы-пылесосы', url: '/market/pylesosy/robotpylesos1/', sub: true, parent: 'pylesosy' },
      { name: '└ Серия Complete C3 (S8)', url: '/market/pylesosy/seriya-complete-c3-s8/', sub: true, parent: 'pylesosy' },
      { name: '└ Серия Guard M1', url: '/market/pylesosy/pylesosy-serii-guard-m1/', sub: true, parent: 'pylesosy' },

      // === АКСЕССУАРЫ И СРЕДСТВА ===
      { name: 'Аксессуары и средства', section: true, id: 'accessories' },
      { name: 'Аксессуары', url: '/market/aksessuary/' },
      { name: 'Моющие и чистящие средства', url: '/market/moyushchie-i-chistyashchie-sredstva/' },

      // === ПРОФЕССИОНАЛЬНАЯ ТЕХНИКА ===
      { name: 'Профессиональная техника', section: true, id: 'professional' },
      { name: 'Проф. стиральные машины', url: '/market/professionalnye-stiralnye-mashiny/' },
      { name: 'Проф. сушильные машины', url: '/market/professionalnye-sushilnye-mashiny/' },
      { name: 'Проф. посудомоечные', url: '/market/professionalnye-posudomoechnye-mashiny/' },
    ],

    catalogs: [
      { name: 'Стиральные машины', url: '/market/washing-machine/' },
      { name: 'Сушильные шкафы', url: '/market/sushilnye-shkafi/' },
      { name: 'Сушильные машины', url: '/market/sushilnye-mashiny/' },
      { name: 'Гладильные машины', url: '/market/gladilnye-mashiny/' },
      { name: 'Комплекты', url: '/market/complects-miele/' },
      { name: 'Духовые шкафы', url: '/market/duhovie-shkafy/' },
      { name: 'Варочные панели', url: '/market/varochnie-paneli/' },
      { name: 'Посудомоечные машины', url: '/market/posudomojki/' },
      { name: 'Вытяжки', url: '/market/vytyazhki/' },
      { name: 'Пароварки', url: '/market/parovarki/' },
      { name: 'Кофемашины', url: '/market/kofemashiny/' },
      { name: 'Микроволновые печи', url: '/market/mikrovolnovye-pechi/' },
      { name: 'Варочные центры', url: '/market/varochhnie-centri/' },
      { name: 'Холодильники', url: '/market/holodilniki/' },
      { name: 'Пылесосы', url: '/market/pylesosy/' },
      { name: 'Аксессуары', url: '/market/aksessuary/' },
      { name: 'Моющие и чистящие средства', url: '/market/moyushchie-i-chistyashchie-sredstva/' },
      { name: 'Профессиональные стиральные', url: '/market/professionalnye-stiralnye-mashiny/' },
      { name: 'Профессиональные сушильные', url: '/market/professionalnye-sushilnye-mashiny/' },
      { name: 'Профессиональные посудомоечные', url: '/market/professionalnye-posudomoechnye-mashiny/' },
    ],

    bulk: {
      concurrency: 3,
      delayMs: 250,
      maxPages: 100,
      paginationRe: /(?:PAGEN_\d+|[?&]page|[?&]PAGE)=\d+/i,
    },

    exclude: [
      'header', 'footer', 'nav', 'script', 'style', 'noscript', 'textarea', 'select',
      '#fwc-panel', '[class*="cookie"]', '.card-type-and-title__title', '.page-title',
      '.characteristics__section-title', '.characteristics__sub-info',
      '.product-reviews__title', '.questions__title', '.sidebar-documentation__title',
      '.sidebar-options__subtitle', '.sidebar-credit__product-type',
    ].join(', '),

    wholePage: { id: 'page', name: 'Вся страница', selector: 'body' },

    pages: [
      {
        id: 'product',
        name: 'Карточка товара',
        urlRe: /^\/market\/.+\.html$/,
        blocks: [
          { id: 'desc', name: 'Описание', selector: '.product-description' },
          { id: 'specs', name: 'Технические характеристики', selector: '.characteristics__inner' },
          { id: 'reviews', name: 'Отзывы', selector: '.product-reviews' },
          {
            id: 'overs',
            name: 'Обзоры',
            heading: /^Обзор/i,
            stop: /^(С этим товаром|Вопросы и ответы|О бренде)/i,
          },
          {
            id: 'after',
            name: 'Текст после обзоров',
            heading: /^О бренде/i,
            stop: /^(Аксессуары|Видео о|Мы помним|Ответы на часто)/i,
          },
        ],
      },
      {
        id: 'catalog',
        name: 'Каталог',
        urlRe: /^\/market\//,
        blocks: [
          { id: 'cards', name: 'Карточки товаров на экране', selector: '[class*="product-card"], [class*="catalog-item"]' },
        ],
      },
      {
        id: 'article',
        name: 'Статья',
        urlRe: /^\/articles\/.+/,
        blocks: [
          { id: 'text', name: 'Текст статьи', selector: 'article, [class*="article__content"], [class*="article-content"]' },
        ],
      },
      {
        id: 'articles',
        name: 'Статьи (список)',
        urlRe: /^\/articles\/?$/,
        blocks: [
          { id: 'cards', name: 'Карточки статей', selector: '[class*="article-card"], [class*="article-item"]' },
        ],
      },
      {
        id: 'glossary',
        name: 'Глоссарий',
        urlRe: /^\/glossary/,
        blocks: [
          { id: 'text', name: 'Текст глоссария', selector: 'article, [class*="glossary"], main' },
        ],
      },
      {
        id: 'reviews',
        name: 'Отзывы',
        urlRe: /^\/reviews/,
        blocks: [
          { id: 'cards', name: 'Отзывы', selector: '[class*="review-card"], [class*="review-item"], [class*="reviews__item"]' },
        ],
      },
      {
        id: 'sales',
        name: 'Акции',
        urlRe: /^\/sales/,
        blocks: [
          { id: 'cards', name: 'Карточки акций', selector: '[class*="sale-card"], [class*="sales-item"], [class*="promo-card"]' },
        ],
      },
      {
        id: 'ratings',
        name: 'Рейтинги',
        urlRe: /^\/ratings\//,
        blocks: [
          { id: 'text', name: 'Текст рейтинга', selector: 'article, [class*="rating-content"], [class*="ratings__content"]' },
        ],
      },
      {
        id: 'home',
        name: 'Главная страница',
        urlRe: /^\/?$/,
        blocks: [
          { id: 'main', name: 'Основной контент', selector: 'main, [role="main"]' },
        ],
      },
    ],

    brands: [
      'Miele', 'Kvalitet', 'Trade', 'Artplay',
      'TwinDos', 'PowerWash', 'QuickPowerWash', 'CapDosing', 'AddLoad',
      'EcoFeedback', 'DirectSensor', 'ProfiEco', 'AutoClean', 'AllergoWash',
      'PreIroning', 'SingleWash', 'SoftSteam', 'StainRemoval', 'UltraPhase',
      'UltraColor', 'WoolCare', 'FragranceDos', 'Waterproof', 'MasterCool',
      'Dialog', 'Edition', 'Chrome', 'White', 'Lotus', 'Nova', 'Gala',
      'Side-by-Side', 'Wi-Fi', 'WiFi', 'USB', 'HDMI', 'LED', 'LCD', 'TFT',
      'jpg', 'pdf', 'mb', 'kb',
    ],

    forceFlag: ['wok'],
    ignoreWordsWithDigits: true,
    ignoreInParentheses: true,
    ignoreUrlsAndEmails: true,
    minLength: 2,
  };

  /* ===================================================================== */

  const STORE_ALLOW = 'fwc_allowlist';
  const STORE_COLLAPSED = 'fwc_collapsed';
  const STORE_SECTIONS = 'fwc_sections';
  const STORE_REPORT = 'fwc_report';
  const STORE_OPEN = 'fwc_open';
  const LS_BACKUP = 'fwc_allowlist_backup';

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
    String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c]));

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  GM_addStyle(`
    #fwc-panel{position:fixed;right:16px;bottom:16px;z-index:2147483647;width:360px;max-height:84vh;overflow:auto;background:#fff;color:#222;font:13px/1.4 Arial,sans-serif;border:1px solid #888;border-radius:8px;box-shadow:0 4px 18px rgba(0,0,0,.3)}
    #fwc-panel *{box-sizing:border-box}
    #fwc-panel header{padding:8px 10px;background:#333;color:#fff;cursor:pointer;display:flex;justify-content:space-between;position:sticky;top:0;z-index:1}
    #fwc-body{padding:10px}
    #fwc-panel h4{margin:12px 0 4px;font-size:11px;color:#777;text-transform:uppercase;letter-spacing:.04em}
    #fwc-panel label{display:block;margin:3px 0;cursor:pointer}
    #fwc-panel label.fwc-sw-row{display:flex!important;align-items:center;gap:10px;margin:7px 0;cursor:pointer}
    #fwc-panel .fwc-sw-row input{position:absolute!important;opacity:0!important;width:0!important;height:0!important;margin:0!important;pointer-events:none}
    #fwc-panel .fwc-sw{flex:none;display:block;width:38px;height:22px;border-radius:11px;background:#bbb!important;position:relative;transition:background .15s}
    #fwc-panel .fwc-sw::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s;box-shadow:0 1px 3px rgba(0,0,0,.35)}
    #fwc-panel .fwc-sw-row input:checked + .fwc-sw{background:#2d7ff9!important}
    #fwc-panel .fwc-sw-row input:checked + .fwc-sw::after{left:19px}
    #fwc-panel .fwc-sw-row input:disabled + .fwc-sw{opacity:.45}
    #fwc-panel .fwc-sw-t{flex:1}
    #fwc-panel button{cursor:pointer;font:inherit}
    #fwc-panel select,#fwc-panel input[type=number],#fwc-panel input[type=text]{width:100%;padding:5px;border:1px solid #bbb;border-radius:4px;margin:3px 0;font:inherit}
    .fwc-btn{width:100%;padding:7px;margin:3px 0;border:1px solid #2d7ff9;background:#2d7ff9;color:#fff;border-radius:4px}
    .fwc-btn.sec{background:#fff;color:#2d7ff9}
    .fwc-btn.gray{background:#f2f2f2;color:#333;border-color:#ccc}
    .fwc-btn.red{background:#d33;border-color:#d33}
    .fwc-links a{display:inline-block;margin:2px 8px 2px 0;color:#2d7ff9}
    .fwc-row{display:flex;justify-content:space-between;align-items:center;gap:6px;padding:3px 0;border-bottom:1px dashed #ddd}
    .fwc-word{cursor:pointer;color:#c00;word-break:break-all}
    .fwc-small{padding:1px 6px;border:1px solid #bbb;background:#f7f7f7;border-radius:3px;font-size:11px;white-space:nowrap}
    .fwc-warn{color:#b36b00}
    .fwc-ok{color:#2a8a2a}
    .fwc-prod{padding:5px 0;border-bottom:1px solid #eee}
    .fwc-prod a{color:#2d7ff9;font-weight:bold}
    .fwc-prod small{color:#555;display:block}
    #fwc-progress{margin:6px 0;padding:6px;background:#eef5ff;border-radius:4px}
    #fwc-panel textarea{width:100%;height:70px;font:11px monospace}
    #fwc-panel .fwc-ex{margin:12px 0;padding:8px;border:1px solid #ddd;border-radius:6px;background:#fafafa}
    #fwc-panel .fwc-ex-h{font-weight:bold;color:#444;font-size:12px;margin-bottom:2px}
    #fwc-panel .fwc-ex-sub{font-size:11px;color:#666;margin:3px 0}
    #fwc-panel .fwc-ex-list{max-height:150px;overflow:auto;background:#fff;border:1px solid #e3e3e3;border-radius:4px;padding:2px 6px;margin:4px 0}
    #fwc-panel .fwc-ret{border-color:#bbb;color:#444;background:#f7f7f7}
    #fwc-panel .fwc-undo{position:sticky;top:34px;z-index:1;display:flex;align-items:center;gap:6px;padding:6px 8px;margin:0 0 8px;background:#2b8a3e;color:#fff;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,.3)}
    #fwc-panel .fwc-undo{overflow:hidden}
    #fwc-panel .fwc-undo span{flex:1;word-break:break-all}
    #fwc-panel .fwc-undo i{position:absolute;left:0;bottom:0;height:3px;width:100%;background:rgba(255,255,255,.7);transform-origin:left;animation:fwcShrink linear forwards}
    @keyframes fwcShrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}
    #fwc-panel .fwc-undo button{background:#fff;color:#2b8a3e;border:0;border-radius:4px;padding:3px 8px;font-weight:bold}
    mark.fwc-mark{background:#ffe600!important;color:#000!important;outline:1px solid #e0a000;border-radius:2px}
    body.fwc-picking,body.fwc-picking *{cursor:crosshair!important}

    /* === Сворачиваемые секции === */
    .fwc-section-header{display:flex;align-items:center;gap:6px;padding:5px 8px;margin:8px 0 2px;background:#eef2f7;border:1px solid #d0d8e4;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;color:#3a5070;text-transform:uppercase;letter-spacing:.03em;user-select:none}
    .fwc-section-header:hover{background:#e0e8f2}
    .fwc-section-header .fwc-arrow{transition:transform .15s;font-size:10px;color:#888}
    .fwc-section-header.collapsed .fwc-arrow{transform:rotate(-90deg)}
    .fwc-section-body{padding:2px 0 2px 4px}
    .fwc-section-body.hidden{display:none}
    .fwc-sub-item{padding-left:14px!important;color:#6a8ab5!important;font-size:12px!important}
    .fwc-parent-item{font-weight:bold;color:#333!important}
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
          const hasForced = CONFIG.forceFlag && CONFIG.forceFlag.some(f => new RegExp('\\b' + f + '\\b', 'i').test(n.nodeValue));
          if (!hasForced) return NodeFilter.FILTER_REJECT;
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

  /* ===================== ПОИСК БЛОКОВ ===================== */

  function getRoots(block, doc = document) {
    if (block.selector) {
      const els = [...doc.querySelectorAll(block.selector)].filter(e => !e.closest('#fwc-panel'));
      return els.filter(a => !els.some(b => b !== a && b.contains(a)));
    }

    if (block.heading) {
      const head = [...doc.querySelectorAll('h1,h2,h3,h4')].find(
        h => !h.closest('#fwc-panel') && block.heading.test(h.textContent.trim())
      );

      if (!head) return [];

      const roots = [head];
      let sib = head.nextElementSibling;

      while (sib) {
        if (block.stop && block.stop.test(sib.textContent.trim().slice(0, 80))) break;
        roots.push(sib);
        sib = sib.nextElementSibling;
      }

      return roots;
    }

    return [];
  }

  /* ===================== СОСТОЯНИЕ ===================== */

  const pageType = CONFIG.pages.find(p => p.urlRe.test(location.pathname)) || null;
  const productBlocks = () => CONFIG.pages.find(p => p.id === 'product').blocks;

  const selected = new Set(pageType ? pageType.blocks.map(b => b.id) : []);
  let collapsed = GM_getValue(STORE_COLLAPSED, false);
  let result = null;
  let picking = false;
  let pickText = '';

  // Состояние сворачивания секций ссылок
  let sectionsState = GM_getValue(STORE_SECTIONS, {});
  if (typeof sectionsState !== 'object' || sectionsState === null) sectionsState = {};

  const isCatalogPage = pageType && pageType.id === 'catalog';

  const bulk = {
    sel: new Set(productBlocks().map(b => b.id)),
    paging: true,
    whole: false,
    limit: 0,
    catalog: isCatalogPage ? 'current' : CONFIG.catalogs[0].url,
    running: false,
    cancel: false,
    progress: '',
    report: null,
  };

  let openedFromReport = false;

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
      : productBlocks().filter(b => ids.includes(b.id));

  const panel = document.createElement('div');
  panel.id = 'fwc-panel';
  document.body.appendChild(panel);

  /* ===================== ПРОВЕРКА ТЕКУЩЕЙ СТРАНИЦЫ ===================== */

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
        blocks: roots.length,
        hits: found.filter(f => f.block === b.id).length,
      });
    }

    result = { found, stats, title, blocks };
    render();
  }

  function runSelected() {
    if (!pageType) return;
    const blocks = pageType.blocks.filter(b => selected.has(b.id));
    if (blocks.length) run(blocks, pageType.name);
  }

  const runWhole = () => run([CONFIG.wholePage], 'Вся страница');
  const rerun = () => result && run(result.blocks, result.title);

  /* ===================== МАССОВАЯ ПРОВЕРКА КАТАЛОГА ===================== */

  async function fetchDoc(url) {
    const r = await fetch(url, { credentials: 'same-origin' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return new DOMParser().parseFromString(await r.text(), 'text/html');
  }

  const pageKey = u => {
    const x = new URL(u);
    return x.pathname + x.search;
  };

  function collectProducts(doc, baseUrl, catalogPath, links) {
    doc.querySelectorAll('a[href]').forEach(a => {
      if (a.closest(CONFIG.exclude)) return;

      let u;
      try {
        u = new URL(a.getAttribute('href'), baseUrl);
      } catch (e) {
        return;
      }

      if (u.origin !== location.origin) return;
      if (!/^\/market\/.+\.html$/.test(u.pathname)) return;
      if (!u.pathname.startsWith(catalogPath)) return;

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

  function analyzeDoc(doc, path, blocks) {
    const hits = [];
    const found = {};

    for (const b of blocks) {
      const roots = getRoots(b, doc);
      found[b.id] = roots.length > 0;

      const st = { depth: 0 };
      const tmp = [];

      roots.forEach(r => scanElement(r, RAW_ALLOW, tmp, b.id, st, false));
      tmp.forEach(t => hits.push({ block: b.id, word: t.word }));
    }

    const h1 = doc.querySelector('h1');

    return {
      url: path,
      title: h1 ? h1.textContent.trim() : path,
      hits,
      found,
    };
  }

  function setProgress(text) {
    bulk.progress = text;
    const el = panel.querySelector('#fwc-progress');
    if (el) el.textContent = text;
  }

  async function runBulk() {
    if (bulk.running) return;

    const blocks = bulk.whole
      ? [{ id: 'page', name: 'Вся карточка целиком', selector: 'body' }]
      : productBlocks().filter(b => bulk.sel.has(b.id));

    if (!blocks.length) {
      bulk.progress = 'Выберите хотя бы один блок карточки';
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
    const catalogPath = new URL(startUrl).pathname;

    let catalogName;
    if (bulk.catalog === 'current') {
      const h1el = document.querySelector('h1');
      catalogName = h1el ? h1el.textContent.trim() : catalogPath;
    } else {
      const cat = CONFIG.catalogs.find(c => c.url === bulk.catalog);
      catalogName = cat ? cat.name : catalogPath;
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
        collectProducts(doc, url, catalogPath, links);

        if (bulk.paging) {
          for (const pu of paginationUrls(doc, url)) {
            const k = pageKey(pu);
            if (visited.has(k) || visited.size >= CONFIG.bulk.maxPages) continue;

            visited.add(k);

            try {
              queue.push({ doc: await fetchDoc(pu), url: pu });
            } catch (e) {
              errors.push('Страница каталога ' + k + ': ' + e.message);
            }

            await sleep(CONFIG.bulk.delayMs);
          }
        }

        setProgress(`Сбор карточек: страниц каталога ${pages}, найдено ${links.size}`);
      }

      let urls = [...links];
      if (bulk.limit > 0) urls = urls.slice(0, bulk.limit);

      const products = [];
      let done = 0;
      let idx = 0;

      async function worker() {
        while (!bulk.cancel) {
          const i = idx++;
          if (i >= urls.length) return;

          const path = urls[i];

          try {
            products[i] = analyzeDoc(await fetchDoc(location.origin + path), path, blocks);
          } catch (e) {
            products[i] = { url: path, title: path, hits: [], found: {}, error: e.message };
            errors.push(path + ': ' + e.message);
          }

          done++;
          setProgress(`Проверено карточек: ${done} из ${urls.length}`);
          await sleep(CONFIG.bulk.delayMs);
        }
      }

      await Promise.all(Array.from({ length: CONFIG.bulk.concurrency }, worker));

      bulk.report = {
        catalogName,
        sourceUrl: startUrl,
        pages,
        blocks: blocks.map(b => ({ id: b.id, name: b.name })),
        products: products.filter(Boolean),
        cancelled: bulk.cancel,
        errors,
        linksFound: links.size,
      };
    } catch (e) {
      bulk.report = {
        catalogName,
        sourceUrl: startUrl,
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
      type: 'fwc-exceptions',
      version: 1,
      exported: new Date().toISOString(),
      words: getUserWords(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'miele-store-exceptions-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(a.href), 5000);

    exMsg = 'Профиль сохранён в файл (слов: ' + data.words.length + ')';
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
      exMsg = 'Загружено из файла: новых слов ' + res.added.length + ' (всего в файле: ' + res.all.length + ')';
      clearUndo();

      if (result) rerun();
      else render();
    };

    fr.readAsText(file, 'utf-8');
  }

  function downloadCsv() {
    const rep = bulk.report;
    if (!rep) return;

    const q = v => '"' + String(v).replace(/"/g, '""') + '"';
    const names = Object.fromEntries(rep.blocks.map(b => [b.id, b.name]));
    const rows = [['Страница', 'Название', 'Блок', 'Слово', 'Количество'].map(q).join(';')];
    const allow = getAllow();

    rep.products.forEach(p => {
      const agg = new Map();

      visibleHits(p, allow).forEach(h => {
        const k = h.block + '|' + h.word.toLowerCase();
        if (!agg.has(k)) agg.set(k, { block: h.block, word: h.word, n: 0 });
        agg.get(k).n++;
      });

      agg.forEach(v => {
        rows.push([location.origin + p.url, p.title, names[v.block] || v.block, v.word, v.n].map(q).join(';'));
      });
    });

    const blob = new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'english-words-' + rep.catalogName.replace(/[^\wА-Яа-я]+/g, '_') + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  /* ===================== ПАНЕЛЬ ===================== */

  function renderBulkReport() {
    const rep = bulk.report;
    if (!rep) return '';

    const names = Object.fromEntries(rep.blocks.map(b => [b.id, b.name]));
    const allow = getAllow();
    const prods = rep.products.map(p => ({ ...p, hits: visibleHits(p, allow) }));
    const withHits = prods.filter(p => p.hits.length);
    const totalHits = prods.reduce((s, p) => s + p.hits.length, 0);

    let h = `<h4>Отчёт: ${esc(rep.catalogName)}${rep.cancelled ? ' (остановлено)' : ''}</h4>`;
    h += `<div>Проверено карточек: <b>${rep.products.length}</b> (страниц каталога: ${rep.pages})</div>`;
    h += `<div>С английскими словами: <b>${withHits.length}</b>, всего слов: <b>${totalHits}</b></div>`;

    if (!rep.linksFound) {
      h += `<div class="fwc-warn">⚠ Ссылки на карточки не найдены. Откройте каталог, где видны товары, и запустите с пункта «Текущая страница».</div>`;
    }

    if (rep.errors.length) {
      h += `<div class="fwc-warn">⚠ Ошибок загрузки: ${rep.errors.length} (подробности в консоли F12)</div>`;
      console.warn('[fwc] ошибки:', rep.errors);
    }

    h += `<div style="margin-top:4px;color:#555">Блок найден в карточках: ` +
      rep.blocks.map(b => `${esc(b.name)} — ${rep.products.filter(p => p.found[b.id]).length}`).join('; ') +
      `</div>`;

    const map = new Map();

    withHits.forEach(p => {
      p.hits.forEach(x => {
        const k = x.word.toLowerCase();
        if (!map.has(k)) map.set(k, { word: x.word, n: 0, prods: new Set() });
        const v = map.get(k);
        v.n++;
        v.prods.add(p.url);
      });
    });

    const words = [...map.values()].sort((a, b) => b.n - a.n);

    if (words.length) {
      h += `<h4>Слова (топ ${Math.min(40, words.length)} из ${words.length})</h4>`;
      h += words.slice(0, 40).map(v =>
        `<div class="fwc-row"><span style="word-break:break-all"><b>${esc(v.word)}</b> <small style="color:#888">×${v.n}, карточек: ${v.prods.size}</small></span>` +
        `<button class="fwc-small" data-ballow="${esc(v.word)}">исключить</button></div>`
      ).join('');
    }

    h += renderExceptions();

    if (withHits.length) {
      withHits.sort((a, b) => b.hits.length - a.hits.length);
      h += `<h4>Карточки с находками (${Math.min(100, withHits.length)} из ${withHits.length})</h4>`;

      h += withHits.slice(0, 100).map(p => {
        const byBlock = {};

        p.hits.forEach(x => {
          if (!byBlock[x.block]) byBlock[x.block] = new Map();
          const m = byBlock[x.block];
          m.set(x.word, (m.get(x.word) || 0) + 1);
        });

        const lines = Object.entries(byBlock).map(([b, m]) =>
          `${esc(names[b] || b)}: ` + [...m].map(([w, n]) => esc(w) + (n > 1 ? '×' + n : '')).join(', ')
        );

        return `<div class="fwc-prod"><a href="${esc(p.url)}" data-open="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a>` +
          lines.map(l => `<small>${l}</small>`).join('') +
          `</div>`;
      }).join('');
    } else if (rep.products.length) {
      h += `<div class="fwc-ok" style="margin-top:6px">Английских слов не найдено ✔</div>`;
    }

    h += `<button class="fwc-btn sec" data-act="csv">Скачать отчёт (CSV для Excel)</button>` +
         `<button class="fwc-btn gray" data-act="bulk-hide">Скрыть отчёт</button>`;

    return h;
  }

  const sw = (attr, checked, disabled, text) =>
    `<label class="fwc-sw-row"><input type="checkbox" ${attr} ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}>` +
    `<span class="fwc-sw"></span><span class="fwc-sw-t">${text}</span></label>`;

  function renderExceptions() {
    const user = getUserWords();

    return `<div class="fwc-ex">` +
      `<div class="fwc-ex-h">Исключения (слова, которые не считаются ошибкой)</div>` +
      `<div class="fwc-ex-sub">Своих: <b>${user.length}</b> · общих (зашиты в скрипт): ${CONFIG.brands.length}</div>` +
      `<input type="text" class="fwc-new" placeholder="добавить слова: через пробел или запятую">` +
      `<button class="fwc-btn sec" data-act="add">Добавить в исключения</button>` +
      `<div class="fwc-ex-list">` +
      (user.length
        ? user.slice().reverse().map(w =>
            `<div class="fwc-row"><span>${esc(w)}</span><button class="fwc-small fwc-ret" data-del="${esc(w)}">↩ Вернуть в проверку</button></div>`
          ).join('')
        : `<div style="color:#888;padding:4px 0">Своих исключений пока нет</div>`) +
      `</div>` +
      `<div class="fwc-ex-sub">Список запоминается в браузере сам.</div>` +
      `</div>`;
  }

  let showBackup = false;

  function renderBackup() {
    let h = `<div style="margin-top:14px;border-top:1px solid #ddd;padding-top:6px">` +
      `<span data-act="toggle-backup" style="cursor:pointer;color:#888;font-size:11px">${showBackup ? '▼' : '▶'} Резервная копия исключений</span>`;

    if (showBackup) {
      h += `<div class="fwc-backup" style="margin-top:4px">` +
        `<button class="fwc-btn gray" data-act="ex-export">⬇ Сохранить исключения в файл</button>` +
        `<button class="fwc-btn gray" data-act="ex-import">⬆ Загрузить исключения из файла</button>` +
        `<input type="file" class="fwc-import" accept=".json,.txt,text/plain,application/json" style="display:none">` +
        (exMsg ? `<div class="fwc-ok">${esc(exMsg)}</div>` : '') +
        `<div class="fwc-ex-sub">Нужно только для переноса на другой компьютер или как копия.</div></div>`;
    }

    return h + `</div>`;
  }

  /* ===================== РЕНДЕР СЕКЦИЙ ССЫЛОК ===================== */

  function renderLinks() {
    let h = '<h4>Разделы сайта</h4>';

    // Группируем ссылки по секциям
    const groups = [];
    let currentGroup = null;

    CONFIG.links.forEach(link => {
      if (link.section) {
        currentGroup = { id: link.id, name: link.name, links: [], subs: {} };
        groups.push(currentGroup);
      } else if (link.sub) {
        // Подссылка — добавляем в последнюю группу к родителю
        if (currentGroup) {
          if (!currentGroup.subs[link.parent]) currentGroup.subs[link.parent] = [];
          currentGroup.subs[link.parent].push(link);
        }
      } else {
        // Обычная ссылка
        if (!currentGroup) {
          // Ссылка до первой секции — создаём «невидимую» группу
          currentGroup = { id: '__top', name: '', links: [], subs: {}, noHeader: true };
          groups.push(currentGroup);
        }
        currentGroup.links.push(link);
      }
    });

    groups.forEach(g => {
      if (g.noHeader) {
        // Без заголовка (главные ссылки в начале)
        h += `<div class="fwc-links">` + g.links.map(l => `<a href="${esc(l.url)}">${esc(l.name)}</a>`).join('') + `</div>`;
      } else {
        // Секция с заголовком, который можно свернуть
        const isCollapsed = sectionsState[g.id] !== false; // по умолчанию свёрнуто
        h += `<div class="fwc-section-header${isCollapsed ? ' collapsed' : ''}" data-section="${esc(g.id)}">` +
          `<span class="fwc-arrow">▼</span> ${esc(g.name)}</div>`;
        h += `<div class="fwc-section-body fwc-links${isCollapsed ? ' hidden' : ''}">`;

        g.links.forEach(l => {
          h += `<a href="${esc(l.url)}" class="${l.hasSub ? 'fwc-parent-item' : ''}">${esc(l.name)}</a>`;

          // Если у ссылки есть подменю — выводим подссылки сразу после неё
          if (l.hasSub && l.subId) {
            const subLinks = g.subs[l.subId] || [];
            subLinks.forEach(s => {
              h += `<a href="${esc(s.url)}" class="fwc-sub-item">${esc(s.name)}</a>`;
            });
          }
        });

        h += `</div>`;
      }
    });

    return h;
  }

  function render() {
    let body = '';

    if (lastExcluded) {
      const w = lastExcluded.words;
      const left = Math.max(0, UNDO_MS - (Date.now() - lastExcluded.t));

      body += `<div class="fwc-undo"><span>Исключено: <b>${esc(w.slice(0, 3).join(', '))}</b>${w.length > 3 ? ' и ещё ' + (w.length - 3) : ''}</span>` +
        `<button data-act="undo">↩ Вернуть</button><button data-act="undo-close" title="Закрыть">✕</button>` +
        `<i style="animation-duration:${UNDO_MS}ms;animation-delay:-${UNDO_MS - left}ms"></i></div>`;
    }

    if (pageType && pageType.id === 'product' && bulk.report) {
      const rec = bulk.report.products.find(x => x.url === location.pathname);

      if (rec) {
        const names = Object.fromEntries(bulk.report.blocks.map(b => [b.id, b.name]));
        const per = {};
        const vh = visibleHits(rec, getAllow());

        vh.forEach(h => {
          per[h.block] = (per[h.block] || 0) + 1;
        });

        const parts = Object.entries(per).map(([b, n]) => `${esc(names[b] || b)}: ${n}`).join('; ');

        body += `<div style="background:#fff8e1;border:1px solid #f0d27a;border-radius:4px;padding:6px;margin-bottom:6px">` +
          (openedFromReport
            ? '📋 Открыто из отчёта каталога «' + esc(bulk.report.catalogName) + '».<br>'
            : '📋 Эта карточка есть в отчёте «' + esc(bulk.report.catalogName) + '».<br>') +
          (vh.length
            ? `В отчёте: <b>${vh.length}</b> (${parts})`
            : '<span class="fwc-ok">В отчёте замечаний не было ✔</span>') +
          `<button class="fwc-btn sec" data-act="rep-run">Подсветить на странице как в отчёте</button>` +
          (bulk.report.sourceUrl
            ? `<button class="fwc-btn gray" data-act="back">← Вернуться к каталогу и отчёту</button>`
            : '') +
          `</div>`;
      }
    }

    // СЕКЦИИ ССЫЛОК
    body += renderLinks();

    if (pageType) {
      body += `<h4>Эта страница: ${esc(pageType.name)}</h4>` +
        pageType.blocks.map(b => sw(`data-block="${b.id}"`, selected.has(b.id), false, esc(b.name))).join('') +
        `<button class="fwc-btn" data-act="run">Проверить выбранное</button>`;
    } else {
      body += `<h4>Эта страница</h4><p>Тип страницы не настроен — можно проверить её целиком.</p>`;
    }

    body += `<button class="fwc-btn sec" data-act="whole">Проверить всю страницу целиком</button>` +
            `<button class="fwc-btn gray" data-act="clear">Сбросить подсветку</button>`;

    if (result) {
      body += `<h4>Результат: ${esc(result.title)}</h4>`;

      body += result.stats.map(s => {
        if (!s.blocks) return `<div class="fwc-warn">⚠ ${esc(s.name)}: блок не найден (проверьте селектор)</div>`;
        return `<div>${esc(s.name)}: <b>${s.hits}</b> ${s.hits ? '' : '<span class="fwc-ok">✔</span>'}</div>`;
      }).join('');

      body += `<div style="margin-top:4px">Всего найдено: <b>${result.found.length}</b></div>`;

      const map = new Map();

      result.found.forEach(f => {
        const k = f.word.toLowerCase();
        if (!map.has(k)) map.set(k, { word: f.word, count: 0, el: f.el });
        map.get(k).count++;
      });

      body += [...map.values()].map(v =>
        `<div class="fwc-row"><span class="fwc-word" data-goto="${esc(v.word)}">${esc(v.word)} <small style="color:#888">×${v.count}</small></span>` +
        `<button class="fwc-small" data-allow="${esc(v.word)}">исключить</button></div>`
      ).join('');

      body += renderExceptions();
    }

    body += `<h4>Все карточки каталога</h4>`;

    const opts = [];

    if (isCatalogPage) {
      const h1el = document.querySelector('h1');
      const h1text = h1el ? h1el.textContent.trim() : location.pathname;
      opts.push(`<option value="current"${bulk.catalog === 'current' ? ' selected' : ''}>Текущая страница: ${esc(h1text)}</option>`);
    }

    CONFIG.catalogs.forEach(c => {
      opts.push(`<option value="${esc(c.url)}"${bulk.catalog === c.url ? ' selected' : ''}>${esc(c.name)}</option>`);
    });

    body += `<select data-bcatalog${bulk.running ? ' disabled' : ''}>${opts.join('')}</select>`;
    body += `<div style="color:#666;margin-top:2px">Что проверять в каждой карточке:</div>`;
    body += sw('data-bwhole', bulk.whole, bulk.running, '<b>Вся карточка целиком</b>');
    body += productBlocks().map(b =>
      sw(`data-bblock="${b.id}"`, bulk.sel.has(b.id), bulk.running || bulk.whole, esc(b.name))
    ).join('');
    body += sw('data-bpaging', bulk.paging, bulk.running, 'Обходить все страницы каталога');
    body += `<label>Максимум карточек (0 — все):<input type="number" min="0" data-blimit value="${bulk.limit}"${bulk.running ? ' disabled' : ''}></label>`;

    if (bulk.running) {
      body += `<div id="fwc-progress">${esc(bulk.progress)}</div><button class="fwc-btn red" data-act="bulk-stop">Остановить</button>`;
    } else {
      if (bulk.progress) body += `<div class="fwc-warn">${esc(bulk.progress)}</div>`;
      body += `<button class="fwc-btn" data-act="bulk-run">Проверить все карточки каталога</button>`;
    }

    if (bulk.report) body += renderBulkReport();

    if (!result && !bulk.report) body += renderExceptions();

    body += `<h4>Инструменты</h4><button class="fwc-btn gray" data-act="pick">🔍 Узнать класс блока (клик по странице)</button>`;

    if (pickText) body += `<textarea readonly>${esc(pickText)}</textarea>`;

    body += renderBackup();

    const keepScroll = panel.scrollTop;

    panel.innerHTML =
      `<header data-act="collapse"><b>Проверка английских слов</b><span>${collapsed ? '▲' : '▼'}</span></header>` +
      `<div id="fwc-body" style="display:${collapsed ? 'none' : 'block'}">${body}</div>`;

    panel.scrollTop = keepScroll;
  }

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
    }
  });

  function markOpen(e) {
    const a = e.target.closest && e.target.closest('a[data-open]');
    if (!a || !bulk.report) return;

    GM_setValue(STORE_OPEN, {
      path: a.dataset.open,
      blockIds: bulk.report.blocks.map(b => b.id),
      t: Date.now(),
    });
  }

  panel.addEventListener('mousedown', markOpen);
  panel.addEventListener('click', markOpen);

  panel.addEventListener('click', e => {
    const t = e.target.closest('[data-act],[data-allow],[data-ballow],[data-del],[data-goto],[data-section]');
    if (!t) return;

    const d = t.dataset;

    // === Сворачивание/разворачивание секции ===
    if (d.section) {
      const id = d.section;
      const isCollapsed = sectionsState[id] !== false;
      sectionsState[id] = isCollapsed ? false : true;
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
    } else if (d.act === 'toggle-backup') {
      showBackup = !showBackup;
      render();
    } else if (d.act === 'ex-import') {
      const blk = t.closest('.fwc-backup');
      const f = blk && blk.querySelector('.fwc-import');
      if (f) f.click();
    } else if (d.act === 'pick') {
      picking = true;
      document.body.classList.add('fwc-picking');
      pickText = 'Кликните по нужному блоку на странице…';
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
    } else if (d.act === 'back') {
      if (bulk.report && bulk.report.sourceUrl) location.href = bulk.report.sourceUrl;
    } else if (d.act === 'rep-run') {
      if (bulk.report) run(blocksByIds(bulk.report.blocks.map(b => b.id)), 'Как в отчёте каталога');
    } else if (d.act === 'csv') {
      downloadCsv();
    } else if (d.allow) {
      afterAllowChange(addWords(d.allow));
    } else if (d.ballow) {
      afterAllowChange(addWords(d.ballow));
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
    console.log('[fwc] цепочка элементов:\n' + pickText);
    render();
  }, true);

  const pend = GM_getValue(STORE_OPEN, null);

  if (
    pend &&
    pageType &&
    pageType.id === 'product' &&
    pend.path === location.pathname &&
    Date.now() - pend.t < 5 * 60 * 1000
  ) {
    GM_setValue(STORE_OPEN, null);
    openedFromReport = true;
    collapsed = false;
    run(blocksByIds(pend.blockIds), 'Из отчёта каталога');

    if (result && result.found[0]) {
      setTimeout(() => result.found[0].el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 500);
    }
  } else {
    render();
  }
})();
