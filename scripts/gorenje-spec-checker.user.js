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
    if (isWokField(rowTitle)) return isNegative(localValue);
    if (!isPlateProduct(product) || !isNegative(localValue)) return false;
    const key = normalizeLabel(rowTitle);
    if (key === "газ-контроль духовки") {
      const ovenEnergy = energyType(context.ovenType || product?.name || product?.href);
      return ovenEnergy === "electric";
    }
    if (key === "газ-контроль варочной поверхности") {
      const surfaceEnergy = energyType(context.surfaceType || product?.name || product?.href);
      return surfaceEnergy === "electric";
    }
    return PLATE_ABSENCE_MEANS_NO.some((pattern) => pattern.test(key));
  }

  function isCleaningField(label) { return /^очистк/.test(normalizeLabel(label)); }
  function isTraditionalCleaning(value) { return /традицион|обычн|стандартн/.test(normalize(value)); }
  function isSteamCleaning(value) { return /пар|aquaclean|aqua clean|steam/.test(normalize(value)); }

  function isDisabledCleaningEntry(entry) {
    const label = normalizeLabel(entry?.label);
    return isNegative(entry?.value) && /очистк|каталит|пиролит|aquaclean|aqua clean|пар|steam/.test(label);
  }

  function isActiveCleaningEntry(entry) {
    const text = normalize(`${entry?.label || ""} ${entry?.value || ""}`);
    if (/пиролитическ[а-яё]*\s+эмаль/.test(text)) return false;
    if (!/очистк|каталит|пиролит|aquaclean|aqua clean|пар|steam/.test(text)) return false;
    return !isNegative(entry?.value);
  }

  function officialAbsenceMeansTraditionalCleaning(rowTitle, localValue, product) {
    return isPlateProduct(product) && isCleaningField(rowTitle) && isTraditionalCleaning(localValue);
  }

  function isEnergyTypeWord(value) {
    const key = normalize(value);
    return /^(?:газов(?:ая|ый|ое|ых)?|электрическ[а-я]*|индукционн[а-я]*|комбинированн[а-я]*)$/.test(key);
  }

  function energyType(value) {
    const key = normalize(value);
    if (/комбинирован/.test(key)) return "combined";
    if (/газ/.test(key)) return "gas";
    if (/электр/.test(key)) return "electric";
    return "";
  }

  function inferredOvenEnergy(plateType, surfaceType) {
    if (energyType(plateType) === "combined" && energyType(surfaceType) === "gas") return "electric";
    return "";
  }

  function isGasIgnitionPowerException(localTitle, localValue, plateType) {
    return canonicalLabel(localTitle) === "connection-power"
      && energyType(plateType) === "gas"
      && numbersOf(localValue).length === 1
      && Math.abs(numberOf(localValue) - 0.005) < 0.000001;
  }

  function gasFeatureKind(label) {
    const key = normalizeLabel(label);
    if (key === "газ-контроль духовки") return "oven-gas-control";
    if (key === "электроподжиг духовки") return "oven-ignition";
    if (key === "газовый нагрев снизу") return "gas-heating";
    if (key === "тип газового нагрева") return "gas-heating-type";
    return "";
  }

  function isFastHeatingField(label) {
    return /^быстрый\s+(?:нагрев|разогрев)\s+духовки$/.test(normalizeLabel(label));
  }

  function gasHeatingEntry(entries) {
    const matches = entries.filter((entry) => /газов[а-яё]*\s+нагрев/.test(normalize(`${entry.label} ${entry.value}`)));
    return matches.find((entry) => /газов[а-яё]*\s+нагрев/.test(normalizeLabel(entry.label))) || matches[0] || null;
  }

  function gasHeatingTypeValue(entry) {
    const sourceText = `${entry.label || ""} ${entry.value || ""}`;
    return sourceText.match(/газов[а-яё]*\s+нагрев\s*\(([^)]+)\)/i)?.[1]?.trim() || entry.value;
  }

  function findGasFeatureReference(localTitle, official, ovenType) {
    const kind = gasFeatureKind(localTitle);
    if (!kind) return null;

    const ovenEnergy = energyType(ovenType);
    if (kind === "oven-ignition" && ovenEnergy !== "gas") {
      return {
        entry: {
          label: "Электроподжиг духовки",
          value: "Не применяется при электрической духовке",
          sourceUrl: official.url,
        },
        localMeta: null,
        kind: "oven-gas-feature-absence",
      };
    }

    const entries = official.entries || [];
    if (kind === "oven-ignition") {
      const entry = entries.find((item) => /^электроподжиг$/.test(normalizeLabel(item.label)));
      if (entry) return { entry, localMeta: null, kind };
    }

    if (ovenEnergy !== "gas") {
      return {
        entry: {
          label: "Тип духового шкафа",
          value: ovenType || "не указан",
          sourceUrl: official.url,
        },
        localMeta: null,
        kind: "oven-gas-feature-absence",
      };
    }

    const entry = kind === "oven-gas-control"
      ? entries.find((item) => /газ-контроль/.test(normalizeLabel(item.label))
        && /духов/.test(normalize(`${item.label} ${item.value} ${item.group || ""}`)))
      : kind === "oven-ignition"
        ? entries.find((item) => /^электроподжиг$/.test(normalizeLabel(item.label)))
        : gasHeatingEntry(entries);
    if (entry && kind === "gas-heating-type") {
      return {
        entry: {
          ...entry,
          label: "Тип газового нагрева",
          value: gasHeatingTypeValue(entry),
          anchorLabel: entry.label,
        },
        localMeta: null,
        kind,
      };
    }
    return entry ? { entry, localMeta: null, kind } : null;
  }

  function programmerType(value) {
    const key = normalize(value);
    if (/сенсор|электрон|цифров|touch|slider/.test(key)) return "electronic";
    if (/механическ|поворотн|механич|таймер/.test(key)) return "mechanical";
    return "";
  }

  function programmerFieldKind(label) {
    const key = normalizeLabel(label);
    if (key === "программатор") return "programmer";
    if (key === "таймер") return "timer";
    return "";
  }

  function programmerEntryScope(entry) {
    const label = normalizeLabel(entry?.label);
    const value = normalize(entry?.value);
    const combinedLabel = /программатор\s+таймер|таймер\s+программатор/.test(label);
    const text = combinedLabel ? value : `${label} ${value}`;
    return {
      programmer: /программатор/.test(text),
      timer: /таймер/.test(text),
    };
  }

  function surfaceMaterial(value) {
    const k = normalize(value);
    if (/чугун/.test(k)) return "чугун";
    if (/стеклокерам/.test(k)) return "стеклокерамика";
    if (/нержавеющ|сталь/.test(k)) return "сталь";
    if (/эмаль/.test(k)) return "эмаль";
    if (/алюмин/.test(k)) return "алюминий";
    if (/стекло/.test(k)) return "стекло";
    if (/керамик/.test(k)) return "керамика";
    return "";
  }

  function unitInfo(value) {
    const key = normalize(value);
    if (/(?:^|[\s,(])(?:квтч|квт\/ч|kwh)(?:$|[\s,.)])/.test(key)) return { group: "energy", factor: 1, name: "кВт·ч" };
    if (/(?:^|[\s,(])квт(?:$|[\s,.)])/.test(key)) return { group: "power", factor: 1000, name: "кВт" };
    if (/(?:^|[\s,(])вт(?:$|[\s,.)])/.test(key)) return { group: "power", factor: 1, name: "Вт" };
    if (/(?:^|[\s,(])(?:мм|миллиметр|милиметр)(?:а|ов|ы|$|[\s,.)])/.test(key)) return { group: "length", factor: 1, name: "мм" };
    if (/(?:^|[\s,(])(?:см|сантиметр)(?:а|ов|ы|$|[\s,.)])/.test(key)) return { group: "length", factor: 10, name: "см" };
    if (/(?:^|[\s,(])кг(?:$|[\s,.)])/.test(key)) return { group: "weight", factor: 1, name: "кг" };
    if (/(?:^|[\s,(])л(?:$|[\s,.)])/.test(key)) return { group: "volume", factor: 1, name: "л" };
    if (/(?:°c|градус)/.test(key)) return { group: "temperature", factor: 1, name: "°C" };
    if (/(?:об\s*\/\s*мин|об\s+мин)/.test(key)) return { group: "speed", factor: 1, name: "об/мин" };
    return null;
  }

  function unitsForLabel(label, value) {
    return unitInfo(label) || unitInfo(value) || { group: "number", factor: 1, name: "" };
  }

  function isPowerField(label) {
    return /мощност|присоедин|подключен/.test(normalizeLabel(label));
  }

  function powerValueInKw(value, label) {
    if (!isPowerField(label)) return null;
    const valueUnit = unitInfo(value);
    const labelUnit = unitInfo(label);
    const sourceUnit = valueUnit?.group === "power" ? valueUnit : labelUnit?.group === "power" ? labelUnit : null;
    if (!sourceUnit) return null;

    const convert = (rawNumber, unitFactor = sourceUnit.factor) => {
      const number = Number(String(rawNumber).replace(",", "."));
      if (!Number.isFinite(number)) return rawNumber;
      return String(Number((number * (unitFactor === 1 ? 0.001 : 1)).toFixed(6)));
    };
    const raw = String(value ?? "").replace(/\u00a0/g, " ");
    const explicitUnit = /(квт|вт)/i.test(raw);
    const converted = explicitUnit
      ? raw.replace(/(\d+(?:[.,]\d+)?)\s*(квт|вт)\b/gi, (_, number, unit) =>
        `${convert(number, /^вт$/i.test(unit) ? 1 : 1000)} кВт`)
      : raw.replace(/\d+(?:[.,]\d+)?/g, (number) => convert(number));
    return {
      value: explicitUnit || /квт/i.test(converted) ? converted : `${converted} кВт`,
      unit: { group: "power", factor: 1000, name: "кВт" },
    };
  }

  function valuesEqual(first, second) {
    const leftBool = booleanKey(first);
    const rightBool = booleanKey(second);
    if (leftBool && rightBool) return leftBool === rightBool;

    const stripUnits = (value) => normalize(value)
      .replace(/[\u2020*]+/g, "")
      .replace(/(?:квтч|квт\/ч|квт|вт|см|мм|кг|°c|°|градусов|кwh|kwh)/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const left = stripUnits(first);
    const right = stripUnits(second);
    if (!left || !right) return left === right;
    if (left === right || left.includes(right) || right.includes(left)) return true;

    const leftNumbers = numbersOf(left);
    const rightNumbers = numbersOf(right);
    if (leftNumbers.length > 0
      && leftNumbers.length === rightNumbers.length
      && (
        leftNumbers.every((number, index) => Math.abs(number - rightNumbers[index]) < 0.01)
        || leftNumbers.slice().sort((a, b) => a - b).every((number, index) => Math.abs(number - rightNumbers.slice().sort((a, b) => a - b)[index]) < 0.01)
      )) return true;

    const listKey = (value) => normalize(value)
      .replace(/климатический класс|температурные режимы/g, " ")
      .split(/[^a-zа-яё0-9]+/)
      .filter(Boolean)
      .sort()
      .join(" ");
    if (/климатический класс/.test(left + right) && listKey(left) === listKey(right)) return true;
    return false;
  }

  function semanticValue(value) {
    const semantic = normalize(value)
      .replace(/[\u2020*]+/g, "")
      .replace(/стеклокерамическ[а-яё]*/g, "стеклокерамика")
      .replace(/стеклокерамик[а-яё]*/g, "стеклокерамика")
      .replace(/no\s*frost/g, "nofrost")
      .replace(/стеклян[а-яё]*/g, "стекло")
      .replace(/эмалирован[а-яё]*/g, "эмаль")
      .replace(/газов[а-яё]*/g, "газ")
      .replace(/электрон[а-яё]*/g, "электронное управление")
      .replace(/автоматическ[а-яё]*/g, "автоматический")
      .replace(/слайдер[а-яё]*|сенсор[а-яё]*/g, "электронное управление")
      .replace(/механическ[а-яё]*/g, "механическое управление")
      .replace(/черн[а-яё]*/g, "черный")
      .replace(/бел[а-яё]*/g, "белый")
      .replace(/серебрист[а-яё]*/g, "серебристый")
      .replace(/светов[а-яё]*/g, "свет")
      .replace(/звуков[а-яё]*/g, "звук")
      .replace(/рамк[а-яё]*/g, "рамка")
      .replace(/нержавеющ[а-яё]*\s*сталь/g, "нержавеющая сталь")
      .replace(/\b(?:варочная|варочные|панель|поверхность)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return normalize(foldHomoglyphs(semantic));
  }

  function compareText(first, second) {
    if (normalize(first) === normalize(second)) return true;
    if (valuesEqual(first, second)) return true;

    const controlType = (value) => {
      const key = normalize(value);
      if (/электрон|сенсор|слайдер|slider|touch|цифров/.test(key)) return "electronic";
      if (/механическ|поворотн/.test(key)) return "mechanical";
      return "";
    };
    const leftControl = controlType(first);
    const rightControl = controlType(second);
    if (leftControl && leftControl === rightControl) return true;

    const left = semanticValue(first);
    const right = semanticValue(second);
    if (!left || !right) return false;
    if (left === right || left.includes(right) || right.includes(left)) return true;

    const leftTokens = left.split(/[^a-zа-яё0-9]+/).filter(t => t.length > 2);
    const rightTokens = right.split(/[^a-zа-яё0-9]+/).filter(t => t.length > 2);
    if (leftTokens.length > 0 && rightTokens.length > 0) {
      const intersection = leftTokens.filter(t => rightTokens.some(rt => rt.includes(t) || t.includes(rt)));
      const distinct = [...new Set(intersection)];
      if (distinct.length >= 2) return true;
      if (distinct.length === 1 && distinct[0].length >= 6) return true;
    }
    return false;
  }

  function parseDimensionParts(value) {
    return normalize(value)
      .replace(/(?:см|мм)/g, "")
      .split(/\s*[xх×]\s*/i)
      .map((part) => numbersOf(part));
  }

  function dimensionSourceOrder(label, fallback = ["height", "width", "depth"]) {
    const key = normalizeLabel(label)
      .replace(/\bширина\b/g, "ш")
      .replace(/\bвысота\b/g, "в")
      .replace(/\bглубина\b/g, "г")
      .replace(/\s+/g, " ");
    if (/ш\s*x\s*в\s*x\s*г/.test(key)) return ["width", "height", "depth"];
    if (/в\s*x\s*ш\s*x\s*г/.test(key)) return ["height", "width", "depth"];
    return fallback;
  }

  function dimensionFormatIssues(value, title = "") {
    const raw = String(value ?? "").trim();
    const key = normalizeLabel(title);
    const isDimension = !title || /размер|габарит|ниши|упаковк|(?:^|\s)(?:высота|ширина|глубина)(?:\s|$)/.test(key);
    if (!isDimension) return [];
    const issues = [];
    if (/\d\s*,\s*\d/.test(raw)) issues.push("десятичный разделитель — запятая; нужна точка");
    if (/\d\s*x\s*\d/i.test(raw)) issues.push("использована английская «x»; нужен русский разделитель «х»");
    return issues;
  }

  function compareNumberPart(localValue, officialValue, localUnit, officialUnit) {
    const local = numbersOf(localValue).map((number) => number * (localUnit?.factor || 1));
    const official = numbersOf(officialValue).map((number) => number * (officialUnit?.factor || 1));
    if (!local.length || !official.length) return null;
    if (localUnit?.group && officialUnit?.group && localUnit.group !== officialUnit.group) return false;
    if (local.length === official.length) {
      return local.every((number, index) => Math.abs(number - official[index]) < 0.01);
    }
    if (local.length === 1 && official.length > 1) {
      return local[0] >= Math.min(...official) - 0.01 && local[0] <= Math.max(...official) + 0.01;
    }
    if (official.length === 1 && local.length > 1) {
      return official[0] >= Math.min(...local) - 0.01 && official[0] <= Math.max(...local) + 0.01;
    }
    return false;
  }

  function compareDimension(localValue, localMeta, entry) {
    const localParts = parseDimensionParts(localValue);
    const officialParts = parseDimensionParts(entry.value);
    if (localParts.length !== 3 || officialParts.length !== 3) return null;

    const lUnit = unitsForLabel(localMeta.title, localValue);
    const oUnit = entry.unit || unitsForLabel(entry.label, entry.value);

    const localByName = Object.fromEntries(localMeta.order.map((name, index) => [name, localParts[index]]));
    const officialByName = Object.fromEntries(entry.dimensionOrder.map((name, index) => [name, officialParts[index]]));
    return ["height", "width", "depth"].every((name) => compareNumberPart(
      localByName[name]?.join(" "),
      officialByName[name]?.join(" "),
      lUnit, oUnit
    ) === true);
  }

  function compareWithEntry(localValue, localTitle, entry, localMeta) {
    if (localMeta?.dimension && entry.dimensionKind) {
      if (localMeta.part && entry.dimensionPart) {
        return compareNumberPart(localValue, entry.value, unitsForLabel(localTitle, localValue), entry.unit || unitsForLabel(entry.label, entry.value));
      }
      return compareDimension(localValue, localMeta, entry);
    }

    const localCanonical = canonicalLabel(localTitle);
    if (localCanonical === "burners") {
      const localCount = numberOf(localValue);
      const officialCount = numberOf(entry.value);
      if (localCount === null || officialCount === null) {
        if (officialCount !== null && (isMissing(localValue) || isNegative(localValue))) return false;
        return null;
      }
      return localCount === officialCount;
    }
    if (localCanonical === "oven-type" && !/(?:газ|электр|комбинир)/i.test(entry.value)) return null;
    if (isCleaningField(localTitle) && isTraditionalCleaning(localValue) && isDisabledCleaningEntry(entry)) {
      return true;
    }
    if (localCanonical === "control") {
      const controlFamily = (value) => {
        const key = normalize(value);
        if (/электрон|сенсор|слайдер|slider|touch|цифров/.test(key)) return "electronic";
        if (/механическ|поворотн/.test(key)) return "mechanical";
        if (/кнопк|переключател/.test(key)) return "form";
        return "";
      };
      const localFamily = controlFamily(localValue);
      const officialFamily = controlFamily(entry.value);
      if (localFamily === "form" || officialFamily === "form") {
        if (localFamily !== officialFamily) return null;
      }
    }

    if (localCanonical === "programmer") {
      const localProgrammerType = programmerType(localValue);
      const officialProgrammerType = programmerType(entry.value);
      if (localProgrammerType && officialProgrammerType) {
        return localProgrammerType === officialProgrammerType;
      }
      if (localProgrammerType && !officialProgrammerType) return false;
      if (!localProgrammerType && officialProgrammerType && isNegative(localValue)) return false;
      if (!localProgrammerType && !officialProgrammerType && isNegative(localValue) && isNegative(entry.value)) return null;
    }

    if (isMissing(localValue)) return isMissing(entry.value) ? true : false;

    if (isPositive(localValue)) {
      if (isPositive(entry.value)) return true;
      const officialNums = numbersOf(entry.value);
      if (officialNums.length > 0 && officialNums.some(n => n > 0)) return true;
      if (entry.value && entry.value.length > 3 && !isNegative(entry.value)) return true;
      return false;
    }
    if (isNegative(localValue)) {
      if (isNegative(entry.value)) return true;
      const officialNums = numbersOf(entry.value);
      if (officialNums.length > 0 && officialNums.every(n => n === 0)) return true;
      return false;
    }

    if (isPositive(entry.value) && !isMissing(localValue) && !isNegative(localValue)) {
      const featureValue = normalize(localValue);
      if (/(?:автомат|электроподжиг|газ-контрол|инвертор|no\s*frost|fresh|steam|пар|aqua|пирол|катал|освещ|подсвет|индикатор|индикац|цифров|защит|таймер|диспле|connect|adapt|super|big|есть|да)/.test(featureValue)) return true;
    }

    if (compareText(localValue, entry.value)) return true;

    const localNumbers = numbersOf(localValue);
    const officialNumbers = numbersOf(entry.value);
    if (localNumbers.length && officialNumbers.length) {
      const numberResult = compareNumberPart(localValue, entry.value, unitsForLabel(localTitle, localValue), unitsForLabel(entry.label, entry.value));
      if (numberResult !== null) return numberResult;
    }
    return false;
  }

  function readTable() {
    const rowsSelectors = isProductPage() ? ".characteristics__row" : ".compare-table-block__row.js-compare-row";
    return [...document.querySelectorAll(rowsSelectors)]
      .map((element) => {
        const titleEl = element.querySelector(isProductPage() ? ".characteristics__name" : ".js-compare-cell-title");
        const valEl = element.querySelector(isProductPage() ? ".characteristics__property" : ".swiper-wrapper > .compare-table-block__cell.js-compare-cell");

        let values = [];
        if (isProductPage()) {
          values = [textOf(valEl)];
        } else {
          values = [...element.querySelectorAll(".swiper-wrapper > .compare-table-block__cell.js-compare-cell")].map(textOf);
        }

        return {
          element,
          title: textOf(titleEl),
          titleElement: titleEl,
          values: values,
        };
      })
      .filter((row) => row.title);
  }

  function rowCells(row) {
    if (isProductPage()) return [row.element.querySelector(".characteristics__property")];
    return [...row.element.querySelectorAll(".swiper-wrapper > .compare-table-block__cell.js-compare-cell")];
  }

  function findRow(rows, pattern) {
    return rows.find((row) => pattern.test(normalizeLabel(row.title)));
  }

  function readProducts(rows) {
    if (isProductPage()) {
      const h1 = document.querySelector('h1');
      const name = h1 ? h1.textContent.trim() : document.title;
      const articleRow = findRow(rows, /^артикул/);
      const product = { name, href: window.location.href, id: "", article: articleRow?.values[0] || "" };
      product.model = modelCandidates(product)[0] || "";
      return [product];
    }
    const articleRow = findRow(rows, /^артикул/);
    return [...document.querySelectorAll(".comparison-card.swiper-slide")]
      .map((card, index) => {
        const title = card.querySelector(".comparison-card__type-and-title");
        const removeButton = card.querySelector(".js-compare_remove");
        const product = {
          name: textOf(title) || "Товар без названия",
          href: title?.href || card.querySelector("a[href]")?.href || "",
          id: removeButton?.dataset.id || "",
          article: articleRow?.values[index] || "",
        };
        product.model = modelCandidates(product)[0] || "";
        return product;
      });
  }

  function productLabel(products, index) {
    const product = products[index];
    if (!product) return `товар №${index + 1}`;
    return product.name + (product.id ? ` (ID ${product.id})` : "");
  }

  function emptyResult() {
    return { rowResults: new Map(), cellResults: new Map(), findings: [] };
  }

  function addDetail(target, detail) {
    if (!detail) return;
    if (!target.details) target.details = [];
    const signature = `${detail.label || ""}|${detail.anchorLabel || ""}|${detail.value || ""}|${detail.source || ""}`;
    if (!target.details.some((item) => `${item.label || ""}|${item.anchorLabel || ""}|${detail.value || ""}|${detail.source || ""}` === signature)) {
      target.details.push(detail);
    }
  }

  function noteResult(result, row, index, status, message, tooltip, source = "", addFinding = true, detail = null) {
    if (!row) return;
    const previousRow = result.rowResults.get(row) || { status: "ok", messages: new Set(), tooltips: new Set() };
    previousRow.rowTitle = row.title;
    if (STATUS_RANK[status] > STATUS_RANK[previousRow.status]) previousRow.status = status;
    previousRow.messages.add(message);
    if (tooltip) previousRow.tooltips.add(tooltip);
    addDetail(previousRow, detail);
    result.rowResults.set(row, previousRow);

    const cells = rowCells(row);
    const cell = cells[index];
    if (cell) {
      const previousCell = result.cellResults.get(cell) || { status: "ok", messages: new Set(), tooltips: new Set(), sources: new Set(), details: [] };
      previousCell.productIndex = index;
      previousCell.rowTitle = row.title;
      if (STATUS_RANK[status] > STATUS_RANK[previousCell.status]) previousCell.status = status;
      previousCell.messages.add(message);
      if (tooltip) previousCell.tooltips.add(tooltip);
      if (source) previousCell.sources.add(source);
      addDetail(previousCell, detail);
      result.cellResults.set(cell, previousCell);
    }
    if (addFinding && status !== "ok") result.findings.push(message);
  }

  function formatOfficialValue(value, label = "") {
    const raw = String(value ?? "").replace(/\s+/g, " ").trim();
    const key = normalizeLabel(label);
    const isDimension = /(?:размер|габарит|высот|ширин|глубин|ниши|упаковк)/.test(key);
    if (!isDimension) return raw;
    const normalizedRaw = raw.replace(/(\d)\s*,\s*(?=\d)/g, "$1.");
    const sourceUnit = unitInfo(label) || unitInfo(value);
    const convertMillimeters = sourceUnit?.group === "length" && sourceUnit.factor === 1;
    const formatNumber = (part) => {
      const number = Number(part) / (convertMillimeters ? 10 : 1);
      return String(Number(number.toFixed(10)));
    };
    const parts = normalizedRaw.match(/\d+(?:\.\d+)?/g);
    if (!parts) return normalizedRaw;
    if (parts.length !== 3) {
      return convertMillimeters
        ? normalizedRaw.replace(/\d+(?:\.\d+)?/g, formatNumber)
        : normalizedRaw;
    }
    const values = parts.map(formatNumber);
    const order = dimensionSourceOrder(label);
    const byName = Object.fromEntries(order.map((name, index) => [name, values[index]]));
    return ["height", "width", "depth"].map((name) => byName[name]).join(" х ");
  }

  function normalizedDimensionUnit(unit, label = "") {
    if (unit?.group === "length" && unit.factor === 1 && /(?:размер|габарит|высот|ширин|глубин|ниши|упаковк)/.test(normalizeLabel(label))) {
      return { ...unit, factor: 10, name: "см" };
    }
    return unit;
  }

  function displayDimensionLabel(label) {
    return String(label ?? "")
      .replace(/\(\s*[шw]\s*[xх×]\s*[вv]\s*[xх×]\s*[гgd]\s*\)/gi, "(ВхШхГ)")
      .replace(/\b[шw]\s*[xх×]\s*[вv]\s*[xх×]\s*[гgd]\b/gi, "ВхШхГ");
  }

  function runLocalValidation(rows, products) {
    const result = emptyResult();
    const dimensionGroups = [
      { label: "Габариты ВхШхГ", composite: /габаритные?\s+размеры?\s*\(?\s*в\s*(?:x|х)?\s*ш\s*(?:x|х)?\s*г/i, parts: [/^высота(?:,|\s)/, /^ширина(?:,|\s)/, /^глубина(?:,|\s)/] },
      { label: "Размеры в упаковке ВхШхГ", composite: /размеры?\s+в\s+упаковке?\s*\(?\s*в\s*(?:x|х)?\s*ш\s*(?:x|х)?\s*г/i, parts: [/^высота\s+упаковки/, /^ширина\s+упаковки/, /^глубина\s+упаковки/] },
    ];

    dimensionGroups.forEach((definition) => {
      const composite = findRow(rows, definition.composite);
      if (!composite) return;
      const parts = definition.parts.map((pattern) => findRow(rows, pattern));

      composite.values.forEach((value, index) => {
        if (parts.some((row) => !row)) return;

        const parsed = parseDimensionParts(value);
        const separate = parts.map((row) => row.values[index] || "");
        const complete = parsed.length === 3 && parsed.every((part) => part.length > 0) && separate.every((item) => numberOf(item) !== null);

        if (!complete) return;

        const localMeta = { dimension: true, order: dimensionSourceOrder(composite.title), title: composite.title };
        const matches = [0, 1, 2].map((partIndex) => compareNumberPart(
          parsed[partIndex].join(" "), separate[partIndex],
          unitsForLabel(composite.title, value), unitsForLabel(parts[partIndex].title, separate[partIndex]),
        ));

        const status = matches.every((item) => item === true) ? "ok" : "error";
        if (status !== "ok") {
          const message = `${definition.label}: составное значение не совпадает с отдельными полями у ${productLabel(products, index)}`;
          const tooltip = `Локально: ${value} != ${separate.join(' x ')}`;
          [composite, ...parts].forEach((row) => noteResult(result, row, index, status, message, tooltip));
        }
      });
    });

    rows.forEach((row) => {
      row.values.forEach((value, index) => {
        const issues = dimensionFormatIssues(value, row.title);
        if (!issues.length) return;
        const message = `${row.title}: ${issues.join("; ")} у ${productLabel(products, index)}`;
        noteResult(result, row, index, "error", message, issues.join("; "), "", true, {
          label: row.title,
          value: `${value || "пусто"}; ${issues.join("; ")}`,
        });
      });
    });

    const typeRow = findRow(rows, /^тип$|^вид$/);
    const gasBurnerRow = findRow(rows, /конфорок\s+газовых/);
    const ignitionRow = findRow(rows, /электроподжиг/);
    if (ignitionRow && (typeRow || gasBurnerRow)) {
      ignitionRow.values.forEach((value, index) => {
        const isGasByType = /газ/.test(normalize(typeRow?.values[index]));
        const gasCount = numberOf(gasBurnerRow?.values[index]);
        const isGasByCount = gasCount !== null && gasCount > 0;
        if (!isGasByType && !isGasByCount) return;
        if (isMissing(value) || isNegative(value)) {
          const message = `Электроподжиг: у газовой панели не должно быть «Нет» или пустого значения (${productLabel(products, index)})`;
          noteResult(result, ignitionRow, index, "error", message, "У газовой панели должен быть электроподжиг");
        }
      });
    }

    const ovenTypeRow = findRow(rows, /^тип духового шкафа$|^тип духовки$/);
    const cleaningRow = findRow(rows, /^очистка$/) || findRow(rows, /^тип очистки$/);
    if (ovenTypeRow && cleaningRow) {
      cleaningRow.values.forEach((value, index) => {
        if (!isSteamCleaning(value) || energyType(ovenTypeRow.values[index]) !== "gas") return;
        const message = `Очистка паром не может быть у газовой духовки (${productLabel(products, index)})`;
        const tooltip = "Паровая очистка возможна у электрической духовки, в том числе в комбинированной плите, но не у полностью газовой духовки";
        [cleaningRow, ovenTypeRow].forEach((row) => noteResult(result, row, index, "error", message, tooltip));
      });
    }
    return result;
  }

  function requestHtml(url) {
    const gmRequest = typeof GM_xmlhttpRequest === "function"
      ? GM_xmlhttpRequest
      : (typeof GM !== "undefined" && typeof GM.xmlHttpRequest === "function" ? GM.xmlHttpRequest : null);
    if (gmRequest) {
      return new Promise((resolve, reject) => {
        gmRequest({
          method: "GET", url, timeout: 30000,
          onload: (response) => {
            if (response.status >= 200 && response.status < 400) resolve(response.responseText);
            else reject(new Error(`HTTP ${response.status}`));
          },
          ontimeout: () => reject(new Error("тайм-аут запроса")),
          onerror: () => reject(new Error("ошибка сетевого запроса")),
        });
      });
    }
    return fetch(url, { credentials: "omit" }).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    });
  }

  function foldHomoglyphs(value) {
    return String(value ?? "").replace(/[АаВвЕеКкМмНнОоРрСсТтХх]/g, (letter) => ({
      А: "A", а: "a", В: "B", в: "b", Е: "E", е: "e", К: "K", к: "k", М: "M", м: "m",
      Н: "H", н: "h", О: "O", о: "o", Р: "P", р: "p", С: "C", с: "c", Т: "T", т: "t", Х: "X", х: "x",
    }[letter] || letter));
  }

  function featureKey(value) {
    return normalize(value)
      .replace(/multi\s*flow/g, "multiflow")
      .replace(/fresh\s*zone/g, "crispzone")
      .replace(/steam\s*tech/g, "steamtech")
      .replace(/senso\s*care/g, "sensocare")
      .replace(/twin\s*air/g, "twinair")
      .replace(/fast\s*freeze/g, "fastfreeze")
      .replace(/super\s*cool/g, "supercool")
      .replace(/adapt\s*tech/g, "adapttech")
      .replace(/convert\s*active/g, "convertactive")
      .replace(/aqua\s*clean/g, "aquaclean")
      .replace(/silver\s*matte/g, "silvermatte")
      .replace(/big\s*space/g, "bigspace")
      .replace(/compact\s*door/g, "compactdoor")
      .replace(/[^a-zа-яё0-9]/g, "");
  }

  function featureNameMatches(localTitle, localValue, officialName) {
    const localTitleKey = normalizeLabel(localTitle);
    const officialTitleKey = normalizeLabel(officialName);
    if (/^быстрый\s+нагрев\s+духовки$/.test(officialTitleKey)) {
      return /^быстрый\s+(?:нагрев|разогрев)\s+духовки$/.test(localTitleKey);
    }

    const local = featureKey(`${localTitle} ${localValue}`);
    const official = featureKey(officialName);
    if (!local || !official) return false;
    if (official.length >= 5 && (local.includes(official) || official.includes(local))) return true;

    const ignored = new Set(["тип", "система", "функция", "технология", "контейнер", "зона", "режим", "работа", "духовка", "духовки", "духовой", "шкаф"]);
    const matches = normalize(officialName)
      .split(/[^a-zа-яё0-9]+/)
      .filter(token => token.length >= 3 && !ignored.has(token))
      .filter(token => featureKey(localTitle).includes(featureKey(token)) || featureKey(localValue).includes(featureKey(token)));
    return matches.length >= 2 || matches.some((token) => token.length >= 6);
  }

  function compactModel(value) {
    return foldHomoglyphs(value).toLowerCase().replace(/[^a-z0-9]/g, "").toUpperCase();
  }

  function modelMatches(value, model) {
    const haystack = compactModel(value);
    const needle = compactModel(model);
    return needle.length >= 4 && (haystack.includes(needle) || needle.includes(haystack));
  }

  function modelCandidates(product) {
    const candidates = new Set();
    const add = (value) => {
      const model = String(value ?? "").trim().replace(/\s+/g, "").toUpperCase();
      if (/^\d{4,}$/.test(model)) {
        candidates.add(model);
        return;
      }
      if (!/[A-ZА-Я]\d/.test(model) && !/\d[A-ZА-Я]/.test(model)) return;
      if (compactModel(model).length < 4) return;
      candidates.add(model);
      candidates.add(compactModel(model));
    };
    const extract = (value) => {
      const matches = String(value ?? "").match(/\b[A-Za-zА-Яа-я]{1,8}\s*[-\/]?\s*\d{1,6}(?:\s*[-\/]?\s*[A-Za-z0-9А-Яа-я]{1,12}){0,3}\b/g) || [];
      matches.forEach(add);
    };

    extract(product.name);
    extract(product.href);
    if (product.article && /^\d{4,}$/.test(String(product.article).trim())) add(product.article);
    return [...candidates];
  }

  function isOfficialProductUrl(href) {
    try {
      const url = new URL(href, OFFICIAL_ORIGIN);
      const parts = url.pathname.split("/").filter(Boolean);
      return url.origin === OFFICIAL_ORIGIN
        && parts[0] === "products"
        && parts.length >= 4
        && !url.pathname.includes("/compare/")
        && !url.pathname.includes("/filter/");
    } catch (_) {
      return false;
    }
  }

  function officialSearchCandidates(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return [...new Map([...doc.querySelectorAll("a[href]")]
      .map((link) => ({
        text: textOf(link),
        href: new URL(link.getAttribute("href"), OFFICIAL_ORIGIN).href,
      }))
      .filter((item) => isOfficialProductUrl(item.href))
      .map((item) => [item.href, item])).values()];
  }

  async function findOfficialUrl(product) {
    const models = modelCandidates(product);
    const searched = new Set();
    for (const model of models) {
      const searchUrl = `${OFFICIAL_ORIGIN}/search/?q=${encodeURIComponent(model)}`;
      if (searched.has(searchUrl)) continue;
      searched.add(searchUrl);
      try {
        const html = await requestHtml(searchUrl);
        const candidates = officialSearchCandidates(html);
        const exact = candidates.find((item) => modelMatches(`${item.text} ${item.href}`, model));
        if (exact) return { url: exact.href, model };
        if (candidates.length === 1 && compactModel(model).length >= 5) {
          return { url: candidates[0].href, model };
        }
      } catch (error) {
        console.warn("[GCV] Search failed for", model, error);
      }
    }
    return null;
  }

  function dimensionMeta(label) {
    const key = normalizeLabel(label);
    if (/монтажные\s+размеры|размер(?:ы)?\s+ниши/.test(key)) {
      return { dimensionKind: "niche", dimensionOrder: ["height", "width", "depth"], composite: true };
    }
    if (/размеры\s+в\s+упаковке/.test(key)) {
      return { dimensionKind: "package", dimensionOrder: ["height", "width", "depth"], composite: true };
    }
    if (/размеры\s*\(?\s*ш\s*x\s*в\s*x\s*г|габаритные\s+размеры|^размеры$/.test(key)) {
      return { dimensionKind: "main", dimensionOrder: ["height", "width", "depth"], composite: true };
    }
    return null;
  }

  function dimensionPartMeta(label) {
    const key = normalizeLabel(label);
    const part = /(?:^|\s)ширина(?:\s|$)/.test(key)
      ? "width"
      : /(?:^|\s)высота(?:\s|$)/.test(key)
        ? "height"
        : /(?:^|\s)глубина(?:\s|$)/.test(key)
          ? "depth"
          : "";
    if (!part) return null;
    const kind = /упаковк/.test(key) ? "package" : /ниши|монтаж/.test(key) ? "niche" : "main";
    return { dimensionKind: kind, dimensionPart: part };
  }

  function localDimensionMeta(label, value = "") {
    const key = normalizeLabel(label);
    const order = dimensionSourceOrder(label);
    if (/размеры?\s+в\s+упаковке|размеры?\s+упаковки/.test(key)) {
      return { dimension: true, kind: "package", order, title: label };
    }
    if (/размер(?:ы)?\s+ниши|монтажные\s+размеры/.test(key)) {
      return { dimension: true, kind: "niche", order, title: label };
    }
    if (/(?:габаритные?\s+размеры?|габариты|^размеры?$)/.test(key)) {
      return { dimension: true, kind: "main", order, title: label };
    }

    const part = key.startsWith("высота") ? "height" : key.startsWith("ширина") ? "width" : key.startsWith("глубина") ? "depth" : "";
    if (!part) return null;
    const kind = key.includes("упаковки") ? "package" : key.includes("ниши") ? "niche" : "main";
    return { dimension: true, kind, part, title: label };
  }

  function parseOfficialPage(html, url) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const entries = [];
    const seen = new Set();

    const addEntry = (entry) => {
      const sourceUnit = entry.unit || unitInfo(entry.label) || unitInfo(entry.value) || null;
      const power = powerValueInKw(entry.value, entry.label);
      const formattedEntry = {
        ...entry,
        unit: power?.unit || normalizedDimensionUnit(sourceUnit, entry.label),
        value: power?.value || formatOfficialValue(entry.value, entry.label),
      };
      const key = `${formattedEntry.group}|${formattedEntry.label}|${formattedEntry.value}|${formattedEntry.dimensionPart || ""}`;
      if (!formattedEntry.label || seen.has(key)) return null;
      seen.add(key);
      const record = { sourceUrl: url, sourceType: "html", ...formattedEntry };
      entries.push(record);
      return record;
    };

    const clean = (element) => {
      if (!element) return "";
      const parts = element.querySelectorAll('.part');
      if (parts.length > 0) {
        return Array.from(parts).map(p => p.textContent.trim()).join(" ").replace(/\s+/g, " ").trim();
      }
      return String(element.innerText || "").replace(/\s+/g, " ").trim();
    };

    const title = clean(doc.querySelector(".products-detail__h1") || doc.querySelector("h1"));

    doc.querySelectorAll(".products-detail__main-props-list-item").forEach((item) => {
      addEntry({
        group: "summary",
        label: clean(item.querySelector(".products-detail__main-props-list-item-name")),
        value: clean(item.querySelector(".products-detail__main-props-list-item-val")),
      });
    });

    doc.querySelectorAll(".products-detail__tech-groups-list-item").forEach((item) => {
      const groupName = clean(item.closest(".products-detail__tech-group")?.querySelector(".products-detail__tech-groups-title")) || "tech";
      addEntry({
        group: groupName,
        label: clean(item.querySelector(".products-detail__tech-groups-list-item-name")),
        value: clean(item.querySelector(".products-detail__tech-groups-list-item-val")),
      });
    });

    const features = [...doc.querySelectorAll(".products-detail__advantages-item")].map((item) => ({
      subtitle: clean(item.querySelector(".products-detail__advantages-subtitle")),
      title: clean(item.querySelector(".products-detail__advantages-title")),
      text: clean(item.querySelector(".products-detail__advantages-text")),
    }));

    const featureNames = [...new Set([
      ...[...doc.querySelectorAll(".products-detail__advantages-thumbs-item-text")].map(clean),
      ...features.flatMap((item) => [item.subtitle, item.title]),
    ].filter(Boolean))];
    const official = {
      url,
      title,
      entries,
      features,
      featureNames,
      featureText: [...featureNames, ...features.map((item) => `${item.subtitle} ${item.title} ${item.text}`)].join(" "),
    };

    entries.forEach((entry) => {
      const partMeta = dimensionPartMeta(entry.label);
      if (!partMeta) return;
      entry.dimensionKind = partMeta.dimensionKind;
      entry.dimensionPart = partMeta.dimensionPart;
    });

    const dimensionEntries = [];
    entries.forEach((entry) => {
      const meta = dimensionMeta(entry.label);
      const parts = parseDimensionParts(entry.value);
      if (!meta || parts.length !== 3 || parts.some((part) => !part.length)) return;
      entry.dimensionKind = meta.dimensionKind;
      entry.dimensionOrder = meta.dimensionOrder;
      entry.isDimensionComposite = true;
      meta.dimensionOrder.forEach((partName, index) => {
        dimensionEntries.push({
          group: entry.group, label: `derived ${meta.dimensionKind} ${partName}`, anchorLabel: entry.label, value: parts[index].join("-"),
          dimensionKind: meta.dimensionKind, dimensionPart: partName, unit: entry.unit || unitInfo(entry.value) || unitInfo(entry.label), derived: true,
        });
      });
    });
    dimensionEntries.forEach(addEntry);

    ["main", "package", "niche"].forEach((kind) => {
      if (entries.some((entry) => entry.dimensionKind === kind && entry.isDimensionComposite)) return;
      const byPart = Object.fromEntries(entries
        .filter((entry) => entry.dimensionKind === kind && entry.dimensionPart)
        .map((entry) => [entry.dimensionPart, entry]));
      if (!(byPart.width && byPart.height && byPart.depth)) return;

      const sourceEntries = [byPart.width, byPart.height, byPart.depth];
      const unit = sourceEntries.find((entry) => entry.unit)?.unit || null;
      const label = kind === "main"
        ? "Габаритные размеры (ШхВхГ)"
        : kind === "package"
          ? "Размеры в упаковке (ШхВхГ)"
          : "Монтажные размеры (ШхВхГ)";
      const composite = addEntry({
        group: "derived",
        label,
        value: sourceEntries.map((entry) => entry.value).join(" х "),
        unit,
      });
      if (composite) {
        composite.dimensionKind = kind;
        composite.dimensionOrder = ["height", "width", "depth"];
        composite.isDimensionComposite = true;
      }
    });
    official.entries = entries;
    return official;
  }

  const STOP_WORDS = new Set([
    "количество", "тип", "материал", "цвет", "размер", "вес", "класс", "форма",
    "система", "наличие", "есть", "нет", "да", "объем", "мощность", "покрытие",
    "дверца", "панель", "управление", "переключатели", "программатор", "таймер",
    "освещение", "шарнир", "решетка", "противень", "ящик", "плита", "духовка",
    "варочная", "поверхность", "шкаф", "электрическая", "газовая", "индукционная"
  ]);

  const SEMANTIC_BLACKLIST = [
    { local: /тип/i, forbidden: [/ящик/, /мощность/, /вес/, /размер/, /объем/, /потреблен/, /напряжен/, /частот/, /покрыт/, /цвет/, /материал/, /форм/, /класс/, /дверц/, /шарнир/, /решетк/, /противен/, /конфорк/] },
    { local: /мощность/i, forbidden: [/тип/, /ящик/, /вес/, /размер/, /объем/, /класс/, /покрыт/, /цвет/, /материал/, /конфорк/] },
    { local: /вес/i, forbidden: [/тип/, /ящик/, /мощность/, /размер/, /объем/, /класс/, /покрыт/, /цвет/] },
    { local: /размер|габарит|высота|ширина|глубина/i, forbidden: [/тип/, /ящик/, /мощность/, /вес/, /объем/, /класс/, /покрыт/, /цвет/] },
    { local: /объем/i, forbidden: [/тип/, /ящик/, /мощность/, /вес/, /размер/, /класс/, /покрыт/, /цвет/, /форм/] },
    { local: /класс/i, forbidden: [/тип/, /ящик/, /мощность/, /вес/, /размер/, /объем/, /покрыт/, /цвет/] },
    { local: /цвет/i, forbidden: [/тип/, /ящик/, /мощность/, /вес/, /размер/, /объем/, /класс/, /материал/, /покрыт/, /управл/] },
    { local: /материал/i, forbidden: [/тип/, /ящик/, /мощность/, /вес/, /размер/, /объем/, /класс/, /цвет/, /форм/, /управл/] },
    { local: /покрыт/i, forbidden: [/тип/, /ящик/, /мощность/, /вес/, /размер/, /объем/, /класс/, /цвет/, /материал/] },
    { local: /страна/i, forbidden: [/тип/, /ящик/, /мощность/, /вес/, /размер/, /объем/, /класс/] },
    { local: /управление|переключател|таймер|программатор/i, forbidden: [/тип/, /ящик/, /мощность/, /вес/, /размер/, /объем/, /класс/, /цвет/, /материал/] },
    { local: /освещен|подсветк/i, forbidden: [/тип/, /ящик/, /мощность/, /вес/, /размер/, /объем/, /класс/] },
    { local: /дверц|стекл|шарнир/i, forbidden: [/тип/, /ящик/, /мощность/, /вес/, /размер/, /объем/, /класс/, /цвет/, /материал/, /конфорк/] },
    { local: /очистк|пар|пиролит|каталит/i, forbidden: [/тип/, /ящик/, /мощность/, /вес/, /размер/, /объем/, /класс/] },
    { local: /противен|решетк|ящик|комплект|оборудован/i, forbidden: [/тип/, /мощность/, /вес/, /размер/, /объем/, /класс/, /цвет/, /материал/, /конфорк/] },
    { local: /конфорк|зона\s+нагрева/i, forbidden: [/тип/, /ящик/, /вес/, /размер/, /объем/, /класс/, /цвет/, /материал/, /дверц/, /стекл/] },
  ];

  function isSemanticallyCompatible(localTitle, officialLabel) {
    const localNorm = normalize(localTitle);
    const officialNorm = normalize(officialLabel);
    for (const rule of SEMANTIC_BLACKLIST) {
      if (rule.local.test(localNorm)) {
        for (const forbidden of rule.forbidden) {
          if (forbidden.test(officialNorm)) return false;
        }
      }
    }
    return true;
  }

  function similarityScore(strA, strB) {
    if (!isSemanticallyCompatible(strA, strB)) return 0;
    if (canonicalLabel(strA) === canonicalLabel(strB)) return 1;

    const a = normalizeLabel(strA).split(/\s+/).filter(t => t.length > 2 && !STOP_WORDS.has(t));
    const b = normalizeLabel(strB).split(/\s+/).filter(t => t.length > 2 && !STOP_WORDS.has(t));
    if (!a.length || !b.length) return 0;

    const units = ["квт", "квтч", "вт", "мм", "см", "кг", "л", "град", "об", "мин"];
    const aUnits = a.filter(t => units.some(u => t.includes(u)));
    const bUnits = b.filter(t => units.some(u => t.includes(u)));

    if (aUnits.length > 0 && bUnits.length > 0) {
      const bUnitSet = new Set(bUnits);
      if (!aUnits.some(u => bUnitSet.has(u))) return 0;
    } else if (aUnits.length > 0 || bUnits.length > 0) {
      if (!/габарит|размер|высота|ширина|глубина/i.test(strA + strB)) return 0;
    }

    const tokenKey = (token) => foldHomoglyphs(token).toLowerCase();
    const setB = new Set(b.map(tokenKey));
    const intersection = a.filter(token => setB.has(tokenKey(token)));
    if (intersection.length === 0) return 0;

    const matchWeight = intersection.reduce((sum, t) => sum + t.length, 0);
    const totalUniqueTokens = [...new Set([...a, ...b])];
    const totalWeight = totalUniqueTokens.reduce((sum, t) => sum + t.length, 0);

    return totalWeight ? matchWeight / totalWeight : 0;
  }

  function labelDescriptor(label, value = "") {
    const key = normalizeLabel(label);
    const descriptor = { labels: [], featureTerms: [], valueHint: "" };

    if (FIELD_MAPPING[key]) {
      descriptor.labels = FIELD_MAPPING[key];
      return descriptor;
    }

    if (key.includes("дисплей")) descriptor.labels = [/^дисплей/, /^цифровой дисплей/];
    else if (key.includes("загрузка") && key.includes("кг")) descriptor.labels = [/^загрузка при сушке/, /^загрузка/, /^максимальная загрузка/];
    else if (key.includes("сенсор влажности")) {
      descriptor.labels = [/^сенсоры$/];
      descriptor.valueHint = "влажности";
    }
    else if (["хлопок", "шерсть", "синтетика", "спорт", "деликат", "рубаш", "постель", "быстр", "пухов", "детск", "микс", "антиаллерг", "экстрагигиен"].some(p => key.includes(p))) {
      descriptor.labels = [/^(?:основные|специальные|режимы) программы/, /^программы сушки$/, /^программы$/];
      descriptor.valueHint = key.split(' ')[0];
    }
    else if (key.includes("размеры в упаковке") || key.includes("размер ниши") || key.includes("габариты") || /^высота|^ширина|^глубина/.test(key)) {
      descriptor.labels = [new RegExp(`^${key.replace(/\s+(см|мм|\(.*\))$/, "").trim()}$`)];
    }
    else if (/(?:особенност|функц|технолог|создан.*собственн|личн.*параметр)/.test(key)) {
      descriptor.featureTerms = [key.replace(/\s*\(.*\)/, "").replace(/,\s*шт$/, "").trim()];
    }
    else if (key.includes("нагрев") || key.includes("гриль") || key.includes("пар") || key.includes("сушка") ||
             key.includes("пицца") || key.includes("размораживание") || key.includes("регенерац") ||
             key.includes("сувид") || key.includes("air fry") || key.includes("gratin") ||
             key.includes("frozen bake") || key.includes("slow bake") || key.includes("adapt bake") ||
             key.includes("multi steam") || key.includes("pure steam") || key.includes("home made") ||
             key.includes("big space") || key.includes("super size") || key.includes("connectlife") ||
             key.includes("totaldry") || key.includes("aquastop") || key.includes("steamtech") ||
             key.includes("twin air") || key.includes("no frost") || key.includes("fresh zone") ||
             key.includes("bigspace") || key.includes("supersize") || key.includes("extrasteam") ||
             key.includes("perfect grill") || key.includes("вариогриль") || key.includes("compact door") ||
             key.includes("aqua clean") || key.includes("silver matte") || key.includes("ecoclean")) {
      descriptor.featureTerms = [key.replace(/\s*\(.*\)/, "").replace(/,\s*шт$/, "").trim()];
    }
    else {
      descriptor.labels = [new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)];
    }

    return descriptor;
  }

  function isSurfaceField(label) {
    return /^тип\s+варочной\s+поверхности$/.test(normalizeLabel(label));
  }

  function findSurfaceReference(localTitle, localValue, entries) {
    const typeCandidates = entries.filter((entry) =>
      /^тип варочной поверхности/.test(normalizeLabel(entry.label))
    );
    const typeSource = typeCandidates.find((entry) =>
      compareWithEntry(localValue, localTitle, entry, null) === true
    ) || typeCandidates[0];
    return typeSource ? { entry: typeSource, localMeta: null, kind: "spec" } : null;
  }

  function findReference(localTitle, localValue, official, context = {}) {
    const zoneKey = normalizeLabel(localTitle);
    const entries = official.entries || [];
    const localCanonical = canonicalLabel(localTitle);

    const glassCountField = /^(?:количество стекол|количество стекол шт|застекление дверцы)$/.test(zoneKey);
    const thermalLayerField = /^(?:количество теплоотражающих слоев|количество теплоотражающих слоев шт|теплоотражающие слои)$/.test(zoneKey)
      || /термосло/.test(zoneKey);
    if (glassCountField || thermalLayerField) {
      const doorEntry = entries.find((entry) => {
        const label = normalizeLabel(entry.label);
        const value = normalize(entry.value);
        return /дверц/.test(label) && /стекл/.test(value) && /термосло/.test(value);
      }) || entries.find((entry) => {
        const value = normalize(entry.value);
        return /дверц/.test(value) && /стекл/.test(value) && /термосло/.test(value);
      });
      if (doorEntry) {
        const value = normalize(doorEntry.value);
        const match = glassCountField
          ? value.match(/(\d+)\s*стекл/)
          : value.match(/(\d+)\s*термосло/);
        if (match) {
          return {
            entry: {
              ...doorEntry,
              label: glassCountField ? "Количество стекол (из описания дверцы)" : "Количество теплоотражающих слоев (из описания дверцы)",
              value: match[1],
              anchorLabel: doorEntry.label,
              sourceUrl: doorEntry.sourceUrl || official.url,
            },
            localMeta: null,
            kind: "derived-door-count",
          };
        }
      }
    }

    if (isFastHeatingField(localTitle)) {
      const feature = (official.featureNames || []).find((name) =>
        /^быстрый\s+нагрев\s+духовки$/.test(normalizeLabel(name))
      );
      return feature ? {
        entry: {
          label: `Функция: ${feature}`,
          value: "Да",
          sourceUrl: official.url,
          anchorLabel: feature,
          featureName: feature,
        },
        localMeta: null,
        kind: "feature-gallery",
      } : null;
    }

    const constructionKey = normalizeLabel(localTitle);
    const constructionValue = normalize(localValue);
    if (/^конструкция$/.test(constructionKey)
      && /(?:2\s*в\s*1|ручн.*вертикальн|вертикальн.*ручн)/.test(constructionValue)) {
      const feature = (official.featureNames || []).find((name) =>
        /(?:^|\s)2\s*в\s*1(?:$|\s)/.test(normalizeLabel(name))
      ) || (official.features || []).map((item) => item.subtitle || item.title).find((name) =>
        /(?:^|\s)2\s*в\s*1(?:$|\s)/.test(normalizeLabel(name || ""))
      );
      if (feature) {
        return {
          entry: {
            label: `Преимущество: ${feature}`,
            value: feature,
            sourceUrl: official.url,
            anchorLabel: feature,
            featureName: feature,
          },
          localMeta: null,
          kind: "feature-gallery",
        };
      }
    }

    const featureBlocks = (official.features || []).map((item) => ({
      title: String(item.title || item.subtitle || "").trim(),
      text: [item.subtitle, item.title, item.text].filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
    }));
    const normPhrase = (value) => normalize(value)
      .replace(/[‐‑‒–—−]/g, "-")
      .replace(/[^a-zа-яё0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const localValuePhrase = normPhrase(localValue);
    const localTitlePhrase = normPhrase(localTitle);
    const matchingFeature = featureBlocks.find((item) => {
      const block = normPhrase(item.text);
      if (!block) return false;
      if (localValuePhrase.length >= 6 && block.includes(localValuePhrase)) return true;
      if (isPositive(localValue) && localTitlePhrase.length >= 5 && block.includes(localTitlePhrase)) return true;
      return false;
    });
    if (matchingFeature) {
      return {
        entry: {
          label: `Преимущество: ${matchingFeature.title || localTitle}`,
          value: matchingFeature.text,
          sourceUrl: official.url,
          anchorLabel: matchingFeature.title || localTitle,
        },
        localMeta: null,
        kind: "feature-text-match",
      };
    }

    if (gasFeatureKind(localTitle)) {
      return findGasFeatureReference(localTitle, official, context.ovenType);
    }

    if (isGasIgnitionPowerException(localTitle, localValue, context.plateType)) {
      return {
        entry: {
          label: "Допустимое значение для газовой плиты",
          value: "0.005 кВт",
          sourceUrl: official.url,
        },
        localMeta: null,
        kind: "gas-ignition-power",
      };
    }

    if (isCleaningField(localTitle) && isTraditionalCleaning(localValue)) {
      const activeCleaning = entries.find(isActiveCleaningEntry);
      if (activeCleaning) return { entry: activeCleaning, localMeta: null, kind: "cleaning-method" };
      const disabledCleaning = entries.find(isDisabledCleaningEntry);
      if (disabledCleaning) return { entry: disabledCleaning, localMeta: null, kind: "cleaning-method" };
      return null;
    }

    if (localCanonical === "oven-type") {
      const inferredEnergy = inferredOvenEnergy(context.plateType, context.surfaceType);
      if (inferredEnergy) {
        return {
          entry: {
            label: "Тип духового шкафа (логика комбинированной плиты)",
            value: "электрический",
            sourceUrl: official.url,
          },
          localMeta: null,
          kind: "energy-type",
        };
      }
      const localEnergy = energyType(localValue);
      if (localEnergy) {
        const energySource = entries.find((entry) =>
          canonicalLabel(entry.label) === "cooker-type"
          && energyType(entry.value) === localEnergy
        );
        if (energySource) return { entry: energySource, localMeta: null, kind: "energy-type" };
      }
    }

    const programmerKind = programmerFieldKind(localTitle);
    if (programmerKind) {
      const scopedCandidates = entries.filter((entry) => programmerEntryScope(entry)[programmerKind]);
      if (scopedCandidates.length) {
        scopedCandidates.sort((first, second) => {
          const firstMatch = compareWithEntry(localValue, localTitle, first, null) === true ? 1 : 0;
          const secondMatch = compareWithEntry(localValue, localTitle, second, null) === true ? 1 : 0;
          return secondMatch - firstMatch || Number(second.group === "summary") - Number(first.group === "summary");
        });
        return { entry: scopedCandidates[0], localMeta: null, kind: "programmer-scope" };
      }

      if (programmerKind === "programmer") {
        const timerOnly = entries.find((entry) => {
          const scope = programmerEntryScope(entry);
          return scope.timer && !scope.programmer;
        });
        if (timerOnly) return { entry: timerOnly, localMeta: null, kind: "programmer-absence" };
      }
      return null;
    }

    if (isWokField(localTitle)) {
      const wokEntry = entries.find((entry) => isWokField(entry.label) || mentionsWok(entry.value));
      if (wokEntry) return { entry: wokEntry, localMeta: null, kind: "spec" };
      const wokFeature = (official.featureNames || []).find((name) => isWokField(name));
      if (wokFeature) {
        return {
          entry: {
            label: `Функция: ${wokFeature}`,
            value: "Да",
            sourceUrl: official.url,
            anchorLabel: wokFeature,
            featureName: wokFeature,
          },
          localMeta: null,
          kind: "feature-gallery",
        };
      }
      return null;
    }

    if (isSurfaceField(localTitle)) {
      const surfaceReference = findSurfaceReference(localTitle, localValue, entries);
      if (surfaceReference) return surfaceReference;
      console.warn(`[GCV] ${localTitle}: подходящее поле на официальном сайте не найдено`);
    }

    if (zoneKey === "размеры" && parseDimensionParts(localValue).length !== 3) return null;

    const isZoneTitle = /^(?:передн|задн|лев|прав|центральн|средн)/.test(zoneKey);
    if (isZoneTitle && numbersOf(localValue).length >= 2) {
      const zoneOf = (text) => {
        const key = normalizeLabel(text);
        const has = (re) => re.test(key);
        const tokens = [];
        if (has(/(?:^|[^а-яё])передн[а-яё]*/)) tokens.push("front");
        if (has(/(?:^|[^а-яё])задн[а-яё]*/)) tokens.push("back");
        if (has(/(?:^|[^а-яё])лев[а-яё]*(?:[^а-яё]|$)/)) tokens.push("left");
        if (has(/(?:^|[^а-яё])прав[а-яё]*(?:[^а-яё]|$)/) && !has(/управлени|справа|направлени|поправ|исправ/)) tokens.push("right");
        if (has(/(?:^|[^а-яё])(?:центральн|средн)[а-яё]*/)) tokens.push("center");
        return tokens;
      };
      const localZone = zoneOf(localTitle);
      const sameZone = (label) => {
        const other = zoneOf(label);
        return localZone.length > 0
          && other.length === localZone.length
          && localZone.every((token) => other.includes(token));
      };
      const diameter = entries.find((entry) => {
        const label = normalizeLabel(entry.label);
        return sameZone(entry.label) && (/^ø/.test(label) || /мм$/.test(label) || /диаметр/.test(label));
      });
      const power = entries.find((entry) => sameZone(entry.label) && /мощност/.test(normalizeLabel(entry.label)));
      if (diameter && power) {
        return {
          entry: {
            label: `${diameter.label} + ${power.label}`,
            value: `${diameter.value}; ${power.value}`,
            sourceUrl: official.url,
            diameter,
            power,
          },
          localMeta: null,
          kind: "zone",
        };
      }
      return null;
    }

    const localMeta = localDimensionMeta(localTitle, localValue);
    if (localMeta) {
      const candidate = entries.find((entry) =>
        entry.dimensionKind === localMeta.kind &&
        (localMeta.part ? entry.dimensionPart === localMeta.part : entry.isDimensionComposite)
      );
      if (candidate) return { entry: candidate, localMeta, kind: "spec" };
      return null;
    }

    if (localCanonical && localCanonical !== "тип") {
      const canonicalCandidates = entries.filter((entry) =>
        canonicalLabel(entry.label) === localCanonical && isSemanticallyCompatible(localTitle, entry.label)
      );
      const localIsEnergyWord = isEnergyTypeWord(localValue);
      const materialAwareCandidates = localIsEnergyWord
        ? canonicalCandidates
        : canonicalCandidates.filter((entry) => !isEnergyTypeWord(entry.value));

      if (materialAwareCandidates.length) {
        const genericVolumeLabels = new Set([
          "полезный объем", "объем нетто", "объем рабочей камеры",
          "объем духовки", "объем духового шкафа",
        ]);
        const volumeLabel = normalizeLabel(localTitle).replace(/\s+(?:см|мм|кг|л|вт|квт|квтч|шт)$/, "").trim();
        const isGenericVolume = localCanonical === "usable-volume" && genericVolumeLabels.has(volumeLabel);
        const hasCompartmentVolumes = entries.some((entry) =>
          /^объем (?:нетто|брутто) [хм] о/.test(normalizeLabel(entry.label))
        );
        const hasValueMatch = materialAwareCandidates.some((entry) =>
          compareWithEntry(localValue, localTitle, entry, localMeta) === true
        );
        if (isGenericVolume && hasCompartmentVolumes && !hasValueMatch) return null;
        materialAwareCandidates.sort((first, second) => {
          const firstMatch = compareWithEntry(localValue, localTitle, first, localMeta) === true ? 1 : 0;
          const secondMatch = compareWithEntry(localValue, localTitle, second, localMeta) === true ? 1 : 0;
          return secondMatch - firstMatch || Number(second.group === "summary") - Number(first.group === "summary");
        });
        return { entry: materialAwareCandidates[0], localMeta, kind: "alias" };
      }
    }

    const descriptor = labelDescriptor(localTitle, localValue);
    let candidates = entries.filter((entry) =>
      descriptor.labels.some((pattern) => pattern.test(normalizeLabel(entry.label)))
    );

    if (descriptor.valueHint) {
      const hinted = candidates.filter((entry) =>
        new RegExp(descriptor.valueHint, "i").test(normalize(entry.value) + " " + normalize(official.title))
      );
      if (hinted.length) candidates = hinted;
      else if (candidates.length === 0) {
        const globalHint = entries.find(e => new RegExp(descriptor.valueHint, "i").test(normalize(e.value)));
        if (globalHint) candidates = [globalHint];
      }
    }

    if (candidates.length) {
      const ranked = candidates.map((entry) => {
        let valueScore = 0;
        const valueResult = compareWithEntry(localValue, localTitle, entry, localMeta);
        if (valueResult === true) valueScore = 100;
        else if (valueResult === null) valueScore = 5;
        return {
          entry,
          score: valueScore + similarityScore(localTitle, entry.label) + Number(entry.group === "summary") * 0.05,
        };
      }).sort((first, second) => second.score - first.score);
      return { entry: ranked[0].entry, localMeta, kind: "spec" };
    }

    const galleryFeature = (official.featureNames || []).find((name) =>
      featureNameMatches(localTitle, localValue, name)
    );
    if (galleryFeature) {
      return {
        entry: {
          label: `Функция: ${galleryFeature}`,
          value: "Да",
          sourceUrl: official.url,
          anchorLabel: galleryFeature,
          featureName: galleryFeature,
        },
        localMeta,
        kind: "feature-gallery",
      };
    }

    const scored = entries
      .map(entry => ({ entry, score: similarityScore(localTitle, entry.label) }))
      .filter(item => item.score >= 0.58)
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0 && (scored.length === 1 || scored[0].score - scored[1].score >= 0.12)) {
      const best = scored[0];
      return { entry: best.entry, localMeta, kind: "fuzzy" };
    }

    const featureText = normalize(official.featureText + " " + entries.map(e => e.value).join(" "));
    const term = descriptor.featureTerms.find((item) => featureText.includes(normalize(item)));
    const termTokens = term ? normalize(term).split(/[^a-zа-яё0-9]+/).filter(token => token.length > 3) : [];
    const localFeatureValue = normalize(localValue);
    if (term && (isPositive(localValue) || termTokens.some(token => localFeatureValue.includes(token)))) {
      return {
        entry: { label: "Упоминание в тексте", value: `Найдено: ${term}`, sourceUrl: official.url },
        localMeta,
        kind: "feature"
      };
    }

    return null;
  }

  function compareReference(localValue, localTitle, reference) {
    if (reference.kind === "gas-ignition-power") return true;
    if (reference.kind === "programmer-absence") return isNegative(localValue);
    if (reference.kind === "oven-gas-feature-absence") return isNegative(localValue);
    if (reference.kind === "gas-heating-type") {
      const localType = normalize(localValue);
      const officialText = normalize(`${reference.entry.label} ${reference.entry.value}`);
      if (isNegative(localValue)) return false;
      if (localType && officialText.includes(localType)) return true;
      return compareText(localValue, reference.entry.label);
    }
    if (reference.kind === "energy-type") {
      const localEnergy = energyType(localValue);
      const officialEnergy = energyType(reference.entry.value);
      if (localEnergy && officialEnergy) return localEnergy === officialEnergy;
      return compareWithEntry(localValue, localTitle, reference.entry, reference.localMeta);
    }
    if (reference.kind === "surface-material") {
      const a = surfaceMaterial(localValue);
      const b = surfaceMaterial(reference.entry.value);
      if (!a || !b) return compareWithEntry(localValue, localTitle, reference.entry, reference.localMeta);
      return a === b;
    }
    if (reference.kind === "zone") {
      const localNumbers = numbersOf(localValue);
      const localKey = normalize(localTitle);

      const unitFactor = (label, value, group, fallbackFactor) => {
        const fromValue = unitInfo(value);
        if (fromValue && fromValue.group === group) return fromValue.factor;
        const fromLabel = unitInfo(label);
        if (fromLabel && fromLabel.group === group) return fromLabel.factor;
        return fallbackFactor;
      };

      const toMm = (number, label, value) => {
        if (number === null || !Number.isFinite(number)) return null;
        return number * unitFactor(label, value, "length", number < 60 ? 10 : 1);
      };
      const toWatt = (number, label, value) => {
        if (number === null || !Number.isFinite(number)) return null;
        return number * unitFactor(label, value, "power", number <= 20 ? 1000 : 1);
      };

      const localLengthFactor = /(?:^|[^а-я])см(?:$|[^а-я])/.test(localKey) ? 10 : 1;
      const localPowerFactor = /квт/.test(localKey) ? 1000 : /(?:^|[^к])вт/.test(localKey) ? 1 : 1000;
      const localDiameter = Number.isFinite(localNumbers[0]) ? localNumbers[0] * localLengthFactor : null;
      const localPower = Number.isFinite(localNumbers[1]) ? localNumbers[1] * localPowerFactor : null;
      const officialDiameter = toMm(
        numberOf(reference.entry.diameter.value),
        reference.entry.diameter.label,
        reference.entry.diameter.value
      );
      const officialPower = toWatt(
        numberOf(reference.entry.power.value),
        reference.entry.power.label,
        reference.entry.power.value
      );

      if (localDiameter === null || localPower === null || officialDiameter === null || officialPower === null) return null;

      const diameterOk = Math.abs(localDiameter - officialDiameter) <= 1.5;
      const powerOk = Math.abs(localPower - officialPower) <= Math.max(10, officialPower * 0.01);
      return diameterOk && powerOk;
    }
    if (reference.kind === "feature-text-match") return true;
    if (reference.kind === "feature" || reference.kind === "feature-gallery") {
      if (isPositive(localValue)) return true;
      if (isNegative(localValue)) return false;
      if (reference.kind === "feature-gallery") return true;
      return compareText(localValue, reference.entry.value);
    }
    return compareWithEntry(localValue, localTitle, reference.entry, reference.localMeta);
  }

  async function loadOfficialProduct(product) {
    try {
      const found = await findOfficialUrl(product);
      if (!found) return { error: "модель не найдена на ru.gorenje.com", model: modelCandidates(product)[0] || "" };
      if (!officialCache.has(found.url)) {
        officialCache.set(found.url, requestHtml(found.url).then((html) => parseOfficialPage(html, found.url)));
      }
      const record = await officialCache.get(found.url);
      return { ...record, model: found.model };
    } catch (error) {
      return { error: String(error.message || error), model: modelCandidates(product)[0] || "" };
    }
  }

  async function runOfficialValidation(rows, products) {
    const result = emptyResult();
    const records = await Promise.all(products.map((product) => loadOfficialProduct(product)));
    const summary = { records, checked: 0, confirmed: 0, mismatches: 0, unknown: 0, skipped: 0, failed: 0 };

    records.forEach((record, index) => {
      if (record.error) summary.failed += 1;
      if (record.url) products[index].officialUrl = record.url;
    });

    const surfaceTypeRow = findRow(rows, /^тип варочной поверхности$/);
    const plateTypeRow = findRow(rows, /^тип плиты$/);
    rows.forEach((row) => {
      row.values.forEach((localValue, index) => {
        const record = records[index];
        summary.checked += 1;
        if (["article", "ean", "model"].includes(canonicalLabel(row.title))) {
          summary.skipped += 1;
          return;
        }

        const isGlassShelves = /стеклянн.*пол[ок]/i.test(row.title);
        const photoHint = isGlassShelves ? " ⚠️ (Сверьте кол-во полок с фото!)" : "";

        if (!record || record.error) {
          summary.unknown += 1;
          const message = `⚠️ ОФИЦИАЛЬНЫЙ ИСТОЧНИК: ${row.title} не проверен для ${productLabel(products, index)} (${record?.error || "нет записи"})${photoHint}`;
          noteResult(result, row, index, "warning", message, `Не найдено на оф. сайте${photoHint}`, record?.url || "", true, {
            label: "Официальный источник",
            value: (record?.error || "Карточка не найдена") + photoHint,
            source: record?.url || "",
            anchorLabel: "",
          });
          return;
        }

        const ovenTypeRow = findRow(rows, /^тип духового шкафа$|^тип духовки$/);
        const reference = findReference(row.title, localValue, record, {
          ovenType: ovenTypeRow?.values[index] || "",
          plateType: plateTypeRow?.values[index] || "",
          surfaceType: surfaceTypeRow?.values[index] || "",
        });

        if (!reference) {
          if (officialAbsenceMeansTraditionalCleaning(row.title, localValue, products[index])) {
            summary.confirmed += 1;
            const message = `✅ ОФИЦИАЛЬНЫЙ ИСТОЧНИК: «${row.title}» отсутствует у ${productLabel(products, index)}; локально «${localValue}», принято как «Традиционная очистка»`;
            noteResult(result, row, index, "ok", message, "Способ очистки отсутствует на официальном сайте; принято значение «Традиционная очистка»", record.url, true, {
              label: "Официальный источник",
              value: "Параметр очистки отсутствует; принято «Традиционная очистка»",
              source: record.url,
              anchorLabel: "",
            });
            return;
          }
          if (officialAbsenceMeansNo(row.title, localValue, products[index], {
            surfaceType: surfaceTypeRow?.values[index] || "",
            ovenType: ovenTypeRow?.values[index] || "",
          })) {
            summary.confirmed += 1;
            const message = `✅ ОФИЦИАЛЬНЫЙ ИСТОЧНИК: «${row.title}» отсутствует у ${productLabel(products, index)}; локально «${localValue}», принято как «Нет»`;
            noteResult(result, row, index, "ok", message, "Строка отсутствует на официальном сайте; для этого логического параметра принято значение «Нет»", record.url, true, {
              label: "Официальный источник",
              value: "Строка отсутствует; принято как «Нет»",
              source: record.url,
              anchorLabel: "",
            });
            return;
          }
          summary.unknown += 1;
          const message = `⚠️ ОФИЦИАЛЬНЫЙ ИСТОЧНИК: характеристика «${row.title}» не найдена у ${productLabel(products, index)}${photoHint}`;
          noteResult(result, row, index, "warning", message, `Нет на оф. сайте${photoHint}`, record.url, true, {
            label: row.title,
            value: "Поле не найдено на официальном сайте" + photoHint,
            source: record.url,
            anchorLabel: row.title,
          });
          return;
        }

        const comparison = compareReference(localValue, row.title, reference);
        const status = comparison === null ? "warning" : comparison ? "ok" : "error";
        if (status === "ok") summary.confirmed += 1;
        if (status === "error") summary.mismatches += 1;
        if (status === "warning") summary.unknown += 1;

        const prefix = status === "ok" ? "✅" : status === "error" ? "❌" : "⚠️";
        const fuzzyMark = reference.kind === "fuzzy" ? " [FUZZY]" : "";
        const shownLabel = displayDimensionLabel(reference.entry.label);
        const message = `${prefix} ОФИЦИАЛЬНЫЙ ИСТОЧНИК${fuzzyMark}: «${row.title}» → «${shownLabel}» у ${productLabel(products, index)}; локально «${localValue || "пусто"}», официально «${reference.entry.value || "пусто"}»${photoHint}`;
        const tooltip = status === "error" ? `На оф. сайте: ${reference.entry.value}${photoHint}` : (status === "warning" ? `Нет на оф. сайте${photoHint}` : "");
        noteResult(result, row, index, status, message, tooltip, reference.entry.sourceUrl || record.url, true, {
          label: shownLabel,
          value: (reference.entry.value || "пусто") + photoHint,
          source: reference.entry.sourceUrl || record.url,
          anchorLabel: reference.entry.anchorLabel || reference.entry.label,
        });
      });
    });

    records.forEach((record, index) => {
      if (!record || record.error || !record.featureNames?.length) return;
      record.featureNames.forEach((featureName) => {
        const localMatch = rows.some((row) => featureNameMatches(row.title, row.values[index] || "", featureName));
        if (!localMatch) {
          result.findings.push(`⚠️ ОФИЦИАЛЬНАЯ ФУНКЦИЯ: «${featureName}» есть у ${productLabel(products, index)}, но локального поля для сравнения нет`);
        }
      });
    });
    result.officialSummary = summary;
    return result;
  }

  function mergeResults(target, extra) {
    extra.rowResults.forEach((item, row) => {
      const previous = target.rowResults.get(row) || { status: "ok", messages: new Set(), tooltips: new Set(), details: [] };
      if (STATUS_RANK[item.status] > STATUS_RANK[previous.status]) previous.status = item.status;
      item.messages.forEach((message) => previous.messages.add(message));
      if (item.tooltips) item.tooltips.forEach(t => previous.tooltips.add(t));
      (item.details || []).forEach((detail) => addDetail(previous, detail));
      target.rowResults.set(row, previous);
    });
    extra.cellResults.forEach((item, cell) => {
      const previous = target.cellResults.get(cell) || { status: "ok", messages: new Set(), tooltips: new Set(), sources: new Set(), details: [] };
      if (STATUS_RANK[item.status] > STATUS_RANK[previous.status]) previous.status = item.status;
      item.messages.forEach((message) => previous.messages.add(message));
      if (item.tooltips) item.tooltips.forEach(t => previous.tooltips.add(t));
      (item.sources || []).forEach((source) => previous.sources.add(source));
      (item.details || []).forEach((detail) => addDetail(previous, detail));
      target.cellResults.set(cell, previous);
    });
    target.findings.push(...extra.findings);
    target.officialSummary = extra.officialSummary;
  }

  let openPopover = null;
  let popoverListenersReady = false;

  function closePopover() {
    if (!openPopover) return;
    openPopover.element.remove();
    openPopover = null;
  }

  function copyValue(value, button) {
    const text = String(value ?? "");
    return (async () => {
      try {
        await navigator.clipboard.writeText(text);
      } catch (_) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      const original = button.textContent;
      button.textContent = "Скопировано";
      window.setTimeout(() => { button.textContent = original; }, 1200);
    })();
  }

  function ensurePopoverListeners() {
    if (popoverListenersReady) return;
    popoverListenersReady = true;
    document.addEventListener("click", (event) => {
      if (!openPopover) return;
      if (event.target.closest(".gcv-popover, .gcv-info-button")) return;
      closePopover();
    });
    window.addEventListener("resize", closePopover);
    window.addEventListener("scroll", closePopover, true);
  }

  function showPopover(cell, item, button) {
    ensurePopoverListeners();
    closePopover();

    const popover = document.createElement("div");
    popover.className = "gcv-popover";
    popover.setAttribute("role", "dialog");
    const head = document.createElement("div");
    head.className = "gcv-popover-head";
    const title = document.createElement("strong");
    title.textContent = item.status === "error" ? "Расхождение" : "Подробности проверки";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "gcv-popover-close";
    close.textContent = "×";
    close.setAttribute("aria-label", "Закрыть подробности");
    close.addEventListener("click", closePopover);
    head.append(title, close);
    popover.appendChild(head);

    const details = item.details || [];
    if (details.length) {
      details.forEach((detail) => {
        const row = document.createElement("div");
        row.className = "gcv-popover-row";
        const value = document.createElement("span");
        value.textContent = `${detail.label ? `${detail.label}: ` : ""}${detail.value || "пусто"}`;
        row.appendChild(value);
        if (item.status === "error" && detail.value) {
          const copy = document.createElement("button");
          copy.type = "button";
          copy.className = "gcv-popover-copy";
          copy.textContent = "Копировать";
          copy.addEventListener("click", () => copyValue(detail.value, copy));
          row.appendChild(copy);
        }
        popover.appendChild(row);
      });
    } else {
      Array.from(item.messages || []).forEach((message) => {
        const messageRow = document.createElement("div");
        messageRow.className = "gcv-popover-message";
        messageRow.textContent = message;
        popover.appendChild(messageRow);
      });
    }

    const sources = new Set(details.map((detail) => detail.source).filter(Boolean));
    (item.sources || new Set()).forEach((source) => sources.add(source));
    const source = sources.values().next().value;
    if (source) {
      const link = document.createElement("a");
      const sourceDetail = details.find((detail) => detail.source);
      link.href = officialAnchorUrl(source, sourceDetail?.anchorLabel || sourceDetail?.label || "");
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "Перейти к параметру";
      link.className = "gcv-popover-source";
      popover.appendChild(link);
    }

    document.body.appendChild(popover);
    const buttonRect = button.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const left = Math.min(Math.max(8, buttonRect.left), window.innerWidth - popoverRect.width - 8);
    const below = buttonRect.bottom + 8;
    const top = below + popoverRect.height <= window.innerHeight - 8
      ? below
      : Math.max(8, buttonRect.top - popoverRect.height - 8);
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
    openPopover = { element: popover, button };
  }

  function removeAnnotations() {
    closePopover();
    document.querySelectorAll(".gcv-badge, .gcv-source, .gcv-cell-source, .gcv-info-button").forEach((item) => item.remove());
    document.querySelectorAll(ROW_SELECTOR).forEach((row) => {
      row.classList.remove("gcv-row-error", "gcv-row-warning", "gcv-row-ok");
    });
  }

  function renderResults(result, products) {
    removeAnnotations();
    result.rowResults.forEach((item, row) => {
      row.element.classList.add(`gcv-row-${item.status}`);
    });
    result.cellResults.forEach((item, cell) => {
      if (!cell) return;
      const badge = document.createElement("span");
      badge.className = `gcv-badge gcv-badge-${item.status}`;
      badge.textContent = item.status === "error" ? "❌" : item.status === "warning" ? "⚠️" : "✅";
      badge.setAttribute("aria-label", item.status === "error" ? "Расхождение" : item.status === "warning" ? "Предупреждение" : "Проверено");
      badge.style.cssText = "margin-left:8px; font-size:14px;";
      cell.append(" ", badge);

      if (item.sources.size > 0) {
        const url = item.sources.values().next().value;
        const detail = (item.details || []).find((entry) => entry.source);
        const link = document.createElement("a");
        link.className = "gcv-cell-source";
        link.href = officialAnchorUrl(url, detail?.anchorLabel || detail?.label || "");
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = "↗";
        link.title = detail?.anchorLabel || detail?.label ? "Перейти к параметру на официальном сайте" : `Открыть источник: ${url}`;
        link.style.cssText = "margin-left:4px; text-decoration:none; color:#007f83;";
        cell.append(" ", link);
      }

      if ((item.details || []).length || item.messages?.size) {
        const info = document.createElement("button");
        info.type = "button";
        info.className = "gcv-info-button";
        info.textContent = "ℹ";
        info.setAttribute("aria-label", "Показать подробности проверки");
        info.addEventListener("click", () => {
          if (openPopover?.button === info) closePopover();
          else showPopover(cell, item, info);
        });
        cell.append(" ", info);
      }
    });
  }

  function ensurePanel() {
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;
    const style = document.createElement("style");
    style.textContent = `
      #${PANEL_ID}{position:fixed;z-index:2147483646;top:14px;right:14px;width:min(430px,calc(100vw - 28px));max-height:calc(100vh - 28px);overflow:auto;background:#fff;color:#17212b;border:1px solid #cfd8dc;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.2);font:14px/1.4 Arial,sans-serif}
      #${PANEL_ID} .gcv-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;background:#f1f5f6;border-bottom:1px solid #dfe7e9}
      #${PANEL_ID} .gcv-title{font-weight:700} #${PANEL_ID} .gcv-body{padding:12px 14px}
      #${PANEL_ID} button{border:1px solid #aebdc2;border-radius:6px;background:#fff;padding:6px 9px;cursor:pointer}
      #${PANEL_ID} button:hover{background:#eaf5f5} #${PANEL_ID} .gcv-run{background:#007f83;color:#fff;border-color:#007f83}
      #${PANEL_ID} .gcv-summary{margin:0 0 9px;font-weight:700} #${PANEL_ID} .gcv-note{color:#526168;font-size:12px;margin:8px 0}
      #${PANEL_ID} .gcv-list{margin:8px 0 0;padding-left:20px;max-height:360px;overflow:auto}
      #${PANEL_ID} .gcv-list li{margin:0 0 7px} #${PANEL_ID} a{color:#007f83}
      .gcv-info-button{margin-left:5px;padding:1px 5px!important;border:1px solid #aebdc2;border-radius:4px;background:#fff;color:#007f83;font-size:13px;line-height:1.2;cursor:pointer}
      .gcv-info-button:hover{background:#eaf5f5}.gcv-popover{position:fixed;z-index:2147483647;width:min(390px,calc(100vw - 16px));max-height:min(70vh,520px);overflow:auto;padding:0;background:#fff;color:#17212b;border:1px solid #aebdc2;border-radius:8px;box-shadow:0 8px 26px rgba(0,0,0,.24);font:13px/1.4 Arial,sans-serif}
      .gcv-popover-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 11px;background:#f1f5f6;border-bottom:1px solid #dfe7e9}.gcv-popover-close{border:0!important;background:transparent!important;padding:0 3px!important;font-size:20px;line-height:1;color:#526168;cursor:pointer}.gcv-popover-row{display:flex;align-items:flex-start;gap:8px;padding:9px 11px;border-bottom:1px solid #edf1f2}.gcv-popover-row>span{flex:1;min-width:0;word-break:break-word}.gcv-popover-message{padding:9px 11px;white-space:pre-wrap;word-break:break-word}.gcv-popover-copy{padding:4px 7px!important;font-size:11px;line-height:1.2;white-space:nowrap}.gcv-popover-source{display:block;padding:9px 11px;color:#007f83}
      #${PANEL_ID}.gcv-collapsed .gcv-body{display:none} #${PANEL_ID}.gcv-collapsed{width:auto}
      .gcv-row-error .compare-table-block__cell, .gcv-row-error .characteristics__property {background-color:rgba(255,72,72,.12)!important}
      .gcv-row-warning .compare-table-block__cell, .gcv-row-warning .characteristics__property {background-color:rgba(255,193,7,.13)!important}
      .gcv-row-ok .compare-table-block__cell, .gcv-row-ok .characteristics__property {background-color:rgba(57,181,74,.08)!important}
    `;
    document.head.appendChild(style);
    panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.innerHTML = `<div class="gcv-head"><span class="gcv-title">Расширенная проверка v1.8.8</span><button data-action="toggle">Показать</button></div> <div class="gcv-body"><button class="gcv-run" data-action="run">Проверить ещё раз</button><div class="gcv-output">Таблица загружается…</div></div>`;
    panel.classList.add("gcv-collapsed");
    panel.querySelector('[data-action="run"]').addEventListener("click", () => runChecks());
    panel.querySelector('[data-action="toggle"]').addEventListener("click", (event) => {
      panel.classList.toggle("gcv-collapsed");
      event.currentTarget.textContent = panel.classList.contains("gcv-collapsed") ? "Показать" : "Скрыть";
    });
    document.body.appendChild(panel);
    return panel;
  }

  function renderPanel(result, products, loading = false) {
    const panel = ensurePanel();
    const output = panel.querySelector(".gcv-output");
    const errors = [...result.rowResults.values()].filter((item) => item.status === "error").length;
    const warnings = [...result.rowResults.values()].filter((item) => item.status === "warning").length;
    output.replaceChildren();

    const summary = document.createElement("p");
    summary.className = "gcv-summary";
    summary.textContent = `Ошибок: ${errors}. Предупреждений: ${warnings}. Проверенных строк: ${result.rowResults.size}.`;
    output.appendChild(summary);

    if (loading) {
      const loadingNote = document.createElement("p");
      loadingNote.className = "gcv-note";
      loadingNote.textContent = "Загружаю официальные карточки ru.gorenje.com…";
      output.appendChild(loadingNote);
      return;
    }

    if (result.officialSummary) {
      const official = document.createElement("p");
      official.className = "gcv-note";
      const item = result.officialSummary;
      official.textContent = `Официальная проверка: подтверждено ${item.confirmed}, расхождений ${item.mismatches}, нет подтверждения ${item.unknown}, служебных идентификаторов пропущено ${item.skipped || 0}.`;
      output.appendChild(official);
    }

    const findings = [...new Set(result.findings)];
    if (!findings.length) {
      const ok = document.createElement("p");
      ok.textContent = "✅ Ошибок по доступным правилам не найдено.";
      output.appendChild(ok);
      return;
    }

    const list = document.createElement("ul");
    list.className = "gcv-list";
    findings.forEach((message) => {
      const item = document.createElement("li");
      item.textContent = message;
      list.appendChild(item);
    });
    output.appendChild(list);
  }

  async function waitForStableTable() {
    let previousCount = 0;
    let stablePolls = 0;
    for (let attempt = 0; attempt < 14; attempt += 1) {
      const count = readTable().length;
      if (count > 0 && count === previousCount) stablePolls += 1;
      else stablePolls = 0;
      if (stablePolls >= 2) return;
      previousCount = count;
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    }
  }

  async function runChecks() {
    if (runInProgress) return;
    runInProgress = true;
    await waitForStableTable();
    const rows = readTable();
    if (rows.length < 1) {
      renderPanel({ ...emptyResult(), findings: [`Таблица характеристик не найдена на странице: ${window.location.href}`] }, [], false);
      runInProgress = false;
      return;
    }
    const currentRun = ++runSequence;
    hasRun = true;
    const products = readProducts(rows);

    const localResult = runLocalValidation(rows, products);
    renderResults(localResult, products);
    renderPanel(localResult, products, true);

    try {
      const officialResult = await runOfficialValidation(rows, products);
      if (currentRun !== runSequence) return;
      mergeResults(localResult, officialResult);
    } catch (error) {
      console.error("[GCV] Ошибка проверки:", error);
      localResult.findings.push(`⚠️ Внутренняя ошибка проверки: ${error?.message || error}. Результаты по официальной части могут быть неполными.`);
    }

    if (currentRun !== runSequence) return;
    renderResults(localResult, products);
    renderPanel(localResult, products, false);
    runInProgress = false;
  }

  function start() {
    if (hasStarted) return;
    hasStarted = true;
    ensurePanel();
    const observer = new MutationObserver(() => {
      if (hasRun || runInProgress || document.querySelectorAll(ROW_SELECTOR).length < 1) return;
      window.clearTimeout(autoTimer);
      autoTimer = window.setTimeout(() => runChecks(), 1000);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    autoTimer = window.setTimeout(() => runChecks(), 1500);
  }

  if (isOfficialProductPage()) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", focusOfficialField, { once: true });
    else focusOfficialField();
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
    window.addEventListener("load", start, { once: true });
  }
})();
