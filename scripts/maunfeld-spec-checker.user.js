// ==UserScript==
// @name         Maunfeld: сверка характеристик (home ↔ official)
// @namespace    maunfeld-home.spec-checker
// @version      1.6.9
// @description  Сверяет характеристики maunfeld-home.ru с maunfeld.ru. Версия 1.6.9: сравнение климатических классов без учёта разделителей; сравнение числовых последовательностей при различающихся знаках; расширены сопоставления названий характеристик.
// @author       internal
// @updateURL    https://lintervil.github.io/price-tools/scripts/maunfeld-spec-checker.user.js
// @downloadURL  https://lintervil.github.io/price-tools/scripts/maunfeld-spec-checker.user.js
// @match        https://maunfeld-home.ru/*
// @match        https://www.maunfeld-home.ru/*
// @match        https://maunfeld.ru/*
// @match        https://www.maunfeld.ru/*
// @connect      maunfeld.ru
// @connect      www.maunfeld.ru
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==
(function () {
'use strict';
const SCRIPT_VERSION = '1.6.9';
const OFFICIAL_ORIGIN = 'https://www.maunfeld.ru';
const API = OFFICIAL_ORIGIN + '/api/v1/';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_VERSION = 'mf_off_v8';
const GM_FETCH_TIMEOUT = 15000;
const OVERALL_TIMEOUT = 45000;
const JOB_KEY = 'mf_job';
const SEC_KEY = 'mf_sections_v1';
const SECTION_MAP = {"1":"dukhovye-shkafy","2":"electric","5":"cooktop","6":"induction","10":"hood","13":"art-nouveau","20":"freestanding-dishwasher","34":"steklokeramicheskie","43":"kukhonnye-moyki","446":"besprovodnye-vertikalnye-pylesosy","458":"statsionarnyy","459":"shnekovye","465":"induktsionnye-plitki","497":"cross-door","502":"vstraivaemaya-tekhnika","1889":"vertikalnye-otparivateli","1891":"vertikalnyy-otparivatel","1958":"izmelchiteli-pishchevykh-otkhodov","2016":"dukhovye-shkafy_comp","2044":"kopmlekty","7":"electrical","17":"island","23":"stiralnye-i-sushilnye-mashiny","33":"blenders","444":"vertikalnye-pylesosy","448":"napolnye-vesy","457":"pogruzhnoy","466":"elektricheskie-plitki","490":"otdelnostoyashchaya-tekhnika","506":"stiralnye-mashiny-bez-sushki2","1866":"elektricheskie-dukhovye-shkafy-s-parom","1890":"ruchnye-otparivateli","2015":"kukhonnye-vytyazhki","2105":"french-door","8":"gas_panel","14":"embedded","57":"kukhonnye-smesiteli","447":"parovye-shvabry","453":"melkaya-bytovaya-tekhnika-dlya-kukhni","461":"tsentrobezhnye","462":"vafelnitsy","498":"side-by-side","1886":"elektricheskie-dukhovye-shkafy-s-svch","1896":"kombinirovannye-plity","2014":"varochnye-paneli","2113":"kholodilniki-kitfit-i-kitfit-pro","2150":"stiralno-sushilnye-kolonny","9":"electrical-and-combined-panels","24":"freezers","29":"edmicrowave","495":"dvuhkamernye","503":"teleskopicheskie","504":"kompaktnye-s-svch","2011":"posudomoechnye-mashiny-vstraivaemye","11":"sloping","19":"vstraivaemye-posudomoechnye-mashiny","27":"freezer","443":"pylesosy","492":"stiralnye-mashiny-bez-sushki","496":"odnokamernye","1751":"kompaktnye-dukhovye-shkafy","2012":"stiralnye-mashiny-otdelnostoyashchie","3":"gas_oven","12":"dome","22":"washing-machine","28":"chest","58":"accessories","2017":"kholodilnik","4":"uzkie-dukhovye-shkafy","15":"standard","25":"embedded-freezer","454":"kofemashiny","499":"vinnye-shkafy","2013":"kofemashiny-vstraivaemye","455":"kofemolki","500":"plity","508":"morozilniki","2118":"vytyazhki-vstraivaemye-v-stoleshnitsu","480":"kukhonnye-vesy","509":"vstraivaemye-vinnye-shkafy","1449":"t-obraznye","464":"kukhonnye-kombayny","493":"s-vertikalnoy-zagruzkoy","511":"vstraivaemye-kofemashiny","31":"mikrovolnovye-pechi","501":"gazovye-plity","2196":"mini-pechi","35":"slow-cooker","36":"grinder","1857":"stiralnye_mashiny_s_sushkoy","37":"table-tiles","1749":"ovoshcherezki","38":"planetary-mixers","1852":"ruchnye-miksery","39":"juicer","494":"sushilnye-mashiny","40":"toasters","489":"khlebopechi","42":"electric-kettles","41":"electric-grills","491":"kompaktnye","1942":"sredstva-dlya-stirki","44":"round","46":"rectangular","47":"with-two-bowls","48":"with-the-wing","49":"corner-sink","52":"kitchen-sinks-oval","53":"rectangular-kitchen-sinks","54":"kitchen-sinks-with-two-bowls","55":"kitchen-sinks-with-drainer","56":"kitchen-sinks-corner","440":"posuda-i-aksessuary","442":"tekhnika-dlya-doma","513":"moyki-i-smesiteli","1858":"stiralnye_mashiny_sushkoy","1870":"mikrovolnovye-pechi-v-verkhnyuyu-polku-i-kolonnu","1871":"mikrovolnovye-pechi-v-kolonnu","1873":"gazovye-plitki","1877":"televizory","1915":"avtomaticheskie-kofemashiny","1916":"rozhkovye","1917":"kapelnye","1926":"sredstva-dlya-posudomoechnykh-mashin","1931":"klimaticheskaya-tekhnika","1932":"protochnye-vodonagrevateli","1933":"nakopitelnye-vodonagrevateli","1940":"tabletki-dlya-posudomoechnykh-mashin","1948":"ventilyatory","1951":"kholodilnik-dlya-kosmetiki","1963":"ventilyatory-vytyazhnye","1970":"plity-induktsionnye","1972":"kronshteyny-dlya-televizorov","1984":"kastryuli","1985":"skovorody","1986":"kovshi","1988":"kryshki","1998":"varochnye-paneli-gazovye","1999":"varochnye-paneli-steklokeramicheskie","2000":"varochnye-paneli-induktsionnye","2001":"vytyazhki-ostrovnye","2002":"vytyazhki-dizaynerskie","2003":"vytyazhki-kupolnye","2004":"vytyazhki-naklonnye","2005":"vytyazhki-polnovstraivaemye","2006":"dukhovye-shkafy-elektricheskie","2008":"dukhovye-shkafy-kompaktnye-s-svch","2009":"kholodilniki-otdelnostoyashchie","2010":"kholodilniki-vstraivaemye","2019":"vinnye-shkaf","2021":"stiralnye-mashiny-otdelnostoyashie","2022":"stiralnye-mashiny-vstraivaemye","2023":"sushilnye-mashiy","2024":"stiralnye-mashiny-s-vertikalnoy-zagruzk","2025":"dukhovye-shkafy-elektricheskie-uzkie","2026":"batareyki","2028":"soedinitelnye-elementy","2031":"batareiki","2045":"grili","2049":"ploskie-vytyazhki","2050":"varochnye-paneli-kombinirovannye","2054":"vytyazhki","2055":"varochnye-poverkhnosti","2056":"vstraivaemye-mikrovolnovye-pechi","2057":"dukhovye-shkafy-maunfeld","2058":"posudomoechnye-mashiny-maunfeld","2059":"stiralnye-mashiny-maunfeld","2060":"sushilnye-mashiny-maunfeld","2061":"kholodilniki-maunfeld","2084":"ventilyatory-kanalnye","2089":"vytyazhki-varochnaya-panel-v-podarok","2090":"dukhovye-shkafy-varochnaya-panel-v-podarok","2091":"mikrovolnovye-pechi-varochnaya-panel-v-podarok","2092":"posudomoechnye-mashiny-varochnaya-panel-v-podarok","2093":"stiralnye-mashiny-varochnaya-panel-v-podarok","2094":"kholodilniki-varochnaya-panel-v-podarok","2096":"vinnye-shkafy-varochnaya-panel-v-podarok","2098":"plity-steklokeramicheskie-varochnaya-panel-v-podarok","2099":"izmelchiteli-bytovye-varochnaya-panel-v-podarok","2106":"vstraivaemye-shkafy-dlya-podogrevaniya-posudy","2119":"chistyashchie-sredstva","2126":"komplekty-stiralnye-i-sushilnye-mashiny","2132":"kholodilnye-shkafy-dlya-napitkov","2146":"formy-dlya-vypechki-i-zapekaniya","2169":"maunfeld-design","2170":"dizaynerskie-vytyazhki","2192":"podstavka-pod-nozhi","2193":"razdelochnye-doski","2198":"aksessuary-dlya-stiralnykh-i-sushilnykh-mashin","2199":"aksessuary-dlya-vstraivaemoy-tekhniki","2200":"kapsulnye-kofevarki","2201":"aksessuary-dlya-mbt","2210":"nabory-posudy","2242":"chayniki","1941":"sol-dlya-posudomoechnykh-mashin","2020":"mikrovolnovaya-pech-vstraivaemaya","2065":"chayniki","2076":"vinnye-shkafy-studii","2080":"malaya-bytovaya-tekhnika-studii","2078":"izmelchiteli-pishchevykh-otkhodov-studii","2082":"tekhnika-dlya-doma-studii","2081":"aksessuary-studii","34369":"belye","34373":"dukhovki-s-parom","34374":"dukhovki-s-svch","34376":"dukhovki-uzkie","34372":"dukhovki-chernye","34375":"kompaktnye-45-sm","34377":"s-sensornym-upravleniem","36466":"premium","34391":"varki-45-sm","34392":"varki-60-sm","34389":"varki-bezhevye","34387":"varki-belye","34390":"varki-domino","34397":"induktsiya","34393":"2-konforki","34394":"3-konforki","34395":"4-konforki","34396":"5-konforok","34398":"steklokeramika","34388":"varki-chernye","39779":"so-vstroennoy-vytyazhkoy","34399":"nepreryvnyy-nagrev","34378":"vytyazhka-40-sm","34385":"vytyazhka-v-shkaf","34386":"vytyazhka-pryamougolnaya","34362":"30-50-sm","34379":"vytyazhki-50-sm","34380":"vytyazhki-60-sm","34382":"vytyazhki-70-sm","34381":"vytyazhki-90-sm","34359":"vytyazhki-bezhevye","34384":"vytyazhki-belye","34552":"vytyazhki-zolotye","34383":"vytyazhki-kruglye","34551":"vytyazhki-mednye","34360":"vytyazhki-serebristye","34356":"vytyazhki-chernye","34424":"nastolnye","34421":"pmm-solo-45-sm","34422":"pmm-solo-60-sm","34423":"avtomaticheskoe-otkryvanie-dveri-solo","34400":"stirka-s-invertorom","34401":"stirka-s-sushkoy","34404":"stirka-s-parom","34402":"sushilnaya-mashina","34403":"ustanovka-v-kolonnu","36204":"umnye-vesy","34430":"vmestitelnyy","35790":"kholodilnik-dlya-kosmetiki","34426":"no-frost-solo","34429":"2-kamery","34428":"3-kamery","34427":"inverter","34411":"pmm-45-sm","34412":"pmm-60-sm","34416":"aqua-stop","34415":"avtomaticheskoe-otkryvanie-dveri","34418":"luch-na-polu","34413":"tretiy-uroven-zagruzki","35246":"invertor","34655":"bolshoy-vstraivaemyy-kholodilnik","34420":"sistema-side-by-side","34651":"vstraivaemaya-kholodilno-morozilnaya-kombinatsiya-premium","34653":"vstraivaemye-kholodilniki-dvukhkamernye","34652":"vstraivaemye-kholodilniki-pod-stoleshnitsu","34419":"no-frost","34654":"vstraivaemyy-odnokamernyy-kholodilnik","34445":"zona-svezhesti-dlya-sokhraneniya-delikatnykh-produktov","35296":"s-vozmozhnostyu-vstraivaniya","35297":"vstraivaemye-v-kolonnu-vinnye-shkafy","35295":"otdelnostoyashchie-vinnye-shkafy","34409":"s-gaz-kontrolem","34407":"s-gazovoy-dukhovkoy","34406":"s-elektricheskoy-dukhovkoy","34410":"s-yashchikom-dlya-khraneniya","34996":"vstraivanie-v-kolonnu","40311":"aktivnyy-kisloroda-dlya-belizny-belya","40314":"gel-dlya-stirki-tsvetnykh-veshchey","40310":"dlya-tsvetnogo-belya","40312":"protiv-pyaten","40313":"upakovka-2-4-kg","40315":"upakovka-6-kg","40316":"upakovka-9-kg","35686":"qled","34435":"full-hd","34433":"hd-4k","34436":"ultra-hd","34434":"smart","34437":"android","34438":"yandeks-tv","40320":"gel-dlya-stirki-belya","40319":"poroshki-dlya-stirki-belya","40318":"sol-dlya-posudomoechnykh-mashin","40317":"tabletki-dlya-posudomoechnykh-mashin","40545":"batareyka-v-chasy","40544":"batareyka-krona","40543":"mizinchikovye-batareyki","40542":"palchikovye-batareyki"};
const F = (id, ours, off) => ({ id, namesOurs: ours, namesOff: off || ours });
const SPEC_FIELDS = [
F('type', ['Тип поверхности', 'Тип варочной панели', 'Тип', 'Тип товара', 'Тип прибора'], ['Тип варочной панели', 'Тип поверхности', 'Тип', 'Тип прибора']),
F('burners_total', ['Количество конфорок', 'Общее количество конфорок', 'Количество нагревательных элементов', 'Количество нагревательных элементов, шт.'], ['Количество конфорок', 'Количество нагревательных элементов', 'Количество нагревательных элементов, шт.']),
F('burners_ind', ['Индукционных конфорок', 'Количество индукционных конфорок'], ['Количество конфорок']),
F('surface', ['Материал поверхности', 'Материал панели'], ['Материал поверхности', 'Материал панели', 'Материал исполнения']),
F('collection', ['Дизайн (коллекция)', 'Коллекция'], ['Дизайн', 'Коллекция']),
F('color', ['Цвет'], ['Цвет']),
F('design', ['Особенности дизайна', 'Окантовка'], ['Особенности дизайна']),
F('width', ['Ширина, см', 'Ширина, мм'], ['Ширина, мм', 'Ширина, см', 'Ширина панели']),
F('height', ['Высота, см', 'Высота, мм'], ['Высота, мм', 'Высота, см']),
F('depth', ['Глубина, см', 'Глубина, мм'], ['Глубина, мм', 'Глубина, см']),
F('niche', ['Габариты ниши для встраивания (Ш х Г), см', 'Габариты ниши для встраивания (В х Ш х Г), см', 'Габариты ниши для встраивания  (В х Ш х Г), см', 'Размеры для монтажа (ШхГ)', 'Размеры для монтажа (Ш х Г)'], ['Габариты ниши для встраивания (Ш х Г), см', 'Габариты ниши для встраивания (В х Ш х Г), см', 'Габариты ниши для встраивания  (В х Ш х Г), см', 'Размеры для монтажа (ШхГ)', 'Размеры для монтажа (Ш х Г)']),
F('control_type', ['Тип управления', 'Тип управления прибором', 'Переключатели'], ['Тип управления', 'Тип управления прибором', 'Переключатели']),
F('control_elements', ['Элементы управления'], ['Элементы управления']),
F('control_features', ['Особенности элементов управления'], ['Особенности элементов управления']),
F('grate_material', ['Решетки', 'Материал решетки'], ['Материал решетки', 'Решетки']),
F('body_material', ['Материал корпуса'], ['Материал корпуса']),
F('color_fittings', ['Цвет фурнитуры'], ['Цвет фурнитуры']),
F('electric_ignition', ['Электроподжиг'], ['Электроподжиг']),
F('gas_burners', ['Газовых конфорок / горелок', 'Количество газовых конфорок', 'Количество горелок'], ['Количество газовых конфорок', 'Газовых конфорок / горелок']),
F('sabaf', ['Итальянские горелки Сабаф (sabaf)', 'Горелки SABAF', 'Горелки Сабаф'], ['Горелки SABAF', 'Итальянские горелки Сабаф (sabaf)']),
F('gas_use', ['Использование газа'], ['Использование газа']),
F('power_levels', ['Количество ступеней мощности', 'Количество режимов мощности'], ['Количество ступеней мощности', 'Уровни мощности']),
F('heat_ind', ['Индикация ступени нагрева', 'Индикация степени нагрева'], ['Индикация ступени нагрева', 'Индикация степени нагрева']),
F('pan_detect', ['Индикатор наличия посуды', 'Детектор диаметра посуды'], ['Детектор диаметра посуды', 'Индикатор наличия посуды']),
F('error_msg', ['Вывод сообщения об ошибке']),
F('cont_heat', ['Технология непрерывного нагрева'], ['Технология непрерывного нагрева']),
F('defrost', ['Размораживание'], ['Размораживание']),
F('keep_warm', ['Подогрев'], ['Подогрев']),
F('booster', ['Усиление мощности конфорки (booster)', 'Функция Booster', 'Booster'], ['Бустер', 'Booster']),
F('fast_heat', ['Быстрый нагрев'], ['Быстрый нагрев']),
F('timer', ['Таймер', 'Таймер конфорок'], ['Таймер', 'Таймер конфорок']),
F('timer_fn', ['Функции таймера']),
F('pause', ['Пауза', 'Режим паузы'], ['Режим паузы', 'Пауза']),
F('inverter', ['Инверторная технология', 'Инвертор'], ['Инвертор', 'Инверторная технология']),
F('flex', ['Количество расширенных зон нагрева Флекс (flex zone)', 'Flex Zone', 'Количество Flex Zone'], ['Flex Zone', 'Flex-зона']),
F('zones_d', ['Диаметр конфорок, мм'], ['Диаметр конфорок, мм']),
F('zones_w', ['Мощность конфорок, Вт'], ['Мощность конфорок, Вт']),
F('child_lock', ['Блокировка от детей', 'Защита от детей', 'Блокировка панели'], ['Блокировка панели', 'Блокировка от детей', 'Защита от детей']),
F('heat_left', ['Индикатор остаточного тепла'], ['Индикатор остаточного тепла']),
F('auto_off', ['Автоматическое отключение', 'Автоматическое выключение'], ['Автоматическое выключение', 'Автоматическое отключение']),
F('power_max', ['Максимальная потребляемая мощность электрических конфорок, Вт', 'Максимальная мощность, Вт', 'Мощность, Вт', 'Мощность газовых конфорок, Вт'], ['Максимальная мощность, Вт', 'Максимальная потребляемая мощность, Вт', 'Потребляемая мощность (макс)', 'Мощность газовых конфорок, Вт']),
F('voltage', ['Напряжение, В', 'Напряжение'], ['Напряжение, В', 'Напряжение']),
F('freq', ['Частота, Гц'], ['Частота, Гц', 'Частота']),
F('weight_net', ['Вес (нетто), кг', 'Вес нетто, кг', 'Нетто'], ['Вес товара без упаковки (нетто), кг', 'Вес нетто, кг', 'Нетто']),
F('weight_gross', ['Вес брутто, кг', 'Вес (брутто), кг', 'Брутто'], ['Вес товара (брутто), кг', 'Вес брутто, кг', 'Брутто']),
F('cord', ['Длина шнура, см', 'Длина сетевого шнура, см'], ['Длина шнура, см']),
F('sku', ['Артикул'], ['Артикул']),
F('code', ['Код товара'], ['Код товара']),
F('country', ['Страна-производитель', 'Страна производства', 'Страна'], ['Страна', 'Страна-производитель', 'Страна производства']),
F('barcode', ['Штрихкод', 'ШтрихКод'], ['ШтрихКод', 'Штрихкод']),
F('warranty', ['Гарантия, мес.', 'Гарантия, мес'], ['Гарантия, мес.', 'Гарантия, мес', 'Гарантия']),
F('complect', ['Комплектация'], ['Комплектация']),
F('energy_class', ['Класс энергопотребления', 'Класс энергетической эффективности', 'Класс энергоэффективности'], ['Класс энергопотребления', 'Класс энергетической эффективности', 'Класс энергоэффективности']),
F('noise', ['Уровень шума, дБ'], ['Уровень шума, дБ', 'Уровень шума']),
F('fridge_total_volume', ['Общий объем холодильного отделения, л', 'Общий объём холодильного отделения, л', 'Общий объем, л', 'Общий объём, л'], ['Общий объём, л', 'Общий объем, л', 'Общий объем холодильного отделения, л', 'Общий объём холодильного отделения, л']),
F('fridge_useful_volume', ['Полезный объем холодильного отделения, л', 'Полезный объём холодильного отделения, л', 'Полезный объем, л', 'Полезный объём, л'], ['Полезный объём, л', 'Полезный объем, л', 'Полезный объем холодильного отделения, л', 'Полезный объём холодильного отделения, л']),
F('volume', ['Объем, л', 'Объём, л', 'Полезный объем, л', 'Полезный объём, л'], ['Объем, л', 'Объём, л', 'Полезный объем, л', 'Полезный объём, л']),
F('programs', ['Количество программ'], ['Количество программ']),
F('speeds', ['Количество скоростей'], ['Количество скоростей']),
F('perf', ['Максимальная производительность, м3/ч', 'Производительность, м3/ч', 'Производительность, м³/ч'], ['Производительность, м3/ч', 'Максимальная производительность, м3/ч', 'Производительность, м³/ч']),
F('energy_year', ['Энергопотребление, кВт·ч/год', 'Энергопотребление кВт.ч/год', 'Годовое энергопотребление, кВт⋅ч'], ['Энергопотребление, кВт·ч/год', 'Энергопотребление кВт.ч/год', 'Годовое энергопотребление, кВт⋅ч']),
F('motor_power', ['Мощность мотора, Вт', 'Мощность двигателя, Вт'], ['Мощность мотора, Вт', 'Мощность двигателя, Вт']),
F('duct_diameter', ['Диаметр воздуховода, мм', 'Диаметр патрубка, мм'], ['Диаметр воздуховода, мм', 'Диаметр патрубка, мм']),
F('hood_modes', ['Количество скоростей', 'Количество режимов работы'], ['Количество скоростей', 'Количество режимов работы']),
F('hood_lamps', ['Количество ламп освещения', 'Освещение', 'Тип освещения'], ['Количество ламп освещения', 'Освещение', 'Тип освещения']),
F('filter_type', ['Тип фильтра', 'Фильтр', 'Тип жироулавливающего фильтра'], ['Тип фильтра', 'Фильтр', 'Тип жироулавливающего фильтра']),
F('air_outlet', ['Отвод воздуха', 'Режимы работы', 'Режим работы'], ['Отвод воздуха', 'Режимы работы', 'Режим работы']),
F('recirculation', ['Рециркуляция', 'Работа в режиме рециркуляции'], ['Рециркуляция', 'Работа в режиме рециркуляции']),
F('oven_volume', ['Объем духовки, л', 'Объем камеры, л', 'Полезный объем, л'], ['Объем духовки, л', 'Объем камеры, л', 'Полезный объем, л']),
F('oven_modes', ['Количество режимов', 'Количество режимов приготовления'], ['Количество режимов', 'Количество режимов приготовления']),
F('oven_temp', ['Максимальная температура, °C', 'Диапазон температур, °C'], ['Максимальная температура, °C', 'Диапазон температур, °C']),
F('grill_power', ['Мощность гриля, Вт'], ['Мощность гриля, Вт']),
F('oven_power', ['Максимальная входная мощность, Вт', 'Потребляемая мощность, Вт'], ['Максимальная входная мощность, Вт', 'Потребляемая мощность, Вт']),
F('cleaning', ['Очистка духовки', 'Тип очистки'], ['Очистка духовки', 'Тип очистки']),
F('gas_control', ['Газ-контроль', 'Газ контроль'], ['Газ-контроль', 'Газ контроль']),
F('ignition', ['Электроподжиг', 'Тип электроподжига'], ['Электроподжиг', 'Тип электроподжига']),
F('micro_power', ['Мощность микроволн, Вт', 'Выходная мощность микроволн, Вт'], ['Мощность микроволн, Вт', 'Выходная мощность микроволн, Вт']),
F('micro_input', ['Потребляемая мощность в режиме микроволн, Вт', 'Потребляемая мощность, Вт'], ['Потребляемая мощность в режиме микроволн, Вт', 'Потребляемая мощность, Вт']),
F('turntable', ['Диаметр поворотного стола, см', 'Диаметр поворотного стола, мм'], ['Диаметр поворотного стола, см', 'Диаметр поворотного стола, мм']),
F('micro_levels', ['Количество уровней мощности', 'Уровни мощности'], ['Количество уровней мощности', 'Уровни мощности']),
F('micro_programs', ['Количество автоматических программ', 'Автоматические программы'], ['Количество автоматических программ', 'Автоматические программы']),
F('install_type', ['Тип установки', 'Тип монтажа', 'Тип установки холодильника', 'Тип монтажа винного шкафа'], ['Тип установки', 'Тип монтажа']),
F('fridge_type', ['Тип прибора', 'Тип холодильника'], ['Тип прибора', 'Тип холодильника']),
F('chambers', ['Количество камер', 'Количество отделений'], ['Количество камер', 'Количество отделений']),
F('doors', ['Количество дверей'], ['Количество дверей']),
F('climate_class', ['Климатический класс'], ['Климатический класс']),
F('compressors', ['Количество компрессоров'], ['Количество компрессоров']),
F('compressor_type', ['Тип компрессора'], ['Тип компрессора']),
F('thermostat', ['Термостат', 'Тип термостата'], ['Термостат', 'Тип термостата']),
F('temp_range', ['Диапазон температур, °C', 'Диапазон температур'], ['Диапазон температур, °C', 'Диапазон температур']),
F('refrigerant', ['Хладагент', 'Тип хладагента'], ['Хладагент', 'Тип хладагента']),
F('freezing_capacity', ['Мощность замораживания, кг/сутки', 'Мощность замораживания, кг/сут'], ['Мощность замораживания, кг/сутки', 'Мощность замораживания, кг/сут']),
F('defrost_type', ['Размораживание', 'Система размораживания', 'Тип размораживания'], ['Размораживание', 'Система размораживания', 'Тип размораживания']),
F('water_use', ['Расход воды, л/цикл', 'Расход воды за цикл, л', 'Потребление воды, л'], ['Расход воды, л/цикл', 'Расход воды за цикл, л', 'Потребление воды, л']),
F('dish_capacity', ['Вместимость, комплектов', 'Количество комплектов', 'Вместимость посуды'], ['Вместимость, комплектов', 'Количество комплектов', 'Вместимость посуды']),
F('wash_programs', ['Количество программ мойки', 'Программы мойки', 'Количество программ'], ['Количество программ мойки', 'Программы мойки', 'Количество программ']),
F('spin_speed', ['Максимальная скорость отжима, об/мин', 'Скорость отжима, об/мин', 'Максимальная скорость отжима'], ['Максимальная скорость отжима, об/мин', 'Скорость отжима, об/мин', 'Максимальная скорость отжима']),
F('load_wash', ['Загрузка белья, кг', 'Максимальная загрузка, кг', 'Загрузка при стирке, кг'], ['Загрузка белья, кг', 'Максимальная загрузка, кг', 'Загрузка при стирке, кг']),
F('load_dry', ['Загрузка при сушке, кг', 'Максимальная загрузка при сушке, кг'], ['Загрузка при сушке, кг', 'Максимальная загрузка при сушке, кг']),
F('drying_type', ['Тип сушки', 'Сушка'], ['Тип сушки', 'Сушка']),
F('water_protection', ['Защита от протечек', 'Система защиты от протечек'], ['Защита от протечек', 'Система защиты от протечек']),
F('steam', ['Обработка паром', 'Пар', 'Функция пара'], ['Обработка паром', 'Пар', 'Функция пара']),
F('coffee_type', ['Тип кофемашины', 'Тип кофеварки'], ['Тип кофемашины', 'Тип кофеварки']),
F('coffee_pressure', ['Давление помпы, бар', 'Давление, бар'], ['Давление помпы, бар', 'Давление, бар']),
F('coffee_tank', ['Объем резервуара для воды, л', 'Объём резервуара для воды, л', 'Емкость резервуара для воды, л'], ['Объем резервуара для воды, л', 'Объём резервуара для воды, л', 'Емкость резервуара для воды, л']),
F('bowl_volume', ['Объем чаши, л', 'Объём чаши, л'], ['Объем чаши, л', 'Объём чаши, л']),
F('auto_programs', ['Количество автоматических программ', 'Автоматические программы'], ['Количество автоматических программ', 'Автоматические программы']),
F('capacity', ['Вместимость', 'Полезный объем', 'Объем камеры'], ['Вместимость', 'Полезный объем', 'Объем камеры']),
F('power_connection', ['Мощность подключения, Вт', 'Мощность подключения', 'Подключаемая мощность, Вт'], ['Мощность подключения, Вт', 'Мощность подключения', 'Подключаемая мощность, Вт']),
F('package_height', ['Высота упаковки, см', 'Высота упаковки, мм'], ['Высота упаковки, см', 'Высота упаковки, мм']),
F('package_width', ['Ширина упаковки, см', 'Ширина упаковки, мм'], ['Ширина упаковки, см', 'Ширина упаковки, мм']),
F('package_depth', ['Глубина упаковки, см', 'Глубина упаковки, мм'], ['Глубина упаковки, см', 'Глубина упаковки, мм']),
F('adjustable_feet', ['Регулируемые ножки'], ['Регулируемые ножки']),
F('door_rehang', ['Перенавешивание дверей', 'Перенавес дверей'], ['Перенавешивание дверей', 'Перенавес дверей'])
];
const DIM_IDS = new Set(['width', 'height', 'depth', 'niche']);
const MM_NAME_RE = /мм|mm/i;
const VALUE_ALIASES = {
'*': {
'да': ['да', 'есть', 'yes', '+', 'да.', 'есть.'],
'нет': ['нет', 'отсутствует', 'no', '—', '-', 'нет.'],
'эмаль': ['эмаль', 'эмалированные', 'эмалированная', 'эмалированное покрытие'],
'металл': ['металл', 'металлический', 'металлическая']
},
type: {
'индукционная': ['индукционная', 'индукционный'],
'газовая': ['газовая', 'газовый'],
'электрическая': ['электрическая', 'hi-light', 'hilight', 'стеклокерамическая'],
'встраиваемая': ['встраиваемая'],
'отдельностоящая': ['отдельностоящая', 'отдельностоящий']
},
color: {
'черный': ['черный', 'чёрный', 'черная', 'чёрная', 'black'],
'белый': ['белый', 'белая', 'белое', 'white'],
'серебристый': ['серебристый', 'inox', 'нержавеющая сталь', 'сталь', 'silver'],
'серый': ['серый', 'серая', 'графит']
},
country: { 'китай': ['китай', 'китай*'], 'турция': ['турция', 'турция*'], 'беларусь': ['беларусь', 'белоруссия'] },
surface: { 'стеклокерамика': ['стеклокерамика', 'стеклокерамическая'] },
control_type: {
'сенсорно-слайдерное': ['сенсорно-слайдерное', 'сенсорное со слайдером', 'сенсорный слайдер', 'touch slider', 'slider touch'],
'слайдерное': ['слайдерное', 'slider', 'slidertouch'],
'сенсорное': ['сенсорное', 'сенсорные', 'сенсорный', 'touch control', 'touch'],
'электронное': ['электронное', 'электронный'],
'механическое': ['механическое', 'механический', 'поворотные', 'ручки']
},
electric_ignition: { 'да': ['да', 'есть', 'автоматический', 'автоматическое', 'автоматический электроподжиг'] },
grate_material: { 'эмаль': ['эмаль', 'эмалированные', 'эмалированная', 'эмалированное покрытие'] }
};
function normName(s) {
return String(s || '').replace(/[«»"']/g, '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').replace(/ё/g, 'е').trim().toLowerCase();
}
function stripDecor(s) { return String(s || '').replace(/[«»"']/g, '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(); }
function compact(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9а-яё]+/gi, ''); }
function parseFlexibleNumber(s) { const m = String(s || '').replace(',', '.').match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]) : null; }
function parseAllNumbers(s) { const m = String(s || '').replace(/,/g, '.').match(/\d+(?:\.\d+)?/g); return m ? m.map(Number) : []; }
function textOf(el) {
if (!el) return '';
const c = el.cloneNode(true);
c.querySelectorAll('.glossary-tooltip,.k-tooltip,script,style,svg').forEach(n => n.remove());
return c.textContent.replace(/\s+/g, ' ').trim();
}
function getByNames(map, names) {
for (const n of names) {
if (map[n] != null && map[n] !== '') return map[n];
const hit = Object.keys(map).find(k => normName(k) === normName(n));
if (hit) return map[hit];
}
return null;
}
function findFieldByName(name) {
return SPEC_FIELDS.find(f => f.namesOurs.concat(f.namesOff).some(n => normName(n) === normName(name)));
}
function isYesValue(s) { return /^(да|есть|yes|\+|включено)(\s*,|\s|$)/i.test(String(s || '').trim()); }
function isNoValue(s) { return /^(нет|отсутствует|no|—|-)(\s*,|\s|$)/i.test(String(s || '').trim()); }
function normValue(raw, fieldId) {
const vn = normName(stripDecor(raw)).replace(/\s*\/\s*/g, '/');
for (const dict of [VALUE_ALIASES[fieldId] || {}, VALUE_ALIASES['*'] || {}]) {
for (const [canon, list] of Object.entries(dict)) {
if (list.some(x => normName(x).replace(/\s*\/\s*/g, '/') === vn)) return canon;
}
}
return vn.replace(/\bесть\b/g, 'да').replace(/\s+/g, ' ').trim();
}
function looksMm(name, raw) {
return MM_NAME_RE.test(name || '') || MM_NAME_RE.test(raw || '') || parseAllNumbers(raw).some(n => n >= 200);
}
function toCm(raw, name) {
const nums = parseAllNumbers(raw);
if (!nums.length) return null;
const explicitMm = MM_NAME_RE.test(name || '');
const explicitCm = /см|cm/i.test(name || '');
const mm = explicitMm || (!explicitCm && MM_NAME_RE.test(raw || '') && nums.some(n => n >= 80));
return nums.map(n => mm ? n / 10 : n);
}
function dimsEqual(a, an, b, bn) {
let pa = toCm(a, an), pb = toCm(b, bn);
if (!pa || !pb || !pa.length || pa.length !== pb.length) return false;
if (normName(an).includes('ниши') || normName(an).includes('монтажа') ||
    normName(bn).includes('ниши') || normName(bn).includes('монтажа')) {
  const aHasUnit = /мм|mm|см|cm/i.test(String(an || '') + ' ' + String(a || ''));
  const bHasUnit = /мм|mm|см|cm/i.test(String(bn || '') + ' ' + String(b || ''));
  if (!aHasUnit && pa.some(n => n >= 100)) pa = pa.map(n => n / 10);
  if (!bHasUnit && pb.some(n => n >= 100)) pb = pb.map(n => n / 10);
}
return pa.every((n, i) => Math.abs(n - pb[i]) < 0.051);
}
function formatCm(raw, name) {
const parts = toCm(raw, name);
if (!parts) return String(raw || '');
return parts.map(n => String(n)).join(' х ');
}
function expandSizes(raw) {
const s = String(raw || '').replace(/\u00a0/g, ' ').replace(/х/gi, 'x').replace(/×/g, 'x');
const out = [];
s.split(/[;,]+/).forEach(part => {
const p = part.trim();
if (!p) return;
const countBy = p.match(/(\d+)\s*по\s*(\d+(?:\.\d+)?(?:\s*x\s*\d+(?:\.\d+)?)?)/i);
if (countBy) {
const n = Number(countBy[1]);
const token = countBy[2].replace(/\s+/g, '');
for (let i = 0; i < n; i++) out.push(token);
return;
}
const countX = p.match(/^(\d+)\s*x\s*(\d+(?:\.\d+)?)(?:\s*x\s*(\d+(?:\.\d+)?))?$/i);
if (countX && Number(countX[1]) <= 6 && Number(countX[2]) >= 80) {
const n = Number(countX[1]);
const token = countX[3] ? (countX[2] + 'x' + countX[3]) : countX[2];
for (let i = 0; i < n; i++) out.push(token);
return;
}
const dim = p.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
if (dim) { out.push(dim[1] + 'x' + dim[2]); return; }
const num = p.match(/(\d+(?:\.\d+)?)/);
if (num) out.push(num[1]);
});
return out.sort();
}
function ourZoneSizes(map) {
const keys = Object.keys(map).filter(k => /диаметр .+конфорки/i.test(k));
const tokens = [];
keys.forEach(k => expandSizes(map[k]).forEach(t => tokens.push(t)));
return { tokens: tokens.sort(), text: keys.map(k => stripDecor(map[k])).join('; ') };
}
function expandPowers(raw) {
const s = String(raw || '').replace(/\u00a0/g, ' ').replace(/[×х]/gi, 'x').trim();
const out = [];
s.split(/[;,]+/).forEach(part => {
  const p = part.trim();
  if (!p) return;
  const countPower = p.match(/^(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*(?:Вт|W)?$/i);
  if (countPower && Number(countPower[1]) >= 1 && Number(countPower[1]) <= 8 && Number(countPower[2].replace(',', '.')) >= 100) {
    const count = Number(countPower[1]);
    const power = String(Number(countPower[2].replace(',', '.')));
    for (let i = 0; i < count; i++) out.push(power);
    return;
  }
  const booster = p.match(/(\d+(?:[.,]\d+)?)\s*(?:\(\s*бустер\s*(\d+(?:[.,]\d+)?)\s*\)|\/\s*(\d+(?:[.,]\d+)?))/i);
  if (booster) {
    const base = String(Number(booster[1].replace(',', '.')));
    const boost = booster[2] || booster[3];
    out.push(base + '/' + String(Number(boost.replace(',', '.'))));
    return;
  }
  const nums = parseAllNumbers(p);
  if (nums.length) nums.forEach(n => out.push(String(n)));
});
return out.sort();
}
function ourZonePowers(map) {
const keys = Object.keys(map).filter(k => /мощность .+конфорки/i.test(k) && !/максимальн/i.test(k));
const tokens = [];
keys.forEach(k => expandPowers(map[k]).forEach(t => tokens.push(t)));
return { tokens: tokens.sort(), text: keys.map(k => stripDecor(map[k])).join('; ') };
}
function sameMultiset(a, b) {
if (!a.length || a.length !== b.length) return false;
return a.every((x, i) => x === b[i]);
}
function valuesEqual(a, b, field) {
if (a == null || b == null || a === '' || b === '') return null;
if (isYesValue(a) && isYesValue(b)) return true;
if (isNoValue(a) && isNoValue(b)) return true;
if (isYesValue(a) && isNoValue(b)) return false;
if (isNoValue(a) && isYesValue(b)) return false;
if (field && field.id === 'flex') {
const n = parseFlexibleNumber(a);
if (n != null && isYesValue(b)) return n > 0;
if (n != null && isNoValue(b)) return n === 0;
}
if (field && field.id === 'inverter') {
const ob = /инвертор|inverter/i.test(String(b)) || isYesValue(b);
if (isYesValue(a) || /инвертор|inverter/i.test(String(a))) return ob;
}
if (field && field.id === 'control_type') {
const av = normValue(a, 'control_type'), bv = normValue(b, 'control_type');
return av === bv;
}
if (field && field.id === 'climate_class') {
const tokens = v => normName(stripDecor(v)).toUpperCase().match(/[A-ZА-ЯЁ]+/g)?.sort().join('|') || '';
return tokens(a) === tokens(b);
}
if (field && DIM_IDS.has(field.id)) return dimsEqual(a, field.namesOurs[0], b, field.namesOff[0]);
if (field && field.id === 'zones_d') return sameMultiset(expandSizes(a), expandSizes(b));
if (field && field.id === 'zones_w') return sameMultiset(expandPowers(a), expandPowers(b));
const na = normValue(a, field && field.id), nb = normValue(b, field && field.id);
if (na === nb || na.replace(/\s/g, '') === nb.replace(/\s/g, '')) return true;
const numsA = parseAllNumbers(na), numsB = parseAllNumbers(nb);
if (numsA.length && numsA.length === numsB.length &&
    numsA.every((n, i) => Math.abs(n - numsB[i]) < 0.000001)) return true;
const fa = parseFlexibleNumber(na), fb = parseFlexibleNumber(nb);
const simpleNumericA = numsA.length === 1 && !/[\-–/xх×]/i.test(na);
const simpleNumericB = numsB.length === 1 && !/[\-–/xх×]/i.test(nb);
if (simpleNumericA && simpleNumericB && fa != null && fb != null && Math.abs(fa - fb) < 0.051 && String(na).length < 24 && String(nb).length < 24) return true;
if ((na.includes(nb) || nb.includes(na)) && Math.min(na.length, nb.length) >= 3 && !/[\-–/xх×]/i.test(na) && !/[\-–/xх×]/i.test(nb)) return true;
return false;
}
function formatOfficialDisplay(field, offRaw, offName) {
if (offRaw == null || offRaw === '') return { display: '', notes: [] };
const notes = [];
let display = String(offRaw);
if (field && DIM_IDS.has(field.id) && field.id !== 'niche') {
display = formatCm(offRaw, offName || field.namesOff[0]);
if (MM_NAME_RE.test(offName || '') || /\d{3,}/.test(String(offRaw))) notes.push('на оф. в мм → см: ' + display);
}
return { display, notes };
}
function extractModel(text) {
const s = String(text || '');
const m = s.match(/\b([A-Z]{1,6}[A-Z0-9.]{2,14}(?:\s+[A-Za-z]{2,12}){0,3})\b/);
if (m && /\d/.test(m[1])) return m[1].replace(/\s+/g, ' ').trim();
return '';
}
function detectBrand(text) {
const s = String(text || '');
if (/maunfeld|маунфелд/i.test(s)) return 'Maunfeld';
return '';
}
function articleOf(map, title) {
return getByNames(map || {}, ['Артикул']) || extractModel(title) || '';
}
function parseOursDocument(doc) {
const map = {};
const addRow = (row, section) => {
const name = textOf(row.querySelector('.characteristics__name'));
const valEl = row.querySelector('.characteristics__property');
let val = '';
if (valEl) {
const ul = valEl.querySelector('ul');
val = ul ? [...ul.querySelectorAll('li')].map(textOf).join('\n') : textOf(valEl);
}
if (!name) return;
if (map[name] == null) { map[name] = val; return; }
const keyed = name + ' [' + (section || '') + ']';
if (map[keyed] == null) map[keyed] = val;
};
doc.querySelectorAll('.characteristics__header .characteristics__row').forEach(r => addRow(r, ''));
doc.querySelectorAll('.characteristics__block').forEach(bl => {
const sec = textOf(bl.querySelector('.characteristics__title-text'));
bl.querySelectorAll('.characteristics__row').forEach(r => addRow(r, sec));
});
return map;
}
function parseOursCompare() {
const products = [...document.querySelectorAll('.comparison-card.comparison__items-card, .compare-card, .comparison__item')].map(card => {
const a = card.querySelector('a[href*="/catalog/"]');
const title = (a && (a.getAttribute('title') || a.innerText)) || card.innerText;
const href = a ? a.href : '';
return { href, title: String(title).replace(/\s+/g, ' ').trim(), model: extractModel(title) || extractModel(href) };
});
const specs = products.map(() => ({}));
document.querySelectorAll('.compare-table-block__row.js-compare-row, .compare-table__row').forEach(row => {
const name = textOf(row.querySelector('.js-compare-cell-title, .compare-table__name'));
if (!name) return;
[...row.querySelectorAll('.js-compare-cell:not(.js-compare-cell-title), .compare-table__value')].forEach((cell, i) => {
if (specs[i]) specs[i][name] = textOf(cell);
});
});
return products.map((p, i) => Object.assign({ specs: specs[i] || {} }, p));
}
function gmFetch(url, ms) {
const wait = ms || GM_FETCH_TIMEOUT;
return new Promise((resolve, reject) => {
let done = false;
const finish = (fn, v) => { if (done) return; done = true; fn(v); };
try {
GM_xmlhttpRequest({
method: 'GET',
url,
timeout: wait,
headers: {
'Accept': 'application/json, text/plain, */*',
'X-Requested-With': 'XMLHttpRequest',
'Referer': OFFICIAL_ORIGIN + '/'
},
onload: r => finish(resolve, r),
onerror: e => finish(reject, e || new Error('net')),
ontimeout: () => finish(reject, new Error('timeout'))
});
} catch (e) { finish(reject, e); }
setTimeout(() => finish(reject, new Error('timeout')), wait + 800);
});
}
async function gmJson(url) {
const res = await gmFetch(url);
const raw = res && (res.responseText || (typeof res.response === 'string' ? res.response : ''));
if (!res || res.status >= 400) throw new Error('http ' + (res && res.status) + ' ' + String(raw || '').slice(0, 80));
try { return JSON.parse(raw || 'null'); }
catch (e) { throw new Error('не JSON: ' + String(raw || '').slice(0, 80)); }
}
function sectionCode(id) {
if (id == null) return '';
return SECTION_MAP[String(id)] || '';
}
function productUrl(detail) {
const code = detail && detail.code;
if (!code) return '';
const sec = sectionCode(detail.sectionId) || 'catalog';
return OFFICIAL_ORIGIN + '/catalog/' + sec + '/' + code;
}
function specsFromDetail(detail) {
detail = detail || {};
if (detail.data && typeof detail.data === 'object') detail = detail.data;
if (detail.item && typeof detail.item === 'object') detail = detail.item;

const map = {};
let table = detail.featuresTable || [];
if ((!table || !table.length) && detail.offers && Array.isArray(detail.offers)) {
const targetOffer = detail.offers.find(o => o.featuresTable && o.featuresTable.length) || detail.offers[0];
if (targetOffer && targetOffer.featuresTable) {
table = targetOffer.featuresTable;
}
}
if (table && !Array.isArray(table) && typeof table === 'object') table = Object.entries(table);
(table || []).forEach(pair => {
if (!pair) return;
const n = Array.isArray(pair) ? pair[0] : pair.name;
const v = Array.isArray(pair) ? pair[1] : pair.value;
const name = String(n || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const val = String(v || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
if (name && map[name] == null) map[name] = val;
});

if (detail.warranty != null && detail.warranty !== '' && map['Гарантия, мес.'] == null) map['Гарантия, мес.'] = String(detail.warranty);
if (detail.equipment && map['Комплектация'] == null) map['Комплектация'] = String(detail.equipment);
if (detail.article && map['Артикул'] == null) map['Артикул'] = String(detail.article);
if (detail.productCode && map['Код товара'] == null) map['Код товара'] = String(detail.productCode);
if (detail.barcode && map['ШтрихКод'] == null) map['ШтрихКод'] = String(detail.barcode);

const blob = [detail.name, detail.article, detail.detailSubtitle].filter(Boolean).join(' ');
if (!getByNames(map, ['Инвертор', 'Инверторная технология']) && /inverter|инвертор/i.test(blob)) map['Инвертор'] = 'да';
return map;
}
function cacheKey(article) { return 'mf_off_v4_' + compact(article); }
function specCount(obj) { return Object.keys((obj && obj.specs) || {}).length; }
function cacheIsFull(obj) {
  if (!obj || !obj.specs || specCount(obj) < 8) return false;
  return !!getByNames(obj.specs, [
    'Артикул', 'Код товара', 'ШтрихКод', 'Штрихкод',
    'Страна', 'Страна производства', 'Цвет', 'Ширина, мм',
    'Тип', 'Тип поверхности', 'Полезный объем, л', 'Объем, л'
  ]);
}
function readCache(article, allowStale) {
try {
const raw = GM_getValue(cacheKey(article), '');
if (!raw) return null;
const obj = JSON.parse(raw);
if (!obj || !obj.specs) return null;
if (!allowStale && obj.ts && Date.now() - obj.ts > CACHE_TTL_MS) return null;
if (!allowStale && !cacheIsFull(obj)) return null;
return obj;
} catch (e) { return null; }
}
function writeCache(article, data) {
if (!article) return;
GM_setValue(cacheKey(article), JSON.stringify(Object.assign({ ts: Date.now(), model: article }, data)));
}
function pickProduct(list, article, code) {
const want = compact(article);
const wantCode = compact(code);
const items = list || [];
const getArticles = p => {
let arts = p.article || p.articles || p.ARTICLE || p.PROPERTY_ARTICLE_VALUE || [];
if (typeof arts === 'string') arts = [arts];
if (!Array.isArray(arts)) arts = [];
return arts;
};
const exact = items.find(p => getArticles(p).some(a => compact(a) === want));
if (exact) return exact;
const byCode = items.find(p => getArticles(p).some(a => wantCode && compact(a) === wantCode));
if (byCode) return byCode;
const loose = items.find(p => {
const arts = getArticles(p);
return arts.some(a => compact(a).includes(want) || want.includes(compact(a))) ||
(p.NAME && compact(p.NAME).includes(want));
});
return loose || null;
}
async function loadOfficialHtmlSpecs(url) {
  if (!url) return {};
  try {
    const res = await gmFetch(url, GM_FETCH_TIMEOUT);
    if (!res || res.status >= 400 || !res.responseText) return {};
    const doc = new DOMParser().parseFromString(res.responseText, 'text/html');
    const map = {};
    const add = (name, value) => {
      name = String(name || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      value = String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      if (name && value && map[name] == null) map[name] = value;
    };
    const text = el => el ? String(el.textContent || '').replace(/\s+/g, ' ').trim() : '';
    doc.querySelectorAll('app-catalog-item-features li, .features-grid li, .features-list li, .product-features li, table tr, .characteristics__row, .product-characteristics__row, [class*=feature-row]').forEach(row => {
      const name = text(row.querySelector('.name, .feature-name, .title, [class*=name], th, .characteristics__name'));
      const val = text(row.querySelector('.val, .feature-value, .value, [class*=value], td, .characteristics__property'));
      if (name && val && name !== val) add(name, val);
      else {
        const cells = [...row.children].map(text).filter(Boolean);
        if (cells.length >= 2) add(cells[0], cells.slice(1).join(' '));
        else {
          const raw = text(row);
          const known = raw.match(/^(Артикул|Код товара|ШтрихКод|Штрихкод|Страна|Страна производства|Цвет|Комплектация)\s*[:\-]?\s+(.+)$/i);
          if (known) add(known[1], known[2]);
        }
      }
    });
    doc.querySelectorAll('script[type="application/ld+json"], script[type="application/json"], script#__NEXT_DATA__').forEach(script => {
      const raw = script.textContent || '';
      if (!raw || raw.length > 2000000) return;
      try {
        const data = JSON.parse(raw);
        const walk = (obj, depth) => {
          if (!obj || typeof obj !== 'object' || depth > 7) return;
          if (Array.isArray(obj)) { obj.forEach(x => walk(x, depth + 1)); return; }
          const table = obj.featuresTable || obj.features || obj.characteristics;
          if (Array.isArray(table)) table.forEach(pair => {
            if (Array.isArray(pair)) add(pair[0], pair[1]);
            else if (pair && typeof pair === 'object') add(pair.name || pair.title, pair.value || pair.val);
          });
          Object.values(obj).forEach(v => { if (v && typeof v === 'object') walk(v, depth + 1); });
        };
        walk(data, 0);
      } catch (_) {}
    });
    return map;
  } catch (_) { return {}; }
}
async function loadOfficial(article, extras, onProgress) {
extras = extras || {};
const code = extras.code || '';
const title = extras.title || '';
const queries = [...new Set([article, code, extractModel(title)].filter(Boolean))];
if (!queries.length) return { notFound: true, specs: {}, error: 'no_model', attempts: [] };
const cached = readCache(article || queries[0]);
if (cacheIsFull(cached)) return Object.assign({ found: true, fromCache: true }, cached);
const attempts = [];
let chosen = null;

for (const q of queries) {
const url = API + '?action=searchEls.getData&query=' + encodeURIComponent(q) + '&canCache=0';
if (onProgress) onProgress('Ищу на оф. сайте (API): «' + q + '»');
try {
const data = await gmJson(url);
let products = [];
if (data) {
if (Array.isArray(data)) products = data;
else if (data.PRODUCTS) products = data.PRODUCTS;
else if (data.result && data.result.PRODUCTS) products = data.result.PRODUCTS;
else if (data.items) products = data.items;
else if (data.data && Array.isArray(data.data)) products = data.data;
}
attempts.push({ u: 'api_search:' + q, r: 'найдено ' + products.length });
chosen = pickProduct(products, article || q, code);
if (chosen) break;
} catch (e) {
attempts.push({ u: 'api_search:' + q, r: String(e && e.message || e) });
}
}

if (chosen) {
if (onProgress) onProgress('Карточка id ' + chosen.id + ', читаю полные характеристики…');
try {
const detail = await gmJson(API + '?action=catalogProduction.getItemDetail&id=' + encodeURIComponent(chosen.id));
const specs = specsFromDetail(detail || {});
const url = productUrl(detail && detail.data || detail || {});
const real = (detail && detail.data) || detail || {};
if (url && Object.keys(specs).length < 25) {
  if (onProgress) onProgress('Дополняю характеристики из HTML официальной карточки в фоне…');
  const htmlSpecs = await loadOfficialHtmlSpecs(url);
  Object.keys(htmlSpecs).forEach(k => { if (specs[k] == null || specs[k] === '') specs[k] = htmlSpecs[k]; });
  attempts.push({ u: 'official_html_background', r: 'добавлено полей: ' + Object.keys(htmlSpecs).length });
}
const parsed = { specs, url, title: real.name || chosen.name, id: chosen.id, model: article || (real.article || ''), source: 'api+html' };
attempts.push({ u: 'api_detail:' + chosen.id, r: 'полей ' + Object.keys(specs).length });
if (Object.keys(specs).length < 8) {
return Object.assign({ found: Object.keys(specs).length > 0, attempts }, parsed);
}
writeCache(article || parsed.model, parsed);
if (detail.article && detail.article !== article) writeCache(detail.article, parsed);
return Object.assign({ found: true, attempts }, parsed);
} catch (e) {
attempts.push({ u: 'api_detail:' + chosen.id, r: String(e && e.message || e) });
}
}

const stale = readCache(article || queries[0], true);
if (stale && cacheIsFull(stale)) return Object.assign({ found: true, fromCache: true, stale: true }, stale);
return { notFound: true, specs: {}, error: 'not_found', attempts, url: OFFICIAL_ORIGIN + '/', model: article };
}
function zonePowerKeys(map) {
return Object.keys(map).filter(k => /мощность .+конфорки/i.test(k) && !/максимальн/i.test(k) && !/^мощность конфорок/i.test(normName(k)));
}
function attachZonePowerRows(rows, oursMap, offMap) {
const offKey = Object.keys(offMap).find(k => /мощность конфорок/i.test(normName(k)));
const offRaw = offKey ? offMap[offKey] : null;
const pool = {};
expandPowers(offRaw).forEach(t => { pool[t] = (pool[t] || 0) + 1; });
zonePowerKeys(oursMap).forEach(k => {
const tokens = expandPowers(oursMap[k]);
const ok = !!(offRaw && tokens.length && tokens.every(t => { if (pool[t]) { pool[t]--; return true; } return false; }));
rows.push({
id: 'pwr:' + normName(k),
name: k,
ours: oursMap[k],
off: offRaw,
offDisplay: offRaw || '',
notes: offRaw ? ['пара «номинал/бустер» сверена с общей строкой «Мощность конфорок, Вт» на оф. сайте'] : [],
status: offRaw ? (ok ? 'ok' : 'diff') : 'only_ours'
});
});
}
function enrichOurs(map) {
const sizes = ourZoneSizes(map);
const powers = ourZonePowers(map);
if (sizes.text && !getByNames(map, ['Диаметр конфорок, мм'])) map['Диаметр конфорок, мм'] = sizes.text;
if (powers.text && !getByNames(map, ['Мощность конфорок, Вт'])) map['Мощность конфорок, Вт'] = powers.text;
return map;
}
function prepareOfficialSpecs(input) {
const map = Object.assign({}, input || {});
const combinedKey = Object.keys(map).find(k => /напряжение/i.test(normName(k)) && (/в.*гц|в\/гц|гц/i.test(normName(k)) || /напряжение\s*[,/]\s*в\s*[,/]?\s*гц/i.test(normName(k))));
if (combinedKey) {
const raw = String(map[combinedKey] || '').replace(/\u00a0/g, ' ').trim();
const m = raw.match(/(\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?)\s*\/\s*(\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?)/);
if (m) {
if (getByNames(map, ['Напряжение, В']) == null) map['Напряжение, В'] = m[1].replace(/\s/g, '');
if (getByNames(map, ['Частота, Гц']) == null) map['Частота, Гц'] = m[2].replace(/\s/g, '');
}
}
return map;
}
function compareSpecs(oursMap, offMap) {
offMap = prepareOfficialSpecs(offMap);
const rows = [];
const usedOff = new Set();
SPEC_FIELDS.forEach(field => {
let oursVal = getByNames(oursMap, field.namesOurs);
let offVal = getByNames(offMap, field.namesOff.concat(field.namesOurs));
if (field.id === 'burners_ind') {
const typ = normName(getByNames(oursMap, ['Тип поверхности', 'Тип']) || '');
if (!/индукц/.test(typ)) return;
}
if (oursVal == null && offVal == null) return;
const offNameHit = field.namesOff.concat(field.namesOurs).find(n => Object.keys(offMap).some(k => normName(k) === normName(n))) || field.namesOff[0] || '';
if (offVal != null) usedOff.add(normName(offNameHit));
const fmt = formatOfficialDisplay(field, offVal, offNameHit);
const notes = fmt.notes.slice();
let status = 'only_one';
if (oursVal != null && offVal != null) status = valuesEqual(oursVal, offVal, field) ? 'ok' : 'diff';
else status = oursVal != null ? 'only_ours' : 'only_off';
rows.push({ id: field.id, name: field.namesOurs[0], ours: oursVal, off: offVal, offDisplay: fmt.display || offVal, notes, status });
});
attachZonePowerRows(rows, oursMap, offMap);
Object.keys(offMap).forEach(k => {
if (usedOff.has(normName(k))) return;
if (SPEC_FIELDS.some(f => f.namesOff.concat(f.namesOurs).some(n => normName(n) === normName(k)))) return;
const oursKey = Object.keys(oursMap).find(ok => normName(ok) === normName(k));
if (!oursKey) {
rows.push({ id: 'extra:' + normName(k), name: k, ours: null, off: offMap[k], offDisplay: offMap[k], notes: [], status: 'only_off' });
return;
}
const equal = valuesEqual(oursMap[oursKey], offMap[k], null);
rows.push({ id: 'extra:' + normName(k), name: oursKey, ours: oursMap[oursKey], off: offMap[k], offDisplay: offMap[k], notes: [], status: equal ? 'ok' : 'diff' });
});
return rows;
}
function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function copyText(s) { try { GM_setClipboard(s, 'text'); } catch (e) { navigator.clipboard && navigator.clipboard.writeText(s); } }
function miniIcon(status) { return status === 'diff' ? '❌' : (status === 'ok' ? '✔️' : (status === 'partial' ? '⚠️' : '❕')); }
function statusTitle(status) { return status === 'diff' ? 'Расхождение с оф. сайтом' : (status === 'ok' ? 'Совпадает с оф. сайтом' : 'Поле есть только с одной стороны'); }
function autoCapButton(models, label) {
return '<button type="button" class="kb-searchlink green kb-autocap" data-models="' + escapeHtml(JSON.stringify(models)) + '"> ' + (label || 'Повторить фоновое получение характеристик') + '</button>';
}
GM_addStyle('#kb-spec-root{position:fixed;right:16px;bottom:16px;z-index:2147483646;font-family:Arial,sans-serif}'
+ '#kb-spec-toggle{background:#1a1a1a;color:#fff;border:0;border-radius:18px;padding:7px 12px;cursor:pointer;font-size:12px;font-weight:600}'
+ '#kb-spec-toggle.diff{background:#b42318}#kb-spec-toggle.ok{background:#067647}#kb-spec-toggle.wait{background:#b54708}'
+ '#kb-spec-panel{display:none;position:fixed;right:12px;bottom:52px;width:min(460px,calc(100vw - 16px));max-height:min(62vh,480px);overflow:auto;background:#fff;color:#111;border-radius:10px;box-shadow:16px 50px rgba(0,0,0,.28);border:1px solid #e5e5e5}'
+ '#kb-spec-panel.open{display:block}'
+ '#kb-spec-panel header{position:sticky;top:0;background:#111;color:#fff;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;z-index:2}'
+ '#kb-spec-panel header b{font-size:12px}#kb-spec-panel header .kb-ver{opacity:.75;font-size:10px;margin-left:6px}'
+ '#kb-spec-panel header button{background:transparent;color:#fff;border:1px solid #555;border-radius:5px;padding:3px 7px;cursor:pointer;font-size:11px}'
+ '.kb-meta{padding:5px 10px;font-size:11px;color:#444;border-bottom:1px solid #eee}.kb-meta a{color:#1254b3}'
+ '.kb-meta details{margin:2px 0}.kb-meta summary{cursor:pointer;color:#1254b3}'
+ '.kb-meta details div{padding:2px 0 2px 8px;color:#777;font-size:10px;white-space:pre-line}'
+ '.kb-table{width:100%;border-collapse:collapse;font-size:11px}.kb-table th,.kb-table td{padding:4px 8px;border-bottom:1px solid #f0f0f0;vertical-align:top;text-align:left;white-space:pre-line}.kb-table th{background:#fafafa;position:sticky;top:36px}'
+ '.kb-st-diff{background:#fef3f2}.kb-st-partial{background:#fff8e1}'
+ '.kb-chip{display:inline-block;padding:1px 7px;border-radius:10px;background:#f2f2f2;margin-right:4px;font-size:10px}'
+ '.kb-notfound{background:#fff8e1;border-left:3px solid #f59e0b;padding:8px 10px;font-size:12px;color:#5b4300}'
+ '.kb-searchlink{display:inline-block;margin:6px 10px;padding:5px 12px;background:#1254b3;color:#fff !important;border-radius:6px;text-decoration:none;font-weight:600;font-size:12px;border:0;cursor:pointer}'
+ '.kb-searchlink.green{background:#067647}'
+ '.kb-status{margin-left:6px;font-size:13px;line-height:1;vertical-align:middle}'
+ '.kb-showbtn{margin-left:6px;font-size:10px;line-height:1.5;border:1px solid #d0d7de;background:#fff;border-radius:10px;padding:1px 8px;cursor:pointer;color:#1254b3;vertical-align:middle}'
+ '.kb-row-ok .characteristics__property{background:#e9f7ef}'
+ '.kb-row-diff .characteristics__property{background:#fdecea}'
+ '.kb-row-ok .characteristics__property,.kb-row-diff .characteristics__property{position:relative}'
+ '.kb-row-ok .characteristics__property::before,.kb-row-diff .characteristics__property::before{content:"";position:absolute;left:-7px;top:1px;bottom:1px;width:4px;border-radius:2px}'
+ '.kb-row-ok .characteristics__property::before{background:#067647}.kb-row-diff .characteristics__property::before{background:#b42318}'
+ '.kb-cell-ok{background:#e9f7ef !important}.kb-cell-diff{background:#fdecea !important}'
+ '.kb-pop{position:absolute;z-index:2147483647;width:300px;background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.18);padding:10px;font-size:12px}'
+ '.kb-pop .kb-offval{margin:6px 0;padding:6px;background:#f6f6f6;border-radius:4px;white-space:pre-line}'
+ '.kb-pop .kb-note{white-space:pre-line;margin-top:2px;color:#666}'
+ '.kb-pop .kb-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}'
+ '.kb-pop button,.kb-pop a.kb-btn{font-size:11px;padding:4px 8px;border-radius:4px;border:1px solid #ccc;background:#111;color:#fff;text-decoration:none;cursor:pointer}.kb-pop button.sec{background:#fff;color:#111}'
+ '.kb-hl{outline:3px solid #b42318!important;background:#fff3f0!important}');
function ensureUI() {
if (document.getElementById('kb-spec-root')) return;
const root = document.createElement('div');
root.id = 'kb-spec-root';
root.innerHTML = '<button type="button" id="kb-spec-toggle">Сверка v' + SCRIPT_VERSION + '</button><div id="kb-spec-panel"><header><b>Сверка с maunfeld.ru <span class="kb-ver">v' + SCRIPT_VERSION + '</span></b><span><button type="button" id="kb-run">Запустить</button> <button type="button" id="kb-close">Закрыть</button></span></header><div id="kb-spec-body"><div class="kb-meta">Нажмите «Запустить».</div></div></div>';
document.body.appendChild(root);
document.getElementById('kb-spec-toggle').onclick = () => document.getElementById('kb-spec-panel').classList.toggle('open');
document.getElementById('kb-close').onclick = () => document.getElementById('kb-spec-panel').classList.remove('open');
document.getElementById('kb-run').onclick = () => runNow();
}
function setBody(html) { const el = document.getElementById('kb-spec-body'); if (el) el.innerHTML = html; }
let panelPops = [];
function bindPanelPops() {
document.querySelectorAll('#kb-spec-body .kb-rowpop').forEach(b => {
b.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); const p = panelPops[+b.getAttribute('data-pop')]; if (p) showSpecPop(b, p.rec, p.session); };
});
}
function bindAutoCap() {
document.querySelectorAll('#kb-spec-body .kb-autocap').forEach(b => {
b.onclick = ev => { ev.preventDefault(); try { const models = JSON.parse(b.getAttribute('data-models') || '[]'); if (models.length) startAutoCapture(models); } catch (e) {} };
});
}
function renderProductBlock(title, model, official, rows) {
const diffs = rows.filter(r => r.status === 'diff');
const ok = rows.filter(r => r.status === 'ok').length;
const only = rows.filter(r => r.status === 'only_ours' || r.status === 'only_off').length;
const url = official.url || '';
const offCount = Object.keys(official.specs || {}).length;
if (official.skipReason === 'brand') {
return '<div class="kb-meta">' + escapeHtml(title || '') + '</div><div class="kb-notfound">Другой бренд — сверка с maunfeld.ru не выполняется.</div>';
}
if (official.found === false || offCount < 8) {
const attemptsHtml = official.attempts && official.attempts.length
? '<details class="kb-meta" open><summary>🔍 Журнал попыток (Debug Log) — нажмите, чтобы свернуть</summary><div style="font-family:monospace;font-size:10px;">'
+ official.attempts.map(a => `<div style="margin-bottom:4px;border-bottom:1px solid #eee;padding-bottom:4px;"><b>🔗 ${escapeHtml(a.u)}</b><br>➡️ ${escapeHtml(a.r)}</div>`).join('')
+ '</div></details>'
: '';
const cap = url ? '<a class="kb-searchlink" href="' + escapeHtml(url) + '" target="_blank">Открыть оф. карточку</a>' : '';
return '<div class="kb-meta">' + escapeHtml(title || '') + '</div><div class="kb-meta">v' + SCRIPT_VERSION + ' · <b>' + escapeHtml(model || '') + '</b></div>'
+ '<div class="kb-notfound">Не удалось получить полные характеристики. Ниже — подробный журнал запросов к API, чтобы понять, на каком этапе произошла ошибка.</div>'
+ attemptsHtml + cap;
}
const src = official.source === 'api' ? 'источник: API' : (official.source === 'html_fallback' || official.source === 'dom' ? 'источник: HTML-страница' : 'источник: кэш');
const visibleRows = rows.filter(r => ['diff', 'ok', 'only_ours', 'only_off'].includes(r.status));
const rowsHtml = visibleRows.map(r => {
const idx = panelPops.length;
panelPops.push({ rec: r, session: { url } });
const cls = r.status === 'diff' ? 'kb-st-diff' : (r.status === 'ok' ? '' : 'kb-st-partial');
const icon = r.status === 'diff' ? '❌' : (r.status === 'ok' ? '✔️' : '⚠️');
const oursValue = r.ours == null || r.ours === '' ? '—' : r.ours;
const offValue = r.offDisplay || r.off || '—';
return '<tr class="' + cls + '"><td>' + escapeHtml(r.name) + '</td><td>' + escapeHtml(oursValue) + '</td><td>' + escapeHtml(offValue) + '</td><td><button type="button" class="kb-rowpop" data-pop="' + idx + '">' + icon + '</button></td></tr>';
}).join('');
return '<div class="kb-meta">' + escapeHtml(title || '') + '</div>'
+ '<div class="kb-meta"><span class="kb-chip">расхожд.: ' + diffs.length + '</span><span class="kb-chip">совпало: ' + ok + '</span><span class="kb-chip">только с одной стороны: ' + only + '</span><span class="kb-chip">оф. полей: ' + offCount + '</span></div>'
+ '<div class="kb-meta">v' + SCRIPT_VERSION + ' · <b>' + escapeHtml(model || '') + '</b> · ' + (url ? '<a href="' + escapeHtml(url) + '" target="_blank">открыть оф. карточку</a>' : '') + ' · ' + src + '</div>'
+ '<table class="kb-table"><thead><tr><th>Поле</th><th>У нас</th><th>Оф.</th><th>Статус</th></tr></thead><tbody>' + (rowsHtml || '<tr><td colspan="4">Нет сопоставленных полей</td></tr>') + '</tbody></table>';
}
function closeKbPop() { document.querySelectorAll('.kb-pop').forEach(n => n.remove()); }
function showSpecPop(anchor, rec, session) {
closeKbPop();
const offVal = rec.offDisplay || rec.off || '—';
const notes = (rec.notes || []).map(n => '<div class="kb-note">' + escapeHtml(n) + '</div>').join('');
const jump = session && session.url ? session.url : '';
const pop = document.createElement('div');
pop.className = 'kb-pop';
pop.innerHTML = '<b>' + escapeHtml(rec.name) + '</b><div>У нас:</div><div class="kb-offval">' + escapeHtml(rec.ours || '—') + '</div><div>На оф. сайте:</div><div class="kb-offval">' + escapeHtml(offVal) + '</div>' + notes
+ '<div class="kb-actions"><button type="button" class="kb-copy">Копировать</button>' + (jump ? '<a class="kb-btn" target="_blank" href="' + escapeHtml(jump) + '">Открыть на оф.</a>' : '') + '<button type="button" class="sec kb-close-pop">Закрыть</button></div>';
document.body.appendChild(pop);
const r = anchor.getBoundingClientRect();
pop.style.left = Math.min(innerWidth - 320, Math.max(8, r.left + scrollX)) + 'px';
pop.style.top = (r.bottom + scrollY + 6) + 'px';
pop.querySelector('.kb-copy').onclick = () => { copyText(offVal); pop.querySelector('.kb-copy').textContent = 'Скопировано'; };
pop.querySelector('.kb-close-pop').onclick = closeKbPop;
}
document.addEventListener('click', e => { if (!e.target.closest('.kb-pop, .kb-showbtn, .kb-rowpop')) closeKbPop(); });
function attachStatusAndButton(el, rec, session) {
if (!el) return;
el.querySelectorAll('.kb-status,.kb-showbtn').forEach(n => n.remove());
const target = el.querySelector('.characteristics__name') || el;
const st = document.createElement('span');
st.className = 'kb-status';
st.textContent = miniIcon(rec.status);
st.title = statusTitle(rec.status);
const btn = document.createElement('button');
btn.type = 'button';
btn.className = 'kb-showbtn';
btn.textContent = 'оф. сайт';
btn.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); showSpecPop(btn, rec, session); };
target.appendChild(st);
target.appendChild(btn);
}
function highlightProductPage(rows, session) {
document.querySelectorAll('.characteristics__row').forEach(row => {
row.classList.remove('kb-row-diff', 'kb-row-ok');
row.querySelectorAll('.kb-status,.kb-showbtn').forEach(n => n.remove());
});
if (session && session.found === false) return;
document.querySelectorAll('.characteristics__row').forEach(row => {
const name = textOf(row.querySelector('.characteristics__name'));
const field = findFieldByName(name);
const rec = rows.find(r => (field && r.id === field.id) || normName(r.name) === normName(name));
if (!rec || rec.status === 'only_ours' || rec.status === 'only_off') return;
row.classList.add(rec.status === 'diff' ? 'kb-row-diff' : 'kb-row-ok');
attachStatusAndButton(row, rec, session);
});
}
function highlightCompare(packs) {
document.querySelectorAll('.compare-table-block__row.js-compare-row').forEach(row => {
const name = textOf(row.querySelector('.js-compare-cell-title'));
[...row.querySelectorAll('.js-compare-cell:not(.js-compare-cell-title)')].forEach((cell, i) => {
const pack = packs[i];
if (!pack) return;
cell.querySelectorAll('.kb-status,.kb-showbtn').forEach(n => n.remove());
cell.classList.remove('kb-cell-ok', 'kb-cell-diff');
if (pack.session && pack.session.found === false) return;
const field = findFieldByName(name);
const rec = pack.rows.find(r => (field && r.id === field.id) || normName(r.name) === normName(name));
if (!rec || rec.status === 'only_ours' || rec.status === 'only_off') return;
cell.classList.add(rec.status === 'diff' ? 'kb-cell-diff' : 'kb-cell-ok');
const st = document.createElement('span');
st.className = 'kb-status';
st.textContent = miniIcon(rec.status);
const btn = document.createElement('button');
btn.type = 'button';
btn.className = 'kb-showbtn';
btn.textContent = 'оф. сайт';
btn.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); showSpecPop(btn, rec, pack.session); };
cell.appendChild(st);
cell.appendChild(btn);
});
});
}
function isProductPage() { return !!document.querySelector('section.characteristics, .characteristics') && /\/catalog\//.test(location.pathname); }
function isComparePage() { return /\/compare\//.test(location.pathname); }
function isOfficialProductPage() { return /maunfeld\.ru$/.test(location.hostname) && /\/catalog\/[^/]+\/[^/]+/.test(location.pathname) && !/\/catalog\/?$/.test(location.pathname); }
function updateToggle(rows, mode) {
const t = document.getElementById('kb-spec-toggle');
if (!t) return;
const d = rows.filter(r => r.status === 'diff').length;
if (mode && mode.skip) { t.className = 'wait'; t.textContent = 'Сверка: другой бренд v' + SCRIPT_VERSION; return; }
if (mode && mode.notFound) { t.className = 'wait'; t.textContent = 'Сверка: не найдено на оф. v' + SCRIPT_VERSION; return; }
t.className = d ? 'diff' : (rows.some(r => r.status === 'ok') ? 'ok' : '');
t.textContent = (d ? 'Сверка: ' + d + ' расхожд.' : 'Сверка: совпало') + ' v' + SCRIPT_VERSION;
}
async function runProduct() {
const title = textOf(document.querySelector('h1')) || document.title;
const ours = enrichOurs(parseOursDocument(document));
const model = articleOf(ours, title) || extractModel(title) || extractModel(location.pathname);
const code = getByNames(ours, ['Код товара']) || '';
const brand = detectBrand(title + ' ' + model + ' ' + (ours['Бренд'] || ''));
if (!brand) {
highlightProductPage([], { found: false });
panelPops = [];
setBody(renderProductBlock(title, model, { skipReason: 'brand', specs: {} }, []));
updateToggle([], { skip: true });
return;
}
setBody('<div class="kb-meta">Артикул: <b>' + escapeHtml(model || '') + '</b>. Запрашиваю maunfeld.ru в фоне…</div>');
let official;
try {
official = await Promise.race([
loadOfficial(model, { title, code }, msg => setBody('<div class="kb-meta">Артикул: <b>' + escapeHtml(model || '') + '</b>. ' + escapeHtml(msg) + '</div>')),
new Promise(res => setTimeout(() => res({ notFound: true, specs: {}, timeout: true, model, attempts: [{ u: '(общий таймаут)', r: 'timeout' }] }), OVERALL_TIMEOUT))
]);
} catch (e) {
official = { notFound: true, specs: {}, error: String(e), model };
}
official.found = !official.notFound && specCount(official) > 0;
const rows = compareSpecs(ours, official.specs || {});
highlightProductPage(rows, { url: official.url, found: official.found });
panelPops = [];
setBody(renderProductBlock(title, model, official, rows));
bindPanelPops();
bindAutoCap();
updateToggle(rows, official.found === false ? { notFound: true } : null);
document.getElementById('kb-spec-panel').classList.add('open');
}
async function runCompare() {
const items = parseOursCompare();
if (!items.length) { setBody('<div class="kb-meta">Товары не найдены</div>'); return; }
const blocks = [], packs = [];
let any = 0, notFoundCount = 0;
panelPops = [];
for (let i = 0; i < items.length; i++) {
const item = items[i];
const model = articleOf(item.specs, item.title) || item.model;
const brand = detectBrand(item.title + ' ' + model);
if (!brand) {
blocks.push(renderProductBlock(item.title, model, { skipReason: 'brand', specs: {} }, []));
packs.push({ rows: [], session: { found: false } });
continue;
}
setBody('<div class="kb-meta">Проверяю ' + (i + 1) + '/' + items.length + ': <b>' + escapeHtml(model || item.title) + '</b> (в фоне…)</div>');
let official;
try {
official = await loadOfficial(model, { title: item.title, code: getByNames(item.specs, ['Код товара']) || '' });
} catch (e) {
official = { notFound: true, specs: {}, error: String(e), model };
}
official.found = !official.notFound && specCount(official) > 0;
if (!official.found) notFoundCount++;
const rows = compareSpecs(enrichOurs(item.specs || {}), official.specs || {});
any += rows.filter(r => r.status === 'diff').length;
packs.push({ rows, session: { url: official.url, found: official.found } });
blocks.push(renderProductBlock(item.title, model, official, rows));
}
highlightCompare(packs);
setBody(blocks.join(''));
bindPanelPops();
bindAutoCap();
const t = document.getElementById('kb-spec-toggle');
if (t) {
t.className = any ? 'diff' : (notFoundCount === items.length ? 'wait' : 'ok');
t.textContent = (any ? 'Сверка: ' + any + ' расхожд.' : 'Сверка: совпало') + ' v' + SCRIPT_VERSION;
}
}
function parseOfficialDom() {
  const map = {};
  const clean = value => String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const add = (name, val) => {
    name = clean(name); val = clean(val);
    if (name && val && name !== val && map[name] == null) map[name] = val;
  };
  const text = el => el ? clean(el.textContent) : '';
  document.querySelectorAll('app-catalog-item-features li, .features-grid li, .features-list li, .product-features li').forEach(li => {
    let nameEl = li.querySelector('.name, .feature-name, .title, [class*="name"], [class*="title"]');
    let valEl = li.querySelector('.val, .feature-value, .value, [class*="value"], [class*="val"]');
    if (nameEl && valEl && nameEl !== valEl) {
      add(text(nameEl), text(valEl));
      return;
    }
    const children = [...li.children].filter(el => text(el));
    if (children.length >= 2) {
      add(text(children[0]), children.slice(1).map(text).join(' '));
      return;
    }
    const raw = text(li);
    const known = raw.match(/^(Артикул|Код товара|ШтрихКод|Штрихкод|Страна|Страна производства|Цвет|Комплектация|Гарантия(?:,\s*мес\.?)?)\s*[:\-]?\s+(.+)$/i);
    if (known) add(known[1], known[2]);
  });
  document.querySelectorAll('table tr, .characteristics__row, .product-characteristics__row, [class*="feature-row"]').forEach(row => {
    const cells = [...row.querySelectorAll('th, td, .characteristics__name, .characteristics__property, [class*="name"], [class*="value"], [class*="val"]')].map(text).filter(Boolean);
    if (cells.length >= 2) add(cells[0], cells.slice(1).join(' '));
  });
  const w = document.querySelector('.warranty .title');
  if (w && map['Гарантия, мес.'] == null) map['Гарантия, мес.'] = text(w).replace(/[^\d]/g, '') || text(w);
  const title = text(document.querySelector('h1')) || document.title;
  return { specs: map, title };
}
function showMoreButton() {
  const selectors = [
    'app-catalog-item-features .btn-show-more',
    '.btn-show-more',
    'button', 'a', '[role="button"]'
  ];
  const candidates = [...new Set(selectors.flatMap(sel => [...document.querySelectorAll(sel)]))];
  return candidates.find(el =>
    /показать\s*(больше|все|ещё|еще)|все характеристики|полные характеристики|развернуть/i.test(textOf(el)) &&
    el.getClientRects().length > 0
  ) || null;
}
function clickShowMore() {
  const btn = showMoreButton();
  if (!btn) return false;
  const list = btn.closest('app-catalog-item-features')?.querySelector('ul');
  if (list && list.classList.contains('active')) return true;
  const label = textOf(btn);
  if (!/показать\s*(больше|все|ещё|еще)|все характеристики|полные характеристики|развернуть/i.test(label)) return false;
  btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  return true;
}
function domSpecsFull() {
  const btn = showMoreButton();
  const list = document.querySelector('app-catalog-item-features ul');
  const active = !!(list && list.classList.contains('active'));
  const collapsed = !!btn && !active &&
    /показать\s*(больше|все|ещё|еще)|все характеристики|полные характеристики|развернуть/i.test(textOf(btn));
  const n = document.querySelectorAll('app-catalog-item-features li, .features-grid li, .features-list li, .product-features li, .characteristics__row, .features__row, table tr').length;
  return n >= 8 && !collapsed;
}
function cacheOfficialPage() {
const read = () => {
clickShowMore();
if (!domSpecsFull()) return;
const parsed = parseOfficialDom();
parsed.url = location.href.split('?')[0];
parsed.model = articleOf(parsed.specs, parsed.title) || extractModel(parsed.title);
parsed.source = 'dom';
if (parsed.model && specCount(parsed) >= 8) writeCache(parsed.model, parsed);
};
setTimeout(read, 800);
setTimeout(read, 2000);
setTimeout(read, 4000);
}
function workerTick() {
  const job = getJob();
  if (!job || job.status !== 'pending') return;
  const cleanUrl = u => String(u || '').split('?')[0].replace(/\/$/, '');
  if (cleanUrl(location.href) !== cleanUrl(job.url)) return;
  const started = Date.now();
  let clicked = false;
  const tryParse = () => {
    const btn = showMoreButton();
    const list = document.querySelector('app-catalog-item-features ul');
    if (btn && list && !list.classList.contains('active') && !clicked) {
      clicked = clickShowMore();
    }
    const parsed = parseOfficialDom();
    const count = specCount(parsed);
    if (count >= 8 && domSpecsFull()) {
      writeCache(job.model, {
        specs: parsed.specs,
        url: location.href.split('?')[0],
        title: parsed.title,
        source: 'dom'
      });
      setJob(Object.assign({}, job, { status: 'done', ok: true, count }));
      return;
    }
    if (Date.now() - started > 30000) {
      setJob(Object.assign({}, job, { status: 'done', ok: false, count, reason: !btn ? 'button_not_found' : 'insufficient_specs' }));
      return;
    }
    setTimeout(tryParse, 500);
  };
  setTimeout(tryParse, 300);
}
function getJob() { try { return JSON.parse(GM_getValue(JOB_KEY, 'null') || 'null'); } catch (e) { return null; } }
function setJob(j) { GM_setValue(JOB_KEY, JSON.stringify(j)); }
let workerWin = null, captureQueue = [], capturing = false;
function startAutoCapture(models) {
if (capturing || !models || !models.length) return;
const first = models[0];
if (!first.url) { setBody('<div class="kb-meta">Нет прямой ссылки на оф. карточку. Откройте карточку maunfeld.ru вручную, скрипт снимет характеристики сам.</div>'); return; }
capturing = true;
captureQueue = models.slice(1);
setJob({ status: 'pending', model: first.model, url: first.url, started: Date.now() });
workerWin = window.open(first.url, 'mfworker', 'width=760,height:520,left=80,top=80');
setBody('<div class="kb-meta">Авто-захват: открываю <b>' + escapeHtml(first.model) + '</b> и нажимаю «Показать больше». Не закрывайте служебное окно.</div>');
}
function onJobDone() {
if (!capturing) return;
if (captureQueue.length) {
const nxt = captureQueue.shift();
setJob({ status: 'pending', model: nxt.model, url: nxt.url, started: Date.now() });
if (workerWin && !workerWin.closed) workerWin.location.href = nxt.url;
else finishCapture();
} else finishCapture();
}
function finishCapture() {
capturing = false;
try { if (workerWin && !workerWin.closed) workerWin.close(); } catch (e) {}
setJob({ status: 'idle' });
setBody('<div class="kb-meta">Авто-захват завершён. Пересчитываю…</div>');
setTimeout(() => { if (isComparePage()) runCompare(); else runProduct(); }, 400);
}
function registerJobListener() {
try {
GM_addValueChangeListener(JOB_KEY, (n, o, v, remote) => {
if (!remote) return;
let j = null;
try { j = JSON.parse(v || 'null'); } catch (e) {}
if (j && j.status === 'done') onJobDone(j);
});
} catch (e) {}
}
async function runNow() {
document.getElementById('kb-spec-panel').classList.add('open');
if (isComparePage()) await runCompare();
else if (isProductPage()) await runProduct();
else setBody('<div class="kb-meta">Откройте карточку товара или сравнение.</div>');
}
function init() {
if (isOfficialProductPage()) { cacheOfficialPage(); workerTick(); return; }
if (!isProductPage() && !isComparePage()) return;
ensureUI();
registerJobListener();
try { GM_registerMenuCommand('Сверить с maunfeld.ru', runNow); } catch (e) {}
}
init();
})();
