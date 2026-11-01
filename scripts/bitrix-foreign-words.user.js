// ==UserScript==
// @name         Битрикс: проверка английских слов в обзорах
// @namespace    bitrix-admin-foreign-words-checker
// @version      1.8.3
// @description  Только админка Битрикс. Слова внутри () и [] всегда игнорируются. Слова вне скобок помечаются жёлтым. Исправлено: RoHS, CE и подобные аббревиатуры вне скобок больше не теряются из-за разбиения CamelCase. Колонка «Английские слова» всегда включена.
// @updateURL    https://lintervil.github.io/price-tools/scripts/bitrix-foreign-words.user.js
// @downloadURL  https://lintervil.github.io/price-tools/scripts/bitrix-foreign-words.user.js
// @match        *://*/bitrix/admin/iblock_list_admin.php*
// @match        *://*/bitrix/admin/iblock_element_admin.php*
// @match        *://*/bitrix/admin/element_admin.php*
// @require      https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js
// @connect      cdn.jsdelivr.net
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const VERSION = '1.8.3';
  const PANEL_ID = 'bx-fw-panel';
  const STORE_USER = 'bx_fw_user_exclusions_v1';
  const STORE_DEFAULT_REMOVED = 'bx_fw_default_removed_v1';
  const FETCH_CONCURRENCY = 2;
  const FETCH_DELAY_MS = 220;
  const DEFAULT_LIST_LIMIT = 200;

  const SERVICE_TITLE_RE = /^\s*(элементы\s*[:.]|добавить элемент|редактирование|список элементов|новый элемент|шаблон|template)/i;

  const DEFAULT_EXCLUSIONS = [
    'miele', 'neff', 'smeg', 'gorenje', 'asko', 'maunfeld', 'bosch', 'dietrich',
    'kaiser', 'kuppers', 'liebherr', 'siemens', 'aeg', 'electrolux', 'elica',
    'falmec', 'graude', 'hitachi', 'insinkerator', 'korting', 'kuppersbusch',
    'teka', 'whirlpool', 'indesit', 'hotpoint', 'zanussi', 'beko', 'haier',
    'midea', 'samsung', 'lg', 'sony', 'panasonic',

    'http', 'https', 'www', 'com', 'ru', 'ua', 'de', 'fr', 'it', 'es', 'pl',
    'cz', 'sk', 'by', 'kz',

    'utf', 'nbsp', 'amp', 'lt', 'gt', 'quot', 'apos',
    'mdash', 'ndash', 'laquo', 'raquo', 'hellip', 'trade', 'reg', 'copy',

    'span', 'div', 'class', 'style', 'data', 'src', 'alt', 'title', 'href',
    'content', 'contenttype', 'meta', 'charset', 'viewport', 'lang', 'role',
    'aria', 'label', 'id', 'p', 'br', 'ul', 'li', 'strong', 'em', 'table',
    'tbody', 'thead', 'tr', 'td', 'th', 'img', 'source', 'picture', 'use',
    'path', 'fill', 'viewbox', 'width', 'height', 'xmlns', 'evenodd',
    'clip', 'rule', 'd', 'transform', 'opacity', 'translate', 'translate3d',
    'px', 'rem', 'lazyload', 'datatrsrc', 'datatrsrcset', 'datatrtooltipcontent',
    'glossary', 'tooltip', 'icon', 'mark', 'image', 'file', 'folder',
    'script', 'iframe', 'input', 'button', 'select', 'option', 'textarea',
    'form', 'filter', 'set', 'find', 'order', 'by', 'pagen', 'nstart',

    'upload', 'medialibrary', 'iblock', 'resize', 'cache',
    'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'css', 'js', 'html', 'htm',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'xlsm', 'xlsb', 'csv', 'txt', 'json', 'xml',

    'detail', 'preview', 'text', 'name', 'code', 'block', 'element',
    'admin', 'bitrix', 'sessid', 'auth', 'csrf', 'uuid', 'guid',

    'kg', 'cm', 'mm', 'db', 'rpm', 'hz', 'kw', 'kwh', 'max', 'min'
  ];

  const WORD_RE = /[A-Za-z]{2,}(?:['’-][A-Za-z]{1,})*/g;
  const LATIN_TOKEN_RE = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g;

  const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
  const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gi;
  const PATH_RE = /\/[A-Za-z0-9_.\-\/]*/g;
  const MEDIA_PATH_RE = /(?:^|[\s(\[<"'=])(?:upload|medialibrary|bitrix|cache|resize)\/[^\s)\]>"']*/gi;
  const QUERY_RE = /\?[A-Za-z0-9_.\-&=%#\/+]*/g;
  const PARAM_RE = /&[A-Za-z0-9_.\-]+=[A-Za-z0-9_.\-&=%#\/+]*/g;
  const HASH_RE = /#[A-Za-z0-9_.\-]+/g;
  const TOKEN_WITH_DIGIT_RE = /[A-Za-z0-9_.\-]*\d[A-Za-z0-9_.\-]*/g;
  const EXT_RE = /\b(?:jpg|jpeg|png|webp|gif|svg|css|js|html|htm|pdf|doc|docx|xls|xlsx|xlsm|xlsb|csv|txt|json|xml)\b/gi;

  const PAREN_CONTENT_RE = /\([^)]*\)/g;
  const SQUARE_CONTENT_RE = /\[[^\]]*\]/g;

  const TECHNICAL_SKIP_PATTERNS = [
    URL_RE,
    EMAIL_RE,
    PATH_RE,
    MEDIA_PATH_RE,
    QUERY_RE,
    PARAM_RE,
    HASH_RE,
    TOKEN_WITH_DIGIT_RE,
    EXT_RE
  ];

  const state = {
    collapsed: false,
    message: '',

    table: null,
    iblockId: '',
    lang: 'ru',
    editTemplate: '',
    elements: [],
    field: 'DETAIL_TEXT',
    customField: '',
    onlyChecked: false,
    allPages: false,

    stripHtml: true,

    showAdvanced: false,
    resultScope: 'words',
    highlightLatin: true,
    latinMinLength: 1,

    outFormat: 'xlsx',

    running: false,
    cancel: false,
    progress: '',

    rows: [],
    words: [],
    wordFilter: '',
    showAllWords: false,

    userExclusions: new Set(),
    defaultRemoved: new Set(),
    exclusionCache: new Set(),

    showDefaultManager: false,
    defaultFilter: ''
  };

  let sessid = '';

  GM_addStyle(`
    #${PANEL_ID}{position:fixed;right:14px;bottom:14px;z-index:2147483647;width:min(760px,calc(100vw - 24px));max-height:88vh;overflow:auto;background:#fff;color:#171717;border:1px solid #888;border-radius:10px;box-shadow:0 10px 35px rgba(0,0,0,.25);font:13px/1.35 Arial,sans-serif}
    #${PANEL_ID} *{box-sizing:border-box}
    #${PANEL_ID} header{position:sticky;top:0;z-index:3;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 11px;background:#171717;color:#fff;cursor:pointer}
    #${PANEL_ID} header b{font-size:13px}
    #bx-fw-body{padding:10px}
    #${PANEL_ID} h4{margin:12px 0 5px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.04em}
    #${PANEL_ID} textarea,#${PANEL_ID} input[type="text"],#${PANEL_ID} select{width:100%;padding:6px;border:1px solid #bbb;border-radius:5px;font:inherit;margin:3px 0;background:#fff;color:#171717}
    #${PANEL_ID} button{cursor:pointer;font:inherit;border:1px solid #2d7ff9;background:#2d7ff9;color:#fff;border-radius:5px;padding:6px 9px;margin:3px 3px 3px 0}
    #${PANEL_ID} button.sec{background:#fff;color:#2d7ff9}
    #${PANEL_ID} button.gray{background:#f2f2f2;color:#333;border-color:#ccc}
    #${PANEL_ID} button.red{background:#d33;color:#fff;border-color:#d33}
    #${PANEL_ID} button.small{padding:2px 7px;font-size:11px;margin:0;border-color:#bbb;background:#f7f7f7;color:#333}
    .bx-fw-row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:3px 0;border-bottom:1px dashed #ddd}
    .bx-fw-row span{word-break:break-all}
    .bx-fw-muted{color:#777;font-size:12px;padding:4px 0}
    .bx-fw-msg{background:#fff3cd;border:1px solid #f0d27a;border-radius:6px;padding:7px 8px;margin:6px 0;color:#5b4300}
    .bx-fw-chips{display:flex;flex-wrap:wrap;gap:5px;max-height:120px;overflow:auto;border:1px solid #e3e3e3;border-radius:5px;padding:5px;background:#fafafa;margin:5px 0}
    .bx-fw-chip{display:inline-flex;align-items:center;gap:5px;border:1px solid #d8dee6;border-radius:12px;background:#fff;padding:2px 7px;font-size:12px}
    .bx-fw-chip button{border:0;background:transparent;color:#b42318;padding:0 1px;margin:0;font-weight:700}
    #bx-fw-word-list,#bx-fw-preview,#bx-fw-default-list{max-height:260px;overflow:auto;border:1px solid #e3e3e3;border-radius:6px;background:#fff;padding:5px;margin-top:5px}
    #bx-fw-default-list{max-height:220px}
    #bx-fw-preview{max-height:380px}
    #bx-fw-preview table{border-collapse:collapse;width:100%;font-size:12px}
    #bx-fw-preview td,#bx-fw-preview th{border:1px solid #ddd;padding:5px;vertical-align:top;text-align:left;max-width:420px;overflow-wrap:anywhere;white-space:pre-wrap}
    #bx-fw-preview th{background:#f7f7f7}
    #bx-fw-preview td.bx-link,#bx-fw-preview th.bx-link{max-width:none;white-space:nowrap}
    mark.bx-fw-mark{border-radius:2px;padding:0 1px;color:#111 !important}
    mark.bx-yellow{background:#ffe066 !important;outline:1px solid #d4a017}
    mark.bx-blue{background:#9ee7ff !important;color:#002b3d !important;outline:1px solid #28a8e0}
    .bx-fw-actions{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}
    .bx-fw-inline{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:4px 0}
    .bx-fw-inline label{display:flex;gap:5px;align-items:center;margin:0}
    .bx-fw-recommend{background:#eef7ee;border:1px solid #b7e4c7;color:#087f45;border-radius:6px;padding:7px 8px;margin:6px 0}
    @media (max-width:720px){#${PANEL_ID}{width:calc(100vw - 18px);right:9px;bottom:9px;max-height:84vh}}
  `);

  init();

  function init() {
    if (!/\/bitrix\/admin\/(iblock_list_admin|iblock_element_admin|element_admin)\.php/.test(location.pathname)) return;

    loadUserExclusions();
    loadDefaultRemoved();
    rebuildExclusionCache();
    sessid = getBitrixSessid();

    const table = findAdminTable();
    if (!table) {
      console.warn('[bx-fw] таблица элементов не найдена');
      return;
    }

    state.table = table;
    state.iblockId = detectParam('IBLOCK_ID');
    state.lang = detectParam('lang') || 'ru';
    state.editTemplate = detectEditTemplate(table);
    state.elements = readElementsFromTable(table);

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    document.body.appendChild(panel);

    panel.addEventListener('click', onClick);
    panel.addEventListener('change', onChange);
    panel.addEventListener('input', onInput);

    try {
      GM_registerMenuCommand('Битрикс: проверить английские слова', () => {
        state.collapsed = false;
        render();
      });
    } catch (_) {}

    render();
  }

  function getBitrixSessid() {
    try { if (typeof window.bitrix_sessid === 'function') { const v = window.bitrix_sessid(); if (v) return String(v); } } catch (_) {}
    try { if (window.BX && typeof window.BX.bitrix_sessid === 'function') { const v = window.BX.bitrix_sessid(); if (v) return String(v); } } catch (_) {}
    const inp = document.querySelector('input[name="sessid"], input[name="bitrix_sessid"], #bitrix_sessid');
    if (inp && inp.value) return inp.value;
    const a = document.querySelector('a[href*="sessid="]');
    if (a) { try { const v = new URL(a.getAttribute('href'), location.origin).searchParams.get('sessid'); if (v) return v; } catch (_) {} }
    const m = document.documentElement.innerHTML.match(/[?&]sessid=([a-zA-Z0-9]+)/);
    return m ? m[1] : '';
  }

  function withSessid(url) {
    if (!sessid) return url;
    try {
      const u = new URL(url, location.origin);
      if (!u.searchParams.get('sessid')) u.searchParams.set('sessid', sessid);
      return u.href;
    } catch (_) {
      return url + (url.includes('?') ? '&' : '?') + 'sessid=' + encodeURIComponent(sessid);
    }
  }

  function normEx(s) {
    return String(s || '').trim().toLowerCase().replace(/['’\-\u2013\u2014]/g, '');
  }

  function defaultBaseSet() {
    return new Set(DEFAULT_EXCLUSIONS.map(normEx).filter(Boolean));
  }

  function defaultActiveSet() {
    const set = defaultBaseSet();
    state.defaultRemoved.forEach(w => set.delete(w));
    return set;
  }

  function loadUserExclusions() {
    try {
      const raw = GM_getValue(STORE_USER, '[]');
      const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(arr)) state.userExclusions = new Set(arr.map(String).map(normEx).filter(Boolean));
    } catch (_) {
      state.userExclusions = new Set();
    }
  }

  function saveUserExclusions() {
    try { GM_setValue(STORE_USER, JSON.stringify([...state.userExclusions])); } catch (_) {}
  }

  function loadDefaultRemoved() {
    try {
      const raw = GM_getValue(STORE_DEFAULT_REMOVED, '[]');
      const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(arr)) state.defaultRemoved = new Set(arr.map(String).map(normEx).filter(Boolean));
    } catch (_) {
      state.defaultRemoved = new Set();
    }
  }

  function saveDefaultRemoved() {
    try { GM_setValue(STORE_DEFAULT_REMOVED, JSON.stringify([...state.defaultRemoved])); } catch (_) {}
  }

  function rebuildExclusionCache() {
    state.exclusionCache = new Set([...defaultActiveSet(), ...state.userExclusions]);
  }

  function addUserWords(text) {
    const words = String(text || '').split(/[\s,;]+/).map(normEx).filter(w => w && w.length >= 2);
    if (!words.length) return 0;

    let added = 0;
    words.forEach(w => {
      if (!state.userExclusions.has(w)) {
        state.userExclusions.add(w);
        added++;
      }
    });

    if (added) {
      saveUserExclusions();
      rebuildExclusionCache();
      if (state.rows.length) reanalyzeRows();
    }

    return added;
  }

  function removeUserWord(word) {
    const w = normEx(word);
    if (!w) return;
    state.userExclusions.delete(w);
    saveUserExclusions();
    rebuildExclusionCache();
    if (state.rows.length) reanalyzeRows();
  }

  function removeDefaultWord(word) {
    const w = normEx(word);
    if (!w) return;
    state.defaultRemoved.add(w);
    saveDefaultRemoved();
    rebuildExclusionCache();
    if (state.rows.length) reanalyzeRows();
  }

  function restoreDefaultWord(word) {
    const w = normEx(word);
    if (!w) return;
    state.defaultRemoved.delete(w);
    saveDefaultRemoved();
    rebuildExclusionCache();
    if (state.rows.length) reanalyzeRows();
  }

  function restoreAllDefaults() {
    state.defaultRemoved.clear();
    saveDefaultRemoved();
    rebuildExclusionCache();
    if (state.rows.length) reanalyzeRows();
  }

  function isExcludedToken(token) {
    const n = normEx(token);
    if (!n || n.length < 2) return true;
    return state.exclusionCache.has(n);
  }

  function detectParam(name) {
    const fromUrl = new URLSearchParams(location.search).get(name);
    if (fromUrl) return fromUrl;

    const input = document.querySelector(`input[name="${name}"], input#${name}, select[name="${name}"]`);
    if (input && input.value) return input.value;

    const link = document.querySelector(`a[href*="${name}="]`);
    if (link) {
      try {
        const v = new URL(link.getAttribute('href'), location.origin).searchParams.get(name);
        if (v) return v;
      } catch (_) {}
    }

    return '';
  }

  function findAdminTable() {
    const candidates = [...document.querySelectorAll('table')]
      .filter(t => !t.closest('#' + PANEL_ID))
      .filter(t => t.querySelectorAll('tr').length > 1);

    const scored = candidates.map(t => {
      let score = 0;
      if (t.id === 'tblcontent') score += 100;
      if (t.classList.contains('adm-list-table')) score += 80;
      if (t.querySelector('a[href*="element_edit.php"], a[href*="iblock_element_edit.php"]')) score += 100;
      if (t.querySelector('input[name="ID_ARRAY[]"], input[name^="ID_ARRAY"]')) score += 80;
      if (t.querySelector('input[type="checkbox"]')) score += 20;
      if (/Элементы|Список элементов|IBLOCK|Инфоблок/i.test(t.textContent || '')) score += 10;
      return { t, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

    return scored[0] ? scored[0].t : null;
  }

  function dataRows(table) {
    const bodyRows = [...table.querySelectorAll('tbody tr')];
    if (bodyRows.length) return bodyRows.filter(tr => !tr.querySelector(':scope > th'));

    return [...table.querySelectorAll('tr')].filter(tr => {
      const first = tr.children[0];
      return first && first.tagName === 'TD';
    });
  }

  function detectEditTemplate(table) {
    const a = table.querySelector('a[href*="element_edit.php"], a[href*="iblock_element_edit.php"]');
    if (!a) return '';

    try {
      const url = new URL(a.getAttribute('href'), location.origin);
      return url.pathname + '?' + url.searchParams.toString();
    } catch (_) {
      return a.getAttribute('href') || '';
    }
  }

  function isServiceElement(id, title) {
    if (!/^\d+$/.test(String(id || '').trim())) return true;
    if (SERVICE_TITLE_RE.test(String(title || ''))) return true;
    return false;
  }

  function readElementsFromTable(table) {
    const rows = dataRows(table);
    const out = [];

    rows.forEach(tr => {
      const id = readElementId(tr);
      if (!id) return;

      const titleCell = tr.querySelector('a[href*="element_edit.php"], a[href*="iblock_element_edit.php"]');
      const title = titleCell ? (titleCell.textContent || '').replace(/\s+/g, ' ').trim() : '';
      if (isServiceElement(id, title)) return;

      const rawHref = titleCell ? titleCell.getAttribute('href') : '';
      const href = rawHref ? withSessid(absoluteUrl(rawHref)) : editUrlForId(id);
      const checked = !!tr.querySelector('input[type="checkbox"]:checked');

      out.push({ id, title, href, checked, text: '', raw: '', words: [], hits: [], latinHits: [] });
    });

    return dedupeById(out);
  }

  function readElementId(tr) {
    const checkbox = tr.querySelector('input[name="ID_ARRAY[]"], input[name^="ID_ARRAY"]');
    if (checkbox && checkbox.value) return checkbox.value;

    const link = tr.querySelector('a[href*="ID="]');
    if (link) {
      try {
        const u = new URL(link.getAttribute('href'), location.origin);
        const id = u.searchParams.get('ID') || u.searchParams.get('ELEMENT_ID');
        if (id) return id;
      } catch (_) {}
    }

    const dataId = tr.querySelector('[data-id], [data-element-id], [data-iblock-element-id]');
    if (dataId) {
      const v = dataId.dataset.id || dataId.dataset.elementId || dataId.dataset.iblockElementId;
      if (v) return v;
    }

    const m = (tr.textContent || '').match(/\bID\s*[:=]?\s*(\d+)/i);
    if (m) return m[1];

    return '';
  }

  function dedupeById(arr) {
    const seen = new Set();
    return arr.filter(x => {
      if (!x.id || seen.has(x.id)) return false;
      seen.add(x.id);
      return true;
    });
  }

  function absoluteUrl(href) {
    try { return new URL(href, location.origin).href; } catch (_) { return href || ''; }
  }

  function editUrlForId(id) {
    let base;

    if (state.editTemplate) {
      try {
        const u = new URL(state.editTemplate, location.origin);
        u.searchParams.set('ID', id);
        if (state.iblockId) u.searchParams.set('IBLOCK_ID', state.iblockId);
        if (state.lang) u.searchParams.set('lang', state.lang);
        base = u.href;
      } catch (_) {
        base = null;
      }
    }

    if (!base) {
      const params = new URLSearchParams({ lang: state.lang || 'ru', ID: id });
      if (state.iblockId) params.set('IBLOCK_ID', state.iblockId);
      base = location.origin + '/bitrix/admin/element_edit.php?' + params.toString();
    }

    return withSessid(base);
  }

  function collectPaginationUrls(table) {
    const out = new Set();
    const basePath = new URL(location.href).pathname;

    table.querySelectorAll('a[href]').forEach(a => {
      let u;
      try { u = new URL(a.getAttribute('href'), location.origin); } catch (_) { return; }
      if (u.origin !== location.origin || u.pathname !== basePath) return;
      if (/PAGEN_\d+=\d+|[?&]page=\d+/i.test(u.search)) out.add(u.href);
    });

    return [...out];
  }

  function effectiveField() {
    return state.field === 'CUSTOM' ? (state.customField || 'DETAIL_TEXT') : state.field;
  }

  function readFieldFromDoc(doc, field) {
    const sel = [
      `textarea[name="${field}"]`,
      `textarea[id="${field}"]`,
      `#${field}`,
      `textarea[name="~${field}"]`,
      `textarea[id="~${field}"]`,
      `input[name="${field}"]`,
      `input[id="${field}"]`
    ];

    for (const s of sel) {
      const el = doc.querySelector(s);
      if (el && (el.value || el.textContent)) return el.value || el.textContent;
    }

    const re = new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const any = [...doc.querySelectorAll('textarea')].find(ta => re.test(ta.name || ta.id || ''));
    return any ? any.value : '';
  }

  function readTitleFromDoc(doc) {
    const n = doc.querySelector('textarea[name="NAME"], input[name="NAME"], #NAME');
    if (n && n.value) return n.value.trim();

    const h1 = doc.querySelector('h1, .adm-page-title, .page-title');
    return h1 ? h1.textContent.trim() : '';
  }

  function docIsLogin(doc, urlHref) {
    const path = (() => {
      try { return new URL(urlHref, location.origin).pathname.toLowerCase(); } catch (_) { return ''; }
    })();

    if (/\/(login|auth|authorize)\.php$/.test(path) || /\/bitrix\/admin\/login/.test(path)) return true;

    const html = doc ? (doc.body ? doc.body.innerHTML.slice(0, 40000) : '') : '';
    return /name="AUTH_FORM"|id="login_form"|Введите ваш логин|Авторизация|Ваш пароль/i.test(html);
  }

  async function fetchCard(el) {
    const url = el.href || editUrlForId(el.id);
    const r = await fetch(url, { credentials: 'same-origin', redirect: 'follow' });
    if (!r.ok) throw new Error('HTTP ' + r.status);

    const html = await r.text();
    const finalUrl = r.url || url;
    const doc = new DOMParser().parseFromString(html, 'text/html');

    if (r.redirected || docIsLogin(doc, finalUrl)) {
      const err = new Error('LOGIN');
      err.isLogin = true;
      throw err;
    }

    return { doc, title: el.title || readTitleFromDoc(doc) };
  }

  async function runCheck() {
    if (state.running) return;

    const targets = state.onlyChecked ? state.elements.filter(e => e.checked) : state.elements;
    if (!targets.length) {
      setMessage(state.onlyChecked ? 'В таблице не отмечено ни одного элемента.' : 'Не найдено элементов в таблице (или все строки служебные).');
      render();
      return;
    }

    state.running = true;
    state.cancel = false;
    state.progress = 'Старт…';
    state.rows = [];
    render();

    const queue = targets.slice();

    if (state.allPages) {
      const extra = await collectAllPagesElements();
      const seen = new Set(queue.map(e => e.id));
      extra.forEach(e => {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          queue.push(e);
        }
      });
    }

    const results = new Array(queue.length);
    let loginSeen = false;
    let idx = 0;
    let done = 0;

    async function worker() {
      while (!state.cancel) {
        const i = idx++;
        if (i >= queue.length) return;

        const el = queue[i];
        try {
          const { doc, title } = await fetchCard(el);
          results[i] = makeAdminRow(el, doc, title);
        } catch (e) {
          if (e && e.isLogin) loginSeen = true;
          results[i] = makeAdminErrorRow(el, e && e.message === 'LOGIN' ? 'Страница авторизации.' : (e && e.message || String(e)));
        }

        done++;
        state.progress = `Загружено ${done} из ${queue.length}`;
        updateProgressDom();
        await sleep(FETCH_DELAY_MS);
      }
    }

    await Promise.all(Array.from({ length: FETCH_CONCURRENCY }, worker));

    state.rows = results.filter(Boolean);
    state.running = false;
    state.progress = '';

    reanalyzeRows();

    if (loginSeen) {
      setMessage('Часть карточек отдала страницу авторизации. Обновите страницу списка, убедитесь, что сессия активна, и запустите проверку снова.');
    }

    render();
  }

  function makeAdminRow(el, doc, title) {
    const raw = readFieldFromDoc(doc, effectiveField());
    return {
      id: el.id,
      title: title || el.title || '',
      href: el.href || editUrlForId(el.id),
      raw,
      text: state.stripHtml ? htmlToPlainText(raw) : String(raw || ''),
      words: [],
      hits: [],
      latinHits: []
    };
  }

  function makeAdminErrorRow(el, msg) {
    return {
      id: el.id,
      title: el.title || '',
      href: el.href || editUrlForId(el.id),
      raw: '',
      text: '',
      error: msg,
      words: [],
      hits: [],
      latinHits: []
    };
  }

  function refreshAdminCleaning() {
    state.rows.forEach(r => {
      if (typeof r.raw !== 'undefined') {
        r.text = state.stripHtml ? htmlToPlainText(r.raw) : String(r.raw || '');
      }
    });

    if (state.rows.length) reanalyzeRows();
  }

  async function collectAllPagesElements() {
    const seen = new Set(state.elements.map(e => e.id));
    const out = [];
    let urls = collectPaginationUrls(state.table);
    let guard = 0;

    while (urls.length && guard < 100 && !state.cancel) {
      guard++;
      const next = [];

      for (const url of urls) {
        if (state.cancel) break;

        try {
          const r = await fetch(withSessid(url), { credentials: 'same-origin' });
          if (!r.ok) continue;

          const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
          const table = findAdminTableInDoc(doc);
          if (!table) continue;

          readElementsFromTable(table).forEach(e => {
            if (!seen.has(e.id)) {
              seen.add(e.id);
              out.push(e);
            }
          });

          next.push(...collectPaginationUrlsInDoc(table, url));
        } catch (_) {}

        await sleep(FETCH_DELAY_MS);
      }

      urls = [...new Set(next)].filter(u => !/PAGEN_1=1\b/.test(u));
    }

    return out;
  }

  function findAdminTableInDoc(doc) {
    const candidates = [...doc.querySelectorAll('table')]
      .filter(t => t.querySelectorAll('tr').length > 1);

    const scored = candidates.map(t => {
      let score = 0;
      if (t.id === 'tblcontent') score += 100;
      if (t.classList.contains('adm-list-table')) score += 80;
      if (t.querySelector('a[href*="element_edit.php"], a[href*="iblock_element_edit.php"]')) score += 100;
      if (t.querySelector('input[name="ID_ARRAY[]"], input[name^="ID_ARRAY"]')) score += 80;
      return { t, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

    return scored[0] ? scored[0].t : null;
  }

  function collectPaginationUrlsInDoc(table, baseUrl) {
    const out = new Set();
    const base = new URL(baseUrl, location.origin);

    table.querySelectorAll('a[href]').forEach(a => {
      let u;
      try { u = new URL(a.getAttribute('href'), base); } catch (_) { return; }
      if (u.origin !== location.origin || u.pathname !== base.pathname) return;
      if (/PAGEN_\d+=\d+|[?&]page=\d+/i.test(u.search)) out.add(u.href);
    });

    return [...out];
  }

  function decodeEntities(s) {
    if (!/&[#a-z0-9]{1,10};/i.test(s)) return s;
    const ta = document.createElement('textarea');
    ta.innerHTML = s;
    return ta.value;
  }

  function stripTagsText(s) {
    try {
      const doc = new DOMParser().parseFromString('<body>' + s + '</body>', 'text/html');
      doc.querySelectorAll('script,style,noscript,svg,iframe').forEach(n => n.remove());
      return doc.body ? doc.body.textContent : s.replace(/<[^>]+>/g, ' ');
    } catch (_) {
      return s
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ');
    }
  }

  function htmlToPlainText(html) {
    if (!html) return '';

    let s = String(html);
    s = s.replace(/\u00a0/g, ' ');
    s = decodeEntities(s);
    s = stripTagsText(s);

    return s.replace(/[ \t]+/g, ' ').replace(/\r?\n/g, ' ').trim();
  }

  function bracketSkipPatterns() {
    return [PAREN_CONTENT_RE, SQUARE_CONTENT_RE];
  }

  function buildHighlightSkipMask(text) {
    return getSkipMask(text, TECHNICAL_SKIP_PATTERNS.concat(bracketSkipPatterns()));
  }

  function getSkipMask(text, patterns) {
    const skip = new Uint8Array(text.length);

    for (const pattern of patterns) {
      const re = new RegExp(pattern.source, pattern.flags);
      for (const m of text.matchAll(re)) {
        skip.fill(1, m.index, m.index + m[0].length);
      }
    }

    return skip;
  }

  function findHits(text) {
    if (!text) return [];

    const skip = buildHighlightSkipMask(text);
    const res = [];

    for (const m of text.matchAll(WORD_RE)) {
      const word = m[0];
      const start = m.index;
      const end = start + word.length;

      let masked = false;
      for (let i = start; i < end; i++) {
        if (skip[i]) {
          masked = true;
          break;
        }
      }

      if (masked) continue;
      if (isExcludedToken(word)) continue;

      res.push({ word, start, end });
    }

    return res;
  }

  function findLatinHits(text) {
    if (!text || !state.highlightLatin) return [];

    const skip = buildHighlightSkipMask(text);
    const res = [];

    for (const m of text.matchAll(LATIN_TOKEN_RE)) {
      const word = m[0];
      const start = m.index;
      const end = start + word.length;

      let masked = false;
      for (let i = start; i < end; i++) {
        if (skip[i]) {
          masked = true;
          break;
        }
      }

      if (masked) continue;
      if (word.length < state.latinMinLength) continue;

      res.push({ word, start, end });
    }

    return res;
  }

  function buildCombinedHighlightedHtml(text, yellowHits, latinHits) {
    if (!text) return '';
    if (!yellowHits.length && !latinHits.length) return esc(text);

    const len = text.length;
    const mark = new Uint8Array(len);

    for (const h of latinHits) {
      for (let i = h.start; i < h.end && i < len; i++) mark[i] = 1;
    }

    for (const h of yellowHits) {
      for (let i = h.start; i < h.end && i < len; i++) mark[i] = 2;
    }

    let out = '';
    let start = 0;
    let cur = len ? mark[0] : 0;

    for (let i = 1; i <= len; i++) {
      const m = i < len ? mark[i] : -1;
      if (m !== cur) {
        const slice = text.slice(start, i);

        if (cur === 2) {
          out += '<mark class="bx-fw-mark bx-yellow">' + esc(slice) + '</mark>';
        } else if (cur === 1) {
          out += '<mark class="bx-fw-mark bx-blue">' + esc(slice) + '</mark>';
        } else {
          out += esc(slice);
        }

        start = i;
        cur = m;
      }
    }

    return out;
  }

  function resultRows(scopeOverride) {
    if (!state.rows.length) return [];
    const scope = scopeOverride || state.resultScope;
    if (scope === 'all') return state.rows.slice();
    return state.rows.filter(r => r.hits && r.hits.length > 0);
  }

  function reanalyzeRows() {
    const globalWords = new Map();

    state.rows.forEach(row => {
      const text = String(row.text || '');
      row.text = text;

      const hits = findHits(text);
      row.hits = hits;
      row.words = [...new Set(hits.map(h => h.word))];

      row.latinHits = findLatinHits(text);

      hits.forEach(h => {
        const n = normEx(h.word);
        if (!n) return;

        const cur = globalWords.get(n);
        if (cur) cur.count++;
        else globalWords.set(n, { original: h.word, count: 1 });
      });
    });

    state.words = [...globalWords.values()].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.original.localeCompare(b.original, 'ru');
    });

    const errors = state.rows.filter(r => r.error).length;
    const inResult = resultRows().length;
    const latinTotal = state.rows.reduce((sum, r) => sum + ((r.latinHits || []).length), 0);

    setMessage(
      `Проверено строк: ${state.rows.length}. В результате: ${inResult}. ` +
      `Жёлтых уникальных слов: ${state.words.length}. Латинских фрагментов: ${latinTotal}. Ошибок: ${errors}.`
    );

    renderWords();
    renderPreview();
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setMessage(msg) {
    state.message = msg || '';
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function currentFilteredWords() {
    const f = normEx(state.wordFilter);
    return state.words.filter(w => !f || normEx(w.original).includes(f));
  }

  function renderWords() {
    const el = document.querySelector('#bx-fw-word-list');
    if (!el) return;

    const words = currentFilteredWords();
    const limit = state.showAllWords ? words.length : Math.min(150, words.length);

    if (!words.length) {
      el.innerHTML = '<div class="bx-fw-muted">Нет иностранных слов с текущими исключениями.</div>';
      return;
    }

    el.innerHTML = words.slice(0, limit).map(w =>
      `<div class="bx-fw-row">
        <span><b>${esc(w.original)}</b> <small>×${w.count}</small></span>
        <button class="small" data-act="exclude-word" data-word="${esc(w.original)}">исключить</button>
      </div>`
    ).join('') + (words.length > limit ? `<div class="bx-fw-muted">Показано ${limit} из ${words.length}. Включите «показывать все».</div>` : '');
  }

  function renderPreview() {
    const wrap = document.querySelector('#bx-fw-preview');
    if (!wrap) return;

    if (!state.rows.length) {
      wrap.innerHTML = '<div class="bx-fw-muted">Результат появится после проверки.</div>';
      return;
    }

    const rows = resultRows();

    if (!rows.length) {
      wrap.innerHTML = '<div class="bx-fw-muted">Нет строк в текущем результате. Переключите «В результат» на «Все проверенные строки» или уменьшите исключения.</div>';
      return;
    }

    let html = '<table><thead><tr><th>ID</th><th>Название</th><th>Текст</th><th>Английские слова</th><th class="bx-link">Ссылка</th></tr></thead><tbody>';

    rows.forEach(r => {
      html += '<tr>' +
        `<td>${esc(r.id)}</td>` +
        `<td>${esc(r.title)}${r.error ? ' <span class="bx-fw-muted">⚠ ' + esc(r.error) + '</span>' : ''}</td>` +
        `<td>${buildCombinedHighlightedHtml(r.text || '', r.hits || [], r.latinHits || [])}</td>` +
        `<td>${esc((r.words || []).join(', '))}</td>` +
        `<td class="bx-link"><a href="${esc(r.href)}" target="_blank" rel="noopener">открыть</a></td>` +
        '</tr>';
    });

    html += '</tbody></table>';

    if (state.resultScope === 'words') {
      html += `<div class="bx-fw-muted">Показаны только строки с жёлтыми найденными словами: ${rows.length} из ${state.rows.length}.</div>`;
    } else {
      html += `<div class="bx-fw-muted">Показаны все проверенные строки: ${rows.length}.</div>`;
    }

    wrap.innerHTML = html;
  }

  function renderFieldOptions() {
    return `<option value="DETAIL_TEXT" ${state.field === 'DETAIL_TEXT' ? 'selected' : ''}>DETAIL_TEXT (детальное описание)</option>` +
      `<option value="PREVIEW_TEXT" ${state.field === 'PREVIEW_TEXT' ? 'selected' : ''}>PREVIEW_TEXT (анонс)</option>` +
      `<option value="NAME" ${state.field === 'NAME' ? 'selected' : ''}>NAME (название)</option>` +
      `<option value="CUSTOM" ${state.field === 'CUSTOM' ? 'selected' : ''}>Другое поле…</option>`;
  }

  function renderUserChips() {
    const list = [...state.userExclusions].sort((a, b) => a.localeCompare(b, 'ru'));
    if (!list.length) return '<div class="bx-fw-muted">Своих исключений пока нет.</div>';

    return list.map(w =>
      `<span class="bx-fw-chip">${esc(w)}<button data-act="remove-ex" data-word="${esc(w)}" title="Убрать из своих исключений">×</button></span>`
    ).join('');
  }

  function defaultWordList() {
    return [...new Set(DEFAULT_EXCLUSIONS.map(normEx).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
  }

  function renderDefaultManagerSummary() {
    const all = defaultWordList();
    const removed = state.defaultRemoved.size;
    const active = all.length - removed;
    return `Стандартных всего: <b>${all.length}</b> · активно: <b>${active}</b> · убрано: <b>${removed}</b>`;
  }

  function renderDefaultList() {
    const el = document.querySelector('#bx-fw-default-list');
    const counts = document.querySelector('#bx-fw-default-counts');
    if (!el) return;

    if (counts) counts.innerHTML = renderDefaultManagerSummary();

    const all = defaultWordList();
    const f = normEx(state.defaultFilter);
    const filtered = all.filter(w => !f || w.includes(f));
    const limit = Math.min(DEFAULT_LIST_LIMIT, filtered.length);

    if (!filtered.length) {
      el.innerHTML = '<div class="bx-fw-muted">Ничего не найдено.</div>';
      return;
    }

    el.innerHTML = filtered.slice(0, limit).map(w => {
      const removed = state.defaultRemoved.has(w);
      const isUser = state.userExclusions.has(w);

      return `<div class="bx-fw-row">
        <span>
          <b>${esc(w)}</b>
          ${removed ? ' <small class="bx-fw-muted">(убрано из стандартных)</small>' : ''}
          ${isUser ? ' <small class="bx-fw-muted">(есть в своих)</small>' : ''}
        </span>
        ${removed
          ? `<button class="small" data-act="restore-default" data-word="${esc(w)}">вернуть</button>`
          : `<button class="small" data-act="remove-default" data-word="${esc(w)}">убрать</button>`
        }
      </div>`;
    }).join('') + (filtered.length > limit ? `<div class="bx-fw-muted">Показано ${limit} из ${filtered.length}. Уточните фильтр.</div>` : '');
  }

  function updateProgressDom() {
    const el = document.querySelector('#bx-fw-progress');
    if (el) el.textContent = state.progress;
  }

  function render() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    const checkedCount = state.elements.filter(e => e.checked).length;

    const body = `
      ${state.message ? `<div class="bx-fw-msg">${esc(state.message)}</div>` : ''}

      <h4>Админка Битрикс</h4>
      <div class="bx-fw-muted">
        Домен: <b>${esc(location.hostname)}</b> ·
        IBLOCK_ID: <b>${esc(state.iblockId || '—')}</b> ·
        язык: <b>${esc(state.lang)}</b> ·
        элементов: <b>${state.elements.length}</b>
        ${state.onlyChecked ? ` · отмечено: <b>${checkedCount}</b>` : ''}
      </div>

      <div class="bx-fw-inline">
        <label>Поле: <select id="bx-field">${renderFieldOptions()}</select></label>
        ${state.field === 'CUSTOM' ? `<input type="text" id="bx-custom-field" placeholder="имя поля, напр. PROPERTY_OBVOR" value="${esc(state.customField)}">` : ''}
      </div>

      <div class="bx-fw-inline">
        <label><input type="checkbox" id="bx-only-checked" ${state.onlyChecked ? 'checked' : ''}> Только отмеченные</label>
        <label><input type="checkbox" id="bx-all-pages" ${state.allPages ? 'checked' : ''}> Все страницы списка</label>
        <label><input type="checkbox" id="bx-strip-html" ${state.stripHtml ? 'checked' : ''}> Вырезать HTML-теги</label>
        <label>Выгрузка таблицы: <select id="bx-outfmt"><option value="xlsx" ${state.outFormat === 'xlsx' ? 'selected' : ''}>XLSX</option><option value="xls" ${state.outFormat === 'xls' ? 'selected' : ''}>XLS</option></select></label>
      </div>

      <button class="gray" data-act="toggle-advanced">
        ${state.showAdvanced ? '▼' : '▶'} Подсветка и состав результата
      </button>

      ${state.showAdvanced ? `
        <div class="bx-fw-inline">
          <label>
            В результат:
            <select id="bx-scope">
              <option value="words" ${state.resultScope === 'words' ? 'selected' : ''}>Только строки с найденными словами</option>
              <option value="all" ${state.resultScope === 'all' ? 'selected' : ''}>Все проверенные строки</option>
            </select>
          </label>
        </div>

        <div class="bx-fw-inline">
          <label><input type="checkbox" id="bx-latin" ${state.highlightLatin ? 'checked' : ''}> Синяя подсветка обычного латинского текста</label>
          <label>
            Мин. длина синего:
            <select id="bx-latin-len">
              <option value="1" ${state.latinMinLength === 1 ? 'selected' : ''}>1 буква</option>
              <option value="2" ${state.latinMinLength === 2 ? 'selected' : ''}>2 буквы</option>
              <option value="3" ${state.latinMinLength === 3 ? 'selected' : ''}>3 буквы</option>
            </select>
          </label>
        </div>
      ` : ''}

      <div class="bx-fw-recommend">
        Рекомендуется скачивать <b>HTML с подсветкой</b>. В XLSX и CSV подсветка не сохраняется, там будет колонка «Английские слова».
      </div>

      <div class="bx-fw-actions">
        <button data-act="check">Проверить</button>
        ${state.running ? `<button class="red" data-act="cancel">Остановить</button>` : ''}
      </div>

      ${state.running ? `<div id="bx-fw-progress" class="bx-fw-msg">${esc(state.progress)}</div>` : ''}

      <h4>Свои исключения</h4>
      <input type="text" id="bx-new-ex" placeholder="Добавить свои слова через пробел, запятую или ;">
      <div class="bx-fw-actions">
        <button class="sec" data-act="add-ex">Добавить в свои исключения</button>
        <button class="gray" data-act="reset-ex">Сбросить свои исключения</button>
      </div>
      <div class="bx-fw-chips">${renderUserChips()}</div>

      <h4>Стандартные исключения</h4>
      <div class="bx-fw-muted">Здесь только технический мусор и названия брендов. Чтобы начать искать бренд или служебное слово — уберите его кнопкой «убрать».</div>
      <button class="gray" data-act="toggle-defaults">
        ${state.showDefaultManager ? '▼' : '▶'} Открыть список стандартных исключений
      </button>

      ${state.showDefaultManager ? `
        <div class="bx-fw-inline">
          <input type="text" id="bx-default-filter" placeholder="Поиск по стандартным исключениям" value="${esc(state.defaultFilter)}">
        </div>
        <div class="bx-fw-actions">
          <button class="gray" data-act="restore-all-defaults">Вернуть все стандартные</button>
          <button class="gray" data-act="remove-shown-defaults">Убрать показанные</button>
        </div>
        <div id="bx-fw-default-counts" class="bx-fw-muted">${renderDefaultManagerSummary()}</div>
        <div id="bx-fw-default-list"></div>
      ` : ''}

      <h4>Найденные иностранные слова</h4>
      <input type="text" id="bx-word-filter" placeholder="Фильтр слов" value="${esc(state.wordFilter)}">
      <label style="display:block;margin:4px 0">
        <input type="checkbox" id="bx-show-all" ${state.showAllWords ? 'checked' : ''}>
        Показывать все слова
      </label>
      <div class="bx-fw-actions">
        <button class="sec" data-act="exclude-shown">Исключить показанные</button>
        <button class="gray" data-act="clear-words">Сбросить фильтр</button>
      </div>
      <div id="bx-fw-word-list"></div>

      <h4>Результат</h4>
      <div class="bx-fw-actions">
        <button data-act="download-html">Скачать HTML с подсветкой (текущий результат)</button>
        <button class="sec" data-act="download-html-all">Скачать HTML: вся проверка</button>
        <button class="gray" data-act="download-xlsx">Скачать ${state.outFormat === 'xls' ? 'XLS' : 'XLSX'} (текущий результат)</button>
        <button class="gray" data-act="download-xlsx-all">Скачать ${state.outFormat === 'xls' ? 'XLS' : 'XLSX'}: вся проверка</button>
        <button class="gray" data-act="download-csv">Скачать CSV (текущий результат)</button>
        <button class="gray" data-act="download-csv-all">Скачать CSV: вся проверка</button>
        <button class="gray" data-act="copy-html">Скопировать HTML</button>
        <button class="gray" data-act="clear-result">Очистить результат</button>
      </div>
      <div id="bx-fw-preview"></div>
    `;

    panel.innerHTML = `
      <header data-act="toggle">
        <b>Битрикс: английские слова v${VERSION}</b>
        <span>${state.collapsed ? '▲' : '▼'}</span>
      </header>
      <div id="bx-fw-body" style="display:${state.collapsed ? 'none' : 'block'}">${body}</div>
    `;

    renderWords();
    renderPreview();
    if (state.showDefaultManager) renderDefaultList();
  }

  function onClick(e) {
    const t = e.target.closest('[data-act]');
    if (!t) return;

    const act = t.dataset.act;

    if (act === 'toggle') { state.collapsed = !state.collapsed; render(); return; }
    if (act === 'check') { runCheck(); return; }
    if (act === 'cancel') { state.cancel = true; state.progress = 'Останавливаю…'; updateProgressDom(); return; }
    if (act === 'toggle-advanced') { state.showAdvanced = !state.showAdvanced; render(); return; }

    if (act === 'add-ex') {
      const inp = document.querySelector('#bx-new-ex');
      if (!inp || !inp.value.trim()) return;
      const added = addUserWords(inp.value);
      inp.value = '';
      setMessage(added ? 'Добавлено своих исключений: ' + added : 'Нечего добавлять.');
      render();
      return;
    }

    if (act === 'reset-ex') {
      state.userExclusions.clear();
      saveUserExclusions();
      rebuildExclusionCache();
      if (state.rows.length) reanalyzeRows();
      setMessage('Свои исключения сброшены.');
      render();
      return;
    }

    if (act === 'remove-ex') { removeUserWord(t.dataset.word); render(); return; }
    if (act === 'exclude-word') { addUserWords(t.dataset.word); render(); return; }

    if (act === 'exclude-shown') {
      const added = addUserWords(currentFilteredWords().map(w => w.original).join(' '));
      setMessage(added ? 'Добавлено в свои исключения: ' + added : 'Показанных слов нет.');
      render();
      return;
    }

    if (act === 'clear-words') { state.wordFilter = ''; renderWords(); return; }
    if (act === 'toggle-defaults') { state.showDefaultManager = !state.showDefaultManager; render(); return; }
    if (act === 'remove-default') { removeDefaultWord(t.dataset.word); render(); return; }
    if (act === 'restore-default') { restoreDefaultWord(t.dataset.word); render(); return; }

    if (act === 'restore-all-defaults') {
      restoreAllDefaults();
      setMessage('Все стандартные исключения возвращены.');
      render();
      return;
    }

    if (act === 'remove-shown-defaults') {
      if (!state.defaultFilter.trim()) {
        setMessage('Введите фильтр, чтобы убрать только показанные стандартные слова.');
        render();
        return;
      }
      const all = defaultWordList();
      const f = normEx(state.defaultFilter);
      const words = all.filter(w => !f || w.includes(f));
      words.forEach(w => state.defaultRemoved.add(w));
      saveDefaultRemoved();
      rebuildExclusionCache();
      if (state.rows.length) reanalyzeRows();
      setMessage('Убрано из стандартных исключений: ' + words.length);
      render();
      return;
    }

    if (act === 'download-xlsx') { downloadSpreadsheet(false); return; }
    if (act === 'download-xlsx-all') { downloadSpreadsheet(true); return; }
    if (act === 'download-html') { downloadHtml(false); return; }
    if (act === 'download-html-all') { downloadHtml(true); return; }
    if (act === 'download-csv') { downloadCsv(false); return; }
    if (act === 'download-csv-all') { downloadCsv(true); return; }
    if (act === 'copy-html') { copyHtml(); return; }

    if (act === 'clear-result') {
      state.rows = [];
      state.words = [];
      setMessage('Результат очищен.');
      render();
      return;
    }
  }

  function onChange(e) {
    const tg = e.target;

    if (tg.id === 'bx-field') { state.field = tg.value; render(); return; }
    if (tg.id === 'bx-only-checked') { state.onlyChecked = tg.checked; render(); return; }
    if (tg.id === 'bx-all-pages') { state.allPages = tg.checked; return; }
    if (tg.id === 'bx-outfmt') { state.outFormat = tg.value; render(); return; }
    if (tg.id === 'bx-strip-html') { state.stripHtml = tg.checked; refreshAdminCleaning(); render(); return; }
    if (tg.id === 'bx-show-all') { state.showAllWords = tg.checked; renderWords(); return; }
    if (tg.id === 'bx-scope') { state.resultScope = tg.value; render(); return; }
    if (tg.id === 'bx-latin') { state.highlightLatin = tg.checked; if (state.rows.length) reanalyzeRows(); render(); return; }
    if (tg.id === 'bx-latin-len') { state.latinMinLength = parseInt(tg.value, 10) || 1; if (state.rows.length) reanalyzeRows(); render(); return; }
  }

  function onInput(e) {
    const tg = e.target;
    if (tg.id === 'bx-custom-field') { state.customField = tg.value; return; }
    if (tg.id === 'bx-word-filter') { state.wordFilter = tg.value; renderWords(); return; }
    if (tg.id === 'bx-default-filter') { state.defaultFilter = tg.value; renderDefaultList(); return; }
  }

  function resultAoa(rowsOverride) {
    const rows = rowsOverride || resultRows();

    const head = ['ID', 'Название', 'Текст', 'Английские слова', 'Ссылка'];

    return [
      head,
      ...rows.map(r => [
        r.id || '',
        r.title || '',
        r.text || '',
        (r.words || []).join(', '),
        r.href || ''
      ])
    ];
  }

  function resultHtml(rowsOverride) {
    const rows = rowsOverride || resultRows();

    let html = '<table><thead><tr><th>ID</th><th>Название</th><th>Текст</th><th>Английские слова</th><th>Ссылка</th></tr></thead><tbody>';

    rows.forEach(r => {
      html += '<tr>' +
        `<td>${esc(r.id || '')}</td>` +
        `<td>${esc(r.title || '')}${r.error ? ' ⚠ ' + esc(r.error) : ''}</td>` +
        `<td>${buildCombinedHighlightedHtml(r.text || '', r.hits || [], r.latinHits || [])}</td>` +
        `<td>${esc((r.words || []).join(', '))}</td>` +
        `<td><a href="${esc(r.href || '')}" target="_blank" rel="noopener">открыть</a></td>` +
        '</tr>';
    });

    return html + '</tbody></table>';
  }

  function csvEscape(v) {
    const s = String(v ?? '');
    return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function downloadSpreadsheet(all = false) {
    const rows = all ? state.rows.slice() : resultRows();
    if (!rows.length) { setMessage('Нет строк для выгрузки.'); render(); return; }
    if (typeof XLSX === 'undefined') { setMessage('XLSX недоступен. Скачайте HTML с подсветкой или CSV.'); render(); return; }

    const bookType = state.outFormat === 'xls' ? 'xls' : 'xlsx';

    try {
      const aoa = resultAoa(rows);
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      ws['!cols'] = [
        { wch: 12 },
        { wch: 45 },
        { wch: 100 },
        { wch: 50 },
        { wch: 95 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Проверка');
      XLSX.writeFile(wb, 'bitrix-foreign-words-' + (all ? 'all-' : '') + stamp() + '.' + bookType, { bookType });

      setMessage((bookType === 'xls' ? 'XLS' : 'XLSX') + (all ? ' (вся проверка)' : ' (текущий результат)') + ' скачан. Для подсветки используйте HTML.');
      render();
    } catch (e) {
      setMessage('Ошибка записи: ' + (e && e.message || e));
      render();
    }
  }

  function downloadHtml(all = false) {
    const rows = all ? state.rows.slice() : resultRows();
    if (!rows.length) { setMessage('Нет строк для выгрузки.'); render(); return; }

    const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Битрикс: подсветка иностранных слов</title>
<style>
body{font:13px Arial,sans-serif;color:#171717}
table{border-collapse:collapse;width:100%}
td,th{border:1px solid #bbb;padding:6px;vertical-align:top;text-align:left;max-width:760px;overflow-wrap:anywhere;white-space:pre-wrap}
th{background:#f3f3f3}
td.bx-link,th.bx-link{max-width:none;white-space:nowrap}
mark.bx-fw-mark{border-radius:2px;padding:0 1px;color:#111 !important}
mark.bx-yellow{background:#ffe066 !important;outline:1px solid #d4a017}
mark.bx-blue{background:#9ee7ff !important;color:#002b3d !important;outline:1px solid #28a8e0}
</style>
</head>
<body>
${resultHtml(rows)}
</body>
</html>`;

    downloadBlob(html, 'bitrix-foreign-words-highlighted-' + (all ? 'all-' : '') + stamp() + '.html', 'text/html;charset=utf-8');
    setMessage('HTML с подсветкой скачан' + (all ? ' (вся проверка)' : ' (текущий результат)') + '. Это рекомендуемый формат для проверки.');
    render();
  }

  function downloadCsv(all = false) {
    const rows = all ? state.rows.slice() : resultRows();
    if (!rows.length) { setMessage('Нет строк для выгрузки.'); render(); return; }

    const csv = '\uFEFF' + resultAoa(rows).map(r => r.map(csvEscape).join(';')).join('\r\n');
    downloadBlob(csv, 'bitrix-foreign-words-' + (all ? 'all-' : '') + stamp() + '.csv', 'text/csv;charset=utf-8');
    setMessage('CSV скачан' + (all ? ' (вся проверка)' : ' (текущий результат)') + '. Для подсветки используйте HTML.');
    render();
  }

  function copyHtml() {
    const rows = resultRows();
    if (!rows.length) { setMessage('Нет строк для копирования.'); render(); return; }

    const html = resultHtml(rows);

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(html).then(() => { setMessage('HTML скопирован.'); render(); }).catch(() => fallbackCopy(html));
    } else {
      fallbackCopy(html);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();

    try { document.execCommand('copy'); setMessage('HTML скопирован.'); }
    catch (_) { setMessage('Не удалось скопировать.'); }

    ta.remove();
    render();
  }

  function stamp() {
    return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  }
})();
