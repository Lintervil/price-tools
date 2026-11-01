// ==UserScript==
// @name         Korting: сверка характеристик (korting-dealer ↔ korting.ru)
// @namespace    korting-dealer.spec-checker
// @version      1.4.17
// @description  Сверка характеристик korting-dealer.ru с korting.ru. v1.4.17: исправлен разбор страницы сравнения — URL товаров вида /korting/кат/подкат/товар.html теперь распознаются.
// @author       internal
// @updateURL    https://lintervil.github.io/price-tools/scripts/korting-spec-checker.user.js
// @downloadURL  https://lintervil.github.io/price-tools/scripts/korting-spec-checker.user.js
// @match        https://korting-dealer.ru/*
// @match        https://www.korting-dealer.ru/*
// @match        https://korting.ru/*
// @match        https://www.korting.ru/*
// @connect      korting.ru
// @connect      www.korting.ru
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
const SCRIPT_VERSION = '1.4.17';
const OFFICIAL_ORIGIN = 'https://korting.ru';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const JOB_KEY = 'kd_job';

const F = (id, ours, off) => ({ id, namesOurs: ours, namesOff: off || ours });
const MM_TO_CM_IDS = new Set(['height','width','depth']);
const CLASS_FIELD_IDS = new Set(['energy_class','wash_class','dry_class']);
const LIST_EXCLUDE = new Set(['hob_type','hob_connect','timer','size_nominal','niche']);

const CATEGORY_ALIASES = {
'varochnye-paneli':'varochnye-poverkhnosti','varochnye-poverkhnosti':'varochnye-poverkhnosti',
'dukhovye-shkafy':'dukhovye-shkafy','dukhovki':'dukhovye-shkafy',
'vytyazhki':'vytyazhki','kholodilniki':'kholodilniki',
'morozilnye-kamery':'morozilnye-kamery','morozilniki':'morozilnye-kamery',
'posudomoechnye-mashiny':'posudomoechnye-mashiny','posudomoyki':'posudomoechnye-mashiny',
'stiralnye-mashiny':'stiralnye-mashiny','stiralki':'stiralnye-mashiny',
'sushilnye-mashiny':'sushilnye-mashiny','sushilki':'sushilnye-mashiny',
'kofemashiny':'kofemashiny','kofevarki':'kofevarki',
'mikrovolnovye-pechi':'mikrovolnovye-pechi','mikrovolnovki':'mikrovolnovye-pechi','svch':'mikrovolnovye-pechi',
'yashchiki-dlya-podogreva':'yashchiki-dlya-podogreva','podogrevateli-posudy':'yashchiki-dlya-podogreva',
'vinnye-shkafy':'vinnye-shkafy','vinoteki':'vinnye-shkafy'
};

const CATEGORY_MAP = {
'dukhovye-shkafy': { slug: 'dukhovye-shkafy', prefixes: ['elektricheskiy-dukhovoy-shkaf','gazovyy-dukhovoy-shkaf','dukhovoy-shkaf','elektricheskiy-dukhovoy-shkaf-s-funktsiey-svch','dukhovoy-shkaf-elektricheskiy','dukhovoy-shkaf-gazovyy'] },
'varochnye-poverkhnosti': { slug: 'varochnye-poverkhnosti', prefixes: ['gazovaya-varochnaya-panel','gazovaya-steklyannaya-varochnaya-panel','gazovaya-varochnaya-panel-na-stekle','elektricheskaya-varochnaya-panel','induktsionnaya-varochnaya-panel','varochnaya-panel','steklokeramicheskaya-varochnaya-panel','gazovaya-panel'] },
'vytyazhki': { slug: 'vytyazhki', prefixes: ['polnovstraivaemaya-vytyazhka','vstraivaemaya-vytyazhka','nastennaya-vytyazhka','ostrovnaya-vytyazhka','vytyazhka','vstroennaya-vytyazhka','kupolnaya-vytyazhka'] },
'kholodilniki': { slug: 'kholodilniki', prefixes: ['vstraivaemyy-kholodilnik','otdelnostoyashchiy-kholodilnik','kholodilnik','dvukhkamernyy-kholodilnik','kholodilnik-s-morozilnoy-kameroy'] },
'morozilnye-kamery': { slug: 'morozilnye-kamery', prefixes: ['morozilnaya-kamera','vstraivaemaya-morozilnaya-kamera','morozilnik'] },
'posudomoechnye-mashiny': { slug: 'posudomoechnye-mashiny', prefixes: ['vstraivaemaya-posudomoechnaya-mashina','otdelnostoyashchaya-posudomoechnaya-mashina','kompaktnaya-posudomoechnaya-mashina','posudomoechnaya-mashina','polnorazmernaya-posudomoechnaya-mashina'] },
'stiralnye-mashiny': { slug: 'stiralnye-mashiny', prefixes: ['vstraivaemaya-stiralnaya-mashina','otdelnostoyashchaya-stiralnaya-mashina','ctiralnaya-mashina','stiralnaya-mashina','stiralno-sushilnaya-mashina'] },
'sushilnye-mashiny': { slug: 'sushilnye-mashiny', prefixes: ['sushilnaya-mashina','sushilnyy-avtomat'] },
'kofemashiny': { slug: 'kofemashiny', prefixes: ['vstraivaemaya-kofemashina','kofemashina','avtomaticheskaya-kofemashina','kofemashina-avtomaticheskaya'] },
'kofevarki': { slug: 'kofevarki', prefixes: ['otdelnostoyashchaya-kofevarka','kofevarka','kafeterka'] },
'mikrovolnovye-pechi': { slug: 'mikrovolnovye-pechi', prefixes: ['vstraivaemaya-mikrovolnovaya-pech','otdelnostoyashchaya-mikrovolnovaya-pech','mikrovolnovaya-pech','svch-pech','mikrovolnovka'] },
'yashchiki-dlya-podogreva': { slug: 'yashchiki-dlya-podogreva', prefixes: ['yashchik-dlya-podogreva','podogrevatel-posudy'] },
'vinnye-shkafy': { slug: 'vinnye-shkafy', prefixes: ['vstraivaemyy-vinnyy-shkaf','vinnyy-shkaf','vinoteka'] },
};

const SPEC_FIELDS = [
F('warranty', ['Гарантия, мес'], ['Срок гарантии (мес.)']),
F('country', ['Страна-производитель'], ['Страна производства']),
F('color', ['Цвет поверхности', 'Цвет'], ['Цвет']),
F('color_regulators', ['Цвет фурнитуры'], ['Цвет регуляторов']),
F('accessory_color', ['Фурнитура'], ['Цвет', 'Варианты цвета']),
F('door_handle_color', ['Цвет ручки двери'], ['Цвет ручки двери']),
F('reg_material', ['Материал переключателей'], ['Материал регуляторов']),
F('frame_design', ['Дизайн рамки'], ['Дизайн рамки']),
F('control_type', ['Тип управления', 'Управление'], ['Управление']),
F('control_elements', ['Переключатели', 'Элементы управления'], ['Управление', 'Переключатели']),
F('display', ['Дисплей'], ['Дисплей']),
F('timer', ['Таймер', 'Функции таймера'], ['Таймер']),
F('child_lock', ['Защита от детей', 'Блокировка выбранного режима', 'Функция «Защита детей» / блокировка управления'], ['Блокировка управления']),
F('auto_off', ['Автоматическое отключение'], ['Автоматическое отключение']),
F('energy_class', ['Класс энергопотребления', 'Класс энергопотребления (стирка)'], ['Класс энергопотребления']),
F('noise', ['Уровень шума, дБ', 'Уровень шума при стирке, дБ'], ['Уровень шума макс (дБ)', 'Уровень шума, (дБ)', 'Уровень шума (дБ)', 'Уровень шума (стирка/отжим/сушка) (дБ)']),
F('noise_spin', ['Уровень шума при отжиме, дБ'], ['Уровень шума (стирка/отжим/сушка) (дБ)']),
F('weight_net', ['Вес нетто, кг'], ['Масса прибора (кг)']),
F('weight_gross', ['Вес брутто, кг'], []),
F('voltage', ['Напряжение, В', 'Напряжение, Вт'], ['Сетевое напряжение (В)']),
F('freq', ['Частота, Гц', 'Частота тока, Гц'], ['Частота тока (Гц)', 'Частота']),
F('cord_len', ['Длина шнура питания, м'], ['Длина шнура питания (м)']),
F('power_cord', ['Шнур питания'], ['Шнур питания', 'Кабель в комплекте', 'Шнур питания в комплекте']),
F('plug', ['Вилка питания', 'Наличие вилки'], ['Вилка питания', 'Вилка в комплекте']),
F('power_max', ['Потребляемая мощность, кВт', 'Мощность подключения, кВт', 'Мощность подключения, Вт', 'Потребляемая мощность, Вт'], ['Номинальная потребляемая мощность (Вт)', 'Потребляемая мощность (Вт)', 'Потребляемая мощность, Вт']),
F('material', ['Материал', 'Материал корпуса', 'Материал прибора'], ['Материал прибора', 'Материал корпуса', 'Материал']),
F('ignition', ['Автоматический электроподжиг', 'Электроподжиг'], ['Электроподжиг']),
F('gas_control', ['Газ-контроль'], ['Газ-контроль']),
F('size_nominal', ['Размер'], ['Ширина (см)']),
F('height', ['Высота, см'], ['Габариты (ВхШхГ) (мм)', 'Габариты (ВxШхГ) (мм)', 'Габариты (ШхГхВ) (мм)', 'Высота (мм)', 'Высота (см)']),
F('width', ['Ширина, см', 'Ширина, cм'], ['Габариты (ВхШхГ) (мм)', 'Габариты (ВxШхГ) (мм)', 'Габариты (ШхГхВ) (мм)', 'Ширина (мм)', 'Ширина (см)']),
F('depth', ['Глубина, см'], ['Габариты (ВхШхГ) (мм)', 'Габариты (ВxШхГ) (мм)', 'Габариты (ШхГхВ) (мм)', 'Глубина (мм)', 'Глубина (см)']),
F('overall_dims', ['Габариты (ВхШхГ), см'], ['Габариты (ВхШхГ) (мм)', 'Габариты (ВxШхГ) (мм)', 'Габариты (ШхГхВ) (мм)']),
F('sku', ['Артикул'], []),
F('accessories', ['Аксессуары', 'Комплектация'], ['Аксессуары в комплекте']),
F('hob_type', ['Вид'], ['Тип панели']),
F('hob_connect', ['Способ подключения'], ['Тип панели']),
F('hob_burners_count', ['Количество варочных зон/конфорок'], ['Конфорки (шт)']),
F('hob_surface_material', ['Материал поверхности'], ['Материал поверхности']),
F('hob_grates', ['Держатели для посуды'], ['Держатели посуды']),
F('booster', ['Интенсивный нагрев Booster'], ['Функция Booster']),
F('sabaf', ['Конфорки SABAF'], ['Дополнительные особенности']),
F('heat_type', ['Тип зоны нагрева'], ['Тип нагрева']),
F('power_steps', ['Количество ступеней нагрева'], ['Уровней мощности']),
F('heat_residual', ['Индикация остаточного тепла'], ['Индикация остаточного тепла']),
F('stop_go', ['Пауза Stop&Go', 'Функция Stop&Go'], ['Функция Stop&Go', 'Stop&Go']),
F('burner_left_front', ['Передняя левая, кВт', 'Ближняя левая, кВт'], ['Левая ближняя конфорка (кВт)', 'Мощность конфорок, кВт: передняя левая']),
F('burner_left_rear', ['Задняя левая, кВт', 'Дальняя левая, кВт'], ['Левая дальняя конфорка (кВт)', 'Мощность конфорок, кВт: задняя левая']),
F('burner_right_front', ['Передняя правая, кВт', 'Ближняя правая, кВт'], ['Правая ближняя конфорка (кВт)', 'Мощность конфорок, кВт: передняя правая']),
F('burner_right_rear', ['Задняя правая, кВт', 'Дальняя правая, кВт'], ['Правая дальняя конфорка (кВт)', 'Мощность конфорок, кВт: задняя правая']),
F('burner_front_power', ['Передняя, кВт', 'Ближняя, кВт'], ['Ближняя (мм/кВт)', 'Передняя конфорка (кВт)', 'Ближняя конфорка (кВт)']),
F('burner_rear_power', ['Задняя, кВт', 'Дальняя, кВт'], ['Дальняя (мм/кВт)', 'Задняя конфорка (кВт)', 'Дальняя конфорка (кВт)']),
F('burner_front_mm', ['Передняя, мм', 'Ближняя, мм'], ['Ближняя (мм/кВт)']),
F('burner_rear_mm', ['Задняя, мм', 'Дальняя, мм'], ['Дальняя (мм/кВт)']),
F('niche', ['Габариты ниши для встраивания (Ш х Г), см', 'Габариты ниши для встраивания (В х Ш х Г), см', 'Размеры ниши для встраивания (ВхШхГ), см'], ['Размеры встраивания (ВхШхГ) (мм)', 'Размеры встраивания (ШхГ) (мм)', 'Размер ниши для встраивания (ВхШхГ), мм', 'Размер ниши для встраивания (ШхГ), мм', 'Размеры ниши для встраивания (ШхГ)']),
F('hood_type', ['Тип вытяжки'], ['Тип']),
F('hood_screen', ['Выдвижная панель'], ['Тип вытяжки']),
F('hood_modes', ['Режимы работы'], ['Режимы']),
F('hood_speeds', ['Количество скоростей'], ['Режимы']),
F('hood_performance', ['Производительность, м3/ч'], ['Производительность (м³/ч)']),
F('hood_motors', ['Количество двигателей / турбина'], ['Количество моторов']),
F('hood_grease_filter', ['Жировой фильтр', 'Фильтр пригоден для мытья в посудомоечной машине'], ['Жировой фильтр']),
F('hood_charcoal_filter_type', ['Тип угольного фильтра'], ['Угольный фильтр']),
F('hood_charcoal_count', ['Количество угольных фильтров, шт'], ['Угольный фильтр (шт)']),
F('hood_light_count', ['Количество ламп освещения'], ['Ламп освещения (шт)']),
F('hood_light_power', ['Мощность каждой лампы, Вт'], ['Мощность лампы (Вт)']),
F('hood_duct_diameter', ['Диаметр воздуховода, мм'], ['Диаметр выходного отверстия (мм)']),
F('hood_backvalve', ['Антивозвратный клапан'], ['Обратный клапан']),
F('oven_type_connect', ['Тип духовки'], ['Тип подключения']),
F('oven_volume', ['Объем, л'], ['Объем (л)']),
F('oven_modes_count', ['Количество режимов'], ['Режимы (шт.)', 'Режимы']),
F('oven_modes', ['Режимы', 'Режимы работы'], ['Режимы']),
F('oven_mode_traditional', ['Традиционный нагрев (верхний + нижний нагрев)'], ['Режимы']),
F('oven_mode_bottom', ['Нижний нагрев'], ['Режимы']),
F('oven_mode_convection', ['Конвекционный нагрев'], ['Режимы']),
F('oven_mode_defrost', ['Конвекционное размораживание (вентилятор без нагрева)', 'Размораживание'], ['Режимы']),
F('oven_mode_pizza', ['Пицца (кольцевой нагревательный элемент + нижний нагрев + вентилятор)', 'Пицца'], ['Режимы']),
F('oven_mode_big_grill', ['Большой гриль (верхний нагрев + гриль)', 'Большой гриль'], ['Режимы']),
F('oven_mode_small_turbo_grill', ['Малый турбогриль'], ['Режимы']),
F('oven_mode_volume_turbo_grill', ['Объемный турбогриль (верхний нагревательный элемент + гриль + вентилятор)', 'Объемный турбогриль'], ['Режимы']),
F('oven_mode_air_fry', ['Интенсивное запекание AIrFry', 'Интенсивное запекание (Air Fry)', 'Интенсивное запекание(Air Fry)'], ['Режимы']),
F('oven_clean', ['Тип очистки'], ['Очистка']),
F('oven_enamel', ['Эмаль'], ['Тип эмали']),
F('oven_grill', ['Тип гриля'], ['Гриль']),
F('oven_glass_count', ['Количество стекол дверцы духовки'], ['Количество стекол дверцы']),
F('oven_temp_range', ['Рабочий диапазон регулируемого термостата, °C'], ['Температурный диапазон (°C)']),
F('oven_rails', ['Телескопические направляющие', 'Количество уровней телескопических направляющих'], ['Телескопические направляющие']),
F('oven_tangential_cooling', ['Тангенциальное охлаждение'], ['Система охлаждения']),
F('oven_conv', ['Конвекционный нагрев'], ['Конвекционный нагрев']),
F('mw_type', ['Тип'], ['Тип']),
F('mw_volume', ['Объем, л'], ['Объем (л)']),
F('mw_door_open', ['Открывание дверцы'], ['Тип открывания дверцы']),
F('mw_chamber_material', ['Материал рабочей камеры'], ['Внутреннее покрытие']),
F('mw_power_in', ['Мощность подключения, Вт', 'Мощность в режиме микроволн, Вт'], ['Входная мощность микроволн (Вт)']),
F('mw_power_out', ['Мощность микроволн, Вт'], ['Выходная мощность микроволн (Вт)']),
F('mw_plate_diam', ['Диаметр блюда/ платформы, см'], ['Диаметр платформы (мм)']),
F('mw_programs', ['Количество автоматических программ'], ['Авторежимы']),
F('mw_defrost', ['Разморозка'], ['Разморозка']),
F('cm_coffee_type', ['Используемый кофе'], ['Используемый кофе']),
F('cm_cappuccinator', ['Капучинатор'], ['Капучинатор']),
F('cm_milk_container', ['Съемный контейнер для молока'], ['Емкость для молока']),
F('cm_two_cups', ['Одновременное приготовление двух чашек'], ['Одновременное приготовление']),
F('cm_water_tank', ['Объем резервуара для воды, л'], ['Объем резервуара для воды (л)']),
F('cm_grind_steps', ['Количество степеней помола'], ['Количество степеней помола']),
F('cm_bean_container', ['Объем резервуара для зерен, г'], ['Емкость контейнера для зерен (г)']),
F('cm_pressure', ['Давление насоса, бар'], ['Давление помпы (бар)']),
F('cm_power', ['Мощность, Вт'], ['Номинальная потребляемая мощность (Вт)']),
F('wd_capacity', ['Вместимость, количество комплектов'], ['Вместительность']),
F('wd_volume', ['Объем, л'], ['Объём (л)']),
F('wd_temp_range', ['Диапазон температур'], ['Температурный диапазон']),
F('wd_press_open', ['Открытие ящика нажатием на панель'], ['Открытие ящика нажатием на панель']),
F('dw_capacity', ['Вместимость, комплектов посуды', 'Вместимость, количество комплектов'], ['Вместительность']),
F('dw_programs', ['Количество программ'], ['Программ (шт)']),
F('dw_baskets', ['Количество корзин'], ['Количество корзин']),
F('wash_class', ['Класс мытья'], ['Класс мойки']),
F('dry_class', ['Класс сушки'], ['Класс сушки']),
F('dw_water_cycle', ['Расход воды на цикл, л', 'Энергопотребление за цикл, кВт/ч'], ['Расход воды за цикл (л)', 'Потребляемая энергия за цикл (стирка/сушка), (кВт⋅ч)']),
F('dw_leak_protect', ['Защита от протечек'], ['Защита от протечек']),
F('fridge_total_vol', ['Общий объем, л'], ['Общий объем (л)']),
F('fridge_cool_vol', ['Полезный объем, л [Холодильная камера]', 'Объем холодильной камеры, л'], ['Холодильная камера (л)']),
F('fridge_freeze_vol', ['Полезный объем, л [Морозильная камера]', 'Объем морозильной камеры, л'], ['Морозильная камера (л)']),
F('fridge_no_frost', ['Система No Frost', 'Система размораживания х.к.', 'Система размораживания м.к.'], ['Тип охлаждения холодильной камеры', 'Тип разморозки морозильной камеры']),
F('fridge_shelves', ['Количество полок'], ['Стеклянные полки (шт)']),
F('fridge_door_shelves', ['Количество дверных полок'], ['Дверные полки (шт)']),
F('fridge_egg_tray', ['Подставка для яиц'], ['Подставка для яиц']),
F('fridge_ice_tray', ['Лоток для приготовления кубиков льда'], ['Лоток для льда']),
F('fridge_vegbox', ['Контейнер для овощей и фруктов'], ['Контейнер для овощей (шт)']),
F('fridge_compressors', ['Особенности компрессора'], ['Тип компрессора']),
F('fridge_refrigerant', ['Хладагент'], ['Хладагент']),
F('fridge_reversible_door', ['Возможность перевешивания двери'], ['Перенавешиваемые двери']),
F('fridge_energy_year', ['Годовой расход электроэнергии, кв/ч', 'Энергопотребление в год, кВТ/ч'], ['Энергопотребление (кВт/год)']),
F('fridge_super_cool', ['Интенсивное охлаждение Super Cool'], ['Интенсивное охлаждение Super Cool']),
F('fridge_super_freeze', ['Интенсивная заморозка Super Freeze', 'Интенсивная заморозка'], ['Интенсивная заморозка']),
F('fridge_fresh_zone', ['Зона свежести'], ['Ящик зона свежести', 'Специальные зоны']),
F('fridge_freeze_drawers', ['Количество ящиков'], ['Контейнеры морозильника (шт)']),
F('fridge_freeze_perf', ['Производительность замораживания, кг/сутки'], ['Мощность замораживания (кг/сут)']),
F('fridge_store_off', ['Автономное сохранение холода, ч.'], ['Хранение при отключении питания, ч']),
F('wine_capacity', ['Максимальная вместимость, бутылок'], ['Максимальная вместимость (бутылок)']),
F('wine_zones', ['Температурные зоны'], ['Температурные зоны']),
F('wine_temp_range', ['Температурный диапазон'], ['Температурный диапазон']),
F('wine_shelves_material', ['Материал полок'], ['Деревянные полки (шт)']),
F('wine_uv_door', ['Дверца с защитой от ультрафиолета'], ['Дополнительные особенности']),
F('wm_load_type', ['Тип загрузки'], ['Тип загрузки']),
F('wm_max_load', ['Максимальная загрузка для стирки, кг'], ['Загрузка (кг)']),
F('wm_spin_speed', ['Скорость отжима, об/мин'], ['Скорость отжима (об/мин)']),
F('wm_modes_count', ['Количество режимов стирки'], ['Программ (шт)']),
F('wm_wash_class', ['Класс стирки'], ['Класс стирки']),
F('wm_spin_class', ['Класс отжима'], ['Класс отжима']),
F('wm_water_wash', ['Расход воды за цикл стирки, л'], ['Общий расход воды (л)']),
F('wm_energy_cycle', ['Расход электроэнергии за цикл стирки, кВт/час'], ['Потребляемая энергия за цикл (стирка/сушка), (кВт⋅ч)']),
F('wm_drum_material', ['Материал барабана'], ['Материал барабана']),
F('wm_tank_material', ['Материал бака'], ['Материал бака']),
F('wm_door_angle', ['Угол открытия люка, градусы'], ['Угол открытия люка (°)']),
F('wm_door_diam', ['Диаметр загрузочного люка, см'], ['Диаметр загрузочного люка (см)']),
F('dm_type', ['Тип сушки'], ['Тип сушки']),
F('dm_max_load', ['Максимальная загрузка, кг'], ['Загрузка (кг)']),
F('dm_programs', ['Количество программ'], ['Программ (шт)']),
F('dm_drum_material', ['Материал барабана'], ['Материал барабана']),
F('dm_drum_volume', ['Объем барабана, л'], ['Объем барабана(л)']),
F('dm_door_diam', ['Диаметр загрузочного люка, см'], ['Диаметр загрузочного люка (см)']),
F('dm_energy', ['Расход электроэнергии за цикл, кВт/час'], ['Потребляемая энергия (кВт⋅ч)']),
];

const VALUE_ALIASES = {
'*': { 'да': ['да', 'есть', 'yes', '+', 'да, в комплекте'], 'нет': ['нет', 'отсутствует', 'no', '—', '-'] },
color: {
'черный': ['черный', 'чёрный', 'черная', 'чёрная', 'черное стекло', 'black'],
'белый': ['белый', 'белое', 'белая', 'white'],
'серебристый': ['серебристый', 'inox', 'нержавеющая сталь', 'нерж. сталь', 'сталь', 'silver']
},
material: {
'нержавеющая сталь': ['нержавеющая сталь', 'металл', 'нерж. сталь', 'нержавеющая', 'сталь', 'нержавейка']
},
hob_type: {
'электрическая': ['электрическая', 'стеклокерамическая', 'электрический'],
'индукционная': ['индукционная', 'индукционный'],
'газовая': ['газовая', 'газовый', 'газ на стекле']
},
heat_type: { 'hi-light': ['hi-light', 'hilight'], 'индукционный': ['индукционный', 'induction', 'инверторный'] },
control_type: {
'сенсорное': ['сенсорное', 'сенсорные', 'сенсорный', 'touch', 'touch control', 'touch control slider', 'сенсорное управление', 'клавишные'],
'механическое': ['механическое', 'поворотные', 'поворотные переключатели', 'поворотные регуляторы', 'поворотные, утапливаемые регуляторы', 'ручки'],
'электронное': ['электронное', 'электронное управление']
},
fridge_no_frost: { 'no frost': ['no frost', 'в холодильном и морозильном отделениях', 'автоматическая'] },
fridge_compressors: { 'стандартный': ['стандартный', '1'] },
fridge_fresh_zone: { 'fresh zone': ['fresh zone', 'есть', 'да'] }
};

function normName(s){return String(s||'').replace(/[«»"']/g,'').replace(/\s+/g,' ').replace(/ё/g,'е').replace(/[x×]/g,'х').trim().toLowerCase();}
function stripDecor(s){return String(s||'').replace(/[«»"'*]/g,'').replace(/\s+/g,' ').trim();}
function latinizeClass(s){const m={А:'A',В:'B',С:'C',Е:'E',а:'A',е:'E'};return String(s||'').replace(/[АВСЕае]/g,c=>m[c]||c);}
function stripGenderEnding(s){return String(s||'').toLowerCase().trim().replace(/(ый|ий|ой|ая|ое|ые|ие)$/,'');}
function parseFlexibleNumber(s){const m=String(s||'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null;}
function parseAllNumbers(s){const m=String(s||'').replace(/,/g,'.').match(/\d+(?:\.\d+)?/g);return m?m.map(Number).filter(n=>isFinite(n)):[];}
function getByNames(map, names){for(const n of names){if(map[n]!=null&&map[n]!=='')return map[n];const hit=Object.keys(map).find(k=>normName(k)===normName(n));if(hit)return map[hit];}return null;}
function findFieldByName(name){return SPEC_FIELDS.find(f=>f.namesOurs.concat(f.namesOff).some(n=>normName(n)===normName(name)));}
function textOf(el){if(!el)return '';const c=el.cloneNode(true);c.querySelectorAll('.glossary-tooltip,script,style,svg').forEach(n=>n.remove());c.querySelectorAll('br').forEach(n=>{try{n.replaceWith('\n');}catch(e){}});return c.textContent.replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').split('\n').map(s=>s.trim()).filter(Boolean).join('\n');}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function copyText(s){try{GM_setClipboard(s,'text');}catch(e){navigator.clipboard&&navigator.clipboard.writeText(s);}}

function normValue(raw, fieldId){
let v=stripDecor(raw).toLowerCase().replace(/,/g,'.');
v=latinizeClass(v);
for(const dict of [VALUE_ALIASES[fieldId]||{}, VALUE_ALIASES['*']]){
for(const [canon,list] of Object.entries(dict)){ if(list.some(x=>normName(x)===normName(v))) return canon; }
}
return v.replace(/\s+/g,' ').trim();
}

function isYesValue(s){const v=String(s||'').toLowerCase().trim();return /^(да|есть|yes|\+|включено|активно)(\s*,|\s|$)/.test(v);}
function isNoValue(s){const v=String(s||'').toLowerCase().trim();return /^(нет|отсутствует|no|—|-|выключено|неактивно)(\s*,|\s|$)/.test(v);}

function firstItem(v){
const items=String(v||'').split(/[\n;,]+/).map(s=>s.trim()).filter(Boolean);
return items.length?items[0]:String(v||'').trim();
}
function hobFamily(v){
const c=normValue(firstItem(v),'hob_type');
if(/газов/.test(c)) return 'gas';
if(/индукц/.test(c)) return 'induction';
if(/электрич|hi-light|hilight|стеклокерам/.test(c)) return 'electric';
return '';
}

function parseBurnerField(raw){
const s=String(raw||'').replace(/,/g,'.');
const parts=s.split('/').map(p=>p.trim()).filter(Boolean);
if(parts.length>=2){
const diameter=parseFlexibleNumber(parts[0]);
const powerNums=parseAllNumbers(parts[1]);
return {diameter, powerMin: powerNums[0]??null, powerMax: powerNums[powerNums.length-1]??null};
}
const powerNums=parseAllNumbers(s);
return {diameter:null, powerMin: powerNums[0]??null, powerMax: powerNums[powerNums.length-1]??null};
}

function parseCombinedDimsMm(raw){
const s=String(raw||'').replace(/,/g,'.').replace(/[xXхХ×]/g,'x');
return (s.match(/\d+(?:\.\d+)?/g)||[]).map(Number).filter(n=>isFinite(n));
}

function setEqualTol(A,B,tol){
if(!A.length||A.length!==B.length) return false;
const used=B.map(()=>false);
return A.every(a=>{
const i=B.findIndex((b,j)=>!used[j]&&Math.abs(a-b)<tol);
if(i<0) return false; used[i]=true; return true;
});
}

function combinedPool(offMap, nameRe){
for(const [k,v] of Object.entries(offMap||{})){
if(!nameRe.test(k)) continue;
const nums=parseCombinedDimsMm(v);
if(nums.length>=2&&nums.length<=3&&nums.every(isFinite)){
const mm=/мм|mm/i.test(k)||/мм|mm/i.test(v)||nums.some(n=>n>=200);
const cm=nums.map(n=>mm?Math.round(n)/10:n);
return {key:k, raw:v, nums:cm, display:cm.map(String).join(' х ')+' см'};
}
}
return null;
}
function dimPools(offMap){
let prod=combinedPool(offMap,/габарит/i);
if(!prod) prod=combinedPool(offMap,/размер(?!.*встраив)/i);
const niche=combinedPool(offMap,/встраив|ниш/i);
return {prod, niche};
}

function officialBurnersSum(offMap){
const vals=[];
for(const [k,v] of Object.entries(offMap||{})){
const key=normName(k);
if(/конфорка\s*\(квт\)$/.test(key)||/мощность конфорок, квт:/.test(key)){
const n=parseFlexibleNumber(v);
if(n!=null) vals.push(n);
}else if(/\(мм\/квт\)$/.test(key)){
const pf=parseBurnerField(v);
if(pf.powerMin!=null) vals.push(pf.powerMin);
}
}
if(vals.length<2) return null;
const sum=Math.round(vals.reduce((a,b)=>a+b,0)*100)/100;
return {sum, count:vals.length};
}

function parseSlashField(raw){
const s=String(raw||'').replace(/,/g,'.').trim();
if(!s || s==='-' || s==='нет') return [];
return s.split('/').map(p=>p.trim()).map(p=>p==='-'?null:parseFlexibleNumber(p));
}

function splitListItems(val){
return String(val||'').replace(/•/g,';').split(/[;\n]+/).map(s=>s.replace(/^[\s-–—]+/,'').trim()).filter(s=>s.length>1);
}
function splitItemsSmart(val){
const base=splitListItems(val);
if(base.length>=2) return base;
const s=String(val||'').trim();
if(!s) return [];
const parts=s.match(/[А-ЯA-ZЁ][^А-ЯA-ZЁ]*/g);
if(parts&&parts.length>=2) return parts.map(p=>p.trim()).filter(p=>p.length>1);
return base;
}
function ovenModeItems(val){
 return splitItemsSmart(val)
   .map(s=>String(s||'').replace(/^[\s•–—-]+/,'').trim())
   .filter(s=>s && !/^освещение$/i.test(normName(s)));
}
function officialOvenModeCount(offMap){
 const modes=getByNames(offMap,['Режимы']);
 return modes==null ? null : ovenModeItems(modes).length;
}
function itemTokens(s){return normName(s).split(/\s+/).filter(Boolean);}
function itemsMatch(a,b){
const na=normName(a), nb=normName(b);
if(!na||!nb) return false;
if(na===nb) return true;
if(na.includes(nb)||nb.includes(na)) return Math.min(na.length,nb.length)>=4;
const ta=itemTokens(a), tb=itemTokens(b);
const inter=ta.filter(t=>tb.includes(t)).length;
const denom=Math.min(ta.length,tb.length);
return denom>0 && inter/denom>=0.6;
}

function valuesEqual(a,b,fieldId,field){
if(a==null||b==null||a===''||b==='')return null;
if(isYesValue(a)&&isYesValue(b))return true;
if(isNoValue(a)&&isNoValue(b))return true;
if(isYesValue(a)&&isNoValue(b))return false;
if(isNoValue(a)&&isYesValue(b))return false;

if(field&&field.id==='material'){
  const normMat = s => String(s||'').toLowerCase()
    .replace(/ё/g,'е')
    .replace(/нерж\.?\s*сталь|нержавейк[аи]|нержавеющ[а-яё]*|inox/g,'нержавеющая сталь')
    .replace(/\bметалл(?!л)\b/g,'нержавеющая сталь')
    .replace(/\s+и\s+/g,', ')
    .replace(/\s*,\s*/g,', ')
    .replace(/\s+/g,' ').trim();
  const a1 = normMat(a), b1 = normMat(b);
  if(a1 && b1 && (a1===b1 || a1.replace(/\s/g,'')===b1.replace(/\s/g,''))) return true;
  const ta=a1.split(/[,;]/).map(s=>s.trim()).filter(Boolean);
  const tb=b1.split(/[,;]/).map(s=>s.trim()).filter(Boolean);
  if(ta.length && tb.length && ta.length===tb.length){
    if(ta.every(t=>tb.some(x=>x===t||x.includes(t)||t.includes(x)))) return true;
  }
  if(a1 && b1 && (a1.includes(b1) || b1.includes(a1)) && Math.min(a1.length,b1.length)>=4) return true;
}

if(field&&(field.id==='hob_type'||field.id==='hob_connect')){
const fa=hobFamily(a), fb=hobFamily(b);
if(fa&&fb) return fa===fb;
return null;
}
if(field&&field.id==='size_nominal'){
const ourN=parseFlexibleNumber(a), offN=parseFlexibleNumber(b);
if(ourN==null||offN==null) return null;
if(Math.abs(ourN-offN)<0.2) return true;
return ourN>offN && (ourN-offN)<=1.5;
}
if(field&&field.id==='sabaf'){
const ob=String(b||'').toLowerCase();
if(isYesValue(a)) return ob.includes('sabaf');
if(isNoValue(a)) return !ob.includes('sabaf');
return null;
}
if(field&&field.id==='hood_screen'){
const offHas=String(b||'').toLowerCase().includes('выдвижн');
if(isYesValue(a)) return offHas;
if(isNoValue(a)) return !offHas;
return null;
}
if(field&&field.id==='hood_modes'){
const c=String(a).split(/[\/;,]/).map(s=>s.trim()).filter(Boolean).length;
const n=parseFlexibleNumber(b);
if(c&&n!=null) return c===n;
return null;
}
if(field&&field.id==='hood_type'){
const a1=String(a||'').toLowerCase(), b1=String(b||'').toLowerCase();
if(/встраиваем/.test(a1)) return /встраиваем/.test(b1);
return null;
}
if(field&&field.id==='power_max'){
 const na=parseFlexibleNumber(a), nb=parseFlexibleNumber(b);
 if(na==null||nb==null) return null;
 if(na>0&&nb>0){
   if(na<100&&nb>=100) return Math.abs(na*1000-nb)<Math.max(2,nb*0.005);
   if(nb<100&&na>=100) return Math.abs(na-nb*1000)<Math.max(2,na*0.005);
 }
 return Math.abs(na-nb)<0.051;
}
if(field&&field.id==='control_elements'){
 const oa=String(a||'').toLowerCase(), ob=String(b||'').toLowerCase();
 const touch=/сенсор|touch|slider/.test(oa), mech=/механическ|поворотн|ручк/.test(oa);
 const offTouch=/сенсор|touch|slider/.test(ob), offMech=/механическ|поворотн|ручк/.test(ob);
 if(touch) return offTouch;
 if(mech) return offMech;
 return null;
}
if(field&&field.id==='stop_go'){
 const oa=String(a||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я]/g,'');
 const ob=String(b||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я]/g,'');
 const offHas=/stopgo|пауза/.test(ob) || isYesValue(b);
 if(isYesValue(a)) return offHas;
 if(isNoValue(a)) return !offHas;
 if(/stopgo|пауза/.test(oa)) return offHas;
 return null;
}
if(field&&field.id==='control_type'){
const a1=String(a||'').toLowerCase(), b1=String(b||'').toLowerCase();
const isMech=/механическ/.test(a1), isSens=/сенсорн/.test(a1), isElec=/электронн/.test(a1);
if(isMech||isSens||isElec){
const bMech=/механическ/.test(b1), bSens=/сенсорн|touch|слайдер/.test(b1), bElec=/электронн/.test(b1);
const bRotary=/поворотн|регулятор|утапливаем|ручк|клавиш/.test(b1);
if(isMech) return bMech||bRotary;
if(isSens) return bSens||bElec;
if(isElec) return bElec||bSens;
}
}
if(field&&field.id==='timer'){
const oa=String(a||'').toLowerCase(), ob=String(b||'').toLowerCase();
if(isYesValue(b)) return oa.length>0 && !isNoValue(a);
if(isNoValue(b)) return isNoValue(a)||oa==='';
return null;
}
if(field&&field.id==='fridge_compressors'){
const ob=String(b||'').toLowerCase(), oa=String(a||'').toLowerCase();
if(/стандарт|обычн/.test(ob)) return /стандарт|обычн/.test(oa)||oa==='1';
if(/инвертор/.test(ob)) return /инвертор/.test(oa);
return null;
}
if(field&&field.id==='fridge_fresh_zone'){
const ob=String(b||'').toLowerCase(), oa=String(a||'').toLowerCase();
if(/fresh zone|freshzone/.test(ob)) return /есть|да|fresh/.test(oa);
return null;
}
if(field&&field.id==='fridge_no_frost'){
const oa=String(a||'').toLowerCase(), ob=String(b||'').toLowerCase();
if(/no frost|nofrost/.test(ob)) return /no frost|nofrost|в холодильном|автоматическ/.test(oa);
return null;
}
if(field&&(field.id==='noise'||field.id==='noise_spin')){
const offParts=parseSlashField(b);
const ourN=parseFlexibleNumber(a);
if(ourN==null||!offParts.length) return null;
const idx=field.id==='noise_spin'?1:0;
const offVal=offParts[idx];
if(offVal==null) return null;
return Math.abs(ourN-offVal)<1.5;
}
if(field&&(field.id==='wm_energy_cycle'||field.id==='dw_water_cycle')){
const offParts=parseSlashField(b);
const ourN=parseFlexibleNumber(a);
if(ourN==null||!offParts.length) return null;
const offVal=offParts[0];
if(offVal==null) return null;
return Math.abs(ourN-offVal)<0.02;
}
if(field&&field.id==='overall_dims'){
const offNums=parseCombinedDimsMm(b).map(n=>n/10);
const ourNums=parseAllNumbers(a);
if(!offNums.length||!ourNums.length) return null;
return setEqualTol(ourNums,offNums,0.3);
}
if(field&&MM_TO_CM_IDS.has(field.id)){
const offNums=parseCombinedDimsMm(b);
const ourN=parseFlexibleNumber(a);
if(ourN==null) return null;
if(offNums.length>=3){
const idx=field.id==='height'?0:field.id==='width'?1:2;
const offVal=offNums[idx];
if(offVal!=null) return Math.abs(ourN-offVal/10)<0.2;
return null;
}
if(offNums.length===1) return Math.abs(ourN-offNums[0])<0.2||Math.abs(ourN-offNums[0]/10)<0.2;
return null;
}
if(field&&field.id==='niche'){
const offNums=parseCombinedDimsMm(b).map(n=>n/10);
const ourNums=parseAllNumbers(a);
if(!offNums.length||!ourNums.length) return null;
if(ourNums.length===offNums.length) return setEqualTol(ourNums,offNums,0.3);
const offTail=ourNums.length===2&&offNums.length===3?offNums.slice(1):offNums;
if(offTail.length!==ourNums.length) return null;
return setEqualTol(ourNums,offTail,0.3);
}
if(field&&(field.id==='burner_front_power'||field.id==='burner_rear_power'||field.id==='burner_left_front'||field.id==='burner_left_rear'||field.id==='burner_right_front'||field.id==='burner_right_rear')){
const {powerMin,powerMax}=parseBurnerField(b);
const ourN=parseFlexibleNumber(a);
if(ourN==null||powerMin==null) return null;
return ourN>=powerMin-0.05&&ourN<=(powerMax??powerMin)+0.05;
}
if(field&&(field.id==='burner_front_mm'||field.id==='burner_rear_mm')){
const {diameter}=parseBurnerField(b);
const ourNums=parseAllNumbers(a);
const ourN=ourNums.length?ourNums[ourNums.length-1]:null;
if(ourN==null||diameter==null) return null;
return Math.abs(ourN-diameter)<1.5;
}
if(field&&CLASS_FIELD_IDS.has(field.id)) return latinizeClass(String(a).toUpperCase())===latinizeClass(String(b).toUpperCase());

const na=normValue(a,fieldId), nb=normValue(b,fieldId);
if((na==='да'&&String(nb).indexOf('да')===0)||(nb==='да'&&String(na).indexOf('да')===0))return true;
if(na===nb||na.replace(/\s/g,'')===nb.replace(/\s/g,''))return true;
const fa=parseFlexibleNumber(na), fb=parseFlexibleNumber(nb);
if(fa!=null&&fb!=null&&Math.abs(fa-fb)<0.051)return true;
const ga=na.split(/\s+/).map(stripGenderEnding).join(' '), gb=nb.split(/\s+/).map(stripGenderEnding).join(' ');
if(ga===gb||((ga.includes(gb)||gb.includes(ga))&&Math.min(ga.length,gb.length)>=4))return true;
if((na.includes(nb)||nb.includes(na))&&Math.min(na.length,nb.length)>=3)return true;
return false;
}

function formatOfficialDisplay(field, offRaw){
if(offRaw==null||offRaw==='')return {display:'',notes:[]};
let display=String(offRaw); const notes=[];
 if(field&&field.id==='power_max'){
   const n=parseFlexibleNumber(offRaw);
   if(n!=null && n>=1000){
     display=String(Math.round((n/1000)*1000)/1000)+' кВт';
     notes.push('официальное значение в Вт → кВт для сопоставления с карточкой');
   }
 }
if(field&&(MM_TO_CM_IDS.has(field.id)||field.id==='overall_dims'||field.id==='niche')){
const nums=parseCombinedDimsMm(offRaw);
if(nums.length>=2&&nums.every(isFinite)){
const mm=nums.some(n=>n>=200)||/мм|mm/i.test(String(offRaw));
const cm=nums.map(n=>mm?Math.round(n)/10:n);
display=cm.map(String).join(' х ')+' см';
if(mm) notes.push('на оф. в мм → см');
}
}
return {display, notes};
}

function parseOursDocument(doc){
const map={};
const addRow=(row,section)=>{
const name=textOf(row.querySelector('.characteristics__name'));
const valEl=row.querySelector('.characteristics__property');
let val='';
if(valEl){const ul=valEl.querySelector('ul'); val=ul?[...ul.querySelectorAll('li')].map(textOf).join('\n'):textOf(valEl);}
if(!name) return;
if(map[name]==null){ map[name]=val; return; }
const keyed=name+' ['+(section||'')+']';
if(map[keyed]==null) map[keyed]=val;
};
doc.querySelectorAll('.characteristics__wrap > .characteristics__header > .characteristics__row, .characteristics__wrap > .characteristics__row').forEach(r=>addRow(r,''));
doc.querySelectorAll('.characteristics__block').forEach(bl=>{
const sec=textOf(bl.querySelector('.characteristics__title-text, .characteristics__title'));
bl.querySelectorAll('.characteristics__row').forEach(r=>addRow(r,sec));
});
if(!Object.keys(map).length) doc.querySelectorAll('.characteristics__row').forEach(r=>addRow(r,''));
return map;
}

const PRODUCT_PATH_RE=/\/korting\/(?:[a-z0-9-]+\/)+([a-z0-9-]+)\.html$/i;

function extractModel(text){
let s=String(text||'').replace(/https?:\/\/[^\s]+/gi,' ').replace(/\.html?/gi,' ');
const nm=s.match(/\b([A-Z]{2,5})\s?(\d{2,4}[A-Z0-9]{2,12})(?:[\s-]+([A-Z]\b))?/);
if(nm&&/\d/.test(nm[2])){
return (nm[1]+' '+nm[2]+(nm[3]?' '+nm[3]:'')).replace(/\s+/g,' ').trim();
}
const re=/\b([A-ZА-Я]{2,6})[-_ ]?(\d{2,6})\b((?:[\s-]+[A-Za-zА-Яа-я0-9]{1,12}){0,2})/g;
let best='', m;
while((m=re.exec(s))){
const tail=(m[3]||'').trim().split(/[\s-]+/).filter(t=>/^[A-Za-zА-Яа-я0-9]{1,12}$/.test(t)).slice(0,2).join(' ');
const cand=((m[1]+' '+m[2]).toUpperCase()+(tail?' '+tail.toUpperCase():'')).trim();
if(cand.length>best.length) best=cand;
}
if(best) return best.replace(/\s+/g,' ');
const fb=s.match(/\b([A-ZА-Я]{2,6}[-_ ]?\d{2,6}(?:[-_][A-ZА-Я0-9]{1,6})?)\b/i);
return fb?fb[1].replace(/\s+/g,' ').toUpperCase():'';
}

function modelKey(m){return String(m||'').toUpperCase().replace(/[^A-Z0-9]+/g,'');}

function officialMatchesModel(parsed, model){
const om=extractModel(parsed.title||'');
if(!om||!model) return true;
const a=modelKey(om), b=modelKey(model);
if(!a||!b) return true;
if(a===b) return true;
if((a.startsWith(b)||b.startsWith(a))&&Math.abs(a.length-b.length)<=2) return true;
return false;
}

function collectCompareProducts(colCount){
const seen=new Set(); const products=[];
const push=a=>{
try{
const raw=a.getAttribute&&a.getAttribute('href'); if(!raw) return;
const u=new URL(raw, location.origin);
if(u.origin!==location.origin) return;
const mPath=u.pathname.match(PRODUCT_PATH_RE);
if(!mPath) return;
const slug=mPath[1];
if(!/\d/.test(slug)) return;
const key=u.pathname.replace(/\/+$/,'').toLowerCase();
if(seen.has(key)) return; seen.add(key);
const title=String(a.getAttribute('title')||a.textContent||'').replace(/\s+/g,' ').trim();
const model=extractModel(title)||extractModel(slug.replace(/-/g,' '));
if(!model) return;
products.push({href:u.href,title:title,model:model});
}catch(e){}
};
const cardSel='.comparison-card.comparison__items-card, .compare-item, .compare-card, .comparison__item, [class*="comparison"][class*="card"], [class*="comparison"][class*="item"], [class*="compare"][class*="card"], [class*="compare"][class*="item"]';
document.querySelectorAll(cardSel).forEach(card=>{
card.querySelectorAll('a[href]').forEach(a=>push(a));
});
if(!products.length){ document.querySelectorAll('a[href]').forEach(push); }
if(colCount>0 && products.length>colCount) products.length=colCount;
return products;
}

function rowsFromContainer(rowSel,nameSel,cellSel){
const out=[];
document.querySelectorAll(rowSel).forEach(row=>{
const nameEl=row.querySelector(nameSel);
if(!nameEl) return;
let cells=[...row.querySelectorAll(cellSel)].filter(c=>!nameEl.contains(c)&&!c.contains(nameEl));
if(!cells.length) cells=[...row.children].filter(c=>c!==nameEl&&!nameEl.contains(c));
if(!cells.length) return;
const name=textOf(nameEl).trim();
if(!name||name.length>120) return;
out.push({name:name,cells:cells});
});
return out;
}
function dedupeRows(rows){
const map=new Map();
rows.forEach(r=>{ if(!map.has(r.name)) map.set(r.name,r); });
return [...map.values()];
}
function getCompareRowDom(){
let rows=rowsFromContainer('.compare-table-block__row.js-compare-row, .compare-row, .compare-table__row','.js-compare-cell-title, .compare-cell-title, .compare-table__name, .compare-table__cell-title','.js-compare-cell:not(.js-compare-cell-title), .compare-cell:not(.js-compare-cell-title), .compare-table__value, .compare-table__cell');
if(rows.length) return dedupeRows(rows);
rows=rowsFromContainer('table tr','th, td:first-child','td').filter(r=>r.cells.length>=2);
if(rows.length) return dedupeRows(rows);
const heur=[];
const conts=[...document.querySelectorAll('[class*="compare"], [class*="comparison"]')];
(conts.length?conts:[document.body]).forEach(cont=>{
cont.querySelectorAll('*').forEach(el=>{
if(heur.length>400) return;
const kids=[...el.children];
if(kids.length<3||kids.length>12) return;
const tag=kids[0].tagName;
if(!kids.every(k=>k.tagName===tag)) return;
const name=textOf(kids[0]).trim();
if(!name||name.length>90) return;
if(/руб|\d{3,}/.test(name)) return;
const vals=kids.slice(1);
if(vals.some(v=>v.querySelector&&v.querySelector('a[href$=".html"]'))) return;
if(!vals.every(v=>textOf(v).length<300)) return;
heur.push({name:name,cells:vals});
});
});
return dedupeRows(heur);
}

function modeColCount(rows){
const freq={};
rows.forEach(r=>{freq[r.cells.length]=(freq[r.cells.length]||0)+1;});
let best=0,bestN=0;
Object.keys(freq).forEach(n=>{ if(freq[n]>bestN){bestN=freq[n]; best=+n;} });
return best;
}

function parseOursCompare(){
const rows=getCompareRowDom();
const colCount=modeColCount(rows);
const products=collectCompareProducts(colCount);
if(!products.length) return [];
const specs=products.map(()=>({}));
rows.forEach(r=>{
r.cells.forEach((cell,i)=>{ if(specs[i]!=null) specs[i][r.name]=textOf(cell).trim(); });
});
return products.map((p,i)=>Object.assign({specs:specs[i]||{}},p));
}

async function waitCompareItems(){
for(let i=0;i<12;i++){
const items=parseOursCompare();
if(items.length) return items;
await new Promise(r=>setTimeout(r,700));
}
return parseOursCompare();
}

function isCloudflare(html){const t=String(html||'').toLowerCase(); return t.includes('just a moment')||t.includes('attention required');}

function parseOfficialDocument(doc){
const map={};
doc.querySelectorAll('tr.table__row').forEach(row=>{
const name=textOf(row.querySelector('.table__row-name'));
const val=textOf(row.querySelector('.table__row-value'));
if(name && map[name]==null) map[name]=val;
});
const title=textOf(doc.querySelector('h1'))||doc.title;
return {specs:map, title};
}

function canonicalOvenMode(s){
 const n=normName(s).replace(/\s*\([^)]*\)/g,'').replace(/[.,]/g,' ').replace(/\s+/g,' ').trim();
 if(/освещени/.test(n)) return 'освещение';
 if(/традиционн/.test(n)) return 'традиционный нагрев';
 if(/нижний нагрев/.test(n)) return 'нижний нагрев';
 if(/конвекционн.*нагрев/.test(n)) return 'конвекционный нагрев';
 if(/разморажив/.test(n)) return 'размораживание';
 if(/пицц/.test(n)) return 'пицца';
 if(/большой гриль/.test(n)) return 'большой гриль';
 if(/малый турбогриль/.test(n)) return 'малый турбогриль';
 if(/объемный турбогриль|обьемный турбогриль/.test(n)) return 'объемный турбогриль';
 if(/интенсивное запекание|air ?fry/.test(n)) return 'интенсивное запекание air fry';
 return n;
}
function officialModeList(offMap){
 const v=getByNames(offMap,['Режимы']);
 return v==null ? [] : splitItemsSmart(v).filter(Boolean);
}
function modeExistsInOfficial(oursName, officialModes){
 const target=canonicalOvenMode(oursName);
 return officialModes.some(m=>canonicalOvenMode(m)===target);
}

function compareSpecs(oursMap, offMap){
const rows=[];
const pools=dimPools(offMap);
SPEC_FIELDS.forEach(field=>{
let oursVal=getByNames(oursMap, field.namesOurs);
let offVal=getByNames(offMap, field.namesOff.concat(field.namesOurs));
if(field.id==='stop_go' && offVal==null){
 const hit=Object.keys(offMap).find(k=>/stop\s*&?\s*go/i.test(k));
 if(hit) offVal=offMap[hit];
}
if(field.id==='oven_modes_count' && offVal==null) offVal=getByNames(offMap,['Режимы']);
if(/^oven_mode_/.test(field.id) && field.id!=='oven_modes') offVal=getByNames(offMap,['Режимы']);
if(oursVal==null&&offVal==null) return;
const fmt=formatOfficialDisplay(field, offVal);
const notes=fmt.notes.slice();
let status='only_one';
const oursItems=oursVal!=null?splitItemsSmart(oursVal):[];
const offItems=offVal!=null?splitItemsSmart(offVal):[];
const isOvenModeField=/^oven_mode_/.test(field.id);
if(isOvenModeField){
 const officialModes=officialModeList(offMap);
 const modePresent=modeExistsInOfficial(field.namesOurs[0],officialModes);
 const oursPresent=isYesValue(oursVal);
 const status=oursPresent ? (modePresent?'ok':'diff') : (isNoValue(oursVal) ? (!modePresent?'ok':'diff') : 'only_one');
 rows.push({id:field.id,name:field.namesOurs[0],ours:oursVal,off:offVal,offDisplay:officialModes.join('\n'),notes:['режим сверяется по списку «Режимы» на официальном сайте'],status});
 return;
}
const isList=(field.id==='accessories')||(field.id!=='oven_modes'&&((oursItems.length>=2||offItems.length>=2)&&!MM_TO_CM_IDS.has(field.id)&&!LIST_EXCLUDE.has(field.id)));
if(isList&&oursVal!=null&&offVal!=null){
const ourMarks=oursItems.map(t=>({text:t,ok:offItems.some(o=>itemsMatch(t,o))}));
const offMarks=offItems.map(t=>({text:t,ok:oursItems.some(o=>itemsMatch(t,o))}));
const uO=ourMarks.filter(m=>!m.ok).length, uF=offMarks.filter(m=>!m.ok).length;
const matched=ourMarks.length-uO;
status=(uO===0&&uF===0)?'ok':(matched>0?'partial':'diff');
rows.push({id:field.id,name:field.namesOurs[0]||field.namesOff[0],ours:oursVal,off:offVal,offDisplay:fmt.display||offVal,notes,status,items:{ours:ourMarks,off:offMarks}});
return;
}
if(oursVal!=null&&offVal!=null){
let eq;
if(field.id==='oven_modes_count'){
 const ourCount=parseFlexibleNumber(oursVal);
 const officialCount=parseFlexibleNumber(offVal);
 const listedCount=officialOvenModeCount(offMap);
 const adjustedCount=listedCount!=null ? listedCount : (officialCount!=null ? officialCount-1 : null);
 eq=(ourCount!=null&&adjustedCount!=null) ? Math.abs(ourCount-adjustedCount)<0.01 : valuesEqual(oursVal,offVal,field.id,field);
 if(listedCount!=null) notes.push('количество сверено по списку режимов; «Освещение» не учитывается');
} else if(field.id==='oven_modes'){
 const ourModes=ovenModeItems(oursVal), offModes=ovenModeItems(offVal);
 const ourMarks=ourModes.map(t=>({text:t,ok:offModes.some(o=>itemsMatch(t,o))}));
 const offMarks=offModes.map(t=>({text:t,ok:ourModes.some(o=>itemsMatch(t,o))}));
 const unmatchedOur=ourMarks.some(m=>!m.ok), unmatchedOff=offMarks.some(m=>!m.ok);
 status=(!unmatchedOur&&!unmatchedOff)?'ok':(ourMarks.some(m=>m.ok)?'partial':'diff');
 rows.push({id:field.id,name:field.namesOurs[0]||field.namesOff[0],ours:oursVal,off:offVal,offDisplay:fmt.display||offVal,notes,status,items:{ours:ourMarks,off:offMarks}});
 return;
} else eq=valuesEqual(oursVal,offVal,field.id,field);
status = eq===null ? 'only_one' : (eq?'ok':'diff');
} else status=oursVal!=null?'only_ours':'only_off';
if(status==='only_one'&&oursVal!=null){
if(MM_TO_CM_IDS.has(field.id)&&pools.prod){
const v=parseFlexibleNumber(oursVal);
if(v!=null){
const okm=pools.prod.nums.some(n=>Math.abs(n-v)<0.3);
status=okm?'ok':'diff';
offVal=pools.prod.raw; fmt.display=pools.prod.display;
notes.push('сравнено с объединёнными габаритами оф. «'+pools.prod.key+'» (мм→см, порядок не важен)');
}
}else if(field.id==='niche'&&pools.niche){
const ourNums=parseAllNumbers(oursVal);
if(ourNums.length){
const okm=setEqualTol(ourNums,pools.niche.nums,0.3)||(ourNums.length===2&&pools.niche.nums.length===3&&setEqualTol(ourNums,pools.niche.nums.slice(1),0.3));
status=okm?'ok':'diff';
offVal=pools.niche.raw; fmt.display=pools.niche.display;
notes.push('сравнено с «'+pools.niche.key+'» оф. (мм→см, порядок не важен)');
}
}else if(field.id==='overall_dims'&&pools.prod){
const ourNums=parseAllNumbers(oursVal);
if(ourNums.length){
const okm=setEqualTol(ourNums,pools.prod.nums,0.3);
status=okm?'ok':'diff';
offVal=pools.prod.raw; fmt.display=pools.prod.display;
notes.push('сравнено с «'+pools.prod.key+'» оф. (мм→см)');
}
}
}
rows.push({id:field.id,name:field.namesOurs[0]||field.namesOff[0],ours:oursVal,off:offVal,offDisplay:fmt.display||offVal,notes,status});
});
const totalOur=getByNames(oursMap,['Общая мощность конфорок, кВт']);
if(totalOur!=null){
const bs=officialBurnersSum(offMap);
if(bs){
const our=parseFlexibleNumber(totalOur);
const ok=our!=null&&Math.abs(our-bs.sum)<0.06;
rows.push({id:'hob_power_total',name:'Общая мощность конфорок, кВт',ours:totalOur,off:String(bs.sum),offDisplay:bs.sum+' кВт (сумма '+bs.count+' конфорок оф.)',notes:['вычислено сложением мощностей отдельных конфорок оф. сайта'],status:ok?'ok':'diff'});
}
}
return rows;
}

function ourCategoryFromPath(){
const m=location.pathname.match(/\/korting\/([a-z0-9-]+)\//i);
if(!m) return '';
return CATEGORY_ALIASES[m[1]] || m[1];
}

function modelToSlug(model){return String(model||'').trim().toLowerCase().replace(/\s+/g,'-').replace(/\.+/g,'').replace(/-+/g,'-');}

function modelCore(model){
const mm=String(model||'').toUpperCase().match(/([A-ZА-Я]{2,6})[-_ ]?(\d{2,6})/);
return mm?(mm[1]+' '+mm[2]):'';
}

function officialCandidateUrls(model, categorySlug){
const conf=CATEGORY_MAP[categorySlug];
if(!conf) return [];
const slug=modelToSlug(model);
return conf.prefixes.map(p=>`${OFFICIAL_ORIGIN}/catalog/${conf.slug}/${p}-${slug}/`);
}

function allCandidateUrls(model){
const slug=modelToSlug(model);
const urls=[];
Object.values(CATEGORY_MAP).forEach(conf=>{
conf.prefixes.forEach(p=>urls.push(`${OFFICIAL_ORIGIN}/catalog/${conf.slug}/${p}-${slug}/`));
});
return [...new Set(urls)];
}

const SEARCH_URL_PATTERNS = [
q => `${OFFICIAL_ORIGIN}/search/?q=${q}`,
q => `${OFFICIAL_ORIGIN}/search?q=${q}`,
q => `${OFFICIAL_ORIGIN}/catalog/search/?q=${q}`,
q => `${OFFICIAL_ORIGIN}/catalog/?q=${q}`,
];

function extractProductLinksFromSearchHtml(html){
const doc=new DOMParser().parseFromString(html,'text/html');
const links=[...doc.querySelectorAll('a[href*="/catalog/"]')]
.map(a=>a.getAttribute('href'))
.filter(h=>h && /\/catalog\/[a-z0-9-]+\/[a-z0-9-]+\/?$/i.test(h) && !/\/catalog\/[a-z0-9-]+\/?$/i.test(h));
return [...new Set(links)].map(h=>h.startsWith('http')?h:OFFICIAL_ORIGIN+h);
}

function slugOfLink(l){return String(l||'').replace(/[#?].*$/,'').replace(/\/+$/,'').split('/').pop()||'';}

async function loadOfficialBySearch(model,onProgress){
const q=encodeURIComponent(model);
const coreSlug=modelToSlug(modelCore(model));
const fullSlug=modelToSlug(model);
for(const build of SEARCH_URL_PATTERNS){
const url=build(q);
if(onProgress) onProgress('Ищу на сайте: '+url.replace(OFFICIAL_ORIGIN,''));
try{
const res=await gmFetch(url,6000);
if(res.status===404) continue;
const html=res.responseText||'';
if(isCloudflare(html)) continue;
const links=extractProductLinksFromSearchHtml(html);
if(!links.length) continue;
const cands=links.filter(l=>{
const s=slugOfLink(l);
return coreSlug && s.includes(coreSlug);
});
if(!cands.length) continue;
const ordered=[];
const pushCand=l=>{ if(!ordered.includes(l)) ordered.push(l); };
cands.filter(l=>slugOfLink(l)===fullSlug).forEach(pushCand);
cands.filter(l=>slugOfLink(l).includes(fullSlug)).forEach(pushCand);
cands.forEach(pushCand);
for(const cand of ordered.slice(0,4)){
try{
const prodRes=await gmFetch(cand,6000);
if(prodRes.status===404) continue;
const prodHtml=prodRes.responseText||'';
if(isCloudflare(prodHtml)) continue;
const doc=new DOMParser().parseFromString(prodHtml,'text/html');
const parsed=parseOfficialDocument(doc);
if(!Object.keys(parsed.specs).length) continue;
if(!officialMatchesModel(parsed,model)) continue;
writeCache(model,{specs:parsed.specs,url:cand});
return {ok:true,specs:parsed.specs,url:cand};
}catch(e){}
}
}catch(e){}
}
return {ok:false};
}

function cacheKey(model){return 'kd_off_v1_'+modelToSlug(model);}
function readCache(model,allowStale){try{const raw=GM_getValue(cacheKey(model),''); if(!raw) return null; const obj=JSON.parse(raw); if(!obj||!obj.specs) return null; if(!allowStale&&obj.ts&&Date.now()-obj.ts>CACHE_TTL_MS) return null; return obj;}catch(e){return null;}}
function writeCache(model,data){GM_setValue(cacheKey(model), JSON.stringify(Object.assign({ts:Date.now(),model},data)));}

function gmFetch(url,ms){
const wait=ms||5000; let done=false;
const req=new Promise((resolve,reject)=>{try{GM_xmlhttpRequest({method:'GET',url,timeout:wait,onload:r=>{if(!done){done=true;resolve(r);}},onerror:e=>{if(!done){done=true;reject(e||new Error('net'));}},ontimeout:()=>{if(!done){done=true;reject(new Error('timeout'));}}});}catch(e){reject(e);}});
const hard=new Promise((_,rej)=>setTimeout(()=>{if(!done){done=true;rej(new Error('timeout'));}},wait+400));
return Promise.race([req,hard]);
}

async function loadOfficialByGuessing(model,categorySlug,onProgress){
const cached=readCache(model); if(cached) return {ok:true,specs:cached.specs,url:cached.url,fromCache:true};
let urls=officialCandidateUrls(model,categorySlug);
if(!urls.length){ if(onProgress) onProgress('Категория не определена, пробую все префиксы…'); urls=allCandidateUrls(model); }
for(const url of urls){
if(onProgress) onProgress('Пробую: '+url.replace(OFFICIAL_ORIGIN,''));
try{
const res=await gmFetch(url,6000);
if(res.status===404) continue;
const html=res.responseText||'';
if(isCloudflare(html)) continue;
const doc=new DOMParser().parseFromString(html,'text/html');
const parsed=parseOfficialDocument(doc);
if(!Object.keys(parsed.specs).length) continue;
if(!officialMatchesModel(parsed,model)){ if(onProgress) onProgress('Не та модель, пропускаю: '+url.replace(OFFICIAL_ORIGIN,'')); continue; }
writeCache(model,{specs:parsed.specs,url});
return {ok:true,specs:parsed.specs,url};
}catch(e){}
}
return {ok:false};
}

function normUrl(u){return String(u||'').replace(/[#?].*$/,'').replace(/\/+$/,'').toLowerCase();}
function getJob(){try{return JSON.parse(GM_getValue(JOB_KEY,'null')||'null');}catch(e){return null;}}
function setJob(j){GM_setValue(JOB_KEY,JSON.stringify(j));}
function workerTick(){
const job=getJob(); if(!job||job.status!=='pending') return;
const urls=job.urls||[]; const idx=job.idx||0;
if(idx>=urls.length){ setJob(Object.assign({},job,{status:'done',ok:false})); return; }
if(normUrl(location.href)!==normUrl(urls[idx])) return;
const advance=()=>{
const next=idx+1;
if(next<urls.length){ setJob(Object.assign({},job,{idx:next})); location.href=urls[next]; }
else setJob(Object.assign({},job,{status:'done',ok:false}));
};
const t0=Date.now();
const tryParse=()=>{
try{
const parsed=parseOfficialDocument(document);
const cnt=Object.keys(parsed.specs||{}).length;
if(cnt>=4 && officialMatchesModel(parsed, job.model)){
const u=location.href.split('?')[0];
writeCache(job.model,{specs:parsed.specs,url:u,title:parsed.title});
setJob(Object.assign({},job,{status:'done',ok:true,url:u}));
return;
}
const hasDom=!!document.querySelector('.table__row');
const is404=/404|не найдена|не существует/i.test((document.title||'')+' '+((document.querySelector('h1')||{}).textContent||''));
if(is404||(!hasDom&&Date.now()-t0>5000)||(Date.now()-t0>10000)){ advance(); return; }
setTimeout(tryParse,700);
}catch(e){ advance(); }
};
setTimeout(tryParse,800);
}
let workerWin=null, captureQueue=[], capturing=false;
function urlsForModel(m){ const cat=ourCategoryFromPath(); const u=officialCandidateUrls(m,cat); return u.length?u:allCandidateUrls(m); }
function startAutoCapture(models){
if(capturing||!models||!models.length) return;
capturing=true; captureQueue=models.slice(1);
const first=models[0];
const urls=urlsForModel(first.model);
setJob({status:'pending',model:first.model,idx:0,urls,started:Date.now()});
workerWin=window.open(urls[0],'kdworker','width=760,height:520,left=80,top=80');
setBody('<div class="kd-meta">🤖 Авто-захват: обрабатываю <b>'+escapeHtml(first.model)+'</b>… Открыто служебное окно korting.ru — не закрывайте его. Осталось: '+models.length+'</div>');
}
function onJobDone(job){
if(!capturing) return;
if(captureQueue.length){
const nxt=captureQueue.shift();
const urls=urlsForModel(nxt.model);
setJob({status:'pending',model:nxt.model,idx:0,urls,started:Date.now()});
if(workerWin&&!workerWin.closed){ workerWin.location.href=urls[0]; setBody('<div class="kd-meta">🤖 Авто-захват: обрабатываю <b>'+escapeHtml(nxt.model)+'</b>… Осталось: '+(captureQueue.length+1)+'</div>'); }
else finishCapture();
}else finishCapture();
}
function finishCapture(){
capturing=false;
try{ if(workerWin&&!workerWin.closed) workerWin.close(); }catch(e){}
setJob({status:'idle'});
setBody('<div class="kd-meta">🤖 Авто-захват завершён. Пересчитываю из кэша…</div>');
setTimeout(()=>{ if(isComparePage()) runCompare(); else runOurProduct(); },400);
}
function registerJobListener(){
try{
GM_addValueChangeListener(JOB_KEY,(n,o,v,remote)=>{
if(!remote) return;
let j=null; try{j=JSON.parse(v||'null');}catch(e){}
if(j&&j.status==='done') onJobDone(j);
});
}catch(e){}
setInterval(()=>{
const j=getJob();
if(j&&j.status==='pending'&&j.started&&Date.now()-j.started>120000){ setJob(Object.assign({},j,{status:'done',ok:false,timeout:true})); }
},5000);
}
function autoCapButton(models,label){
return '<button type="button" class="kd-searchlink green kd-autocap" data-models="'+escapeHtml(JSON.stringify(models))+'">🤖 '+(label||'Авто-захват')+'</button>';
}

GM_addStyle('#kd-spec-root{position:fixed;right:16px;bottom:16px;z-index:2147483646;font-family:Arial,sans-serif}'
+'#kd-spec-toggle{background:#1a1a1a;color:#fff;border:0;border-radius:18px;padding:7px 12px;cursor:pointer;font-size:12px;font-weight:600}'
+'#kd-spec-toggle.diff{background:#b42318}#kd-spec-toggle.ok{background:#067647}#kd-spec-toggle.wait{background:#b54708}'
+'#kd-spec-panel{display:none;position:fixed;right:12px;bottom:52px;width:min(500px,calc(100vw - 16px));max-height:min(70vh,560px);overflow:auto;background:#fff;color:#111;border-radius:10px;box-shadow:0 16px 50px rgba(0,0,0,.28);border:1px solid #e5e5e5}'
+'#kd-spec-panel.open{display:block}'
+'#kd-spec-panel header{position:sticky;top:0;background:#111;color:#fff;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;z-index:2}'
+'#kd-spec-panel header b{font-size:12px}#kd-spec-panel header button{background:transparent;color:#fff;border:1px solid #555;border-radius:5px;padding:3px 7px;cursor:pointer;font-size:11px}'
+'.kd-meta{padding:5px 10px;font-size:11px;color:#444;border-bottom:1px solid #eee}.kd-meta a{color:#1254b3}'
+'.kd-table{width:100%;border-collapse:collapse;font-size:11px}.kd-table th,.kd-table td{padding:4px 8px;border-bottom:1px solid #f0f0f0;vertical-align:top;text-align:left;white-space:pre-line}.kd-table th{background:#fafafa;position:sticky;top:36px}'
+'.kd-st-diff{background:#fef3f2}.kd-st-partial{background:#fff8e1}'
+'.kd-chip{display:inline-block;padding:1px 7px;border-radius:10px;background:#f2f2f2;margin-right:4px;font-size:10px}'
+'.kd-notfound{background:#fff8e1;border-left:3px solid #f59e0b;padding:8px 10px;font-size:12px;color:#5b4300}'
+'.kd-searchlink{display:inline-block;margin:6px 10px;padding:5px 12px;background:#1254b3;color:#fff !important;border-radius:6px;text-decoration:none;font-weight:600;font-size:12px;border:0;cursor:pointer}'
+'.kd-searchlink:hover{background:#0d3f8f}'
+'.kd-searchlink.green{background:#067647}.kd-searchlink.green:hover{background:#04553b}'
+'.kd-row-ok .characteristics__property{position:relative;background:#e9f7ef}'
+'.kd-row-diff .characteristics__property{position:relative;background:#fdecea}'
+'.kd-row-partial .characteristics__property{position:relative;background:#fff8e1}'
+'.kd-row-ok .characteristics__property::before,.kd-row-diff .characteristics__property::before,.kd-row-partial .characteristics__property::before{content:"";position:absolute;left:-8px;top:1px;bottom:1px;width:4px;border-radius:2px}'
+'.kd-row-ok .characteristics__property::before{background:#067647}'
+'.kd-row-diff .characteristics__property::before{background:#b42318}'
+'.kd-row-partial .characteristics__property::before{background:#f59e0b}'
+'.kd-row-diff .characteristics__name{color:#b42318;font-weight:600}'
+'.kd-row-partial .characteristics__name{color:#b45309;font-weight:600}'
+'.kd-cell-ok{background:#e9f7ef !important}'
+'.kd-cell-diff{background:#fdecea !important;box-shadow:inset 0 -2px 0 #b42318}'
+'.kd-cell-partial{background:#fff8e1 !important;box-shadow:inset 0 -2px 0 #f59e0b}'
+'.kd-showbtn{margin-left:6px;font-size:10px;line-height:1.5;border:1px solid #d0d7de;background:#fff;border-radius:10px;padding:1px 8px;cursor:pointer;color:#1254b3;vertical-align:middle;white-space:nowrap}'
+'.kd-showbtn:hover{background:#f0f6ff;border-color:#1254b3}'
+'.kd-status{margin-left:6px;font-size:13px;line-height:1;vertical-align:middle;cursor:default}'
+'.kd-rowpop{background:transparent;border:0;cursor:pointer;font-size:12px;padding:0 4px}'
+'.kd-marks{margin:2px 0;font-size:11px}'
+'.kd-li{margin:1px 0}.kd-li-ok{color:#067647}.kd-li-diff{color:#b42318}'
+'.kd-item{display:inline-block;padding:0 4px;margin:1px 0;border-radius:3px}'
+'.kd-item-ok{background:#e9f7ef;box-shadow:inset 2px 0 0 #067647}'
+'.kd-item-diff{background:#fdecea;box-shadow:inset 2px 0 0 #b42318}'
+'.kd-pop{position:absolute;z-index:2147483647;width:300px;background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.18);padding:10px;font-size:12px}'
+'.kd-pop .kd-offval{margin:6px 0;padding:6px;background:#f6f6f6;border-radius:4px;white-space:pre-line}'
+'.kd-pop .kd-note{white-space:pre-line;margin-top:2px}'
+'.kd-pop .kd-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}'
+'.kd-pop button,.kd-pop a.kd-btn{font-size:11px;padding:4px 8px;border-radius:4px;border:1px solid #ccc;background:#111;color:#fff;text-decoration:none;cursor:pointer}'
+'.kd-pop button.sec{background:#fff;color:#111}'
+'.kd-hl{outline:3px solid #b42318!important;background:#fff3f0!important}');

function ensureUI(){
if(document.getElementById('kd-spec-root'))return;
const root=document.createElement('div'); root.id='kd-spec-root';
root.innerHTML='<button type="button" id="kd-spec-toggle">Сверка v'+SCRIPT_VERSION+'</button><div id="kd-spec-panel"><header><b>Сверка с korting.ru <span style="opacity:.75;font-size:10px;margin-left:6px">v'+SCRIPT_VERSION+'</span></b><span><button type="button" id="kd-run">Запустить</button> <button type="button" id="kd-close">Закрыть</button></span></header><div id="kd-spec-body"><div class="kd-meta">Нажмите «Запустить».</div></div></div>';
document.body.appendChild(root);
document.getElementById('kd-spec-toggle').onclick=()=>document.getElementById('kd-spec-panel').classList.toggle('open');
document.getElementById('kd-close').onclick=()=>document.getElementById('kd-spec-panel').classList.remove('open');
document.getElementById('kd-run').onclick=()=>runNow();
}
function setBody(html){const el=document.getElementById('kd-spec-body'); if(el) el.innerHTML=html;}
let panelPops=[];
function bindPanelPops(){
document.querySelectorAll('#kd-spec-body .kd-rowpop').forEach(b=>{
b.onclick=ev=>{ev.preventDefault(); ev.stopPropagation(); const idx=+b.getAttribute('data-pop'); const p=panelPops[idx]; if(p) showSpecPop(b,p.rec,p.session);};
});
}
function bindAutoCap(){
document.querySelectorAll('#kd-spec-body .kd-autocap').forEach(b=>{
b.onclick=ev=>{ev.preventDefault(); try{const models=JSON.parse(b.getAttribute('data-models')||'[]'); if(models.length) startAutoCapture(models);}catch(e){}};
});
}
function marksHtml(marks){return (marks||[]).map(m=>'<div class="kd-li '+(m.ok?'kd-li-ok':'kd-li-diff')+'">'+(m.ok?'✅':'❌')+' '+escapeHtml(m.text)+'</div>').join('');}

function renderNoMatch(model,title){
const cat=ourCategoryFromPath();
const conf=CATEGORY_MAP[cat];
const catUrl = conf ? (OFFICIAL_ORIGIN+'/catalog/'+conf.slug+'/') : (OFFICIAL_ORIGIN+'/catalog/');
const capBtn=autoCapButton([{model:model||''}],'Авто-захват: открыть в служебном окне');
return '<div class="kd-meta">'+escapeHtml(title||'')+'</div>'
+'<div class="kd-meta">Модель: <b>'+escapeHtml(model||'—')+'</b></div>'
+'<div class="kd-notfound">⚠ <b>Не удалось автоматически найти карточку на korting.ru.</b> Нажмите «Авто-захват» или откройте карточку вручную — скрипт запомнит характеристики.</div>'
+capBtn
+'<div class="kd-meta"><a href="'+escapeHtml(catUrl)+'" target="_blank">Открыть раздел на korting.ru →</a></div>';
}

function renderProductBlock(title,model,url,rows){
const diffs=rows.filter(r=>r.status==='diff'); const part=rows.filter(r=>r.status==='partial'); const ok=rows.filter(r=>r.status==='ok').length;
const only=rows.filter(r=>r.status==='only_ours'||r.status==='only_off').length;
const problem=diffs.concat(part);
const rowsHtml=problem.map(r=>{
const idx=panelPops.length;
panelPops.push({rec:r, session:{url:url}});
const oursCell=r.items?marksHtml(r.items.ours):escapeHtml(r.ours||'—');
const offCell=r.items?marksHtml(r.items.off):escapeHtml(r.offDisplay||r.off||'—');
return '<tr class="'+(r.status==='partial'?'kd-st-partial':'kd-st-diff')+'"><td>'+escapeHtml(r.name)+'</td><td>'+oursCell+'</td><td>'+offCell+'</td><td><button type="button" class="kd-rowpop" data-pop="'+idx+'" title="Открыть попап со значением оф. сайта">'+(r.status==='partial'?'⚠️':'❌')+'</button></td></tr>';
}).join('');
return '<div class="kd-meta">'+escapeHtml(title||'')+'</div>'
+'<div class="kd-meta"><span class="kd-chip">расхожд.: '+diffs.length+'</span><span class="kd-chip">частично: '+part.length+'</span><span class="kd-chip">совпало: '+ok+'</span><span class="kd-chip">только с одной стороны: '+only+'</span></div>'
+'<div class="kd-meta">Модель: <b>'+escapeHtml(model||'')+'</b>'+(url?' · <a href="'+escapeHtml(url)+'" target="_blank">открыть оф. карточку</a>':'')+'</div>'
+'<table class="kd-table"><thead><tr><th>Поле</th><th>У нас</th><th>Оф.</th><th></th></tr></thead><tbody>'+(rowsHtml||'<tr><td colspan="4">Расхождений нет</td></tr>')+'</tbody></table>';
}

function closeKdPop(){document.querySelectorAll('.kd-pop').forEach(n=>n.remove());}
function showSpecPop(anchor,rec,session){
try{
closeKdPop(); const offVal=rec.offDisplay||rec.off||'—';
const offValShown=rec.items?marksHtml(rec.items.off):(String(offVal).includes('\n')?String(offVal).split('\n').map(l=>'• '+l).join('\n'):String(offVal));
const oursBlock=rec.items?'<div>У нас:</div><div class="kd-offval">'+marksHtml(rec.items.ours)+'</div>':'';
const notes=(rec.notes||[]).map(n=>'<div class="kd-note">'+escapeHtml(n)+'</div>').join('');
const jump=session&&session.url?session.url+(session.url.indexOf('?')>=0?'&':'?')+'kd_spec='+encodeURIComponent(rec.id)+'&kd_name='+encodeURIComponent(rec.name):'';
const pop=document.createElement('div'); pop.className='kd-pop';
pop.innerHTML='<b>'+escapeHtml(rec.name)+'</b> '+oursBlock+'<div>На оф. сайте:</div><div class="kd-offval">'+(rec.items?offValShown:escapeHtml(offValShown))+'</div>'+notes+'<div class="kd-actions"><button type="button" class="kd-copy">Копировать</button>'+(jump?'<a class="kd-btn" target="_blank" href="'+escapeHtml(jump)+'">Открыть на оф.</a>':'')+'<button type="button" class="sec kd-close-pop">Закрыть</button></div>';
document.body.appendChild(pop);
const r=anchor.getBoundingClientRect(); pop.style.left=Math.min(innerWidth-320,Math.max(8,r.left+scrollX))+'px'; pop.style.top=(r.bottom+scrollY+6)+'px';
pop.querySelector('.kd-copy').onclick=()=>{copyText(rec.items?rec.items.off.map(m=>m.text).join('; '):offVal); pop.querySelector('.kd-copy').textContent='Скопировано';};
pop.querySelector('.kd-close-pop').onclick=closeKdPop;
}catch(e){}
}
document.addEventListener('click',e=>{if(!e.target.closest('.kd-pop, .kd-showbtn, .kd-rowpop')) closeKdPop();});

function attachStatusAndButton(el,rec,session){
try{
if(!el)return;
el.querySelectorAll('.kd-status,.kd-showbtn').forEach(n=>n.remove());
const target=(el.querySelector('.characteristics__name')||el);
const icon=rec.status==='diff'?'❌':(rec.status==='ok'?'✔️':(rec.status==='partial'?'⚠️':'❕'));
const st=document.createElement('span'); st.className='kd-status'; st.textContent=icon; st.title=rec.status==='diff'?'Расхождение с оф. сайтом':(rec.status==='ok'?'Совпадает с оф. сайтом':(rec.status==='partial'?'Частичное совпадение':'Поле есть только с одной стороны'));
const btn=document.createElement('button'); btn.type='button'; btn.className='kd-showbtn'; btn.textContent='оф. сайт'; btn.title='Показать значение с korting.ru и скопировать';
btn.onclick=ev=>{ev.preventDefault(); ev.stopPropagation(); showSpecPop(btn,rec,session);};
target.appendChild(st); target.appendChild(btn);
}catch(e){}
}
function paintListCell(row, marks){
try{
const valEl=row.querySelector('.characteristics__property'); if(!valEl||!marks||!marks.length) return;
const ul=valEl.querySelector('ul');
if(ul){
const lis=[...ul.querySelectorAll('li')];
if(lis.length===marks.length){ lis.forEach((li,i)=>{ li.classList.add('kd-item', marks[i].ok?'kd-item-ok':'kd-item-diff'); }); return; }
}
const div=document.createElement('div'); div.className='kd-marks'; div.innerHTML=marksHtml(marks);
valEl.parentNode&&valEl.parentNode.insertBefore(div, valEl.nextSibling);
}catch(e){}
}
let lastHL=null, hlObserver=null;
function doHighlight(rows, session){
try{
document.querySelectorAll('.characteristics__row').forEach(row=>{
row.classList.remove('kd-row-diff','kd-row-ok','kd-row-partial');
row.querySelectorAll('.kd-status,.kd-showbtn,.kd-marks').forEach(n=>n.remove());
const valEl=row.querySelector('.characteristics__property');
if(valEl) valEl.querySelectorAll('.kd-item').forEach(sp=>sp.classList.remove('kd-item','kd-item-ok','kd-item-diff'));
});
if(session&&session.found===false) return;
document.querySelectorAll('.characteristics__row').forEach(row=>{
const name=textOf(row.querySelector('.characteristics__name'));
const field=findFieldByName(name);
const rec=rows.find(r=>(field&&r.id===field.id)||normName(r.name)===normName(name));
if(!rec)return;
if(rec.status==='diff') row.classList.add('kd-row-diff');
else if(rec.status==='ok') row.classList.add('kd-row-ok');
else if(rec.status==='partial'){ row.classList.add('kd-row-partial'); paintListCell(row, rec.items?rec.items.ours:null); }
attachStatusAndButton(row,rec,session);
});
}catch(e){}
}
function needsRehighlight(){
const wrap=document.querySelector('.characteristics__wrap');
if(!wrap||!lastHL||!lastHL.rows||!lastHL.rows.length) return false;
return wrap.querySelectorAll('.kd-status').length===0;
}
function highlightProductPage(rows, session){
lastHL={rows,session};
doHighlight(rows,session);
setTimeout(()=>{ if(needsRehighlight()) doHighlight(lastHL.rows,lastHL.session); },1500);
setTimeout(()=>{ if(needsRehighlight()) doHighlight(lastHL.rows,lastHL.session); },4000);
if(!hlObserver&&window.MutationObserver){
hlObserver=new MutationObserver(()=>{ if(needsRehighlight()) doHighlight(lastHL.rows,lastHL.session); });
const target=document.querySelector('.characteristics__wrap')||document.body;
hlObserver.observe(target,{childList:true,subtree:true});
}
}

function highlightCompare(packs){
try{
getCompareRowDom().forEach(r=>{
const field=findFieldByName(r.name);
r.cells.forEach((cell,i)=>{
const pack=packs[i]; if(!pack) return;
cell.querySelectorAll('.kd-status,.kd-showbtn,.kd-marks').forEach(n=>n.remove());
cell.classList.remove('kd-cell-ok','kd-cell-diff','kd-cell-partial');
if(pack.session&&pack.session.found===false) return;
const rec=pack.rows.find(x=>(field&&x.id===field.id)||normName(x.name)===normName(r.name));
if(!rec) return;
if(rec.status==='diff') cell.classList.add('kd-cell-diff');
else if(rec.status==='ok') cell.classList.add('kd-cell-ok');
else if(rec.status==='partial'){ cell.classList.add('kd-cell-partial'); if(rec.items){ const div=document.createElement('div'); div.className='kd-marks'; div.innerHTML=marksHtml(rec.items.ours); cell.appendChild(div); } }
const st=document.createElement('span'); st.className='kd-status'; st.textContent=rec.status==='diff'?'❌':(rec.status==='ok'?'✔️':(rec.status==='partial'?'⚠️':'')); st.title=rec.status==='diff'?'Расхождение с оф. сайтом':(rec.status==='ok'?'Совпадает с оф. сайтом':'Поле есть только с одной стороны');
const btn=document.createElement('button'); btn.type='button'; btn.className='kd-showbtn'; btn.textContent='оф. сайт'; btn.title='Показать значение с korting.ru и скопировать';
btn.onclick=ev=>{ev.preventDefault(); ev.stopPropagation(); showSpecPop(btn,rec,pack.session);};
cell.appendChild(st); cell.appendChild(btn);
});
});
}catch(e){}
}

function isOursProductPage(){return !!document.querySelector('.characteristics__wrap') && /korting-dealer\.ru$/.test(location.hostname.replace(/^www\./,''));}
function isComparePage(){return /\/compare\//.test(location.pathname) && /korting-dealer\.ru$/.test(location.hostname.replace(/^www\./,''));}
function isOfficialProductPage(){return /korting\.ru$/.test(location.hostname.replace(/^www\./,'')) && /\/catalog\//.test(location.pathname) && !!document.querySelector('.table__row');}

function updateToggle(rows,waiting){
const t=document.getElementById('kd-spec-toggle'); if(!t)return;
if(waiting){t.className='wait'; t.textContent='Сверка: ищу карточку… v'+SCRIPT_VERSION; return;}
const d=rows.filter(r=>r.status==='diff').length;
const p=rows.filter(r=>r.status==='partial').length;
t.classList.toggle('diff',d>0);
t.classList.toggle('wait',d===0&&p>0);
t.classList.toggle('ok',d===0&&p===0&&rows.some(r=>r.status==='ok'));
const parts=[]; if(d) parts.push(d+' расхожд.'); if(p) parts.push(p+' частич.');
t.textContent=(parts.length?'Сверка: '+parts.join(', '):'Сверка: совпало')+' v'+SCRIPT_VERSION;
}

async function runOurProduct(){
const title=textOf(document.querySelector('h1'))||document.title;
const model=extractModel(title)||extractModel(location.pathname);
const ours=parseOursDocument(document);
const cat=ourCategoryFromPath();
if(!model){ setBody('<div class="kd-meta">Не удалось определить модель товара из заголовка/URL.</div>'); return; }
updateToggle([],true);
const onProgress = msg=>setBody('<div class="kd-meta">Модель: <b>'+escapeHtml(model)+'</b>. '+escapeHtml(msg)+'</div>');
let result=await loadOfficialByGuessing(model, cat, onProgress);
if(!result.ok) result=await loadOfficialBySearch(model, onProgress);
if(!result.ok){ setBody(renderNoMatch(model,title)); updateToggle([],true); bindAutoCap(); highlightProductPage([],{found:false}); return; }
const rows=compareSpecs(ours, result.specs);
panelPops=[];
highlightProductPage(rows, {url:result.url, found:true});
setBody(renderProductBlock(title,model,result.url,rows)); bindPanelPops(); bindAutoCap();
updateToggle(rows,false);
}

async function runCompare(){
setBody('<div class="kd-meta">Ищу товары на странице сравнения…</div>');
const items=await waitCompareItems();
if(!items.length){setBody('<div class="kd-meta">Товары не найдены на странице сравнения.</div>'); return;}
const blocks=[], packs=[]; let any=0, partAny=0, notFoundCount=0;
const missingModels=[];
panelPops=[];
for(let i=0;i<items.length;i++){
const item=items[i];
setBody('<div class="kd-meta">Проверяю '+(i+1)+'/'+items.length+': <b>'+escapeHtml(item.model||item.title)+'</b>… Запрашиваю korting.ru…</div>');
let result=await loadOfficialByGuessing(item.model, ourCategoryFromPath(), null);
if(!result.ok) result=await loadOfficialBySearch(item.model, null);
result.found = !!result.ok && Object.keys(result.specs||{}).length>0;
if(!result.found){ notFoundCount++; missingModels.push({model:item.model}); }
const rows=compareSpecs(item.specs||{},result.specs||{});
any+=rows.filter(r=>r.status==='diff').length;
partAny+=rows.filter(r=>r.status==='partial').length;
packs.push({item,rows,session:{url:result.url,specs:result.specs||{},model:item.model,found:result.found}});
blocks.push(renderProductBlock(item.title,item.model,result.url,rows));
}
if(missingModels.length){
blocks.unshift('<div class="kd-meta">🤖 Не найдены автоматически: '+missingModels.map(m=>escapeHtml(m.model)).join(', ')+'. '+autoCapButton(missingModels,'Авто-захват всех ненайденных ('+missingModels.length+')')+'</div>');
}
highlightCompare(packs); setBody(blocks.join('')); bindPanelPops(); bindAutoCap();
const t=document.getElementById('kd-spec-toggle');
t.classList.remove('wait');
t.classList.toggle('diff',any>0);
t.classList.toggle('wait',any===0&&partAny>0);
t.classList.toggle('ok',any===0&&partAny===0&&notFoundCount===0);
const parts=[]; if(any) parts.push(any+' расхожд.'); if(partAny) parts.push(partAny+' частич.'); if(notFoundCount) parts.push(notFoundCount+' не найдено');
t.textContent=(parts.length?'Сверка: '+parts.join(', '):'Сверка: совпало')+' v'+SCRIPT_VERSION;
}

function highlightOfficialTarget(){
try{
const fieldId=new URL(location.href).searchParams.get('kd_spec')||'';
const want=new URL(location.href).searchParams.get('kd_name')||'';
const field=SPEC_FIELDS.find(f=>f.id===fieldId);
const names=[]; if(want) names.push(want); if(field) names.push(...field.namesOff,...field.namesOurs);
if(!names.length) return;
const nodes=[...document.querySelectorAll('tr.table__row')];
const hit=nodes.find(el=>names.some(n=>normName(el.textContent).indexOf(normName(n))!==-1));
if(hit){hit.classList.add('kd-hl'); hit.scrollIntoView({block:'center',behavior:'smooth'});}
}catch(e){}
}
function saveOfficialSpecsIfPresent(){
const parsed=parseOfficialDocument(document);
if(!Object.keys(parsed.specs).length) return;
const model=extractModel(parsed.title)||extractModel(location.pathname);
if(!model) return;
writeCache(model, {specs:parsed.specs, url: location.href.split('?')[0]});
let el=document.getElementById('kd-off-badge');
if(!el){ el=document.createElement('div'); el.id='kd-off-badge'; el.style.cssText='position:fixed;right:16px;bottom:16px;z-index:2147483646;font-family:Arial,sans-serif;background:#067647;color:#fff;border-radius:18px;padding:7px 12px;font-size:12px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.18)'; document.body.appendChild(el); }
el.textContent='Сверка: характеристики сохранены ('+model+')';
highlightOfficialTarget();
}
async function runNow(){
const panel=document.getElementById('kd-spec-panel'); if(panel) panel.classList.add('open');
if(isComparePage()) await runCompare();
else if(isOursProductPage()) await runOurProduct();
else setBody('<div class="kd-meta">Откройте карточку товара или страницу сравнения на korting-dealer.ru</div>');
}
function init(){
if(isOfficialProductPage()){ saveOfficialSpecsIfPresent(); workerTick(); return; }
if(!isOursProductPage()&&!isComparePage()) return;
ensureUI(); registerJobListener();
try{GM_registerMenuCommand('Сверить с korting.ru', runNow);}catch(e){}
runNow();
}
init();
})();
