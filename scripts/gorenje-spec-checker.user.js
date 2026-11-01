// ==UserScript==
// @name         Gorenje: расширенная проверка сравнения (v1.8.8)
// @namespace    https://gorenje-ru.ru/
// @version      1.8.8
// @description  Сверка Gorenje с официальным сайтом, включая поиск характеристик в текстах преимуществ.
// @updateURL    https://lintervil.github.io/price-tools/scripts/gorenje-spec-checker.user.js
// @downloadURL  https://lintervil.github.io/price-tools/scripts/gorenje-spec-checker.user.js
// @match        https://gorenje-ru.ru/compare/*
// @match        https://gorenje-ru.ru/catalog/*.html
// @match        https://gorenje-ru.ru/catalog/*/*.html
// @match        https://gorenje-ru.ru/catalog/*/*/*.html
// @match        https://gorenje-ru.ru/catalog/*/*/*/*.html
// @match        https://ru.gorenje.com/products/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @connect      ru.gorenje.com
// @connect      gorenje-ru.ru
// ==/UserScript==

(function () {
  "use strict";

  const ROW_SELECTOR = ".compare-table-block__row.js-compare-row, .characteristics__row";
  const SCRIPT_VERSION = "1.8.8";
  const PANEL_ID = "gcv-panel";
  const OFFICIAL_ORIGIN = "https://ru.gorenje.com";
  const STATUS_RANK = { ok: 0, warning: 1, error: 2 };

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFKC")
      .replace(/\u00a0/g, " ")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/(\d),(\d)/g, "$1.$2")
      .replace(/×/g, "x")
      .replace(/(\d)\s*[хХ]\s*(?=\d)/g, "$1 x ")
      .replace(/ё/g, "е")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeLabel(value) {
    return normalize(value)
      .replace(/\s+источник\s*$/, "")
      .replace(/\s*\*+\s*$/, "")
      .replace(/([вшг])х(?=[вшг])/g, "$1 x ")
      .replace(/[()[\],:;.!?—–\-/«»"']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const FIELD_MAPPING_RAW = {
    "Тип": [],
    "Тип плиты": [/^(?:категория|тип прибора)$/],
    "Тип варочной поверхности": [/^тип варочной поверхности/, /решетк/],
    "Газ-контроль духовки": [/^газ-контроль$/],
    "Газ-контроль варочной поверхности": [/^газ-контроль$/],
    "Электроподжиг духовки": [/^электроподжиг$/],
    "Электроподжиг варочной поверхности": [/^электроподжиг$/],
    "Тип духового шкафа": [/^тип духового шкафа/, /^тип духовки/],
    "Способ подключения": [/^тип питания/, /^источник энергии/, /^способ подключения/],
    "Объем рабочей камеры, л": [/^полезный объем/],
    "Объем духовки, л": [/^полезный объем/],
    "Габаритные размеры (ВxШxГ), см": [/^размеры \(ш×в×г\)/, /^габаритные размеры/],
    "Габаритные размеры ВхШхГ, см": [/^размеры \(ш×в×г\)/, /^габаритные размеры/],
    "Размеры ниши для встраивания (ВxШxГ), см": [/^мин\.\s*размеры ниши/, /ниши для встраивания/, /^размеры ниши/],
    "Размеры в упаковке (ВxШxГ), см": [/^размеры в упаковке/],
    "Размеры в упаковке ВхШхГ, см": [/^размеры в упаковке/],
    "Высота, см": [/^высота мм$/, /^высота$/],
    "Ширина, см": [/^ширина мм$/, /^ширина$/],
    "Глубина, см": [/^глубина мм$/, /^глубина$/],
    "Высота упаковки, см": [/^высота в упаковке/, /^высота упаковки/],
    "Ширина упаковки, см": [/^ширина в упаковке/, /^ширина упаковки/],
    "Глубина упаковки, см": [/^глубина в упаковке/, /^глубина упаковки/],
    "Материал панели управления": [/^материал панели управления/],
    "Материал варочной поверхности": [/^(?:материал|покрытие) варочной (?:поверхности|панели)$/],
    "Материал крышки варочной поверхности": [/^крышка/],
    "Материал дверцы": [/^материал дверцы/],
    "Цвет": [/^цвет$/],
    "Цвет фурнитуры": [/^цвет ручки/],
    "Цвет ручки дверцы": [/^цвет ручки/],
    "Шарнир дверцы": [/^шарнир дверцы/],
    "Покрытие против отпечатков пальцев": [/^защита от отпечатков/, /^fingerprint/],
    "Внутреннее покрытие духовки": [/^покрытие стенок рабочей камеры/, /^покрытие камеры/, /^эмаль/, /^пиролитическая/],
    "Освещение духовки": [/^освещение духовки/, /^освещение/],
    "Внутреннее освещение": [/^освещение духовки/, /^освещение/],
    "Дизайн": [/^дизайн/, /^линейка/, /^серия/],
    "Управление": [/^тип управления/],
    "Тип управления": [/^тип управления/],
    "Программатор": [/^программатор/],
    "Таймер": [/^программатор/, /^таймер/],
    "Тип переключателей": [],
    "Форма переключателей": [/^форма переключателей/],
    "Класс энергопотребления": [/^класс энергопотребления/],
    "Присоединительная мощность, кВт": [/^присоединительная мощность/, /^мощность подключения/],
    "Присоединительная мощность, Вт": [/^присоединительная мощность/, /^мощность подключения/],
    "Присоединительная мощность — эл., кВт": [/^присоединительная мощность/, /^мощность подключения/],
    "Максимальная температура, °С": [/^максимальная температура/],
    "Энергопотребление (классический нагрев), кВт/ч": [/^потребление электроэнергии/],
    "Потребление электроэнергии вентиляционный нагрев, кВт": [/^потребление электроэнергии/],
    "Вес без упаковки, кг": [/^вес нетто/],
    "Вес нетто, кг": [/^вес нетто/],
    "Вес брутто, кг": [/^вес брутто/],
    "Артикул": [/^артикул$/],
    "Страна-производитель": [/^страна производства/],
    "Гарантия": [/^гарантия/],
    "Система охлаждения": [/^система охлаждения/, /^динамическая система/, /^no ?frost$/],
    "Термоэлектрический предохранитель": [/^термоэлектрический предохранитель/],
    "Дверца": [/^дверца духовки/, /^дверца/],
    "Съемный стеклопакет": [/^съемный стеклопакет/, /^внутренняя поверхность дверцы/],
    "Количество стекол": [/^застекление дверцы/, /^количество стекол/],
    "Количество стекол, шт": [/^застекление дверцы/, /^количество стекол/],
    "Количество теплоотражающих слоев": [/термослой/, /^теплоотражающ/],
    "Количество теплоотражающих слоев, шт": [/термослой/, /^теплоотражающ/],
    "Решетка": [/^решетка/],
    "Мелкий противень, шт": [/^мелкий противень/],
    "Глубокий противень": [/^глубокий противень/, /^универсальный противень/],
    "Глубокий эмалированный противень": [/^глубокий противень/, /^1 глубокий/],
    "Рельефные направляющие": [/^рельефные направляющие/, /^направляющие/],
    "Тип ящика": [/^ящик плиты/],
    "Часы": [/^часы/],
    "Будильник": [/^будильник/],
    "Звуковой сигнал": [/^звуковой сигнал/],
    "Автопрограммы": [/^автопрограммы/],
    "Тип очистки": [/^очистка/, /^aquaclean/, /^тип очистки/, /^каталитическая/],
    "Очистка от накипи": [/^очистка от накипи/],
    "Индикация остаточного тепла для каждой конфорки": [/^индикация остаточного тепла/, /^индикатор остаточного тепла/],
    "Количество режимов": [/^количество программ/],
    "Количество функций духовки": [/^количество программ/],
    "Конфорки": [/^количество конфорок/],
    "Передняя левая, кВт": [/^мощность передней левой/],
    "Передняя правая, кВт": [/^мощность передней правой/],
    "Задняя левая, кВт": [/^мощность задней левой/],
    "Задняя правая, кВт": [/^мощность задней правой/],
    "Передняя левая, мм": [/^ø\s*передняя левая/],
    "Передняя правая, мм": [/^ø\s*передняя правая/],
    "Задняя левая, мм": [/^ø\s*задняя левая/],
    "Задняя правая, мм": [/^ø\s*задняя правая/],
    "Количество стеклянных полок, шт.": [/^стеклянные полки/, /^количество стеклянных полок/],
    "Количество стеклянных полок": [/^стеклянные полки/, /^количество стеклянных полок/],
    "Объем, л": [/^объем(?: л)?$/, /^объем нетто(?: л)?$/],
    "Общий объем, л": [/^общий объем(?: брутто)?(?: л)?$/],
    "Полезный объем": [/^(?:полезный объем|объем нетто)(?: л)?$/],
    "Объем нетто, л": [/^(?:полезный объем|объем нетто)(?: л)?$/],
    "Объем холодильного отделения, л": [/^объем (?:нетто )?(?:холодильного отделения|х о)(?: л)?$/],
    "Объем морозильного отделения, л": [/^объем (?:нетто )?(?:морозильного отделения|м о)(?: л)?$/],
    "Объем барабана, л": [/^объем барабана(?: л)?$/],
    "Максимальная загрузка (хлопок), кг": [/^(?:максимальная )?загрузка(?: кг)?$/],
    "Максимальное количество оборотов отжима, об./мин.": [/^(?:максимальное количество оборотов отжима|отжим)(?: об мин)?$/],
    "Способ открывания дверцы": [/^(?:способ )?(?:открытие|открывание) дверцы/],
    "Дверца открывается": [/^(?:способ )?(?:открытие|открывание) дверцы/],
    "Открывание дверцы": [/^(?:открытие|открывание) дверцы/],
    "Очистка паром": [/^(?:очистка паром|очистка aquaclean|очистка aqua clean)/],
    "Очистка": [/^очистка/, /^aquaclean/, /^каталитическая/],
    "Система интенсивной циркуляции воздуха (multi flow 360)": [/^(?:циркуляция воздуха|система интенсивной циркуляции воздуха)/],
    "Быстрое замораживание": [/^(?:включатель )?быстрое замораживание/],
    "Эко": [/^режим эко$/, /^эко$/],
    "Мощность микроволн": [/^мощность микроволн/],
    "Стеклянная тарелка поворотного стола, мм": [/^диаметр тарелки/],
    "Уровень мощности": [/^(?:уровни мощности|количество уровней мощности)/],
    "Сенсор влажности белья": [/^сенсор влажности белья/],
    "Защита от сминания (anti сrease)": [/^(?:защита от сминания|anticrease)/],
    "Присоединительная мощность, Вт": [/^(?:мощность подключения|присоединительная мощность)/],
    "Присоединительная мощность — эл., кВт": [/^(?:мощность подключения|присоединительная мощность)/],
    "Потребление электроэнергии": [/^(?:потребление|расход) электроэнергии/],
    "Расход электроэнергии": [/^(?:потребление|расход) электроэнергии/],
    "Количество температурных зон": [/^количество температурных зон/],
    "Вместимость бутылок по 0,75 л": [/^(?:вместимость бутылок|стандартные бутылки)/],
  };

  const FIELD_MAPPING = {};
  for (const [rawKey, patterns] of Object.entries(FIELD_MAPPING_RAW)) {
    FIELD_MAPPING[normalizeLabel(rawKey)] = patterns;
  }

  const CANONICAL_LABEL_RULES = [
    { key: "country", patterns: [/^страна (?:производитель|производства|изготовитель)$/] },
    { key: "article", patterns: [/^(?:артикул|код товара)$/] },
    { key: "ean", patterns: [/^(?:ean|еаn)(?: код)?$/] },
    { key: "model", patterns: [/^модель$/] },
    { key: "cooker-type", patterns: [/^тип плиты$/, /^категория$/, /^тип прибора$/] },
    { key: "oven-type", patterns: [/^тип духового шкафа$/, /^тип духовки$/] },
    { key: "programmer", patterns: [/^программатор/] },
    { key: "burners", patterns: [/^конфорки$/, /^количество конфорок$/] },
    { key: "connection-power", patterns: [/^(?:присоединительная мощность|мощность подключения)(?: эл)?$/] },
    { key: "net-weight", patterns: [/^(?:вес нетто|масса нетто)$/] },
    { key: "gross-weight", patterns: [/^(?:вес брутто|масса брутто)$/] },
    { key: "usable-volume", patterns: [/^(?:полезный объем|объем нетто|объем рабочей камеры|объем духовки|объем духового шкафа)$/] },
    { key: "total-volume", patterns: [/^(?:общий объем|общий объем брутто)$/] },
    { key: "cooling-net-volume", patterns: [/^полезный объем холодильного отделения$/, /^объем нетто х о$/] },
    { key: "cooling-gross-volume", patterns: [/^объем холодильного отделения$/, /^объем брутто х о$/] },
    { key: "freezer-net-volume", patterns: [/^полезный объем морозильного отделения$/, /^объем нетто м о$/] },
    { key: "freezer-gross-volume", patterns: [/^объем морозильного отделения$/, /^объем брутто м о$/] },
    { key: "control", patterns: [/^(?:тип )?управлени[ея]$/] },
    { key: "door-opening", patterns: [/^(?:способ )?(?:открытие|открывание) дверцы/] },
    { key: "cavity-coating", patterns: [/^(?:внутреннее покрытие духовки|покрытие стенок рабочей камеры|покрытие внутренних стенок духовки и противней)$/] },
    { key: "lighting", patterns: [/^(?:внутреннее )?освещение(?: духовки)?$/] },
    { key: "steam-cleaning", patterns: [/^(?:очистка паром|очистка aquaclean|очистка aqua clean)$/] },
    { key: "defrost", patterns: [/^размораживание(?: холодильного отделения| морозильного отделения)?$/] },
    { key: "quick-freeze", patterns: [/^(?:быстрое замораживание|включатель быстрое замораживание)/] },
    { key: "air-circulation", patterns: [/^(?:циркуляция воздуха|система интенсивной циркуляции воздуха)/] },
    { key: "adapt-tech", patterns: [/^(?:adapttech|адаптивная технология охлаждения adapttech cooling)/] },
    { key: "fresh-zone", patterns: [/^(?:зона свежести|контейнер зоны свежести)/] },
    { key: "glass-shelves", patterns: [/^(?:стеклянные полки|количество стеклянных полок)/] },
    { key: "door-shelves", patterns: [/^(?:дверные полки|количество дверных полок)/] },
    { key: "freezing-capacity", patterns: [/^мощность замораживания/] },
    { key: "steam-feature", patterns: [/^(?:обработка паром|функция пара|парогенератор steam ?tech)/] },
    { key: "motor", patterns: [/^(?:мотор|инверторный мотор)/] },
    { key: "homemade-shape", patterns: [/^(?:с|c)водчатая форма.*home ?made/] },
    { key: "bottle-count", patterns: [/^(?:вместимость бутылок|стандартные бутылки)/] },
    { key: "wooden-shelves", patterns: [/^(?:деревянные полки|деревянные полки в холодильной камере)/] },
    { key: "capacity", patterns: [/^(?:вместимость|вместимость комплектов посуды)/] },
    { key: "delay-start", patterns: [/^(?:отсрочка старта|отсрочка запуска|отсрочка окончания программы|установка окончания стирки)/] },
    { key: "child-lock", patterns: [/^(?:блокировка от детей|блокировка панели управления|блокировка управления от детей)$/] },
    { key: "water-cycle", patterns: [/^(?:расход воды за цикл|расход воды)$/] },
    { key: "water-year", patterns: [/^(?:расход воды за год|годовое потребление воды)$/] },
    { key: "energy-year", patterns: [/^(?:расход электроэнергии за год|расход электроэнергии в год|ориентировочное годовое потребление электроэнергии)$/] },
    { key: "noise-wash", patterns: [/^уровень шума (?:при|во время) стирк/] },
    { key: "noise-spin", patterns: [/^уровень шума (?:при|во время) отжима/] },
    { key: "dishwasher-drying", patterns: [/^(?:тип сушки|сушка)/] },
    { key: "height-adjustment", patterns: [/^регулировка высоты/] },
    { key: "aqua-stop", patterns: [/^(?:полная защита от протечек|total aquastop)/] },
    { key: "microwave-power", patterns: [/^мощность микроволн$/] },
    { key: "plate-diameter", patterns: [/^(?:диаметр тарелки|стеклянная тарелка поворотного стола)$/] },
    { key: "energy-class", patterns: [/^класс энергопотребления$/] },
    { key: "load", patterns: [/^(?:максимальная )?загрузка(?: хлопок)?$/] },
    { key: "spin-speed", patterns: [/^(?:максимальное количество оборотов отжима|отжим)$/] },
    { key: "noise", patterns: [/^уровень шума$/] },
    { key: "temperature-range", patterns: [/^(?:диапазон температур|температурные режимы)$/] },
  ];

  function canonicalLabel(label) {
    const key = normalizeLabel(label)
      .replace(/(?:^|\s)(?:см|мм|кг|л|вт|квт|квтч|квт ч|kwh|wh|об\s+мин|°c|градус(?:ов)?|шт)(?=\s|$)/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const rule = CANONICAL_LABEL_RULES.find((item) => item.patterns.some((pattern) => pattern.test(key)));
    return rule ? rule.key : key;
  }

  let hasRun = false;
  let hasStarted = false;
  let runInProgress = false;
  let runSequence = 0;
  let autoTimer = null;
  const officialCache = new Map();

  function isProductPage() { return window.location.pathname.includes('/catalog/'); }

  function textOf(element) {
    if (!element) return "";
    const copy = element.cloneNode(true);
    copy.querySelectorAll(".glossary-tooltip, .gcv-badge, .gcv-source, .gcv-cell-source").forEach((item) => item.remove());
    const ul = copy.querySelector('ul');
    if (ul) return Array.from(ul.querySelectorAll('li')).map(li => li.textContent.trim()).join(', ');
    return String(copy.innerText || copy.textContent || "").replace(/\s+/g, " ").trim();
  }

  function isOfficialProductPage() {
    return window.location.origin === OFFICIAL_ORIGIN && window.location.pathname.startsWith("/products/");
  }

  function officialAnchorUrl(source, label) {
    if (!source || !label) return source || "";
    try {
      const url = new URL(source);
      url.hash = `gcv-field=${encodeURIComponent(label)}`;
      return url.href;
    } catch (_) {
      return source;
    }
  }

  function focusOfficialField() {
    const requested = new URLSearchParams(window.location.hash.slice(1)).get("gcv-field");
    if (!requested) return;
    const target = normalizeLabel(requested.replace(/^функция\s*:\s*/i, ""));
    const highlight = () => {
      const names = document.querySelectorAll([
        ".products-detail__main-props-list-item-name",
        ".products-detail__tech-groups-list-item-name",
        ".products-detail__advantages-thumbs-item-text",
        ".products-detail__advantages-title",
      ].join(","));
      const matches = [...names]
        .filter((element) => {
          const name = normalizeLabel(textOf(element));
          return name === target || name.includes(target) || target.includes(name);
        })
        .map((element) => element.closest(
          ".products-detail__main-props-list-item, .products-detail__tech-groups-list-item, .products-detail__advantages-thumbs-item, .products-detail__advantages-item"
        ) || element);
      if (!matches.length) return false;

      let style = document.getElementById("gcv-anchor-style");
      if (!style) {
        style = document.createElement("style");
        style.id = "gcv-anchor-style";
        style.textContent = ".gcv-anchor-highlight{outline:3px solid #e33434!important;outline-offset:3px;background:rgba(255,72,72,.16)!important;box-shadow:0 0 0 6px rgba(255,72,72,.12)!important;transition:background .2s ease}";
        document.head.appendChild(style);
      }
      matches.forEach((element) => element.classList.add("gcv-anchor-highlight"));
      matches[0].scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => matches.forEach((element) => element.classList.remove("gcv-anchor-highlight")), 7000);
      return true;
    };

    if (highlight()) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (highlight() || attempts >= 40) window.clearInterval(timer);
    }, 500);
  }

  function numbersOf(value) {
    return (normalize(value).match(/\d+(?:\.\d+)?/g) || []).map(Number);
  }

  function numberOf(value) {
    const numbers = numbersOf(value);
    return numbers.length ? numbers[0] : null;
  }

  function isMissing(value) {
    const key = normalize(value).replace(/[\u2020*]+/g, "").trim();
    return !key || /^(?:не указано|неизвестно|[-—–])$/.test(key);
  }

  function isNegative(value) {
    const key = normalize(value);
    return /^(?:нет|no|[-—–]|false|отсутствует)$/.test(key) || key === "0";
  }

  function isPositive(value) {
    const key = normalize(value);
    return /^(?:да|есть|\+|yes|true|имеется|присутствует)$/.test(key) || key === "1";
  }

  function booleanKey(value) {
    const key = normalize(value);
    if (/^(?:да|есть|\+|yes|true|имеется|присутствует)$/.test(key) || key === "1") return "yes";
    if (/^(?:нет|no|-|false|отсутствует)$/.test(key) || key === "0") return "no";
    return "";
  }

  const PLATE_ABSENCE_MEANS_NO = [
    /^часы$/, /^будильник$/, /^звуковой сигнал$/, /^таймер$/, /^электроподжиг/,
    /^газ-контроль/, /^термоэлектрический предохранитель/, /^индикация остаточного тепла/,
    /^освещение(?: духовки)?$/, /^внутреннее освещение$/, /^съемный стеклопакет$/,
    /^съемные направляющие$/, /^рельефные направляющие$/, /^гриль$/, /^вариогриль/,
    /^пицца$/, /^автопрограммы/, /^решетка(?:\s+подставка для турки)?$/,
    /^мелкий .*противень$/, /^глубокий .*противень$/,
  ];

  function isPlateProduct(product) {
    return /плит[ауы]/i.test(product?.name || "") || /\/catalog\/plity\//i.test(product?.href || "");
  }

  const WOK_TOKEN = /(?:^|[^a-zа-яё])(?:вок|wok)(?:[^a-zа-яё]|$)/;

  function isWokField(label) { return WOK_TOKEN.test(normalizeLabel(label)); }
  function mentionsWok(value) { return WOK_TOKEN.test(normalize(value)); }

  function officialAbsenceMeansNo(rowTitle, localValue, product, context = {}) {
    if (isWokField(rowTitle
