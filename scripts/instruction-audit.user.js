// ==UserScript==
// @name         QA: Проверка инструкций на сайтах
// @namespace    qa.instruction-audit
// @version      1.2.2
// @description  Проверка отображения и вывода инструкций: шапка, категории, мобильное открытие, пагинация, названия и документы в каталоге.
// @updateURL    https://lintervil.github.io/price-tools/scripts/instruction-audit.user.js
// @downloadURL  https://lintervil.github.io/price-tools/scripts/instruction-audit.user.js
// @match        *://aeg-com.ru/*
// @match        *://www.aeg-com.ru/*
// @match        *://asko-russia.ru/*
// @match        *://www.asko-russia.ru/*
// @match        *://blanco-shop.com.ru/*
// @match        *://www.blanco-shop.com.ru/*
// @match        *://bonecrusher-shop.ru/*
// @match        *://www.bonecrusher-shop.ru/*
// @match        *://bosch-centre.ru/*
// @match        *://www.bosch-centre.ru/*
// @match        *://dedietrich-home.ru/*
// @match        *://www.dedietrich-home.ru/*
// @match        *://electrolux-home.ru/*
// @match        *://www.electrolux-home.ru/*
// @match        *://elicahome.ru/*
// @match        *://www.elicahome.ru/*
// @match        *://falmec-home.ru/*
// @match        *://www.falmec-home.ru/*
// @match        *://gorenje-ru.ru/*
// @match        *://www.gorenje-ru.ru/*
// @match        *://graude-store.ru/*
// @match        *://www.graude-store.ru/*
// @match        *://hitachi-holodilnik.ru/*
// @match        *://www.hitachi-holodilnik.ru/*
// @match        *://insinkerator-shop.ru/*
// @match        *://www.insinkerator-shop.ru/*
// @match        *://kaiser-store.ru/*
// @match        *://www.kaiser-store.ru/*
// @match        *://korting-dealer.ru/*
// @match        *://www.korting-dealer.ru/*
// @match        *://kuppers-russia.ru/*
// @match        *://www.kuppers-russia.ru/*
// @match        *://kuppersbusch-centre.ru/*
// @match        *://www.kuppersbusch-centre.ru/*
// @match        *://l-rus.ru/*
// @match        *://www.l-rus.ru/*
// @match        *://maunfeld-home.ru/*
// @match        *://www.maunfeld-home.ru/*
// @match        *://miele-store.ru/*
// @match        *://www.miele-store.ru/*
// @match        *://miele.com.ru/*
// @match        *://www.miele.com.ru/*
// @match        *://moikishop.ru/*
// @match        *://www.moikishop.ru/*
// @match        *://neff-centre.ru/*
// @match        *://www.neff-centre.ru/*
// @match        *://philips-tv.ru/*
// @match        *://www.philips-tv.ru/*
// @match        *://siemens-centre.ru/*
// @match        *://www.siemens-centre.ru/*
// @match        *://sm-rus.ru/*
// @match        *://www.sm-rus.ru/*
// @match        *://teka-ru.ru/*
// @match        *://www.teka-ru.ru/*
// @grant        GM_setClipboard
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==
(function () {
  'use strict';
  if (window.top !== window.self) return;
  const VERSION = '1.2.2';
  const STORE_KEY = 'qa_instruction_audit_v1';
  const TABLE_KEY = 'qa_instruction_audit_table_v1';
  const CHECK_COLUMNS = [
    ['header', 'Переход на страницу со всеми инструкциями'],
    ['images', 'Есть все картинки для инструкций'],
    ['mobile_stub', 'Заглушка в МОБ версии'],
    ['instruction_products', 'Для каких товаров выводятся инструкции'],
    ['pagination', 'Переход по страницам и пагинация'],
    ['names_catalog', 'Названия документов + в каталоге'],
    ['catalog_products', 'Для каких товаров выводятся в каталоге']
  ];
  const STATUS_OPTIONS = ['Не проверено', 'ОК', 'Баг', 'Нужна ручная проверка'];
  const KNOWN_DOMAINS = ['aeg-com.ru','asko-russia.ru','blanco-shop.com.ru','bonecrusher-shop.ru','bosch-centre.ru','dedietrich-home.ru','electrolux-home.ru','elicahome.ru','falmec-home.ru','gorenje-ru.ru','graude-store.ru','hitachi-holodilnik.ru','insinkerator-shop.ru','kaiser-store.ru','korting-dealer.ru','kuppers-russia.ru','kuppersbusch-centre.ru','l-rus.ru','maunfeld-home.ru','miele-store.ru','miele.com.ru','moikishop.ru','neff-centre.ru','philips-tv.ru','siemens-centre.ru','sm-rus.ru','teka-ru.ru'];
  const DOMAIN = location.hostname.replace(/^www\./, '');
  const PATH = location.pathname;
  const isInstruction = /technical-documentation|instructions|instrukts/i.test(PATH);
  const isCatalog = /\/(korting|catalog|produkty|products)\//i.test(PATH) && !isInstruction;
  const isInstructionRoot = isInstruction && PATH.replace(/\/+$/, '').split('/').length <= 2;
  const isInstructionCategory = isInstruction && !isInstructionRoot;
  const mobile = matchMedia('(max-width: 767px)').matches;
  const $ = (sel, root=document) => [...root.querySelectorAll(sel)];
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  const txt = el => clean(el?.innerText || el?.textContent || '');
  const visible = el => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  const unique = arr => [...new Set(arr)];
  const url = location.href.split('#')[0];
  const findings = [];
  const manualChecks = [
    ['mobile_doc_open', 'На мобильном телефоне клик по инструкции открывает отдельную страницу/окно'],
    ['mobile_placeholder', 'На мобильной странице есть заголовок, заглушка и кнопка «Посмотреть инструкцию»'],
    ['mobile_download', 'Кнопка «Посмотреть инструкцию» запускает скачивание файла'],
    ['pagination_works', 'Пагинация переключает страницы и показывает другой набор инструкций'],
    ['show_more_works', 'Кнопка «Показать еще» добавляет карточки инструкций'],
    ['new_in_stock_order', 'В начале списка находятся инструкции новинок, которые есть в наличии'],
    ['correct_names', 'Названия инструкций совпадают с соответствующими товарами'],
    ['discontinued_excluded', 'В каталоге нет документов для снятых с производства товаров']
  ];
  function add(id, title, status, details='') {
    findings.push({id, title, status, details});
  }
  function linkTextMatches(el, re) {
    return re.test(txt(el) + ' ' + (el.getAttribute('title') || '') + ' ' + (el.getAttribute('aria-label') || ''));
  }
  function findInstructionLinks() {
    return $('a[href]').filter(a => /technical-documentation|instructions|instrukts/i.test(a.getAttribute('href') || '') ||
      /инструкц/i.test(txt(a) + ' ' + (a.title || '')));
  }
  function testHeaderLink() {
    const candidates = findInstructionLinks().filter(a => {
      const r = a.getBoundingClientRect();
      return r.top < Math.max(250, innerHeight * 0.35) && !/\/technical-documentation\/[^/]+/.test(a.pathname || '');
    });
    const link = candidates.find(a => /инструкц/i.test(txt(a) + ' ' + a.title)) || candidates[0];
    if (link) add('header_instructions', 'В шапке есть переход на страницу инструкций', 'pass',
      `Найдено: «${txt(link) || link.title || link.href}» → ${link.getAttribute('href')}`);
    else add('header_instructions', 'В шапке есть переход на страницу инструкций', 'warn',
      'Автоматически не найдено. Проверьте верхнее меню «Информация покупателям» вручную.');
  }
  function testInstructionRoot() {
    if (!isInstructionRoot) return;
    const categoryLinks = $('a[href]').filter(a => {
      const h = a.getAttribute('href') || '';
      return /technical-documentation\/[^/?#]+\/?$/i.test(h);
    });
    const items = unique(categoryLinks.map(a => a.closest('article, li, .item, .card, .catalog-item, .technical-documentation__item, .documentation-item') || a));
    const withoutImage = items.filter(item => !$('img,picture,svg', item).some(el => {
      if (el.tagName === 'IMG') return (el.complete ? el.naturalWidth > 0 : true);
      return visible(el);
    }));
    if (!categoryLinks.length) add('instruction_categories', 'На общей странице есть категории инструкций', 'warn', 'Ссылки на категории автоматически не найдены.');
    else add('instruction_categories', 'На общей странице есть категории инструкций', 'pass', `Найдено ссылок на категории: ${categoryLinks.length}.`);
    if (items.length && withoutImage.length === 0) add('category_images', 'У всех категорий есть изображения', 'pass', `Проверено карточек/элементов: ${items.length}.`);
    else if (items.length) add('category_images', 'У всех категорий есть изображения', 'fail',
      `Элементов без найденного изображения: ${withoutImage.length} из ${items.length}. Возможна ошибка селектора — проверьте вручную.`);
    else add('category_images', 'У всех категорий есть изображения', 'warn', 'Не удалось определить карточки категорий.');
  }
  function getInstructionBlocks() {
    return $('.instruction-block__inner').map(block => {
      const productLink = block.querySelector('a.instruction-block__top-link');
      const model = txt(block.querySelector('.instruction-block__title'));
      const productName = txt(block.querySelector('.instruction-block__category'));
      const docs = $('a.instruction-link, a.instructions-all__instruction, a[href]', block)
        .filter(a => a !== productLink && (
          /инструкц/i.test(txt(a)) ||
          /\.(pdf|docx?)(?:[?#]|$)/i.test(a.getAttribute('href') || '') ||
          /\/doc-view\//i.test(a.getAttribute('href') || '')
        )).map(a => ({name:txt(a.querySelector('.instruction-link__file-name')) || txt(a),
                      href:a.href, format:txt(a.querySelector('.instruction-link__file-format'))}));
      const badgeText = txt(block.querySelector('.new, .badge, .label, [class*=new], [class*=novelty], [class*=badge]'));
      return {
        model, productName, badgeText,
        productUrl: productLink ? new URL(productLink.getAttribute('href'), location.origin).href : '',
        productCode: '',
        availability: '',
        docs,
        block
      };
    }).filter(x => x.model || x.productUrl || x.docs.length);
  }
  function fetchProductInfo(productUrl) {
    return new Promise(resolve => {
      let parsed;
      try { parsed = new URL(productUrl); } catch (_) {
        resolve({ok:false, error:'Некорректная ссылка на товар'}); return;
      }
      if (parsed.origin !== location.origin) {
        resolve({ok:false, error:'Карточка товара на другом домене'}); return;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      fetch(parsed.href, {credentials:'same-origin', signal:controller.signal, cache:'no-store'})
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.text();
        })
        .then(html => {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const statusEl = doc.querySelector('.card-info__availability');
          const codeEl = doc.querySelector('.js-card-info-product-code');
          const modelEl = doc.querySelector('h1, .card-info__title, .product-title');
          const status = clean(statusEl?.innerText || statusEl?.textContent || '');
          const code = clean(codeEl?.innerText || codeEl?.textContent || '').replace(/^Код товара:\s*/i, '');
          const title = clean(modelEl?.innerText || modelEl?.textContent || '');
          const statusNorm = status.toLowerCase().replace(/ё/g,'е');
          const isDiscontinued = /снят\s+с\s+производств|не\s+производится|снят\s+с\s+продаж/.test(statusNorm);
          const isOutOfStock = /нет\s+в\s+наличии|нет\s+в\s+продаже|ожидается|под\s+заказ/.test(statusNorm);
          const isAvailable = !isOutOfStock && !isDiscontinued && /в\s+наличии|есть\s+в\s+наличии|доступен\s+к\s+заказу/.test(statusNorm);
          resolve({ok:true, status:status || 'Статус не найден', code, title,
            isDiscontinued, isAvailable, isOutOfStock, statusFound:!!statusEl, codeFound:!!codeEl});
        })
        .catch(e => resolve({ok:false, error:e.name === 'AbortError' ? 'Тайм-аут 12 секунд' : String(e)}))
        .finally(() => clearTimeout(timeoutId));
    });
  }
  async function auditInstructionProducts() {
    const blocks = getInstructionBlocks();
    if (!blocks.length) {
      add('instruction_product_status', 'Статусы товаров, для которых опубликованы инструкции', 'warn',
          'Не найдены блоки .instruction-block__inner.');
      render();
      return;
    }
    const statusId = 'instruction_product_status';
    const updateProgress = (message, status='manual') => {
      const idx = findings.findIndex(x => x.id === statusId);
      if (idx >= 0) findings.splice(idx, 1);
      add(statusId, 'Проверка статусов товаров по ссылкам из инструкций', status, message);
      render();
    };
    updateProgress(`Найдено карточек инструкций: ${blocks.length}. Проверяю ссылки партиями по 8; для каждой карточки лимит 12 секунд…`);
    const reports = [];
    const concurrency = 8;
    for (let i = 0; i < blocks.length; i += concurrency) {
      const batch = blocks.slice(i, i + concurrency);
      const result = await Promise.all(batch.map(async item => {
        const info = await fetchProductInfo(item.productUrl);
        return {position:i + batch.indexOf(item) + 1, model:item.model, productName:item.productName, badgeText:item.badgeText, productUrl:item.productUrl,
          docs:item.docs, ...info};
      }));
      reports.push(...result);
      const done = reports.length;
      const discontinuedCount = reports.filter(x => x.ok && x.isDiscontinued).length;
      const outOfStockCount = reports.filter(x => x.ok && x.isOutOfStock).length;
      const failedCount = reports.filter(x => !x.ok || !x.statusFound).length;
      updateProgress(`Проверено ${done}/${blocks.length}. Снято с производства: ${discontinuedCount}; нет в наличии/под заказ: ${outOfStockCount}; не удалось определить статус: ${failedCount}.`);
    }
    const discontinued = reports.filter(x => x.ok && x.isDiscontinued);
    const available = reports.filter(x => x.ok && x.isAvailable);
    const outOfStock = reports.filter(x => x.ok && x.isOutOfStock);
    const failed = reports.filter(x => !x.ok || !x.statusFound);
    const lines = reports.map(x => {
      const state = !x.ok ? `ОШИБКА ЗАПРОСА (${x.error || 'неизвестно'})` :
        !x.statusFound ? 'СТАТУС НЕ НАЙДЕН' :
        x.isDiscontinued ? 'СНЯТ С ПРОИЗВОДСТВА' :
        x.isAvailable ? 'В НАЛИЧИИ' :
        x.isOutOfStock ? 'НЕТ В НАЛИЧИИ / ПОД ЗАКАЗ' : x.status;
      return `${x.model || x.title || 'Модель не указана'} — ${state}; код: ${x.code || 'не найден'}; документы: ${(x.docs||[]).length}; ${x.productUrl || ''}`;
    });
    const summary = `Проверено: ${reports.length}/${blocks.length}; в наличии: ${available.length}; снято с производства: ${discontinued.length}; нет в наличии/под заказ: ${outOfStock.length}; статус не определён: ${failed.length}.\n\n` + lines.join('\n');
    const index = findings.findIndex(x => x.id === statusId);
    if (index >= 0) findings.splice(index, 1);
    add(statusId, 'Статусы товаров, для которых опубликованы инструкции',
        (discontinued.length || outOfStock.length) ? 'fail' : failed.length ? 'warn' : 'pass', summary);
    if (discontinued.length) {
      add('instructions_for_discontinued', 'Инструкции связаны со снятыми с производства товарами', 'fail',
          discontinued.map(x => `${x.model || x.title}: ${x.status}; код ${x.code || 'не найден'}; ${x.productUrl}`).join('\n'));
    }
    if (outOfStock.length) {
      add('instructions_for_out_of_stock', 'Инструкции связаны с товарами не в наличии', 'warn',
          outOfStock.map(x => `${x.model || x.title}: ${x.status}; код ${x.code || 'не найден'}; ${x.productUrl}`).join('\n'));
    }
    const normalizeModel = value => clean(value).toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]/gi,'');
    const nameMismatches = reports.filter(x => x.ok && x.title && x.model && (() => {
      const model = normalizeModel(x.model);
      const title = normalizeModel(x.title);
      return model.length >= 4 && !title.includes(model) && !model.includes(title);
    })());
    const nameIdx = findings.findIndex(x => x.id === 'instruction_names_manual');
    if (nameIdx >= 0) findings.splice(nameIdx, 1);
    add('instruction_names_manual', 'Названия инструкций соответствуют товарам',
      failed.length ? 'warn' : nameMismatches.length ? 'fail' : 'pass',
      `${nameMismatches.length ? 'Возможные несовпадения модели и карточки: ' + nameMismatches.length : 'Явных несовпадений модели не найдено'}. ` +
      (failed.length ? `Не удалось открыть/проверить ${failed.length} карточек, результат частичный. ` : '') +
      (nameMismatches.length ? nameMismatches.map(x => `Инструкция «${x.model}» → карточка «${x.title}» (${x.productUrl})`).join('\n') : 'Сравнение основано на коде модели в заголовке; проверьте предупреждения, если модель не указана в H1.'));

    const newAvailable = reports.filter(x => x.ok && x.isAvailable && /новин|new product/i.test((x.badgeText || '') + ' ' + (x.model || '') + ' ' + (x.productName || '')));
    const availablePositions = reports.filter(x => x.ok && x.isAvailable).map(x => x.position);
    const unavailablePositions = reports.filter(x => x.ok && (x.isDiscontinued || x.isOutOfStock)).map(x => x.position);
    const orderIdx = findings.findIndex(x => x.id === 'category_order_manual');
    if (orderIdx >= 0) findings.splice(orderIdx, 1);
    let orderStatus = 'warn';
    let orderDetails = '';
    if (newAvailable.length) {
      const firstOtherPosition = unavailablePositions.length ? Math.min(...unavailablePositions) : Infinity;
      const lastNewPosition = Math.max(...newAvailable.map(x => x.position));
      const misplaced = newAvailable.filter(x => x.position > firstOtherPosition);
      orderStatus = misplaced.length ? 'fail' : 'pass';
      orderDetails = `Найдено отмеченных «новинка» товаров в наличии: ${newAvailable.length}. ` +
        (misplaced.length ? `Некоторые стоят ниже товаров не в наличии/снятых с производства: ${misplaced.map(x => `${x.model} (позиция ${x.position})`).join(', ')}.` :
        'Отмеченные новинки в наличии расположены выше товаров не в наличии/снятых с производства.');
    } else {
      const firstUnavailable = unavailablePositions.length ? Math.min(...unavailablePositions) : Infinity;
      const laterAvailable = availablePositions.filter(p => p > firstUnavailable);
      orderStatus = laterAvailable.length ? 'fail' : 'warn';
      orderDetails = laterAvailable.length ? `Найдено ${laterAvailable.length} товаров в наличии ниже товаров не в наличии/снятых с производства. Но наличие отметки «новинка» автоматически не распознано, поэтому именно сортировку новинок нужно подтвердить вручную.` :
        'Карточки товаров проверены, но отметки «новинка» не распознаны. Автоматически можно оценить только порядок по наличию; статус новинки требует подтверждения.';
    }
    add('category_order_manual', 'Сортировка: новинки в наличии идут первыми', orderStatus, orderDetails);

    const codes = reports.filter(x => x.ok && x.code).map(x => x.code);
    const repeatedCodes = codes.filter((v,i) => codes.indexOf(v) !== i);
    if (repeatedCodes.length) {
      add('duplicate_product_codes', 'Повторяющиеся коды товаров среди инструкций', 'warn', unique(repeatedCodes).join(', '));
    }
    window.__qaInstructionProductAudit = reports.map(({block, ...rest}) => rest);
    render();
  }
  function testInstructionCategory() {
    if (!isInstructionCategory) return;
    const cards = unique($('a[href]').filter(a => {
      const h = a.getAttribute('href') || '';
      return /\.(pdf|docx?)(?:[?#]|$)/i.test(h) || /instruction|technical-documentation|manual/i.test(h);
    }).map(a => a.closest('article, li, .item, .card, .catalog-item, .product-item, .documentation-item') || a));
    const pagination = $('a,button').filter(el => /следующ|назад|вперед|далее|страниц|показать еще|показать ещё|загрузить еще|загрузить ещё/i.test(txt(el)));
    if (cards.length) add('instruction_cards', 'На странице категории отображаются инструкции', 'pass', `Найдено возможных карточек/ссылок: ${cards.length}.`);
    else add('instruction_cards', 'На странице категории отображаются инструкции', 'warn', 'Автоматически не найдены ссылки на файлы/карточки инструкций.');
    if (pagination.length) add('pagination_controls', 'Есть элементы пагинации или «Показать еще»', 'pass',
      unique(pagination.map(txt)).slice(0, 8).join('; '));
    else add('pagination_controls', 'Есть элементы пагинации или «Показать еще»', 'warn', 'Элементы пагинации не найдены. Если список короткий, проверьте вручную.');
    add('category_order_manual', 'Сортировка: новинки в наличии идут первыми', 'manual', 'Автоматическая проверка выполнится после нажатия «Проверить товары из инструкций».');
    add('instruction_names_manual', 'Названия инструкций соответствуют товарам', 'manual', 'Автоматическая сверка выполнится после открытия карточек товаров.');
  }
  function testCatalog() {
    if (!isCatalog) return;
    const cards = unique($('a[href]').filter(a => /\/[^/]+\.html?(?:[?#]|$)/i.test(a.getAttribute('href') || '') &&
      (a.closest('.product, .product-item, .catalog-item, .catalog__item, .products__item, article') || /korting\//i.test(a.href)))
      .map(a => a.closest('.product, .product-item, .catalog-item, .catalog__item, .products__item, article') || a));
    const docLinks = $('a[href]').filter(a => /\.(pdf|doc|docx)(?:[?#]|$)/i.test(a.href) || /инструкц/i.test(txt(a) + ' ' + (a.title || '')));
    if (docLinks.length) add('catalog_documents', 'В каталоге есть ссылки на документы/инструкции', 'pass', `Найдено ссылок: ${docLinks.length}.`);
    else add('catalog_documents', 'В каталоге есть ссылки на документы/инструкции', 'warn', 'На этой странице ссылки на документы автоматически не обнаружены.');
    if (cards.length) {
      const discontinued = cards.filter(c => /снят[аоы]?\s+с\s+производств|не\s+производится|архив|снят[аоы]?\s+с\s+продаж/i.test(txt(c)));
      add('discontinued_products', 'Документы не выводятся у снятых с производства товаров', discontinued.length ? 'fail' : 'manual',
        discontinued.length ? `В карточках с явными отметками снятия найдено: ${discontinued.length}.` :
        `Найдено карточек: ${cards.length}; автоматическая проверка статуса производства ненадёжна, проверьте товары вручную.`);
    } else add('discontinued_products', 'Документы не выводятся у снятых с производства товаров', 'manual',
      'Карточки товаров автоматически не определены; проверьте, например, KDI-4530.');
  }
  function testMobileDocumentPage() {
    const title = txt(document.querySelector('h1, h2, .title, .page-title'));
    const buttons = $('a,button').filter(el => /посмотреть инструкц/i.test(txt(el)));
    const pdfLinks = $('a[href]').filter(a => /\.(pdf|docx?)(?:[?#]|$)/i.test(a.href));
    if (/\.(pdf|docx?)(?:[?#]|$)/i.test(location.pathname)) {
      add('mobile_doc_view', 'Открыта HTML-страница инструкции на мобильном устройстве', 'warn',
        'Сейчас URL похож на прямой файл документа; ожидается промежуточная HTML-страница.');
    } else if (buttons.length) {
      add('mobile_doc_button', 'Есть кнопка «Посмотреть инструкцию»', 'pass', `Заголовок: ${title || 'не найден'}`);
      add('mobile_doc_stub', 'Есть заглушка/промежуточная страница', title ? 'pass' : 'warn',
        title ? `Заголовок страницы: ${title}` : 'Не найден заголовок страницы.');
      add('mobile_doc_download', 'Кнопка связана с файлом инструкции', pdfLinks.length ? 'pass' : 'manual',
        pdfLinks.length ? `Найдено ссылок на документы: ${pdfLinks.length}.` : 'Проверьте, что кнопка действительно скачивает файл.');
    }
  }
  function runTests() {
    testHeaderLink();
    testInstructionRoot();
    testInstructionCategory();
    testCatalog();
    testMobileDocumentPage();
    if (mobile && isInstructionCategory) {
      add('mobile_doc_flow', 'Мобильный сценарий открытия инструкции', 'manual',
        'Откройте конкретную инструкцию с телефона и проверьте новую страницу, заглушку и скачивание.');
    }
  }
  const style = document.createElement('style');
  style.textContent = `
  #qa-instruction-audit{position:fixed;z-index:2147483647;right:12px;bottom:12px;width:min(440px,calc(100vw - 24px));max-height:78vh;overflow:auto;background:#fff;color:#222;border:1px solid #bbb;border-radius:10px;box-shadow:0 5px 28px #0004;font:13px/1.4 Arial,sans-serif}
  #qa-instruction-audit *{box-sizing:border-box}
  #qa-instruction-audit .qa-head{position:sticky;top:0;background:#f5f7f8;padding:10px 12px;border-bottom:1px solid #ddd;display:flex;align-items:center;gap:8px}
  #qa-instruction-audit .qa-title{font-weight:700;flex:1}
  #qa-instruction-audit button{cursor:pointer;border:1px solid #bbb;background:#fff;color:#222;border-radius:5px;padding:5px 8px;font:inherit}
  #qa-instruction-audit .qa-body{padding:10px 12px}
  #qa-instruction-audit .qa-meta{font-size:11px;color:#555;overflow-wrap:anywhere;margin-bottom:8px}
  #qa-instruction-audit .qa-row{border-top:1px solid #eee;padding:8px 0}
  #qa-instruction-audit .qa-row strong{display:block}
  #qa-instruction-audit .qa-status{font-size:10px;font-weight:bold;text-transform:uppercase;margin-right:6px}
  #qa-instruction-audit .pass{color:#137333} #qa-instruction-audit .fail{color:#b3261e} #qa-instruction-audit .warn{color:#9a6700} #qa-instruction-audit .manual{color:#555}
  #qa-instruction-audit .qa-details{color:#555;margin:3px 0 0;overflow-wrap:anywhere}
  #qa-instruction-audit textarea{width:100%;min-height:48px;resize:vertical;margin-top:4px;border:1px solid #ccc;border-radius:5px;padding:6px;font:inherit}
  #qa-instruction-audit .qa-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  #qa-instruction-audit .qa-actions button.primary{background:#222;color:#fff}
  #qa-instruction-audit .qa-hide{display:none}
  #qa-instruction-audit select{max-width:100%;font:inherit;padding:4px;border:1px solid #ccc;border-radius:4px}
  #qa-qa-table-overlay{position:fixed;inset:0;z-index:2147483647;background:#0008;display:flex;align-items:center;justify-content:center;padding:12px}
  #qa-qa-table-overlay .qa-table-window{background:#fff;color:#222;width:min(98vw,1400px);max-height:94vh;overflow:auto;border-radius:10px;padding:14px;font:12px/1.4 Arial,sans-serif}
  #qa-qa-table-overlay .qa-table-head{display:flex;gap:8px;align-items:center;position:sticky;top:-14px;background:#fff;padding:5px 0 10px;z-index:2}
  #qa-qa-table-overlay .qa-table-wrap{overflow:auto}
  #qa-qa-table-overlay table{border-collapse:collapse;min-width:1100px;width:100%}
  #qa-qa-table-overlay th,#qa-qa-table-overlay td{border:1px solid #ddd;padding:6px;vertical-align:top;text-align:left}
  #qa-qa-table-overlay th{background:#f2f4f5;position:sticky;top:34px}
  #qa-qa-table-overlay textarea{min-width:180px;min-height:54px;font:inherit}
  `;
  document.documentElement.appendChild(style);

  function loadSaved() {
    try { return typeof GM_getValue === 'function' ? (GM_getValue(STORE_KEY, {}) || {}) : JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (_) { return {}; }
  }
  function saveSaved(data) {
    try { if (typeof GM_setValue === 'function') GM_setValue(STORE_KEY, data); else localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (_) {}
  }
  function loadTable() {
    try { return typeof GM_getValue === 'function' ? (GM_getValue(TABLE_KEY, {}) || {}) : JSON.parse(localStorage.getItem(TABLE_KEY) || '{}'); } catch (_) { return {}; }
  }
  function saveTable(data) {
    try { if (typeof GM_setValue === 'function') GM_setValue(TABLE_KEY, data); else localStorage.setItem(TABLE_KEY, JSON.stringify(data)); } catch (_) {}
  }
  function defaultTableRow(domain) {
    return {domain, statuses:Object.fromEntries(CHECK_COLUMNS.map(([key]) => [key, 'Не проверено'])), comment:'', updatedAt:''};
  }
  function csvEscape(value) { return '"' + String(value ?? '').replace(/"/g, '""') + '"'; }
  function exportTableCSV() {
    const table = loadTable();
    KNOWN_DOMAINS.forEach(domain => { if (!table[domain]) table[domain] = defaultTableRow(domain); });
    if (!table[DOMAIN]) table[DOMAIN] = defaultTableRow(DOMAIN);
    saveTable(table);
    const headers = ['Сайт', ...CHECK_COLUMNS.map(x => x[1]), 'Комментарий', 'Дата обновления'];
    const rows = Object.values(table).sort((a,b) => a.domain.localeCompare(b.domain, 'ru')).map(r => [r.domain, ...CHECK_COLUMNS.map(([key]) => r.statuses?.[key] || 'Не проверено'), r.comment || '', r.updatedAt || '']);
    const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(csvEscape).join(';')).join('\r\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `qa-instructions-table-${new Date().toISOString().slice(0,10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function openTable() {
    const table = loadTable();
    KNOWN_DOMAINS.forEach(domain => { if (!table[domain]) table[domain] = defaultTableRow(domain); });
    if (!table[DOMAIN]) table[DOMAIN] = defaultTableRow(DOMAIN);
    saveTable(table);
    document.getElementById('qa-qa-table-overlay')?.remove();
    const overlay = document.createElement('div'); overlay.id = 'qa-qa-table-overlay';
    const windowEl = document.createElement('div'); windowEl.className = 'qa-table-window';
    const head = document.createElement('div'); head.className = 'qa-table-head';
    const title = document.createElement('strong'); title.textContent = 'Общая таблица QA инструкций'; title.style.flex = '1'; head.appendChild(title);
    const exportBtn = document.createElement('button'); exportBtn.textContent = 'Экспорт CSV для Excel'; exportBtn.onclick = exportTableCSV; head.appendChild(exportBtn);
    const closeBtn = document.createElement('button'); closeBtn.textContent = 'Закрыть'; closeBtn.onclick = () => overlay.remove(); head.appendChild(closeBtn); windowEl.appendChild(head);
    const info = document.createElement('p'); info.textContent = 'Статусы сохраняются в Tampermonkey и доступны между поддерживаемыми сайтами. Выберите статус для каждого пункта; комментарии сохраняются автоматически после изменения.'; windowEl.appendChild(info);
    const wrap = document.createElement('div'); wrap.className = 'qa-table-wrap'; const tbl = document.createElement('table');
    const thead = document.createElement('thead'); const trh = document.createElement('tr'); ['Сайт', ...CHECK_COLUMNS.map(x => x[1]), 'Комментарий'].forEach(label => { const th = document.createElement('th'); th.textContent = label; trh.appendChild(th); }); thead.appendChild(trh); tbl.appendChild(thead);
    const tbody = document.createElement('tbody');
    Object.values(table).sort((a,b) => (a.domain === DOMAIN ? -1 : b.domain === DOMAIN ? 1 : a.domain.localeCompare(b.domain, 'ru'))).forEach(row => {
      const tr = document.createElement('tr'); const tdDomain = document.createElement('td'); const link = document.createElement('a'); link.href = `https://${row.domain}/technical-documentation/`; link.textContent = row.domain; link.target = '_blank'; tdDomain.appendChild(link); tr.appendChild(tdDomain);
      CHECK_COLUMNS.forEach(([key]) => { const td = document.createElement('td'); const sel = document.createElement('select'); STATUS_OPTIONS.forEach(status => { const opt = document.createElement('option'); opt.value = status; opt.textContent = status; sel.appendChild(opt); }); sel.value = row.statuses?.[key] || 'Не проверено'; sel.onchange = () => { const all = loadTable(); all[row.domain] ||= defaultTableRow(row.domain); all[row.domain].statuses ||= {}; all[row.domain].statuses[key] = sel.value; all[row.domain].updatedAt = new Date().toLocaleString(); saveTable(all); }; td.appendChild(sel); tr.appendChild(td); });
      const tdNote = document.createElement('td'); const note = document.createElement('textarea'); note.placeholder = 'Описание бага / что проверить'; note.value = row.comment || ''; note.onchange = () => { const all = loadTable(); all[row.domain] ||= defaultTableRow(row.domain); all[row.domain].comment = note.value; all[row.domain].updatedAt = new Date().toLocaleString(); saveTable(all); }; tdNote.appendChild(note); tr.appendChild(tdNote); tbody.appendChild(tr);
    }); tbl.appendChild(tbody); wrap.appendChild(tbl); windowEl.appendChild(wrap); overlay.appendChild(windowEl); overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); }); document.body.appendChild(overlay);
  }
  const saved = loadSaved();
  runTests();

  const panel = document.createElement('section');
  panel.id = 'qa-instruction-audit';
  panel.innerHTML = `<div class="qa-head"><span class="qa-title">QA инструкций v${VERSION}</span><button type="button" data-act="collapse">Свернуть</button><button type="button" data-act="close">×</button></div>
  <div class="qa-body"><div class="qa-meta"></div><div class="qa-results"></div><label>Заметка по странице<textarea data-note placeholder="Например: KDI-4530 снята с производства, но инструкция отображается"></textarea></label>
  <div class="qa-actions"><button type="button" data-act="table">Общая таблица</button><button type="button" data-act="csv">Экспорт таблицы CSV</button><button type="button" class="primary" data-act="save">Сохранить проверку</button><button type="button" data-act="export">Экспорт JSON</button><button type="button" data-act="audit-products">Проверить товары из инструкций</button><button type="button" data-act="copy">Копировать URL</button><button type="button" data-act="reset">Очистить результаты</button></div></div>`;
  document.body.appendChild(panel);
  panel.querySelector('.qa-meta').textContent = `${DOMAIN} · ${PATH} · ${mobile ? 'мобильная ширина' : 'десктопная ширина'} · ${new Date().toLocaleString()}`;
  panel.querySelector('[data-note]').value = saved[url]?.note || '';

  const labels = {pass:'OK',fail:'ОШИБКА',warn:'ПРОВЕРИТЬ',manual:'ВРУЧНУЮ'};
  const resultBox = panel.querySelector('.qa-results');
  function render() {
    resultBox.innerHTML = '';
    findings.forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'qa-row';
      row.innerHTML = `<span class="qa-status ${f.status}">${labels[f.status] || f.status}</span><strong></strong><div class="qa-details"></div>`;
      row.querySelector('strong').textContent = f.title;
      row.querySelector('.qa-details').textContent = f.details;
      resultBox.appendChild(row);
    });
    if (!findings.length) resultBox.textContent = 'Для этого типа страницы автоматические проверки не определены.';
  }
  render();

  function record() {
    return {
      domain: DOMAIN, url, path: PATH, pageType: isInstructionRoot ? 'instruction-root' :
      isInstructionCategory ? 'instruction-category' : isCatalog ? 'catalog' : 'other',
      viewport: {width: innerWidth, height: innerHeight, mobileWidth: mobile},
      checkedAt: new Date().toISOString(),
      automaticResults: findings,
      instructionProductAudit: window.__qaInstructionProductAudit || [],
      manualChecks: manualChecks.map(([id, title]) => ({id, title, status:'not_checked'})),
      note: panel.querySelector('[data-note]').value
    };
  }
  panel.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'close') panel.remove();
    if (act === 'collapse') {
      const body = panel.querySelector('.qa-body');
      const hidden = !body.classList.contains('qa-hide');
      body.classList.toggle('qa-hide', hidden);
      btn.textContent = hidden ? 'Развернуть' : 'Свернуть';
    }
    if (act === 'table') openTable();
    if (act === 'csv') exportTableCSV();
    if (act === 'save') {
      const table = loadTable();
      const row = table[DOMAIN] || defaultTableRow(DOMAIN);
      row.comment = panel.querySelector('[data-note]').value;
      row.updatedAt = new Date().toLocaleString();
      const autoMap = {header:'header_instructions', images:'category_images', instruction_products:'instruction_product_status', pagination:'pagination_controls', names_catalog:'instruction_names_manual', catalog_products:'discontinued_products'};
      Object.entries(autoMap).forEach(([column, id]) => { const f = findings.find(x => x.id === id); if (!f) return; if (row.statuses[column] === 'Не проверено') row.statuses[column] = f.status === 'pass' ? 'ОК' : f.status === 'fail' ? 'Баг' : 'Нужна ручная проверка'; });
      table[DOMAIN] = row; saveTable(table);
      const data = loadSaved();
      data[url] = record();
      saveSaved(data);
      btn.textContent = 'Сохранено';
      setTimeout(() => { if (btn.isConnected) btn.textContent = 'Сохранить проверку'; }, 1200);
    }
    if (act === 'export') {
      const data = loadSaved();
      data[url] = record();
      saveSaved(data);
      const blob = new Blob([JSON.stringify({exportedAt:new Date().toISOString(),checks:Object.values(data)}, null, 2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `qa-instructions-${DOMAIN}-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    if (act === 'audit-products') {
      btn.disabled = true;
      btn.textContent = 'Проверяю товары…';
      await auditInstructionProducts();
      btn.disabled = false;
      btn.textContent = 'Проверить товары из инструкций';
    }
    if (act === 'copy') {
      try { await navigator.clipboard.writeText(url); btn.textContent = 'URL скопирован'; }
      catch (_) { prompt('Скопируйте URL:', url); }
    }
    if (act === 'reset') {
      if (confirm('Очистить сохранённые результаты проверки на этом сайте?')) {
        const data = loadSaved();
        delete data[url];
        saveSaved(data);
        panel.querySelector('[data-note]').value = '';
      }
    }
  });
})();
