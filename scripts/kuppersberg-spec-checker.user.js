// ==UserScript==
// @name         Kuppersberg: сверка характеристик (russia ↔ official)
// @namespace    kuppers-russia.spec-checker
// @version      1.7.4
// @description  Сверяет характеристики kuppers-russia.ru с kuppersberg.ru. Исправлен поиск моделей вытяжек: F 603 W, INLINEA 52 Inox и т.п.
// @author       internal
// @updateURL    https://lintervil.github.io/price-tools/scripts/kuppersberg-spec-checker.user.js
// @downloadURL  https://lintervil.github.io/price-tools/scripts/kuppersberg-spec-checker.user.js
// @match        https://kuppers-russia.ru/*
// @match        https://www.kuppers-russia.ru/*
// @match        https://kuppersberg.ru/*
// @match        https://www.kuppersberg.ru/*
// @connect      kuppersberg.ru
// @connect      www.kuppersberg.ru
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

const SCRIPT_VERSION = '1.7.4';
const OFFICIAL_ORIGIN = 'https://kuppersberg.ru';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const GM_FETCH_TIMEOUT = 12000;
const OVERALL_TIMEOUT = 60000;
const JOB_KEY = 'kb_job';

const F = (id, ours, off) => ({ id, namesOurs: ours, namesOff: off || ours });

const SPEC_FIELDS = [
F('type', ['Тип'], ['Тип посудомоечной машины', 'Тип', 'Тип нагрева', 'Тип вытяжки', 'Тип микроволновой печи']),
F('fridge_kind', ['Тип товара', 'Тип холодильника'], ['Отдельностоящий холодильник', 'Тип холодильника']),
F('width', ['Ширина, см']), F('height', ['Высота, см']), F('depth', ['Глубина, см']),
F('niche', ['Габариты ниши для встраивания  (В х Ш х Г), см', 'Габариты ниши для встраивания (В х Ш х Г), см', 'Габариты ниши для встраивания (Ш х Г), см'], ['Размер ниши для встраивания (ВхШхГ), мм', 'Размер ниши для встраивания (ШхГ), мм', 'Размеры ниши для встраивания  (ШхГ)']),
F('warranty', ['Гарантия, мес']), F('country', ['Страна производства']), F('collection', ['Коллекция']),
F('engine', ['Двигатель'], ['Двигатель', 'Инверторный мотор']),
F('capacity', ['Вместимость (комплектов посуды)', 'Количество комплектов посуды', 'Вместимость, комплектов посуды'], ['Количество комплектов посуды', 'Загрузка (комплектов посуды)']),
F('baskets', ['Количество корзин']), F('three_baskets', ['Три корзины']),
F('energy_class', ['Класс энергопотребления']), F('wash_class', ['Класс мытья'], ['Класс мойки', 'Класс мытья']), F('dry_class', ['Класс сушки']),
F('programs_count', ['Количество стандартных программ', 'Количество программ'], ['Количество программ']),
F('control_type', ['Тип управления', 'Управление'], ['Управление', 'Тип управления']),
F('display', ['Дисплей'], ['Дисплей', 'Цвет дисплея', 'LED дисплей', 'LED-дисплей']),
F('leak', ['Защита от протечек'], ['Защита от протечек', 'Защита от протечек «Aqua Stop»']),
F('voltage', ['Напряжение, В']), F('freq', ['Частота тока, Гц', 'Частота, Гц']),
F('power', ['Мощность подключения, кВт'], ['Мощность подключения', 'Мощность подключения, кВт']),
F('water', ['Расход воды на цикл, л', 'Потребление воды, л'], ['Потребление воды, л']),
F('noise', ['Уровень шума, дБ']), F('weight', ['Вес брутто, кг']),
F('pack_h', ['Высота упаковки, см']), F('pack_w', ['Ширина упаковки, см']), F('pack_d', ['Глубина упаковки, см']),
F('sku', ['Артикул']),
F('cutlery_basket', ['Корзина для столовых приборов']),
F('mid_basket_adj', ['Регулируемая по высоте средняя корзина', 'Регулируемая по высоте верхняя корзина'], ['Регулируемая по высоте средняя корзина']),
F('cord', ['Длина сетевого шнура', 'Длина сетевого шнура, см'], ['Длина сетевого шнура']),
F('salt_funnel', ['Воронка для соли']), F('mount_kit', ['Монтажный комплект']), F('hoses', ['Шланг заливной/сливной']),
F('panel_color', ['Цвет панели управления'], ['Цвет панели управления', 'Панель управления']),
F('energy_cycle', ['Энергопотребление, кВт/цикл', 'Расход электроэнергии за цикл, кВт/час'], ['Потребление электроэнергии, кВт/ч', 'Потребляемая энергия за цикл (стирка/сушка), (кВт⋅ч)']),
F('delay_start', ['Мин/макс. время отсрочки запуска, ч', 'Отложенный старт', 'Таймер отсрочки запуска'], ['Отсрочка старта, ч', 'Отложенный старт (ч)']),
F('dw_inner_light', ['Внутренняя подсветка', 'Освещение барабана'], ['Внутренняя LED-подсветка', 'Внутреннее освещение']),
F('self_diag', ['Электронная самодиагностика'], ['Самодиагностика неисправностей']),
F('all_in_1', ['Функция «Все-в-1»', 'Все-в-1', 'Возможность использования таблеток All in 1'], ['Использование средств 3 в 1']),
F('half_load', ['Режим половинной загрузки'], ['Загрузка 1/2']),
F('ind_salt_rinse', ['Индикатор наличия ополаскивателя', 'Индикатор наличия соли'], ['Индикатор отсутствия соли и ополаскивателя']),
F('beam_floor', ['Индикатор «Луч на полу»', 'Луч на полу'], ['Луч на полу']),
F('auto_open_door', ['Автоматическое открывание двери'], ['Автоматическое открывание двери']),
F('prog_eco', ['Эко', 'Экономная (Эко)'], ['ECO', 'Эко']),
F('prog_intensive', ['Интенсивная, 65-70°С', 'Интенсивная'], ['Интенсивная']),
F('prog_quick', ['Быстрая, 35-50°С', 'Быстрая мойка', 'Быстрая'], ['Быстрая']),
F('prog_normal', ['Нормальная'], ['Нормальная', 'Универсальная']),
F('prog_glass', ['Стекло'], ['Стекло']),
F('prog_90', ['90 минут'], ['90 мин']),
F('prog_auto', ['Автоматическая, 45-65°С', 'Автоматическая', 'Стандартная'], ['Авто']),
F('burners_total', ['Общее количество конфорок'], ['Общее количество конфорок', 'Количество конфорок']),
F('burners_gas', ['Количество газовых конфорок']),
F('burners_induction', ['Количество индукционных конфорок']),
F('burners_hilight', ['Количество конфорок Hi-light', 'Количество конфорок Hi-Light']),
F('burner_kind', ['Виды конфорок'], ['Тип конфорок', 'Виды конфорок']),
F('power_electric', ['Общая электрическая мощность, кВт'], ['Мощность подключения, кВт', 'Общая электрическая мощность, кВт']),
F('power_gas', ['Общая газовая мощность, кВт']),
F('burner_front', ['Ближняя, кВт'], ['Мощность конфорок, кВт: передняя']),
F('burner_rear', ['Дальняя, кВт'], ['Мощность конфорок, кВт: задняя']),
F('burner_left_front', ['Ближняя левая, кВт', 'Передняя левая, кВт'], ['Мощность конфорок, кВт: передняя левая']),
F('burner_right_front', ['Ближняя правая, кВт', 'Передняя правая, кВт'], ['Мощность конфорок, кВт: передняя правая']),
F('burner_left_rear', ['Дальняя левая, кВт', 'Задняя левая, кВт'], ['Мощность конфорок, кВт: задняя левая']),
F('burner_right_rear', ['Дальняя правая, кВт', 'Задняя правая, кВт'], ['Мощность конфорок, кВт: задняя правая']),
F('zone_front_mm', ['Ближняя, мм'], ['Диаметр зон, мм. передняя']),
F('zone_rear_mm', ['Дальняя, мм'], ['Диаметр зон, мм. задняя']),
F('zone_fl_mm', ['Ближняя левая, мм'], ['Диаметр зон, мм. передняя левая']),
F('zone_fr_mm', ['Ближняя правая, мм'], ['Диаметр зон, мм. передняя правая']),
F('zone_rl_mm', ['Дальняя левая, мм'], ['Диаметр зон, мм. задняя левая']),
F('zone_rr_mm', ['Дальняя правая, мм'], ['Диаметр зон, мм. задняя правая']),
F('ignition', ['Электроподжиг'], ['Автоматический электроподжиг', 'Электроподжиг']),
F('lpg_jets', ['Форсунки под сжиженный газ']),
F('construction', ['Конструкция']), F('color', ['Цвет']),
F('fittings', ['Фурнитура'], ['Цвет фурнитуры', 'Фурнитура']),
F('hob_surface', ['Панель конфорок'], ['Стеклокерамика']),
F('grates', ['Материал решеток']),
F('gas_control', ['Газ-контроль'], ['Газ-контроль конфорок', 'Газ-контроль']),
F('wok', ['Конфорка WOK', 'Конфорка Wok']),
F('power_levels', ['Количество режимов мощности', 'Уровней мощности, шт.'], ['Количество уровней мощности', 'Уровни мощности']),
F('heat_type', ['Тип нагрева'], ['Тип нагрева', 'Технологии']),
F('pan_detect', ['Функция распознавания посуды']),
F('timer', ['Таймер']), F('booster', ['Функция Booster'], ['Booster']),
F('stop_go', ['Функция Stop & Go', 'Функция Stop &Go'], ['Stop and Go', 'Stop & Go']),
F('auto_off', ['Автоматическое выключение'], ['Автоматическое отключение', 'Автоматическое выключение']),
F('heat_indicator', ['Индикатор остаточного тепла'], ['Индикаторы остаточного тепла', 'Индикатор остаточного тепла', 'Индиктор остаточного тепла']),
F('child_lock', ['Защита от детей'], ['Блокировка панели управления', 'Защита от детей', 'Кнопка блокировки панели']),
F('overheat', ['Отключение при перегреве']),
F('flush_install', ['Установка вровень со столешницей']),
F('design_edges', ['Окантовка'], ['Особенности дизайна', 'Окантовка']),
F('plug', ['Наличие вилки']),
F('complect', ['Комплектация']),
F('hood_install', ['Монтаж'], ['Тип вытяжки']),
F('hood_speeds', ['Количество скоростей'], ['Количество скоростей']),
F('hood_perf_max', ['Максимальная производительность, м3/ч'], ['Максимальная производительность, м3/ч']),
F('hood_perf_exhaust', ['Производительность в режиме отвода'], ['Производительность в режиме отвода, м3/ч']),
F('hood_perf_recirc', ['Производительность в режиме рециркуляции'], ['Производительность в режиме рециркуляции, м3/ч']),
F('hood_mode', ['Режимы работы'], ['Режим работы']),
F('hood_duct_d', ['Диаметр воздуховода, см'], ['Диаметр воздуховода']),
F('hood_backflow', ['Обратный клапан']),
F('hood_grease_cnt', ['Количество жировых фильтров']),
F('hood_motor_cnt', ['Количество двигателей']),
F('hood_light', ['Освещение']),
F('hood_light_cnt', ['Количество ламп освещения'], ['Количество ламп освещения']),
F('hood_light_w', ['Мощность лампы, Вт', 'Мощность лампы освещения, Вт'], ['Мощность освещения, Вт']),
F('hood_charcoal', ['Угольный фильтр'], ['Угольный фильтр', 'Фильтр']),
F('hood_switches', ['Переключатели']),
F('oven_volume', ['Объем, л'], ['Объем духового шкафа, л']),
F('oven_temp_max', ['Максимальная температура, °C'], ['Максимальная температура, °C']),
F('oven_modes', ['Число режимов работы', 'Количество режимов'], ['Количество режимов', 'Количество режимов работы']),
F('oven_clean', ['Тип очистки'], ['Очистка духовки']),
F('oven_convection', ['Традиционный нагрев с конвекцией'], ['Традиционный нагрев с конвекцией']),
F('oven_heat_trad', ['Традиционный нагрев'], ['Традиционный нагрев']),
F('oven_heat_bottom', ['Нижний нагрев'], ['Нижний нагрев']),
F('oven_grill_maxi', ['Макси-гриль', 'Макси-Гриль'], ['Макси-Гриль']),
F('oven_grill_maxi_conv', ['Макси-гриль с конвекцией', 'Макси-Гриль с конвекцией'], ['Макси-Гриль с конвекцией']),
F('oven_grill_turbo', ['Гриль с турбовентилятором'], ['Гриль с турбовентилятором']),
F('oven_defrost', ['Разморозка'], ['Разморозка']),
F('oven_preheat', ['Предварительный разогрев'], ['Предварительный разогрев']),
F('oven_light', ['Освещение']),
F('oven_cool_fan', ['Вентилятор охлаждения']),
F('oven_door_glass', ['Количество стекол дверцы'], ['Количество стекол дверцы']),
F('oven_door_closer', ['Доводчик двери']),
F('oven_door_remove', ['Съемная дверца духового шкафа'], ['Съемная дверца духового шкафа']),
F('oven_glass_remove', ['Съемное внутреннее стекло'], ['Съемное внутреннее стекло']),
F('oven_tele_rails', ['Телескопические направляющие'], ['Телескопические направляющие']),
F('oven_rails', ['Направляющие для противней'], ['Направляющие для противней']),
F('oven_switcher', ['Переключатели']),
F('mw_volume', ['Объем, л'], ['Объем камеры, л']),
F('mw_power', ['Мощность микроволн, Вт'], ['Мощность микроволн, Вт']),
F('mw_power_levels', ['Уровней мощности, шт.'], ['Уровни мощности']),
F('mw_turntable', ['Поворотный стол'], ['Поворотный стол']),
F('mw_defrost', ['Размораживание'], ['Размораживание']),
F('mw_interior', ['Внутренняя поверхность камеры', 'Эмаль легкой очистки'], ['Внутренняя поверхность камеры']),
F('mw_panel', ['Панель управления'], ['Панель управления']),
F('mw_switches', ['Переключатели']),
F('cm_cappuccinator', ['Капучинатор', 'Вид капучинатора'], ['Вид капучинатора', 'Капучинатор']),
F('cm_drinks', ['Количество программ', 'Количество напитков'], ['Количество напитков']),
F('cm_grinder', ['Тип кофемолки'], ['Тип кофемолки']),
F('cm_coffee_type', ['Тип используемого кофе'], ['Тип используемого кофе']),
F('cm_bean_container', ['Объем контейнера для зерен, гр.'], ['Объем контейнера для зерен, гр.']),
F('cm_water_tank', ['Объём емкости для воды, л'], ['Объём емкости для воды, л']),
F('cm_grind_steps', ['Количество степеней помола'], ['Количество степеней помола']),
F('cm_burr_material', ['Материал жерновов'], ['Материал жерновов']),
F('cm_pressure', ['Максимальное давление, бар'], ['Максимальное давление, бар']),
F('cm_heater', ['Тип нагревателя'], ['Тип нагревателя']),
F('cm_strength', ['Регулировка крепости кофе'], ['Регулировка крепости кофе']),
F('cm_temp', ['Регулировка температуры напитка'], ['Регулировка температуры напитка']),
F('cm_height_adj', ['Регулировка высоты блока', 'Регулировка высоты блока подачи кофе'], ['Регулировка высоты блока подачи кофе']),
F('cm_descale', ['Автоматическая программа удаления накипи'], ['Автоматическая программа удаления накипи']),
F('cm_clean_brew', ['Автоматическая очистка заварочного блока'], ['Автоматическая очистка заварочного блока']),
F('cm_rinse', ['Функция промывки'], ['Функция промывки']),
F('cm_tele_rail', ['Телескопические направляющие'], ['Телескопические направляющие']),
F('cm_clock', ['Часы']),
F('cm_milk_cont', ['Контейнер для молока'], ['Контейнер для молока']),
F('cm_backlight', ['Подсветка']),
F('cm_display', ['Дисплей'], ['Дисплей']),
F('cm_display_type', ['Тип дисплея'], ['Тип дисплея']),
F('cm_power_w', ['Мощность, Вт', 'Мощность подключения, кВт'], ['Максимальная мощность, Вт']),
F('cm_espresso', ['Эспрессо']),
F('cm_cappuccino', ['Капучино']),
F('cm_latte', ['Латте']),
F('cm_black', ['Черный кофе']),
F('cm_hot_water', ['Горячая вода']),
F('cm_hot_milk', ['Горячее молоко'], ['Горячие сливки']),
F('cm_milk_foam', ['Молочная пена']),
F('cm_auto_on', ['Автоматическое включение'], ['Автоматическое включение']),
F('cm_water_filter', ['Фильтр для воды']),
F('fridge_total_vol', ['Полезный объем, л', 'Общий объем, л'], ['Общий/полезный объем, л', 'Объем, л', 'Полезный объем, л']),
F('fridge_cool_vol', ['Объем, л', 'Объем холодильной камеры, л'], ['Объем холодильной камеры, л']),
F('fridge_freeze_vol', ['Объем, л [Морозильное отделение]', 'Полезный объем морозильной камеры, л'], ['Полезный объем морозильной камеры, л']),
F('fridge_doors', ['Количество дверей']),
F('fridge_climate', ['Климатический класс']),
F('fridge_energy_year', ['Годовой расход электроэнергии, кВт ч']),
F('fridge_compressors', ['Количество компрессоров'], ['Количество компрессоров']),
F('fridge_inverter', ['Инверторный компрессор'], ['Тип компрессора']),
F('fridge_light', ['Освещение'], ['Светодиодное освещение камеры', 'Освещение', 'Светодиодное освещение']),
F('fridge_no_frost', ['Система разморозки', 'Система размораживания', 'Система размораживания морозильного отделения'], ['Разморозка']),
F('fridge_frost_free', ['Без инея и наледи (Frost Free)', 'Frost Free'], ['Total No Frost']),
F('fridge_super_cool', ['Суперохлаждение'], ['Супер охлаждение', 'Суперохлаждение']),
F('fridge_antibact', ['Антибактериальный пластик']),
F('fridge_shelves_glass', ['Общее количество полок'], ['Количество стеклянных полок']),
F('fridge_shelves_adj', ['Количество регулируемых полок'], ['Полки регулируемые по высоте']),
F('fridge_door_shelves', ['Количество полок на дверце'], ['Навесные дверные полки']),
F('fridge_vegbox', ['Отсек для овощей', 'Ящик для овощей и фруктов'], ['Отсек для овощей']),
F('fridge_egg_tray', ['Подставка для яиц', 'Лоток для яиц'], ['Полка для яиц']),
F('fridge_ice_tray', ['Лоток для приготовления кубиков льда'], ['Емкость для льда', 'Лоток для льда']),
F('fridge_freeze_drawers', ['Количество ящиков'], ['Выдвижные ящики']),
F('fridge_reversible_door', ['Перенавешиваемые двери']),
F('fridge_freeze_shelves', ['Полки для заморозки']),
F('fridge_freeze_pos', ['Расположение'], ['Расположение морозильной камеры']),
F('fridge_freeze_perf', ['Производительность, кг/сутки'], ['Производительность, кг/сутки', 'Мощность замораживания', 'Мощность замораживания, кг/сутки']),
F('fridge_store_off', ['Хранение при отключении питания, ч'], ['Хранение при отключении питания, ч']),
];

const DIM_FIELD_IDS = new Set(['width','height','depth','niche','pack_h','pack_w','pack_d']);
const KEEP_MM_IDS = new Set(['zone_front_mm','zone_rear_mm','zone_fl_mm','zone_fr_mm','zone_rl_mm','zone_rr_mm']);
const POWER_PAIR_IDS = new Set(['burner_front','burner_rear','burner_left_front','burner_right_front','burner_left_rear','burner_right_rear','power_electric','power']);
const CLASS_FIELD_IDS = new Set(['energy_class','wash_class','dry_class']);
const MM_NAME_RE = /мм|mm/i;

const STOP_TAIL = /^(https?|www|ru|com|net|org|catalog|katalog|products?|compare|search|kuppersberg|kuppers|russia|dukhovye|shkafy|varochnye|vytyazhki|kholodilniki|stiralnye|sushilnye|posudomoechnye|mikrovolnovye|kofemashiny|vinnye|morozilnye|shop|cart|item)$/i;

const VALUE_ALIASES = {
'*': {
'да': ['да','есть','yes','+','да.','есть.'],
'нет': ['нет','отсутствует','no','—','-','нет.','отсутствует.']
},
type: {
'газовая': ['газовая'],
'индукционная': ['индукционная','индукционный'],
'электрическая': ['электрическая','hi-light','hilight'],
'hi-light': ['hi-light','hilight','hi light','электрическая'],
'встраиваемая': ['встраиваемая','полностью встраиваемая'],
'отдельностоящая': ['отдельностоящая','отдельностоящий']
},
construction: { 'домино': ['домино','«домино»','domino'] },
country: { 'китай': ['китай','китай*'], 'турция': ['турция','турция*'], 'беларусь': ['беларусь','беларусь*','белоруссия'] },
collection: {
'high-tech': ['high-tech','hi-tech','hightech','хай-тек','современный дизайн','современный'],
'classic': ['classic','классический дизайн','классический','классика'],
'country': ['country','кантри','деревенский'],
'retro': ['retro','ретро']
},
control_type: {
'сенсорное': ['сенсорное','сенсорные','сенсорный','сенсорное управление','сенсорные панели','сенсорная панель','touch','slidertouch','сенсорный слайдер slidertouch','сенсорный слайдер','слайдер'],
'механическое': ['механическое','поворотные переключатели','поворотные регуляторы','утапливаемые переключатели','утапливаемые регуляторы','поворотные','ручки'],
'кнопочное': ['кнопочное','кнопки'],
'электронное': ['электронное','электронное управление']
},
heat_type: { 'hi-light': ['hi-light','hilight'], 'индукционный': ['индукционный','инверторный','inverter'], 'инверторный': ['инверторный','inverter','индукционный'] },
hob_surface: { 'стеклокерамика': ['стеклокерамика','kanger','стеклокерамика kanger','стеклокерамика: kanger'] },
timer: { 'да': ['да','есть','с отключением'] },
design_edges: { 'прямой край': ['прямой край','прямые края','прямая кромка','прямые кромки'] },
color: {
'черный': ['черный','чёрный','черные','чёрные','черная','чёрная','черное','чёрное','черное стекло','антрацит','black'],
'белый': ['белый','белое','белая','слоновая кость','white'],
'серебристый': ['серебристый','inox','нержавеющая сталь','нерж. сталь','сталь','платина','серебро','silver']
},
fittings: { 'черный': ['черный','чёрный','черная','чёрная'] },
burner_kind: { 'sabaf': ['sabaf','chinese sabaf'] },
hood_install: { 'встраиваемая': ['встраиваемая','в подвесной шкаф'] },
hood_mode: { 'отвод/рециркуляция': ['отвод / рециркуляция','отвод воздуха / рециркуляция','отвод/рециркуляция'] },
oven_clean: { 'гидролизная': ['гидролизная','гидролизная очистка'], 'каталитическая': ['каталитическая','каталитическая очистка'] },
mw_switches: { 'поворотные': ['поворотные','поворотный переключатель'] },
fridge_light: { 'да': ['светодиодные лампы','светодиодное освещение камеры','да','есть','led'] },
fridge_climate: { 'st/n': ['st / n','st/n','st-n','n/st','n-st'], 'sn-t': ['sn-t','sn / t','sn/t','sn t'] },
fridge_reversible_door: { 'да': ['да','есть','да (выполняется мастером асц)'] }
};

function normName(s){return String(s||'').replace(/[«»"']/g,'').replace(/\s+/g,' ').replace(/ё/g,'е').trim().toLowerCase();}
function stripDecor(s){return String(s||'').replace(/[«»"']/g,'').replace(/\s+/g,' ').trim();}
function latinizeClass(s){const m={А:'A',В:'B',С:'C',Е:'E',а:'A',е:'E'};return String(s||'').replace(/[АВСЕае]/g,c=>m[c]||c);}
function parseFlexibleNumber(s){const m=String(s||'').replace(',','.').match(/-?\d+(?:.\d+)?/);return m?Number(m[0]):null;}
function parseAllNumbers(s){const m=String(s||'').replace(/,/g,'.').match(/\d+(?:.\d+)?/g);return m?m.map(Number):[];}
function getByNames(map, names){for(const n of names){if(map[n]!=null&&map[n]!=='')return map[n];const hit=Object.keys(map).find(k=>normName(k)===normName(n));if(hit)return map[hit];}return null;}
function findFieldByName(name){return SPEC_FIELDS.find(f=>f.namesOurs.concat(f.namesOff).some(n=>normName(n)===normName(name)));}
function textOf(el){if(!el)return '';const c=el.cloneNode(true);c.querySelectorAll('.glossary-tooltip,.k-tooltip,script,style,svg').forEach(n=>n.remove());return c.textContent.replace(/\s+/g,' ').trim();}
function parseDimParts(raw, hint){const s=String(raw||'');const nums=(s.match(/\d+(?:[.,]\d+)?/g)||[]).map(n=>Number(String(n).replace(',','.')));const mm=MM_NAME_RE.test(hint||'')||MM_NAME_RE.test(s)||nums.some(n=>n>=200);return nums.map(n=>mm?Math.round(n)/10:n);}
function formatDimsRuCm(raw,hint){return parseDimParts(raw,hint).map(String).join(' х ');}
function dimsNumericEqual(a,an,b,bn){const pa=parseDimParts(a,an),pb=parseDimParts(b,bn);if(!pa.length||pa.length!==pb.length)return false;return pa.every((n,i)=>Math.abs(n-pb[i])<0.051);}
function fieldLooksDim(field,raw){if(field&&DIM_FIELD_IDS.has(field.id))return true;const s=String(raw||'');return /\d\s*[xXхХ×]\s*\d/.test(s);}
function dimSeparatorKind(s){const t=String(s||'');if(/[xX]/.test(t)&&!/[хХ]/.test(t))return 'en';if(/[× ]/.test(t))return 'symbol';if(/[хХ]/.test(t))return 'ru';return '';}

function normValue(raw, fieldId){
let v=stripDecor(raw).toLowerCase().replace(/,/g,'.');
const vn=normName(v).replace(/\s*\/\s*/g,'/');
for(const dict of [VALUE_ALIASES[fieldId]||{}, VALUE_ALIASES['*']||{}]){
for(const [canon,list] of Object.entries(dict)){
if(list.some(x=>normName(x).replace(/\s*\/\s*/g,'/')===vn)) return canon;
}
}
v=v.replace(/\bесть\b/g,'да').replace(/\s\/\s*/g,'/').replace(/\s+/g,' ').trim();
return v;
}

function splitComplectItems(val,rowEl){
if(rowEl){const lis=[...rowEl.querySelectorAll('li')].map(textOf).filter(Boolean); if(lis.length) return lis;}
return String(val||'').replace(/•/g,';').split(/[;\n]+/).map(s=>s.replace(/^[\s-–—]+/,'').trim()).filter(s=>s.length>1);
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

function isYesValue(s){const v=String(s||'').toLowerCase().trim();return /^(да|есть|yes|\+|включено|активно)(\s*,|\s|$)/.test(v);}
function isNoValue(s){const v=String(s||'').toLowerCase().trim();return /^(нет|отсутствует|no|—|-|выключено|неактивно)(\s*,|\s|$)/.test(v);}

function normClimate(v){
return String(v||'').toUpperCase().split(/[\s\/,\-–—]+/).map(s=>s.trim()).filter(Boolean).sort().join('-');
}

function valuesEqual(a,b,fieldId,field,offName){
if(a==null||b==null||a===''||b==='')return null;
if(isYesValue(a)&&isYesValue(b))return true;
if(isNoValue(a)&&isNoValue(b))return true;
if(isYesValue(a)&&isNoValue(b))return false;
if(isNoValue(a)&&isYesValue(b))return false;
if(field&&field.id==='fridge_climate'){
const ca=normClimate(a), cb=normClimate(b);
if(ca&&cb) return ca===cb;
}
if(field&&field.id==='fridge_inverter'){
const obYes=/инвертор|inverter/i.test(String(b));
const obNo=isNoValue(b)||/стандарт|обычн/i.test(String(b));
if(isYesValue(a)) return obYes;
if(isNoValue(a)) return obNo||!obYes;
return null;
}
if(field&&field.id==='fridge_frost_free'){
const aStr=String(a).toLowerCase();
const hasCool=/холодильн/.test(aStr), hasFreeze=/морозильн/.test(aStr);
if(isYesValue(b)) return hasCool&&hasFreeze;
if(isNoValue(b)) return !hasCool&&!hasFreeze;
return null;
}
if(field&&field.id==='engine'&&/инвертор|inverter/i.test(offName||'')){
const oa=/инвертор|inverter/i.test(String(a))?'yes':'no';
const ob=isYesValue(b)?'yes':(isNoValue(b)?'no':null);
if(ob) return oa===ob;
}
if(field&&field.id==='dw_inner_light'){
const oa=/led|да|есть|yes/i.test(String(a));
const ob=isYesValue(b);
return oa===ob;
}
if(field&&field.id==='delay_start'){
const na2=parseAllNumbers(a), nb2=parseAllNumbers(b);
if(na2.length&&nb2.length){
const sa=[na2[0],na2[na2.length-1]], sb=[nb2[0],nb2[nb2.length-1]];
return sa[0]===sb[0]&&sa[sa.length-1]===sb[sb.length-1];
}
}
if(field&&field.id==='control_type'){
const a1=String(a||'').toLowerCase(), b1=String(b||'').toLowerCase();
const isMech=/механическ/.test(a1), isSens=/сенсорн/.test(a1), isElec=/электронн/.test(a1);
if(isMech||isSens||isElec){
const bMech=/механическ/.test(b1), bSens=/сенсорн|touch|слайдер/.test(b1), bElec=/электронн/.test(b1);
const bRotary=/поворотн|регулятор|утапливаем|ручк/.test(b1);
if(isMech) return bMech||bRotary;
if(isSens) return bSens||bElec;
if(isElec) return bElec||bSens;
}
}
if(field&&KEEP_MM_IDS.has(field.id)){const pa=String(a).toLowerCase().replace(/,/g,'.').replace(/мм|mm/g,'').replace(/\s+/g,'');const pb=String(b).toLowerCase().replace(/,/g,'.').replace(/мм|mm/g,'').replace(/\s+/g,'');return pa===pb||Math.abs(Number(pa)-Number(pb))<0.51;}
if(field&&field.id==='niche'){
const splitG=v=>String(v).split(/[xXхХ×]/).map(g=>parseAllNumbers(g)).filter(g=>g.length);
const ga=splitG(a); const gbRaw=splitG(b);
const flat=gbRaw.reduce((acc,g)=>acc.concat(g),[]);
const mm=flat.some(n=>n>=200);
const gb=gbRaw.map(g=>mm?g.map(n=>n/10):g);
if(!ga.length||!gb.length||ga.length!==gb.length) return null;
return ga.every((g,i)=>{
const o=gb[i]?gb[i][0]:null; if(o==null) return false;
if(g.length===1) return Math.abs(g[0]-o)<0.6;
return (o>=g[0]-0.6&&o<=g[1]+0.6)||Math.abs(g[0]-o)<0.6;
});
}
if(field&&!KEEP_MM_IDS.has(field.id)&&(DIM_FIELD_IDS.has(field.id)||fieldLooksDim(field,a)||fieldLooksDim(field,b)))return dimsNumericEqual(a,field.namesOurs[0],b,offName||field.namesOff[0]);
if(field&&CLASS_FIELD_IDS.has(field.id))return latinizeClass(String(a).toUpperCase())===latinizeClass(String(b).toUpperCase());
if(field&&POWER_PAIR_IDS.has(field.id)){const pa=String(a).toLowerCase().replace(/,/g,'.').replace(/квт/g,'').replace(/\s+/g,'');const pb=String(b).toLowerCase().replace(/,/g,'.').replace(/квт/g,'').replace(/\s+/g,'');if(pa===pb)return true;}
if(fieldId==='display'){const da=normValue(a,fieldId),db=normValue(b,fieldId);if((da==='да'&&db&&db!=='нет')||(db==='да'&&da&&da!=='нет'))return true;}
const na=normValue(a,fieldId),nb=normValue(b,fieldId);
if((na==='да'&&String(nb).indexOf('да')===0)||(nb==='да'&&String(na).indexOf('да')===0))return true;
if(na===nb||na.replace(/\s/g,'')===nb.replace(/\s/g,''))return true;
const fa=parseFlexibleNumber(na),fb=parseFlexibleNumber(nb);
if(fa!=null&&fb!=null&&Math.abs(fa-fb)<0.051)return true;
if((na.includes(nb)||nb.includes(na))&&Math.min(na.length,nb.length)>=3)return true;
return false;
}

function formatOfficialDisplay(field,offRaw,offName){
if(offRaw==null||offRaw==='')return {display:'',notes:[]};
const notes=[]; let display=String(offRaw);
if(field&&KEEP_MM_IDS.has(field.id)) display=String(offRaw).replace(/\sмм\s*/i,'').trim()+' мм';
else if(!(field&&KEEP_MM_IDS.has(field.id))&&(DIM_FIELD_IDS.has(field.id)||fieldLooksDim(field,offRaw)||MM_NAME_RE.test(offName||''))){
display=formatDimsRuCm(offRaw,offName||'');
if(MM_NAME_RE.test(offName||'')||/\d{3,}/.test(String(offRaw))) notes.push('на оф. в мм → см: '+display);
}
return {display,notes};
}

function oursFormatNotes(field,oursRaw){
const notes=[];
if(!oursRaw)return notes;
if(fieldLooksDim(field,oursRaw)&&!(field&&KEEP_MM_IDS.has(field.id))){
const k=dimSeparatorKind(oursRaw);
if(k==='en')notes.push('у нас английский x, нужен «х»');
}
return notes;
}

function inferOfficialFromTitle(map, title){
const t=normName(title); const heat=normName(getByNames(map,['Тип нагрева'])||'');
if(!getByNames(map,['Тип'])){
if(/hi[-\s]?light/.test(heat)||/hi[-\s]?light/.test(t)) map['Тип']='Hi-Light';
else if(/индукцион/.test(heat)||/индукцион/.test(t)) map['Тип']='индукционная';
else if(/электрическ/.test(heat)||/электрическ/.test(t)) map['Тип']='электрическая';
else if(/газов/.test(t)||getByNames(map,['Газ-контроль конфорок','Газ-контроль'])) map['Тип']='газовая';
else if(/отдельностоящ/.test(t)) map['Тип']='отдельностоящий';
}
if(/hi[-\s]?light/.test(heat)&&!getByNames(map,['Количество конфорок Hi-light','Количество конфорок Hi-Light'])){
const n=getByNames(map,['Общее количество конфорок','Количество конфорок']); if(n) map['Количество конфорок Hi-Light']=n;
}
const w=parseFlexibleNumber(getByNames(map,['Ширина, см'])||'');
const isDomino=/домино/.test(normName(getByNames(map,['Конструкция'])||''))||/домино/.test(t)||(w!=null&&w>0&&w<=32);
if(isDomino){
if(!getByNames(map,['Конструкция'])) map['Конструкция']='«Домино»';
if(!getByNames(map,['Общее количество конфорок'])) map['Общее количество конфорок']='2';
const typ=normName(getByNames(map,['Тип'])||'');
if((/газов/.test(t)||typ==='газовая')&&!getByNames(map,['Количество газовых конфорок'])) map['Количество газовых конфорок']='2';
if((/индукцион/.test(t)||typ==='индукционная')&&!getByNames(map,['Количество индукционных конфорок'])) map['Количество индукционных конфорок']='2';
}
if(getByNames(map,['Цвет дисплея'])&&!getByNames(map,['Дисплей'])) map['Дисплей']='да';
return map;
}

function enrichOfficial(official, fallbackTitle){
official=official||{}; official.specs=official.specs||{};
if(Object.keys(official.specs).length) inferOfficialFromTitle(official.specs, [official.title, fallbackTitle].filter(Boolean).join(' '));
return official;
}

function expandComplect(map){
const raw=getByNames(map,['Комплектация']); if(!raw) return map;
splitComplectItems(raw).forEach(item=>{ if(map[item]==null) map[item]='да'; });
return map;
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
doc.querySelectorAll('.characteristics__header .characteristics__row').forEach(r=>addRow(r,''));
doc.querySelectorAll('.characteristics__block').forEach(bl=>{
const sec=textOf(bl.querySelector('.characteristics__title-text'));
bl.querySelectorAll('.characteristics__row').forEach(r=>addRow(r,sec));
});
return expandComplect(map);
}

function parseOursCompare(){
const products=[...document.querySelectorAll('.comparison-card.comparison__items-card')].map(card=>{
const a=card.querySelector('a[href*="/catalog/"]');
const title=(a&&(a.getAttribute('title')||a.innerText))||card.innerText;
const href=a?a.href:'';
const model=extractModel(title)||extractModel(href);
return {href:href, title:String(title).replace(/\s+/g,' ').trim(), model:model};
});
const specs=products.map(()=>({}));
document.querySelectorAll('.compare-table-block__row.js-compare-row').forEach(row=>{
const name=textOf(row.querySelector('.js-compare-cell-title')); if(!name) return;
[...row.querySelectorAll('.js-compare-cell:not(.js-compare-cell-title)')].forEach((cell,i)=>{ if(specs[i]) specs[i][name]=textOf(cell); });
});
return products.map((p,i)=>Object.assign({specs:expandComplect(specs[i]||{})},p));
}

function isCloudflare(doc,html){const t=(html||(doc&&doc.body&&doc.body.innerText)||'').toLowerCase(); return t.includes('just a moment')||t.includes('performing security verification');}

function parseLdJson(doc, map){
doc.querySelectorAll('script[type="application/ld+json"]').forEach(sc=>{
try{
const walk=o=>{
if(Array.isArray(o)){ o.forEach(walk); return; }
if(o&&typeof o==='object'){
if(o.additionalProperty) walk(o.additionalProperty);
if(o.properties) walk(o.properties);
if(typeof o.name==='string'&&o.value!=null&&typeof o.value!=='object'){ const n=o.name.trim(); if(n&&map[n]==null) map[n]=String(o.value); }
Object.values(o).forEach(walk);
}
};
walk(JSON.parse(sc.textContent||'null'));
}catch(e){}
});
}

function parseOfficialDocument(doc){
const map={}, features=[];
parseLdJson(doc, map);
doc.querySelectorAll('.prodMain__description__text p').forEach(p=>{
const span=p.querySelector('span'); const name=span?textOf(span).replace(/:$/,''):'';
let val='';
if(span) val=textOf(p).replace(textOf(span),'').replace(/^:/,'').trim();
else { const parts=textOf(p).split(':'); if(parts.length>=2){const n=parts[0].trim(); if(map[n]==null) map[n]=parts.slice(1).join(':').trim(); return;} }
if(name&&map[name]==null) map[name]=val;
});
doc.querySelectorAll('.prodMain table tr, .prodTabs table tr, .prodDesc table tr').forEach(tr=>{
const th=tr.querySelector('th'); const td=tr.querySelector('td');
if(th&&td){ const n=textOf(th).replace(/:$/,''); const v=textOf(td); if(n&&v&&map[n]==null) map[n]=v; return; }
const tds=tr.querySelectorAll('td');
if(tds.length>=2){ const n=textOf(tds[0]).replace(/:$/,''); const v=textOf(tds[1]); if(n&&v&&map[n]==null) map[n]=v; }
});
const complectBits=[];
doc.querySelectorAll('.prodTabs__item__dbl-list').forEach(block=>{
const sec=textOf(block.querySelector('.prodTabs__item__list-title, h3.prodTabs__item__list-title'));
const isC=normName(sec)==='комплектация';
block.querySelectorAll('li').forEach(li=>{
const spans=li.querySelectorAll('span');
if(spans.length>=2){const name=textOf(spans[0]).replace(/\s+/g,' ').trim(); const val=textOf(spans[spans.length-1]); if(name&&map[name]==null) map[name]=val; if(isC&&name) complectBits.push(val&&val!=='да'?name+': '+val:name);}
});
});
if(complectBits.length&&map['Комплектация']==null) map['Комплектация']=complectBits.join('; ');
doc.querySelectorAll('.prodDesc__icons__item').forEach(item=>{const name=textOf(item.querySelector('.prodDesc__icons__name'))||(item.querySelector('img')||{}).alt||''; if(name&&map[name]==null) map[name]='да';});
const title=textOf(doc.querySelector('h1.prodMain__name, h1'))||doc.title;
return {blocked:false, specs:map, features, title};
}

function parseOfficialHtml(html){const doc=new DOMParser().parseFromString(html,'text/html'); if(isCloudflare(doc,html)) return {blocked:true,specs:{},title:''}; return parseOfficialDocument(doc);}

function extractModel(text){
const s=String(text||'').replace(/https?:\/\/[^\s]+/gi,' ');
const re=/\b([A-Z]{1,12})[-_ ]?(\d{1,5})\b((?:[\s-]+[A-Za-z]{1,12}){0,3})/g;
let best='', m;
while((m=re.exec(s))){
const tail=(m[3]||'').trim().split(/[\s-]+/).filter(t=>/^[A-Za-z]{1,12}$/.test(t)&&!STOP_TAIL.test(t)&&!/kuppersberg/i.test(t)).slice(0,3).join(' ');
const cand=((m[1]+' '+m[2]).toUpperCase()+(tail?' '+tail:'')).trim();
if(cand.length>=best.length) best=cand;
}
if(best) return best;
const fb=s.match(/\b([A-Z]{1,12}[-_ ]?\d{1,5}[A-Za-z]{0,12})\b/i);
return fb?fb[1].replace(/\s+/g,' ').toUpperCase():'';
}

function detectBrand(text){
const s=String(text||'');
if(/kuppersbusch/i.test(s)||/купперсбуш/i.test(s)) return 'Kuppersbusch';
if(/\basko\b/i.test(s)||/\bаско\b/i.test(s)) return 'Asko';
return 'Kuppersberg';
}

function modelParts(model){
const s=String(model||'').trim();
const m=s.match(/^([A-Z]{1,12})[-_ ]?(\d{1,5})(?:[\s-]+(.+))?$/i);
let core='', tailTokens=[];
if(m){
core=(m[1]+' '+m[2]).toUpperCase();
tailTokens=(m[3]||'').split(/[\s-]+/).filter(t=>/^[A-Za-z]{1,12}$/.test(t)&&!STOP_TAIL.test(t)&&!/kuppersberg/i.test(t)).slice(0,3);
}else{
const c=s.match(/^([A-Z]{1,12})[-_ ]?(\d{1,5})/i);
if(c) core=(c[1]+' '+c[2]).toUpperCase();
}
const coreDash=core.toLowerCase().replace(/\s+/g,'-');
const coreUnder=core.toLowerCase().replace(/\s+/g,'_');
const coreCompact=core.toLowerCase().replace(/[^a-z0-9]+/g,'');
const fullDash=(core+' '+tailTokens.join(' ')).trim().toLowerCase().replace(/\s+/g,'-');
const fullUnder=(core+' '+tailTokens.join(' ')).trim().toLowerCase().replace(/\s+/g,'_');
const compactFull=(core+tailTokens.join('')).toLowerCase().replace(/[^a-z0-9]+/g,'');
return {core, tailTokens, coreDash, coreUnder, coreCompact, fullDash, fullUnder, compactFull};
}

function canonTail(tailStr){
const t=String(tailStr||'').toUpperCase().replace(/[^A-Z0-9]+/g,'');
if(!t) return '';
if(t==='BLACK') return 'B';
if(t==='BLACKLINE') return 'BL';
if(t==='WHITE') return 'W';
if(t==='WHITELINE') return 'WL';
if(t==='INOX'||t==='STAINLESS'||t==='STEEL'||t==='SILVER') return 'S';
return t;
}

function slugCore(s){const m=String(s||'').match(/^([a-z]{1,12})[-_](\d{1,5})/i);return m?(m[1].toUpperCase()+' '+m[2]):'';}
function slugTail(s){const m=String(s||'').match(/^([a-z]{1,12})[-_](\d{1,5})[-_]?([a-z0-9-_]*)$/i);if(!m)return '';return canonTail(String(m[3]||'').replace(/[-_]/g,''));}
function tailCanonFromUrl(url){const slug=String(url||'').replace(/\/+$/,'').split('/').pop();return slugTail(slug);}
function modelVariants(model){const p=modelParts(model);return [...new Set([p.fullDash,p.fullUnder,p.compactFull].filter(Boolean))];}

function officialCandidateUrls(model){
const p=modelParts(model);
const slugs=[];

if(p.tailTokens.length){
const tDash=p.tailTokens.join('-').toLowerCase();
const tUnder=p.tailTokens.join('_').toLowerCase();
const t0=p.tailTokens[0].toLowerCase();
const ini=p.tailTokens.map(t=>t[0]).join('').toLowerCase();
slugs.push(p.coreDash+'-'+tDash, p.coreUnder+'_'+tUnder, p.coreDash+'-'+t0, p.coreUnder+'_'+t0, p.coreDash+'-'+ini, p.coreDash+'-'+t0[0]);
}

slugs.push(p.fullDash, p.fullUnder, p.compactFull, p.coreDash, p.coreUnder);

const singleLetterMatch=p.core.match(/^([A-Z])\s*(\d{1,5})$/i);
if(singleLetterMatch&&p.tailTokens.length){
const letter=singleLetterMatch[1].toLowerCase();
const num=singleLetterMatch[2];
const tails=p.tailTokens.map(t=>t.toLowerCase());
slugs.push(
letter+'_'+num+'_'+tails.join('_'),
letter+'-'+num+'-'+tails.join('-'),
letter+num+tails.join(''),
letter+'_'+num+tails.join('')
);
}

const longWordMatch=p.core.match(/^([A-Z]{7,12})\s*(\d{1,5})$/i);
if(longWordMatch&&p.tailTokens.length){
const word=longWordMatch[1].toLowerCase();
const num=longWordMatch[2];
const tails=p.tailTokens.map(t=>t.toLowerCase());
slugs.push(
word+'_'+num+'_'+tails.join('_'),
word+'-'+num+'-'+tails.join('-'),
word+num+tails.join(''),
word+'_'+num+tails.join('')
);
}

const urls=[];
[...new Set(slugs.filter(Boolean))].forEach(slug=>{
urls.push(OFFICIAL_ORIGIN+'/products/'+slug+'/');
urls.push(OFFICIAL_ORIGIN+'/new/products/'+slug+'/');
});

return [...new Set(urls)];
}

function officialSearchUrl(model){return OFFICIAL_ORIGIN+'/search/?q='+encodeURIComponent(model);}
function cacheKey(model){return 'kb_off_v5_'+String(model||'').toLowerCase().replace(/[^a-z0-9]+/g,'');}
function coreKey(model){return 'kb_off_v5_core_'+modelParts(model).coreDash.replace(/[^a-z0-9]+/g,'');}

function readCache(model,allowStale){
try{
const keys=[cacheKey(model)].concat(modelVariants(model).map(v=>'kb_off_v5_'+v.replace(/[^a-z0-9]+/g,'')));
keys.push(coreKey(model));
for(const k of [...new Set(keys)]){
const raw=GM_getValue(k,''); if(!raw) continue;
const obj=JSON.parse(raw); if(!obj||!obj.specs) continue;
if(!allowStale&&obj.ts&&Date.now()-obj.ts>CACHE_TTL_MS) continue;
if(k===coreKey(model)){
const st=canonTail(modelParts(obj.model||'').tailTokens.join(''));
const our=canonTail(modelParts(model).tailTokens.join(''));
if(st&&our&&st!==our) continue;
}
return obj;
}
}catch(e){}
return null;
}

function writeCache(model,data){
const payload=JSON.stringify(Object.assign({ts:Date.now(),model},data));
GM_setValue(cacheKey(model), payload);
GM_setValue(coreKey(model), payload);
modelVariants(model).forEach(v=>GM_setValue('kb_off_v5_'+v.replace(/[^a-z0-9]+/g,''), payload));
}

function gmFetch(url,ms){const wait=ms||GM_FETCH_TIMEOUT; let done=false; const req=new Promise((resolve,reject)=>{try{GM_xmlhttpRequest({method:'GET',url,timeout:wait,onload:r=>{if(!done){done=true;resolve(r);}},onerror:e=>{if(!done){done=true;reject(e||new Error('net'));}},ontimeout:()=>{if(!done){done=true;reject(new Error('timeout'));}}});}catch(e){reject(e);}}); const hard=new Promise((_,rej)=>setTimeout(()=>{if(!done){done=true;rej(new Error('timeout'));}},wait+400)); return Promise.race([req,hard]);}

function checkParsed(parsed,model,fetchedTailCanon){
const rawCount=Object.keys(parsed.specs||{}).length;
if(rawCount<4) return {ok:false,reason:'empty',count:rawCount};
const offModel=extractModel(parsed.title||'');
const pm=modelParts(model), po=modelParts(offModel);
if(!po.core||pm.core!==po.core) return {ok:false,reason:'model',count:rawCount};
const ourTail=canonTail(pm.tailTokens.join(''));
const ft=(fetchedTailCanon==null)?ourTail:fetchedTailCanon;
if(ft!=='' && ft!==ourTail) return {ok:false,reason:'model',count:rawCount};
const co=canonTail(po.tailTokens.join(''));
if(ft===''&&ourTail&&co&&co!==ourTail) return {ok:false,reason:'model',count:rawCount};
return {ok:true,count:rawCount};
}

const SEARCH_PATTERNS=[
q=>OFFICIAL_ORIGIN+'/search/?q='+q,
q=>OFFICIAL_ORIGIN+'/search?q='+q,
q=>OFFICIAL_ORIGIN+'/catalog/search/?q='+q
];

function extractOfficialLinks(html){
const doc=new DOMParser().parseFromString(html,'text/html');
const links=[...doc.querySelectorAll('a[href*="/products/"]')]
.map(a=>a.getAttribute('href'))
.filter(h=>h&&/\/(new\/)?products\/[a-z0-9-_]+\/?$/i.test(h));
return [...new Set(links)].map(h=>h.startsWith('http')?h:OFFICIAL_ORIGIN+h);
}

async function loadOfficialBySearch(model,onProgress,attempts){
const q=encodeURIComponent(model);
const p=modelParts(model);
const ourTail=canonTail(p.tailTokens.join(''));
const slugOf=l=>l.replace(/\/+$/,'').split('/').pop();
for(const build of SEARCH_PATTERNS){
const url=build(q);
if(onProgress) onProgress('Ищу на сайте: '+url.replace(OFFICIAL_ORIGIN,''));
try{
const res=await gmFetch(url,GM_FETCH_TIMEOUT);
if(res.status===404){ if(attempts) attempts.push({u:url.replace(OFFICIAL_ORIGIN,''),r:'404'}); continue; }
const html=res.responseText||'';
if(isCloudflare(null,html)){ if(attempts) attempts.push({u:url.replace(OFFICIAL_ORIGIN,''),r:'cloudflare'}); continue; }
const links=extractOfficialLinks(html);
if(!links.length){ if(attempts) attempts.push({u:url.replace(OFFICIAL_ORIGIN,''),r:'нет ссылок'}); continue; }
const cands=links.filter(l=>slugCore(slugOf(l))===p.core);
let best=cands.find(l=>slugTail(slugOf(l))===ourTail);
if(!best) best=cands.find(l=>slugTail(slugOf(l))==='');
if(!best&&!ourTail) best=cands[0];
if(!best){ if(attempts) attempts.push({u:url.replace(OFFICIAL_ORIGIN,''),r:'нет нужной модели в выдаче'}); continue; }
const prodRes=await gmFetch(best,GM_FETCH_TIMEOUT);
if(prodRes.status===404){ if(attempts) attempts.push({u:best.replace(OFFICIAL_ORIGIN,''),r:'404'}); continue; }
const prodHtml=prodRes.responseText||'';
if(isCloudflare(null,prodHtml)){ if(attempts) attempts.push({u:best.replace(OFFICIAL_ORIGIN,''),r:'cloudflare'}); continue; }
const parsed=parseOfficialHtml(prodHtml); parsed.url=best; parsed.model=model;
if(parsed.blocked){ if(attempts) attempts.push({u:best.replace(OFFICIAL_ORIGIN,''),r:'cloudflare'}); continue; }
const chk=checkParsed(parsed,model,tailCanonFromUrl(best));
if(attempts) attempts.push({u:best.replace(OFFICIAL_ORIGIN,''),r:chk.ok?'ok':'reject:'+chk.reason});
if(chk.ok) return parsed;
}catch(e){ if(attempts) attempts.push({u:url.replace(OFFICIAL_ORIGIN,''),r:'ошибка'}); }
}
return null;
}

async function loadOfficial(model,onProgress,extras,attempt){
attempt=attempt||1;
extras=extras||{};
const attempts=[];
const wrap=obj=>{try{return enrichOfficial(obj||{}, extras.title);}catch(e){return obj||{specs:{}};}};
if(attempt===1){ if(onProgress) onProgress('Проверяю кэш…'); }
const cached=readCache(model); if(cached&&cached.specs&&Object.keys(cached.specs).length) return wrap(cached);
const p=modelParts(model);
let blocked=false, lastErr=null, timeoutCount=0, jsrenderFallback=null, lowConf=null;
for(const url of officialCandidateUrls(model)){
if(onProgress) onProgress((attempt===2?'Повторно: ':'Запрос: ')+url.replace(OFFICIAL_ORIGIN,''));
try{
const res=await gmFetch(url,GM_FETCH_TIMEOUT); const html=res.responseText||'';
if(isCloudflare(null,html)){blocked=true; lastErr='cloudflare'; attempts.push({u:url.replace(OFFICIAL_ORIGIN,''),r:'cloudflare'}); continue;}
const parsed=parseOfficialHtml(html); parsed.url=url; parsed.model=model;
if(parsed.blocked){blocked=true; attempts.push({u:url.replace(OFFICIAL_ORIGIN,''),r:'cloudflare'}); continue;}
const chk=checkParsed(parsed,model,tailCanonFromUrl(url));
const isProdPage=/prodMain__name|prodMain__description|prodTabs__item|prodDesc__icons|class="prodMain/i.test(html);
if(chk.ok){ writeCache(model,parsed); return wrap(parsed); }
if(chk.reason==='empty'){
attempts.push({u:url.replace(OFFICIAL_ORIGIN,''),r:'empty('+chk.count+')'+(isProdPage?', страница товара':'')});
if(isProdPage){
if(!jsrenderFallback) jsrenderFallback={url:url};
const po=modelParts(extractModel(parsed.title||''));
if(po.core&&po.core===p.core&&!lowConf){
const test=Object.assign({},parsed.specs);
inferOfficialFromTitle(test, parsed.title||'');
if(Object.keys(test).length>=1){ lowConf=parsed; }
}
}
}else{
attempts.push({u:url.replace(OFFICIAL_ORIGIN,''),r:'reject:'+chk.reason});
}
}catch(e){
lastErr=e;
if(String(e&&e.message||e).indexOf('timeout')>=0){ timeoutCount++; attempts.push({u:url.replace(OFFICIAL_ORIGIN,''),r:'timeout'}); }
else attempts.push({u:url.replace(OFFICIAL_ORIGIN,''),r:'ошибка'});
}
}
if(onProgress) onProgress((attempt===2?'Повторно: ':'')+'Пробую поиск по сайту…');
const found=await loadOfficialBySearch(model,onProgress,attempts);
if(found){ writeCache(model,found); return wrap(found); }
const stale=readCache(model,true); if(stale&&stale.specs) return wrap(stale);
if(attempt===1 && timeoutCount>0){
if(onProgress) onProgress('Сервер отвечал медленно. Делаю повторную попытку…');
await new Promise(r=>setTimeout(r,1500));
return loadOfficial(model,onProgress,extras,2);
}
if(lowConf){ lowConf.lowConfidence=true; writeCache(model,lowConf); return wrap(lowConf); }
if(jsrenderFallback){
return wrap({blocked:false, specs:{}, error:'jsrender', notFound:true, jsrender:true, url:jsrenderFallback.url, model, attempts});
}
return wrap({blocked, specs:{}, error:String(lastErr&&lastErr.message||lastErr||'not_found'), notFound:true, timeout:timeoutCount>0, url:officialSearchUrl(model), model, attempts});
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
if(cnt>=4){
const u=location.href.split('?')[0];
writeCache(job.model,{specs:parsed.specs,url:u,title:parsed.title});
setJob(Object.assign({},job,{status:'done',ok:true,url:u}));
return;
}
const hasDom=!!document.querySelector('.prodMain,.prodTabs__item__dbl-list,.prodMain__description__text');
const is404=/404|не найдена|не существует/i.test((document.title||'')+' '+((document.querySelector('h1')||{}).textContent||''));
if(is404||(!hasDom&&Date.now()-t0>5000)||(Date.now()-t0>10000)){ advance(); return; }
setTimeout(tryParse,700);
}catch(e){ advance(); }
};
setTimeout(tryParse,800);
}

let workerWin=null, captureQueue=[], capturing=false;

function startAutoCapture(models){
if(capturing||!models||!models.length) return;
capturing=true; captureQueue=models.slice(1);
const first=models[0];
const urls=officialCandidateUrls(first.model);
setJob({status:'pending',model:first.model,idx:0,urls,started:Date.now()});
workerWin=window.open(urls[0],'kbworker','width=760,height:520,left=80,top=80');
setBody('<div class="kb-meta">🤖 Авто-захват: обрабатываю <b>'+escapeHtml(first.model)+'</b>… Открыто служебное окно kuppersberg.ru — не закрывайте его, остальные модели пройдут по очереди. Осталось: '+models.length+'</div>');
}

function onJobDone(job){
if(!capturing) return;
if(captureQueue.length){
const nxt=captureQueue.shift();
const urls=officialCandidateUrls(nxt.model);
setJob({status:'pending',model:nxt.model,idx:0,urls,started:Date.now()});
if(workerWin&&!workerWin.closed){ workerWin.location.href=urls[0]; setBody('<div class="kb-meta">🤖 Авто-захват: обрабатываю <b>'+escapeHtml(nxt.model)+'</b>… Осталось: '+(captureQueue.length+1)+'</div>'); }
else finishCapture();
}else finishCapture();
}

function finishCapture(){
capturing=false;
try{ if(workerWin&&!workerWin.closed) workerWin.close(); }catch(e){}
setJob({status:'idle'});
setBody('<div class="kb-meta">🤖 Авто-захват завершён. Пересчитываю сравнение из кэша…</div>');
setTimeout(()=>{ if(isComparePage()) runCompare(); else runProduct(); },400);
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

function compareSpecs(oursMap, offMap){
const rows=[];
SPEC_FIELDS.forEach(field=>{
let oursVal=getByNames(oursMap, field.namesOurs);
let offVal=getByNames(offMap, field.namesOff.concat(field.namesOurs));
if(oursVal==null&&offVal==null) return;
const offNameHit=(function(){for(const n of field.namesOff.concat(field.namesOurs)){const hit=Object.keys(offMap).find(k=>normName(k)===normName(n)); if(hit) return hit;} return field.namesOff[0]||'';})();
const fmt=formatOfficialDisplay(field, offVal, offNameHit);
const notes=[];
let status='only_one';
const oursItems=oursVal!=null?splitComplectItems(oursVal):[];
const offItems=offVal!=null?splitComplectItems(offVal):[];
const isList=(field.id==='complect')||((oursItems.length>=2||offItems.length>=2)&&!DIM_FIELD_IDS.has(field.id)&&field.id!=='niche'&&field.id!=='fridge_frost_free');
if(isList&&oursVal!=null&&offVal!=null){
const ourMarks=oursItems.map(t=>({text:t,ok:offItems.some(o=>itemsMatch(t,o))}));
const offMarks=offItems.map(t=>({text:t,ok:oursItems.some(o=>itemsMatch(t,o))}));
const uO=ourMarks.filter(m=>!m.ok).length, uF=offMarks.filter(m=>!m.ok).length;
const matched=ourMarks.length-uO;
status=(uO===0&&uF===0)?'ok':(matched>0?'partial':'diff');
rows.push({id:field.id,name:field.namesOurs[0],ours:oursVal,off:offVal,offDisplay:fmt.display||offVal,notes,status,items:{ours:ourMarks,off:offMarks}});
return;
}
if(field.id==='complect'){
if(oursVal==null||offVal==null){ status=oursVal!=null?'only_ours':'only_off'; }
}
else{
notes.push(...oursFormatNotes(field,oursVal), ...fmt.notes);
if(oursVal!=null&&offVal!=null){status=valuesEqual(oursVal,offVal,field.id,field,offNameHit)?'ok':'diff'; if(status==='ok'&&oursFormatNotes(field,oursVal).length) status='diff';}
else status=oursVal!=null?'only_ours':'only_off';
}
rows.push({id:field.id,name:field.namesOurs[0],ours:oursVal,off:offVal,offDisplay:fmt.display||offVal,notes,status});
});
return rows;
}

function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function copyText(s){try{GM_setClipboard(s,'text');}catch(e){navigator.clipboard&&navigator.clipboard.writeText(s);}}
function miniIcon(status){ return status==='diff'?'❌':(status==='ok'?'✔️':(status==='partial'?'⚠️':'❕')); }
function statusTitle(status){ return status==='diff'?'Расхождение с оф. сайтом':(status==='ok'?'Совпадает с оф. сайтом':(status==='partial'?'Частичное совпадение: есть отличия по пунктам':'Поле есть только с одной стороны')); }
function marksHtml(marks){return (marks||[]).map(m=>'<div class="kb-li '+(m.ok?'kb-li-ok':'kb-li-diff')+'">'+(m.ok?'✅':'❌')+' '+escapeHtml(m.text)+'</div>').join('');}

function autoCapButton(models,label){
return '<button type="button" class="kb-searchlink green kb-autocap" data-models="'+escapeHtml(JSON.stringify(models))+'">🤖 '+(label||'Авто-захват: открыть оф. карточки в служебном окне')+'</button>';
}

GM_addStyle('#kb-spec-root{position:fixed;right:16px;bottom:16px;z-index:2147483646;font-family:Arial,sans-serif}'
+'#kb-spec-toggle{background:#1a1a1a;color:#fff;border:0;border-radius:18px;padding:7px 12px;cursor:pointer;font-size:12px;font-weight:600}'
+'#kb-spec-toggle.diff{background:#b42318}#kb-spec-toggle.ok{background:#067647}#kb-spec-toggle.wait{background:#b54708}'
+'#kb-spec-panel{display:none;position:fixed;right:12px;bottom:52px;width:min(440px,calc(100vw - 16px));max-height:min(60vh,460px);overflow:auto;background:#fff;color:#111;border-radius:10px;box-shadow:0 16px 50px rgba(0,0,0,.28);border:1px solid #e5e5e5}'
+'#kb-spec-panel.open{display:block}'
+'#kb-spec-panel header{position:sticky;top:0;background:#111;color:#fff;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;z-index:2}'
+'#kb-spec-panel header b{font-size:12px}#kb-spec-panel header .kb-ver{opacity:.75;font-size:10px;margin-left:6px}'
+'#kb-spec-panel header button{background:transparent;color:#fff;border:1px solid #555;border-radius:5px;padding:3px 7px;cursor:pointer;font-size:11px}'
+'.kb-meta{padding:5px 10px;font-size:11px;color:#444;border-bottom:1px solid #eee}.kb-meta a{color:#1254b3}'
+'.kb-meta details{margin:2px 0}.kb-meta summary{cursor:pointer;color:#1254b3}'
+'.kb-meta details div{padding:2px 0 2px 8px;color:#777;font-size:10px;white-space:pre-line}'
+'.kb-table{width:100%;border-collapse:collapse;font-size:11px}.kb-table th,.kb-table td{padding:4px 8px;border-bottom:1px solid #f0f0f0;vertical-align:top;text-align:left;white-space:pre-line}.kb-table th{background:#fafafa;position:sticky;top:36px}'
+'.kb-st-diff{background:#fef3f2}.kb-st-partial{background:#fff8e1}'
+'.kb-chip{display:inline-block;padding:1px 7px;border-radius:10px;background:#f2f2f2;margin-right:4px;font-size:10px}'
+'.kb-notfound{background:#fff8e1;border-left:3px solid #f59e0b;padding:8px 10px;font-size:12px;color:#5b4300}'
+'.kb-searchlink{display:inline-block;margin:6px 10px;padding:5px 12px;background:#1254b3;color:#fff !important;border-radius:6px;text-decoration:none;font-weight:600;font-size:12px;border:0;cursor:pointer}'
+'.kb-searchlink:hover{background:#0d3f8f}'
+'.kb-searchlink.green{background:#067647}.kb-searchlink.green:hover{background:#04553b}'
+'.kb-status{margin-left:6px;font-size:13px;line-height:1;vertical-align:middle;cursor:default}'
+'.kb-showbtn{margin-left:6px;font-size:10px;line-height:1.5;border:1px solid #d0d7de;background:#fff;border-radius:10px;padding:1px 8px;cursor:pointer;color:#1254b3;vertical-align:middle;white-space:nowrap}'
+'.kb-showbtn:hover{background:#f0f6ff;border-color:#1254b3}'
+'.kb-row-ok .characteristics__property,.kb-row-diff .characteristics__property,.kb-row-partial .characteristics__property{position:relative;border-radius:2px}'
+'.kb-row-ok .characteristics__property{background:#e9f7ef}'
+'.kb-row-diff .characteristics__property{background:#fdecea}'
+'.kb-row-partial .characteristics__property{background:#fff8e1;box-shadow:inset 3px 0 0 #f59e0b}'
+'.kb-row-partial .characteristics__name{color:#b45309;font-weight:600}'
+'.kb-row-ok .characteristics__property::before,.kb-row-diff .characteristics__property::before{content:"";position:absolute;left:-7px;top:1px;bottom:1px;width:4px;border-radius:2px}'
+'.kb-row-ok .characteristics__property::before{background:#067647}'
+'.kb-row-diff .characteristics__property::before{background:#b42318}'
+'.kb-item{display:inline-block;padding:0 4px;margin:1px 0;border-radius:3px}'
+'.kb-item-ok{background:#e9f7ef;box-shadow:inset 2px 0 0 #067647}'
+'.kb-item-diff{background:#fdecea;box-shadow:inset 2px 0 0 #b42318}'
+'.kb-marks{margin:2px 0;font-size:11px}'
+'.kb-cell-ok{background:#e9f7ef !important}'
+'.kb-cell-diff{background:#fdecea !important;box-shadow:inset 0 -2px 0 #b42318}'
+'.kb-cell-partial{background:#fff8e1 !important;box-shadow:inset 0 -2px 0 #f59e0b}'
+'.kb-rowpop{background:transparent;border:0;cursor:pointer;font-size:12px;padding:0 4px}'
+'.kb-pop{position:absolute;z-index:2147483647;width:300px;background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.18);padding:10px;font-size:12px}'
+'.kb-pop .kb-offval{margin:6px 0;padding:6px;background:#f6f6f6;border-radius:4px;white-space:pre-line}'
+'.kb-pop .kb-note{white-space:pre-line;margin-top:2px}'
+'.kb-li{margin:1px 0}.kb-li-ok{color:#067647}.kb-li-diff{color:#b42318}'
+'.kb-pop .kb-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}'
+'.kb-pop button,.kb-pop a.kb-btn{font-size:11px;padding:4px 8px;border-radius:4px;border:1px solid #ccc;background:#111;color:#fff;text-decoration:none;cursor:pointer}.kb-pop button.sec{background:#fff;color:#111}'
+'.kb-hl{outline:3px solid #b42318!important;background:#fff3f0!important}');

function ensureUI(){try{if(document.getElementById('kb-spec-root'))return; const root=document.createElement('div'); root.id='kb-spec-root'; root.innerHTML='<button type="button" id="kb-spec-toggle">Сверка v'+SCRIPT_VERSION+'</button><div id="kb-spec-panel"><header><b>Сверка с kuppersberg.ru <span class="kb-ver">v'+SCRIPT_VERSION+'</span></b><span><button type="button" id="kb-run">Запустить</button> <button type="button" id="kb-close">Закрыть</button></span></header><div id="kb-spec-body"><div class="kb-meta">Нажмите «Запустить».</div></div></div>'; document.body.appendChild(root); document.getElementById('kb-spec-toggle').onclick=()=>document.getElementById('kb-spec-panel').classList.toggle('open'); document.getElementById('kb-close').onclick=()=>document.getElementById('kb-spec-panel').classList.remove('open'); document.getElementById('kb-run').onclick=()=>runNow();}catch(e){}}

function setBody(html){const el=document.getElementById('kb-spec-body'); if(el) el.innerHTML=html;}

let panelPops=[];

function bindPanelPops(){
document.querySelectorAll('#kb-spec-body .kb-rowpop').forEach(b=>{
b.onclick=ev=>{ev.preventDefault(); ev.stopPropagation(); const idx=+b.getAttribute('data-pop'); const p=panelPops[idx]; if(p) showSpecPop(b,p.rec,p.session);};
});
}

function bindAutoCap(){
document.querySelectorAll('#kb-spec-body .kb-autocap').forEach(b=>{
b.onclick=ev=>{ev.preventDefault(); try{const models=JSON.parse(b.getAttribute('data-models')||'[]'); if(models.length) startAutoCapture(models);}catch(e){}};
});
}

function renderProductBlock(title,model,official,rows){
const diffs=rows.filter(r=>r.status==='diff'); const part=rows.filter(r=>r.status==='partial'); const ok=rows.filter(r=>r.status==='ok').length;
const only=rows.filter(r=>r.status==='only_ours'||r.status==='only_off').length;
const url=official.url||'';
const offCount=Object.keys((official.specs||{})).length;
if(official.skipReason==='brand'){
return '<div class="kb-meta">'+escapeHtml(title||'')+'</div>'
+'<div class="kb-meta">v'+SCRIPT_VERSION+' · <b>'+escapeHtml(model||'')+'</b></div>'
+'<div class="kb-notfound">⚠ <b>Другой бренд: '+escapeHtml(official.brand||'')+'.</b> Такие товары не представлены на kuppersberg.ru (это отдельный бренд), поэтому сверка не выполняется и значки не ставятся.</div>';
}
if(official.found===false){
let attemptsHtml='';
if(official.attempts&&official.attempts.length){
attemptsHtml='<details class="kb-meta"><summary>Что проверили ('+official.attempts.length+')</summary><div>'+official.attempts.map(a=>escapeHtml(a.u)+' → '+escapeHtml(a.r)).join('\n')+'</div></details>';
}
const capBtn=autoCapButton([{model:model||''}],'Авто-захват: открыть эту карточку в служебном окне');
if(official.jsrender){
return '<div class="kb-meta">'+escapeHtml(title||'')+'</div>'
+'<div class="kb-meta"><span class="kb-chip">оф. полей: 0</span></div>'
+'<div class="kb-meta">v'+SCRIPT_VERSION+' · <b>'+escapeHtml(model||'')+'</b></div>'
+'<div class="kb-notfound">⚠ <b>Страница товара на kuppersberg.ru существует, но характеристики подгружаются JavaScript’ом</b> — фоновый запрос видит пустой HTML. Нажмите «Авто-захват»: скрипт сам откроет карточку в служебном окне, дождётся отрисовки, считает характеристики в кэш и закроет окно — после этого сравнение пересчитается автоматически.</div>'
+attemptsHtml+capBtn
+'<a class="kb-searchlink" href="'+escapeHtml(url)+'" target="_blank">📄 Или открыть карточку вручную</a>'
+'<a class="kb-searchlink" href="'+escapeHtml(officialSearchUrl(model))+'" target="_blank">🔎 Поиск kuppersberg.ru: «'+escapeHtml(model||'')+'»</a>';
}
const reason=official.timeout?' (сервер kuppersberg.ru не ответил за отведённое время)':(official.blocked?' (Cloudflare заблокировал запрос)':'');
return '<div class="kb-meta">'+escapeHtml(title||'')+'</div>'
+'<div class="kb-meta"><span class="kb-chip">оф. полей: 0</span><span class="kb-chip">расхожд.: 0</span></div>'
+'<div class="kb-meta">v'+SCRIPT_VERSION+' · <b>'+escapeHtml(model||'')+'</b></div>'
+'<div class="kb-notfound">⚠ <b>Не найдено на оф. сайте'+escapeHtml(reason)+'.</b> Карточка kuppersberg.ru для этой модели (с этим индексом/цветом) не найдена: возможно, модель не представлена или называется иначе. Сравнение не выполнялось, значки расхождений не ставились.</div>'
+attemptsHtml+capBtn
+'<a class="kb-searchlink" href="'+escapeHtml(officialSearchUrl(model))+'" target="_blank">🔎 Открыть поиск kuppersberg.ru с запросом «'+escapeHtml(model||'')+'»</a>'
+'<div class="kb-meta">Если карточка всё же существует — откройте её вручную на kuppersberg.ru: скрипт запомнит характеристики, затем нажмите «Запустить» ещё раз (тогда сравнение выполнится мгновенно из кэша).</div>';
}
const blocked=official.blocked?'<div class="kb-meta">Cloudflare. Откройте оф. карточку и запустите снова.</div>':'';
const lowNote=official.lowConfidence?'<div class="kb-meta">⚠ Найдено с низкой уверенностью: страница товара есть, но характеристик в сыром HTML мало (часть подгружается JS). Сравнены только доступные поля; кнопка «Авто-захват»/ручное открытие даст полные данные.</div>':'';
const warn=(offCount<=1&&!official.lowConfidence)?'<div class="kb-meta">Оф. полей мало ('+offCount+'). Проверьте модель/URL.</div>':'';
const popHint=(diffs.length||part.length)?'<div class="kb-meta">💡 Нажмите кнопку «оф. сайт» у поля на странице (или ❌/⚠️ в таблице ниже) — откроется попап с по пунктам: ✅ что совпало, ❌ чего не хватает.</div>':'';
const problem=diffs.concat(part);
const rowsHtml=problem.map(r=>{
const idx=panelPops.length;
panelPops.push({rec:r, session:{url:url}});
const oursCell=r.items?marksHtml(r.items.ours):escapeHtml(r.ours||'—');
const offCell=r.items?marksHtml(r.items.off):escapeHtml(r.offDisplay||r.off||'—');
return '<tr class="'+(r.status==='partial'?'kb-st-partial':'kb-st-diff')+'"><td>'+escapeHtml(r.name)+'</td><td>'+oursCell+'</td><td>'+offCell+'</td><td><button type="button" class="kb-rowpop" data-pop="' + idx + '" title="Открыть попап со значением оф. сайта">'+(r.status==='partial'?'⚠️':'❌')+'</button></td></tr>';
}).join('');
return '<div class="kb-meta">'+escapeHtml(title||'')+'</div>'
+'<div class="kb-meta"><span class="kb-chip">расхожд.: '+diffs.length+'</span><span class="kb-chip">частично: '+part.length+'</span><span class="kb-chip">совпало: '+ok+'</span><span class="kb-chip">только с одной стороны: '+only+'</span><span class="kb-chip">оф. полей: '+offCount+'</span></div>'
+'<div class="kb-meta">v'+SCRIPT_VERSION+' · <b>'+escapeHtml(model||'')+'</b> · '+(url?'<a href="'+escapeHtml(url)+'" target="_blank">открыть оф. карточку</a>':'')+'</div>'
+blocked+lowNote+warn+popHint
+'<table class="kb-table"><thead><tr><th>Поле</th><th>У нас</th><th>Оф.</th><th></th></tr></thead><tbody>'+(rowsHtml||'<tr><td colspan="4">Расхождений нет</td></tr>')+'</tbody></table>';
}

function closeKbPop(){document.querySelectorAll('.kb-pop').forEach(n=>n.remove());}

function showSpecPop(anchor,rec,session){
try{
closeKbPop();
const offVal=rec.offDisplay||rec.off||'—';
const offValShown=rec.items?marksHtml(rec.items.off):(String(offVal).includes('\n')?String(offVal).split('\n').map(l=>'• '+l).join('\n'):String(offVal));
const oursBlock=rec.items?'<div>У нас:</div><div class="kb-offval">'+marksHtml(rec.items.ours)+'</div>':'';
const notes=(rec.notes||[]).map(n=>'<div class="kb-note">'+escapeHtml(n)+'</div>').join('');
const jump=session&&session.url?session.url+(session.url.indexOf('?')>=0?'&':'?')+'kb_spec='+encodeURIComponent(rec.id)+'&kb_name='+encodeURIComponent(rec.name):'';
const pop=document.createElement('div'); pop.className='kb-pop';
pop.innerHTML='<b>'+escapeHtml(rec.name)+'</b> '+oursBlock+'<div>На оф. сайте:</div><div class="kb-offval">'+(rec.items?offValShown:escapeHtml(offValShown))+'</div>'+notes+'<div class="kb-actions"><button type="button" class="kb-copy">Копировать</button>'+(jump?'<a class="kb-btn" target="_blank" href="'+escapeHtml(jump)+'">Открыть на оф.</a>':'')+'<button type="button" class="sec kb-close-pop">Закрыть</button></div>';
document.body.appendChild(pop);
const r=anchor.getBoundingClientRect(); pop.style.left=Math.min(innerWidth-320,Math.max(8,r.left+scrollX))+'px'; pop.style.top=(r.bottom+scrollY+6)+'px';
pop.querySelector('.kb-copy').onclick=()=>{copyText(rec.items?rec.items.off.map(m=>m.text).join('; '):offVal); pop.querySelector('.kb-copy').textContent='Скопировано';};
pop.querySelector('.kb-close-pop').onclick=closeKbPop;
}catch(e){}
}

document.addEventListener('click',e=>{if(!e.target.closest('.kb-pop, .kb-showbtn, .kb-rowpop')) closeKbPop();});

function attachStatusAndButton(el,rec,session){
try{
if(!el)return;
el.querySelectorAll('.kb-status,.kb-showbtn,.kb-mini').forEach(n=>n.remove());
const target=(el.querySelector('.characteristics__name')||el);
const st=document.createElement('span'); st.className='kb-status'; st.textContent=miniIcon(rec.status); st.title=statusTitle(rec.status);
const btn=document.createElement('button'); btn.type='button'; btn.className='kb-showbtn'; btn.textContent='оф. сайт'; btn.title='Показать значение с kuppersberg.ru и скопировать';
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
if(lis.length===marks.length){ lis.forEach((li,i)=>{ li.classList.add('kb-item', marks[i].ok?'kb-item-ok':'kb-item-diff'); }); return; }
}
const div=document.createElement('div'); div.className='kb-marks'; div.innerHTML=marksHtml(marks);
valEl.parentNode&&valEl.parentNode.insertBefore(div, valEl.nextSibling);
}catch(e){}
}

function highlightProductPage(rows, session){
try{
document.querySelectorAll('.characteristics__row').forEach(row=>{
row.classList.remove('kb-row-diff','kb-row-ok','kb-row-partial');
row.querySelectorAll('.kb-status,.kb-showbtn,.kb-mini,.kb-marks').forEach(n=>n.remove());
const valEl=row.querySelector('.characteristics__property');
if(valEl) valEl.querySelectorAll('.kb-item').forEach(sp=>sp.classList.remove('kb-item','kb-item-ok','kb-item-diff'));
});
if(session&&session.found===false) return;
document.querySelectorAll('.characteristics__row').forEach(row=>{
const name=textOf(row.querySelector('.characteristics__name')); const field=findFieldByName(name); const rec=rows.find(r=>(field&&r.id===field.id)||normName(r.name)===normName(name));
if(!rec)return;
if(rec.status==='diff') row.classList.add('kb-row-diff');
else if(rec.status==='ok') row.classList.add('kb-row-ok');
else if(rec.status==='partial'){ row.classList.add('kb-row-partial'); paintListCell(row, rec.items?rec.items.ours:null); }
attachStatusAndButton(row,rec,session);
});
}catch(e){}
}

function highlightCompare(packs){
try{
document.querySelectorAll('.compare-table-block__row.js-compare-row').forEach(row=>{
const name=textOf(row.querySelector('.js-compare-cell-title'));
[...row.querySelectorAll('.js-compare-cell:not(.js-compare-cell-title)')].forEach((cell,i)=>{
const pack=packs[i]; if(!pack)return;
cell.querySelectorAll('.kb-status,.kb-showbtn,.kb-mini,.kb-marks').forEach(n=>n.remove());
cell.classList.remove('kb-cell-ok','kb-cell-diff','kb-cell-partial');
if(pack.session&&pack.session.found===false) return;
const field=findFieldByName(name); const rec=pack.rows.find(r=>(field&&r.id===field.id)||normName(r.name)===normName(name));
if(!rec)return;
if(rec.status==='diff') cell.classList.add('kb-cell-diff');
else if(rec.status==='ok') cell.classList.add('kb-cell-ok');
else if(rec.status==='partial'){ cell.classList.add('kb-cell-partial'); if(rec.items){ const div=document.createElement('div'); div.className='kb-marks'; div.innerHTML=marksHtml(rec.items.ours); cell.appendChild(div); } }
const st=document.createElement('span'); st.className='kb-status'; st.textContent=miniIcon(rec.status); st.title=statusTitle(rec.status);
const btn=document.createElement('button'); btn.type='button'; btn.className='kb-showbtn'; btn.textContent='оф. сайт'; btn.title='Показать значение с kuppersberg.ru и скопировать';
btn.onclick=ev=>{ev.preventDefault(); ev.stopPropagation(); showSpecPop(btn,rec,pack.session);};
cell.appendChild(st); cell.appendChild(btn);
});
});
}catch(e){}
}

function isProductPage(){return !!document.querySelector('section.characteristics')&&/\/catalog\//.test(location.pathname);}
function isComparePage(){return /\/compare\//.test(location.pathname);}
function isOfficialProductPage(){return /kuppersberg.ru$/.test(location.hostname)&&/\/products\//.test(location.pathname);}

function updateToggle(rows, mode){
const t=document.getElementById('kb-spec-toggle'); if(!t)return;
const d=rows.filter(r=>r.status==='diff').length;
const p=rows.filter(r=>r.status==='partial').length;
if(mode&&mode.skip){t.classList.remove('ok','diff');t.classList.add('wait');t.textContent='Сверка: другой бренд ('+mode.skip+') v'+SCRIPT_VERSION;return;}
if(mode&&mode.notFound){t.classList.remove('ok','diff');t.classList.add('wait');t.textContent='Сверка: не найдено на оф. v'+SCRIPT_VERSION;return;}
t.classList.toggle('diff',d>0);
t.classList.toggle('wait',d===0&&p>0);
t.classList.toggle('ok',d===0&&p===0&&rows.some(r=>r.status==='ok'));
const parts=[]; if(d) parts.push(d+' расхожд.'); if(p) parts.push(p+' частич.');
t.textContent=(parts.length?'Сверка: '+parts.join(', '):'Сверка: совпало')+' v'+SCRIPT_VERSION;
}

async function runProduct(){
const title=textOf(document.querySelector('h1'))||document.title;
const model=extractModel(title)||extractModel(location.pathname)||extractModel(document.body.innerText.slice(0,1500));
const ours=parseOursDocument(document);
const brand=detectBrand(title+' '+((ours&&ours['Бренд'])||'')+' '+((ours&&ours['Торговая марка'])||''));
if(brand!=='Kuppersberg'){
const official={skip:true,skipReason:'brand',brand,specs:{},url:''};
highlightProductPage([],{found:false});
panelPops=[];
setBody(renderProductBlock(title,model,official,[])); bindAutoCap();
updateToggle([],{skip:brand});
return;
}
setBody('<div class="kb-meta">Модель: <b>'+escapeHtml(model||'')+'</b>. Запрашиваю официальный сайт…</div>');
let official;
try{official=await Promise.race([loadOfficial(model,msg=>setBody('<div class="kb-meta">Модель: <b>'+escapeHtml(model||'')+'</b>. '+escapeHtml(msg)+'</div>'),{title,ours}), new Promise(res=>setTimeout(()=>res({blocked:true,specs:{},error:'timeout',notFound:true,timeout:true,model,url:officialSearchUrl(model),attempts:[{u:'(общий таймаут)',r:'timeout'}]}),OVERALL_TIMEOUT))]);}
catch(e){official={blocked:true,specs:{},error:String(e),notFound:true,model,url:officialSearchUrl(model)};}
official.found = !official.notFound && Object.keys(official.specs||{}).length>0;
const rows=compareSpecs(ours, official.specs||{});
highlightProductPage(rows,{url:official.url,specs:official.specs||{},ours,model,found:official.found});
panelPops=[];
setBody(renderProductBlock(title,model,official,rows)); bindPanelPops(); bindAutoCap(); updateToggle(rows, official.found===false?{notFound:true}:null);
}

async function runCompare(){
const items=parseOursCompare(); if(!items.length){setBody('<div class="kb-meta">Товары не найдены</div>'); return;}
const blocks=[], packs=[]; let any=0, partAny=0, notFoundCount=0, skipCount=0;
const missingModels=[];
panelPops=[];
for(let i=0;i<items.length;i++){
const item=items[i];
const brand=detectBrand(item.title+' '+((item.specs&&item.specs['Бренд'])||'')+' '+((item.specs&&item.specs['Торговая марка'])||''));
if(brand!=='Kuppersberg'){
skipCount++;
const official={skip:true,skipReason:'brand',brand,specs:{},url:''};
packs.push({item,rows:[],session:{url:'',specs:{},model:item.model,found:false}});
blocks.push(renderProductBlock(item.title,item.model,official,[]));
continue;
}
setBody('<div class="kb-meta">Проверяю '+(i+1)+'/'+items.length+': <b>'+escapeHtml(item.model||item.title)+'</b>… Запрашиваю kuppersberg.ru…</div>');
let official;
try{official=await Promise.race([loadOfficial(item.model,msg=>setBody('<div class="kb-meta">Проверяю '+(i+1)+'/'+items.length+': <b>'+escapeHtml(item.model||item.title)+'</b>. '+escapeHtml(msg)+'</div>'),{title:item.title,ours:item.specs||{}}), new Promise(res=>setTimeout(()=>res({blocked:true,specs:{},error:'timeout',notFound:true,timeout:true,model:item.model,url:officialSearchUrl(item.model),attempts:[{u:'(общий таймаут)',r:'timeout'}]}),OVERALL_TIMEOUT))]);}
catch(e){official={blocked:true,specs:{},error:String(e),notFound:true,model:item.model,url:officialSearchUrl(item.model)};}
official.found = !official.notFound && Object.keys(official.specs||{}).length>0;
if(official.found===false){ notFoundCount++; missingModels.push({model:item.model}); }
const rows=compareSpecs(item.specs||{},official.specs||{});
any+=rows.filter(r=>r.status==='diff').length;
partAny+=rows.filter(r=>r.status==='partial').length;
packs.push({item,rows,session:{url:official.url,specs:official.specs||{},model:item.model,found:official.found}});
blocks.push(renderProductBlock(item.title,item.model,official,rows));
}
if(missingModels.length){
blocks.unshift('<div class="kb-meta">🤖 Не найдены автоматически (JS-рендер или отсутствие карточки): '+missingModels.map(m=>escapeHtml(m.model)).join(', ')+'. '+autoCapButton(missingModels,'Авто-захват всех ненайденных ('+missingModels.length+')')+'</div>');
}
highlightCompare(packs); setBody(blocks.join('')); bindPanelPops(); bindAutoCap();
const t=document.getElementById('kb-spec-toggle');
if(skipCount===items.length){t.classList.remove('ok','diff');t.classList.add('wait');t.textContent='Сверка: другой бренд v'+SCRIPT_VERSION;}
else if(notFoundCount===items.length){t.classList.remove('ok','diff');t.classList.add('wait');t.textContent='Сверка: не найдено на оф. v'+SCRIPT_VERSION;}
else{
t.classList.remove('wait');
t.classList.toggle('diff',any>0);
t.classList.toggle('wait',any===0&&partAny>0);
t.classList.toggle('ok',any===0&&partAny===0&&notFoundCount===0&&skipCount===0);
const parts=[]; if(any) parts.push(any+' расхожд.'); if(partAny) parts.push(partAny+' частич.'); if(skipCount) parts.push(skipCount+' др. бренд'); if(notFoundCount) parts.push(notFoundCount+' не найдено');
t.textContent=(parts.length?'Сверка: '+parts.join(', '):'Сверка: совпало')+' v'+SCRIPT_VERSION;
}
}

function officialParam(name){try{return new URL(location.href).searchParams.get(name)||'';}catch(e){return '';}}

function highlightOfficialTarget(){
try{
const fieldId=officialParam('kb_spec'); const want=officialParam('kb_name'); const field=SPEC_FIELDS.find(f=>f.id===fieldId);
const names=[]; if(want) names.push(want); if(field) names.push(...field.namesOff,...field.namesOurs); if(!names.length) return;
const nodes=[...document.querySelectorAll('.prodTabs__item__dbl-list li, .prodMain__description__text p, .prodMain table tr, .prodTabs table tr')];
const hit=nodes.find(el=>names.some(n=>normName(el.textContent).indexOf(normName(n))!==-1));
if(hit){hit.classList.add('kb-hl'); hit.scrollIntoView({block:'center',behavior:'smooth'});}
}catch(e){}
}

function cacheOfficialPage(){try{const parsed=parseOfficialDocument(document); parsed.url=location.href.split('?')[0]; parsed.model=extractModel(parsed.title+' '+location.pathname); if(parsed.model&&Object.keys(parsed.specs).length) writeCache(parsed.model,parsed); highlightOfficialTarget();}catch(e){}}

async function runNow(){document.getElementById('kb-spec-panel').classList.add('open'); if(isComparePage()) await runCompare(); else if(isProductPage()) await runProduct(); else setBody('<div class="kb-meta">Откройте карточку или сравнение</div>');}

function init(){
if(isOfficialProductPage()){ cacheOfficialPage(); workerTick(); return; }
if(!isProductPage()&&!isComparePage()) return;
ensureUI(); registerJobListener();
try{GM_registerMenuCommand('Сверить с kuppersberg.ru', runNow);}catch(e){}
}

init();
})();
