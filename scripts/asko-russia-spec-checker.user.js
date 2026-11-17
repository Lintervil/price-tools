// ==UserScript==
// @name         ASKO: сверка характеристик (russia ↔ official)
// @namespace    asko-russia.spec-checker
// @version      1.4.4
// @description  Сверяет характеристики asko-russia.ru с ru.asko.com. v1.4.4: добавлена выгрузка отчёта в CSV (для карточки и для сравнения).
// @author       internal
// @match        https://asko-russia.ru/*
// @match        https://www.asko-russia.ru/*
// @match        https://ru.asko.com/*
// @match        https://www.ru.asko.com/*
// @connect      ru.asko.com
// @connect      www.ru.asko.com
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function () {
'use strict';
const SCRIPT_VERSION = '1.4.4';
const OFFICIAL_ORIGIN = 'https://ru.asko.com';
const GM_FETCH_TIMEOUT = 20000;
const OVERALL_TIMEOUT = 60000;
const MAX_CANDIDATE_CHECKS = 6;

const F = (id, ours, off) => ({ id, namesOurs: ours, namesOff: off || ours });
const SPEC_FIELDS = [
F('type', ['Тип', 'Тип товара'], ['Тип', 'Категория', 'Тип загрузки', 'Тип духовки']),
F('width', ['Ширина, см', 'Ширина'], ['Ширина, мм', 'Ширина, см', 'Ширина']),
F('height', ['Высота, см', 'Высота'], ['Высота, мм', 'Высота, см', 'Высота']),
F('depth', ['Глубина, см', 'Глубина'], ['Глубина, мм', 'Глубина, см', 'Глубина']),
F('niche', ['Размеры ниши, см', 'Габариты ниши для встраивания (Ш х Г), см'], ['Размеры ниши, см']),
F('mount', ['Особенности монтажа'], ['Тип установки варочной панели', 'Особенности монтажа']),
F('collection', ['Серия', 'Дизайн-линия'], ['Дизайн-линия', 'Серия']),
F('color', ['Цвет'], ['Цвет', 'Цвет корпуса', 'Цвет прибора']),
F('country', ['Страна производства', 'Страна'], ['Страна производства', 'Страна']),
F('warranty', ['Гарантия', 'Гарантия, мес', 'Гарантийный срок'], ['Гарантия', 'Гарантийный срок']),
F('sku', ['Артикул', 'Код товара', 'Модель'], ['Артикул', 'Номер модели', 'Model number']),
F('ean', ['Штрихкод', 'EAN'], ['ЕАN-код']),
F('voltage', ['Напряжение, В'], ['Напряжение', 'Напряжение (В)']),
F('freq', ['Частота, Гц'], ['Частота']),
F('weight_net', ['Вес, кг', 'Вес нетто, кг'], ['Вес нетто']),
F('weight_gross', ['Вес в упаковке, кг', 'Вес брутто, кг'], ['Вес брутто']),
F('pack_h', ['Высота упаковки, см'], ['Высота упаковки']),
F('pack_w', ['Ширина упаковки, см'], ['Ширина упаковки']),
F('pack_d', ['Глубина упаковки, см'], ['Глубина упаковки']),
F('cord', ['Длина кабеля, м', 'Длина кабеля, см', 'Длина присоединительного кабеля, см'], ['Длина присоединительного кабеля']),
F('control_type', ['Тип управления', 'Управление', 'Элементы управления'], ['Управление', 'Панель управления', 'Тип управления']),
F('switches', ['Переключатели'], ['Панель управления', 'Переключатели']),
F('display', ['Дисплей', 'Тип дисплея'], ['Дисплей', 'Тип дисплея']),
F('timer', ['Таймер'], ['Таймер']),
F('child_lock', ['Блокировка от детей', 'Защита от детей', 'Блокировка от детей (KidSafe™)'], ['Блокировка от детей', 'Защита от детей', 'Безопасность детей']),
F('power_conn', ['Мощность подключения, Вт', 'Мощность подключения, кВт'], ['Мощность подключения']),
F('energy_class', ['Класс энергопотребления'], ['Класс энергопотребления', 'Класс энергоэффективности']),
F('noise', ['Уровень шума, дБ', 'Максимальный уровень шума, дБ', 'Уровень шума при стирке, дБ', 'Уровень шума при отжиме, дБ'], ['Уровень шума, дБ', 'Уровень шума, дБ(А)']),
F('material', ['Материал', 'Материал корпуса', 'Материал прибора'], ['Материал', 'Материал прибора', 'Материал корпуса']),
F('hob_zones', ['Количество конфорок'], ['Количество зон приготовления', 'Количество конфорок']),
F('hob_total_power', ['Общая мощность конфорок, кВт'], ['Общая мощность конфорок, кВт']),
F('hob_expand', ['Зоны расширения'], ['Зоны расширения']),
F('hob_material', ['Материал панели'], ['Материал варочной панели', 'Материал панели']),
F('design_edges', ['Окантовка'], ['Края', 'Окантовка', 'Дизайн рамки']),
F('hob_grates', ['Материал решеток'], ['Материал кольца для вока', 'Материал решеток']),
F('wok', ['Конфорка повышенной мощности', 'Конфорка WOK'], ['Конфорка повышенной мощности']),
F('booster', ['Усиление мощности (Booster)', 'Функция Booster'], ['Функция Booster', 'Booster']),
F('bridge', ['Объединение конфорок (Bridge)', 'Функция Bridge'], ['Объединение конфорок (Bridge)']),
F('heat_residual', ['Индикация остаточного тепла'], ['Индикатор остаточного тепла для каждой конфорки', 'Индикация остаточного тепла']),
F('stop_go', ['Функция паузы (Stop&Go)', 'Пауза Stop&Go'], ['Функция паузы (Stop&Go)', 'Stop&Go']),
F('overheat', ['Отключение при перегреве'], ['Отключение при перегреве']),
F('pan_detect', ['Функция распознавания посуды'], ['Функция распознавания посуды']),
F('power_steps', ['Количество ступеней регулировки мощности'], ['Количество ступеней регулировки мощности']),
F('ignition', ['Электроподжиг'], ['Электроподжиг']),
F('gas_control', ['Газ-контроль'], ['Газ-контроль']),
F('gas_type', ['Тип / давление газа'], ['Тип / давление газа']),
F('burner_fl', ['Передняя левая, кВт', 'Ближняя левая, кВт'], ['Передняя левая, кВт']),
F('burner_fr', ['Передняя правая, кВт', 'Ближняя правая, кВт'], ['Передняя правая, кВт']),
F('burner_rl', ['Задняя левая, кВт', 'Дальняя левая, кВт'], ['Задняя левая, кВт']),
F('burner_rr', ['Задняя правая, кВт', 'Дальняя правая, кВт'], ['Задняя правая, кВт']),
F('burner_left', ['Левая, кВт'], ['Левая, кВт']),
F('zone_fl_cm', ['Передняя левая, см', 'Ближняя левая, см'], ['Передняя левая, см']),
F('zone_fr_cm', ['Передняя правая, см', 'Ближняя правая, см'], ['Передняя правая, см']),
F('zone_rl_cm', ['Задняя левая, см', 'Дальняя левая, см'], ['Задняя левая, см']),
F('zone_rr_cm', ['Задняя правая, см', 'Дальняя правая, см'], ['Задняя правая, см']),
F('zone_left_cm', ['Левая, см'], ['Левая, см']),
F('hood_speeds', ['Количество скоростей'], ['Количество скоростей']),
F('hood_boost', ['Функция интенсивной вентиляции (Boost+)', 'Функция бустера'], ['Функция бустера', 'Booster']),
F('hood_perf', ['Производительность, м³/ч', 'Производительность, м3/ч'], ['Макс. объем, м³/ч', 'Производительность, м³/ч']),
F('hood_light_count', ['Количество ламп'], ['Количество лампочек']),
F('hood_light_type', ['Тип освещения', 'Освещение'], ['Тип освещения', 'Освещение']),
F('hood_light_list', ['Освещение'], ['Освещение', 'Тип освещения', 'Количество лампочек']),
F('hood_filter_count', ['Количество фильтров'], ['Количество жировых фильтров', 'Количество фильтров']),
F('hood_filter_ind', ['Индикатор загрязнения фильтра'], ['Индикация загрязнения фильтра', 'Индикатор загрязнения фильтра']),
F('hood_grease', ['Жировой фильтр'], ['Жировой фильтр']),
F('hood_grease_list', ['Жировой фильтр'], ['Жировой фильтр']),
F('hood_motor', ['Мотор'], ['Мотор']),
F('hood_energy_year', ['Годовое потребление электроэнергии, кВт/ч'], ['Годовое потребление электроэнергии, кВтч', 'Ориентировочное годовое потребление электроэнергии, кВтч']),
F('hood_light_power', ['Мощность освещения, Вт'], ['Общая мощность подсветки', 'Мощность освещения, Вт']),
F('duct_d', ['Диаметр воздуховода, мм'], ['Диаметр воздуховода']),
F('oven_kind', ['Вид'], ['Тип духовки']),
F('oven_volume', ['Объем, л'], ['Объем, л']),
F('oven_temp_max', ['Максимальная температура, °С', 'Максимальная температура, °C'], ['Максимальная температура в духовке, °C', 'Максимальная температура, °C']),
F('oven_probe', ['Точный термощуп (Celsius Cooking™)', 'Термощуп'], ['Термозонд']),
F('oven_energy', ['Потребление электроэнергии (вентиляционный нагрев), кВт⋅ч'], ['Потребление электроэнергии (вентиляционный нагрев), кВтч']),
F('oven_rails', ['Телескопические направляющие'], ['Направляющие для противней', 'Телескопические направляющие']),
F('oven_door_glass', ['Количество стекол дверцы'], ['Количество стекол дверцы']),
F('oven_cool_fan', ['Вентилятор охлаждения'], ['Система вентилятора']),
F('oven_door', ['Дверца'], ['Температура поверхности дверцы']),
F('oven_soft_door', ['Плавное движение дверцы'], ['Шарнир дверцы']),
F('oven_light', ['Освещение'], ['Освещение']),
F('oven_calib', ['Калибровка температуры'], ['Калибровка температуры']),
F('oven_levels', ['Уровни приготовления, шт.'], ['Количество уровней для выпечки']),
F('oven_mw_power', ['Мощность микроволн, Вт'], ['Мощность микроволн, Вт']),
F('oven_stirrer', ['Распределение волн без вращающегося стола'], ['Технология генерации микроволн']),
F('oven_programs_count', ['Автоматические программы, шт', 'Автоматические программы, шт.'], ['Автоматические программы']),
F('oven_modes_count', ['Число режимов', 'Режимы нагрева, шт.'], ['Число режимов']),
F('oven_complect', ['Комплектация'], ['Приборы в комплекте', 'Комплектация']),
F('fridge_super_cool', ['Быстрое охлаждение (Super Сool)', 'Быстрое охлаждение (Super Cool)', 'Super Cool'], ['Super Cool']),
F('fridge_defrost', ['Система размораживания'], ['No Frost']),
F('fridge_vol', ['Общий полезный объем, л', 'Полезный объем, л'], ['Полезный объем', 'Полезный объем холодильного отделения']),
F('fridge_multibox', ['Многофункциональный контейнер (MultiBox)'], ['Контейнер для хранения сыра и масла']),
F('fridge_door_shelves', ['Количество полок на дверце'], ['Дверные полки']),
F('fridge_bottle_shelf', ['Полка для бутылок на дверце'], ['Дверная полка для бутылок']),
F('fridge_humidity', ['Автоматический контроль влажности'], ['Регулировка влажности']),
F('fridge_shelves', ['Количество полок, шт'], ['Количество съемных полок, шт.', 'Стеклянные полки, шт.']),
F('fridge_fresh', ['Зона свежести'], ['Зона свежести']),
F('fridge_adaptive', ['Адаптивный температурный контроль'], ['Адаптивный контроль температуры']),
F('fridge_alarm', ['Звуковая сигнализация', 'Световой сигнал о превышении температуры'], ['Сигнализация открытой двери']),
F('fridge_alarm_types', ['Звуковая сигнализация', 'Световой сигнал о превышении температуры'], ['Сигнализация открытой двери']),
F('fridge_feet', ['Регулировка ножек по высоте'], ['Ножки']),
F('fridge_hinge', ['Дверной упор', 'Перенавешиваемая дверь'], ['Расположение дверных шарниров']),
F('fridge_climate', ['Климатический класс', 'Климатический классс'], ['Климатический класс']),
F('fridge_energy_year', ['Годовое потребление электроэнергии, кВтч'], ['Ориентировочное годовое потребление электроэнергии, кВтч', 'Годовое потребление электроэнергии, кВтч']),
F('fridge_refrigerant', ['Хладагент'], ['Хладагент']),
F('fridge_compressors', ['Компрессор', 'Тип компрессора'], ['Тип компрессора']),
F('dw_spray', ['Зоны подачи воды (Spray™), шт.'], ['Количество зон подачи воды']),
F('dw_scs', ['Система самоочистки'], ['Система самоочистки Super Cleaning System™']),
F('dw_8steel', ['8 стальных элементов (8Steel™)', '8 стальных элементов'], ['8 стальных элементов']),
F('dw_delay', ['Отложенный старт'], ['Отсрочка старта']),
F('dw_door_open', ['Открывание двери'], ['Система сушки']),
F('dw_leak', ['Защита от протечек (AquaSafe™)', 'Защита от протечек'], ['Защита от протечек AquaSafe™', 'Система защиты от протечек AquaSafe™']),
F('dw_salt_ind', ['Индикатор наличия соли и ополаскивателя'], ['Индикация наличия ополаскивателя', 'Индикатор наличия соли']),
F('dw_statuslight', ['Индикатор окончания цикла (StatusLight™)'], ['StatusLight', 'Индикатор состояния StatusLight™']),
F('dw_antisiphon', ['Встроенный антисифон'], ['Встроенный антисифон']),
F('dw_rear_leg', ['Регулируемая задняя ножка'], ['Задняя ножка, регулируемая спереди', 'Регулируемая задняя ножка']),
F('dw_pressure', ['Требуемое давление воды при заливе, МПа'], ['Требуемое давление воды при заливе, МПа']),
F('dw_temp_max', ['Максимальная температура, °С', 'Максимальная температура, °C'], ['Макс. температура воды на заливе, °C', 'Максимальная температура, °С']),
F('dw_hoses', ['Длина заливного / сливного шланга, м'], ['Длина заливного / сливного шланга, см']),
F('dw_energy_cycle', ['Энергопотребление, кВт/ цикл'], ['Потребление электроэнергии — Нормальная программа, кВтч']),
F('dw_water_cycle', ['Расход воды на цикл, л'], ['Расход воды']),
F('dw_water_year', ['Расход воды в год, л'], ['Расход воды за год']),
F('dw_zones_boost', ['Зоны усиленной мойки'], ['Система очистки']),
F('dw_complect', ['Комплектация'], ['Комплектация', 'Приборы в комплекте']),
F('capacity', ['Максимальная загрузка, кг', 'Загрузка белья, кг', 'Загрузка, кг', 'Вместимость комплектов'], ['Максимальная загрузка', 'Загрузка', 'Вместимость']),
F('wm_programs_count', ['Количество программ', 'Количество программ сушки'], ['Количество программ', 'Количество стандартных программ']),
F('wm_delay', ['Отложенный старт', 'Таймер отсрочки старта'], ['Отсрочка старта']),
F('wm_spin', ['Скорость отжима, об/мин'], ['Скорость отжима']),
F('wm_drum_vol', ['Объем барабана, л', 'Объем, л'], ['Размер барабана', 'Объем барабана']),
F('wm_drum_light', ['Подсветка барабана'], ['Освещение барабана Load Light™']),
F('wm_door_diam', ['Диаметр люка, см'], ['Диаметр загрузочного проема']),
F('wm_leak', ['Защита от протечек'], ['Система Aqua safe']),
F('wm_overflow', ['Защита от перелива'], ['Защита от перелива']),
F('wm_balance', ['Контроль дисбаланса'], ['Контроль дисбаланса']),
F('wm_drain', ['Система слива'], ['Система слива']),
F('wm_quattro', ['Жёсткое крепление барабана (Quattro™)'], ['Внутренняя конструкция Quattro™']),
F('wm_steelseal', ['Конструкция двери'], ['Уплотнитель дверцы']),
F('wm_counterweight', ['Противовесы'], ['Противовес']),
F('wm_activedrum', ['Уникальная конструкция барабана (Active Drum™)'], ['Барабан Active Drum™: бережная и эффективная стирка', 'Active Drum']),
F('wm_dose', ['Помощник дозировки (DoseAssist)'], ['Dose assist']),
F('wm_drum_mat', ['Материал барабана'], ['Барабан', 'Бак']),
F('wm_motor', ['Мотор'], ['Мотор']),
F('wm_temp_range', ['Температура воды'], ['Диапазон температур']),
F('wm_water_connect', ['Подключение к воде'], ['Подключение к водопроводу']),
F('wm_stack', ['Возможность установки в колонну', 'Простая установка в колонну'], ['Простая установка сушильной машины на стиральную машину']),
F('wm_heater', ['Мощность нагрева, кВт'], ['Мощность нагревателя']),
F('wm_modes', ['Режимы стирки'], ['Режимы стирки']),
F('wm_settings', ['Настройки'], ['Настройки']),
F('dm_type', ['Тип сушки'], ['Тип сушильной машины']),
F('dm_door', ['Дверца'], ['Расположение дверных шарниров']),
F('dm_condensate', ['Конденсат'], ['Конденсат', 'Объем резервуара для воды']),
F('wm_load_type', ['Загрузка', 'Тип загрузки'], ['Тип загрузки'])
];

const DIM_IDS = new Set(['width', 'height', 'depth', 'wm_door_diam']);
const LONG_LIST_IDS = new Set(['wm_modes', 'wm_settings', 'dw_zones_boost', 'fridge_alarm_types', 'hood_light_list', 'hood_grease_list', 'dw_complect', 'oven_complect', 'dm_condensate']);
const MM_NAME_RE = /мм|mm/i;
const HOB_POWER_IDS = new Set(['burner_fl', 'burner_fr', 'burner_rl', 'burner_rr', 'burner_left']);
const ZONE_SIZE_IDS = new Set(['zone_fl_cm', 'zone_fr_cm', 'zone_rl_cm', 'zone_rr_cm', 'zone_left_cm']);
const POWER_CONN_IDS = new Set(['power_conn', 'wm_heater']);
const PRESENCE_IDS = new Set(['fridge_bottle_shelf', 'fridge_humidity', 'fridge_feet', 'fridge_alarm', 'oven_rails', 'oven_cool_fan', 'oven_soft_door', 'oven_probe', 'dw_scs', 'oven_stirrer', 'fridge_adaptive', 'wm_stack', 'dw_antisiphon']);

const VALUE_ALIASES = {
'*': { 'да': ['да', 'есть', 'yes', '+', 'вкл'], 'нет': ['нет', 'отсутствует', 'no', '—', '-', 'нет.'] },
type: {
'электрическая': ['электрическая', 'мультифункциональная', 'компактная духовка с функцией свч', 'hi-light', 'hilight'],
'индукционная': ['индукционная', 'индукция'],
'газовая': ['газовая', 'газ'],
'встраиваемая': ['встраиваемая', 'полностью встраиваемая']
},
color: {
'белый': ['белый', 'white', 'белое'],
'черный': ['черный', 'чёрный', 'black', 'черное', 'чёрное', 'черное стекло', 'графит'],
'серебристый': ['серебристый', 'inox', 'нержавеющая сталь', 'сталь', 'silver', 'титан']
},
country: { 'швеция': ['швеция', 'sweden'], 'словения': ['словения', 'slovenia'], 'сербия': ['сербия', 'serbia'], 'китай': ['китай', 'china'] },
mount: {
'над столешницей': ['над столешницей', 'внакладку'],
'в один уровень со столешницей': ['в один уровень со столешницей', 'вровень со столешницей']
},
control_type: {
'электронное': ['электронное', 'сенсорное', 'сенсорное управление', 'сенсор плавного контроля slidertouch', 'slidertouch', 'touch', 'по сенсору или по времени', 'сенсорные'],
'механическое': ['механическое', 'поворотные', 'ручки', 'поворотные переключатели'],
'кнопочное': ['кнопочное', 'кнопки', 'кнопочные']
},
switches: {
'сенсорные': ['сенсорные', 'сенсорные (slider touch)', 'сенсор плавного контроля slidertouch', 'сенсорное управление', 'сенсорное', 'slidertouch'],
'поворотные': ['поворотные', 'механическое', 'поворотные переключатели'],
'кнопочные': ['кнопочные', 'кнопки', 'кнопочное']
},
ignition: { 'да': ['да', 'есть', 'автоматический электроподжиг варочной поверхности', 'автоматический электроподжиг', 'электроподжиг'] },
hood_light_type: { 'светодиодное': ['светодиодное', 'led', 'светодиодное освещение'] },
child_lock: { 'да': ['да', 'есть', 'электронная блокировка дверцы', 'блокировка панели управления kidsafe', 'блокировка панели управления kidsafe™', 'блокировка панели управления'] },
dw_salt_ind: { 'да': ['да', 'есть', 'сообщение на дисплее'] },
fridge_defrost: { 'автоматическая': ['автоматическая', 'no frost в холодильном отделении', 'в холодильном отделении'] },
dw_door_open: { 'автоматическое': ['автоматическое', 'auto door open drying', 'auto door open drying™'] },
dm_type: { 'тепловой насос': ['тепловой насос'] },
collection: { 'classic': ['classic', 'классика (classic)', 'классика'], 'essence': ['essence', 'эссенция (essence)', 'эссенция'], 'logic': ['logic', 'лоджик (logic)', 'лоджик'] },
display: { 'tft': ['tft', 'цветной (tft)', 'tft дисплей с сенсорными кнопками'], 'lcd': ['lcd', 'жк-дисплей', 'жк', 'светодиодный с иконками (icon led)'] }
};

function normName(s) { return String(s || '').replace(/[«»"']/g, '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').replace(/ё/g, 'е').trim().toLowerCase(); }
function stripDecor(s) { return String(s || '').replace(/[«»"']/g, '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(); }
function parseFlexibleNumber(s) { const m = String(s || '').replace(',', '.').match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]) : null; }
function parseAllNumbers(s) { const m = String(s || '').replace(/,/g, '.').match(/\d+(?:\.\d+)?/g); return m ? m.map(Number) : []; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

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
const mm = looksMm(name, raw) && nums.some(n => n >= 80);
return nums.map(n => mm ? Math.round(n) / 10 : n);
}
function dimsEqual(a, an, b, bn) {
const pa = toCm(a, an), pb = toCm(b, bn);
if (!pa || !pb || !pa.length || pa.length !== pb.length) return false;
return pa.every((n, i) => Math.abs(n - pb[i]) < 0.051);
}
function formatCm(raw, name) {
const parts = toCm(raw, name);
if (!parts) return String(raw || '');
return parts.map(n => String(n)).join(' х ');
}
function setEqualTol(A, B, tol) {
if (!A.length || A.length !== B.length) return false;
const used = B.map(() => false);
return A.every(a => {
const i = B.findIndex((b, j) => !used[j] && Math.abs(a - b) < tol);
if (i < 0) return false; used[i] = true; return true;
});
}
function nicheSetEqual(a, b) {
const pa = parseAllNumbers(a);
const pb = parseAllNumbers(b).map(n => n >= 200 ? n / 10 : n);
if (!pa.length || !pb.length) return null;
if (pa.length === pb.length) return setEqualTol(pa, pb, 0.31);
const longer = pa.length > pb.length ? pa : pb;
const shorter = pa.length > pb.length ? pb : pa;
if (longer.length === shorter.length + 1) {
for (let i = 0; i < longer.length; i++) {
const cut = longer.slice(0, i).concat(longer.slice(i + 1));
if (setEqualTol(cut, shorter, 0.31)) return true;
}
}
return false;
}
function unitMm(raw, name) {
const s = String(raw || '');
const n = parseFlexibleNumber(s);
if (n == null) return null;
if (/мм|mm/i.test(s)) return n;
if (/см|cm/i.test(s)) return n * 10;
if (/м\b|m\b/i.test(s)) return n * 1000;
if (/мм|mm/i.test(name || '')) return n;
if (/см|cm/i.test(name || '')) return n * 10;
if (/\bм\b/i.test(name || '')) return n * 1000;
return n >= 500 ? n : (n >= 20 ? n * 10 : n * 1000);
}

function splitLongList(text) {
const s = String(text || '').replace(/<li[^>]*>/gi, '\n• ').replace(/<\/li>/gi, '').replace(/<\/?ul[^>]*>/gi, '').replace(/<br\s*\/?>/gi, '\n');
const parts = s.split(/\s*(?:\n|\/|;)\s*/).map(p => p.replace(/^[\s•\-\–\—\*]+/, '').replace(/\s+/g, ' ').trim()).filter(p => p.length >= 2);
return parts;
}
function extractItemTitle(item) {
const s = String(item || '');
const m = s.match(/^([^:;\.\–\—]{2,60}?)(?:\s*[:;]\s*|\s+[-–—]\s+|$)/);
if (m && m[1] && m[1].length >= 2) return normName(m[1]);
return normName(s);
}
function titlesSimilar(a, b) {
if (!a || !b) return false;
if (a === b) return true;
const minL = Math.min(a.length, b.length);
if (minL < 3) return false;
if (a.includes(b) || b.includes(a)) return true;
const short = a.length < b.length ? a : b;
const long = a.length < b.length ? b : a;
if (short.length >= 3 && long.startsWith(short.replace(/ый|ая|ое|ой|режим|режима|режиму$/g, ''))) return true;
return false;
}
function compareLongLists(a, b) {
const A = splitLongList(a);
const B = splitLongList(b);
if (!A.length && !B.length) return { status: null, items: { ours: [], off: [] } };
const Aitems = A.map(t => ({ text: t, title: extractItemTitle(t), ok: false }));
const Bitems = B.map(t => ({ text: t, title: extractItemTitle(t), ok: false }));
Aitems.forEach(ai => {
const j = Bitems.findIndex(bj => !bj.ok && titlesSimilar(ai.title, bj.title));
if (j >= 0) { ai.ok = true; Bitems[j].ok = true; }
});
const uO = Aitems.filter(m => !m.ok).length;
const uF = Bitems.filter(m => !m.ok).length;
let status;
if (uO === 0 && uF === 0) status = 'ok';
else if (Aitems.length - uO > 0) status = 'partial';
else status = 'diff';
return { status, items: { ours: Aitems, off: Bitems } };
}

function valuesEqual(a, b, field) {
if (a == null || b == null || a === '' || b === '') return null;
if (isYesValue(a) && isYesValue(b)) return true;
if (isNoValue(a) && isNoValue(b)) return true;
if (isYesValue(a) && isNoValue(b)) return false;
if (isNoValue(a) && isYesValue(b)) return false;
if (field && LONG_LIST_IDS.has(field.id)) {
const r = compareLongLists(a, b);
return r.status === 'ok';
}
if (field && field.id === 'niche') return nicheSetEqual(a, b);
if (field && DIM_IDS.has(field.id)) return dimsEqual(a, field.namesOurs[0], b, field.namesOff[0]);
if (field && POWER_CONN_IDS.has(field.id)) {
const na = parseFlexibleNumber(a), nb = parseFlexibleNumber(b);
if (na == null || nb == null) return null;
if (na > 0 && nb > 0) {
if (na < 100 && nb >= 100) return Math.abs(na * 1000 - nb) < Math.max(2, nb * 0.005);
if (nb < 100 && na >= 100) return Math.abs(na - nb * 1000) < Math.max(2, na * 0.005);
}
return Math.abs(na - nb) < 0.051;
}
if (field && field.id === 'cord') {
const ma = unitMm(a, field.namesOurs[0]), mb = unitMm(b, b);
if (ma == null || mb == null) return null;
return Math.abs(ma - mb) < 11;
}
if (field && field.id === 'dw_hoses') {
const ma = String(a).split('/').map(x => unitMm(x, field.namesOurs[0])).filter(x => x != null);
const mb = String(b).split('/').map(x => unitMm(x, b)).filter(x => x != null);
if (!ma.length || !mb.length || ma.length !== mb.length) return null;
return ma.every((n, i) => Math.abs(n - mb[i]) < 11);
}
if (field && (field.id === 'wm_delay' || field.id === 'dw_delay')) {
const pa = parseAllNumbers(a), pb = parseAllNumbers(b);
if (!pa.length || !pb.length) return null;
return pa[pa.length - 1] === pb[pb.length - 1];
}
if (field && field.id === 'fridge_climate') {
const ta = [...new Set((String(a).match(/\b(SN|ST|N|T)\b/g) || []).map(s => s.toUpperCase()))].sort();
const tb = [...new Set((String(b).match(/\b(SN|ST|N|T)\b/g) || []).map(s => s.toUpperCase()))].sort();
return ta.length && tb.length && ta.join(',') === tb.join(',');
}
if (field && field.id === 'display') {
const tok = s => { const m = String(s).match(/tft|lcd|fstn|led|жк/i); return m ? (m[0] === 'ЖК' ? 'lcd' : m[0].toLowerCase()) : ''; };
const ta = tok(a), tb = tok(b);
if (ta && tb) return ta === tb;
return null;
}
if (field && field.id === 'hood_grease') {
const norm = s => String(s).toLowerCase().replace(/металлическ/g, 'нержавеющая сталь');
const nb = norm(b);
const items = String(a).split(/[,;\n]+/).map(s => norm(s).trim()).filter(Boolean);
return items.length ? items.every(it => nb.includes(it)) : null;
}
if (field && field.id === 'fridge_fresh') return (isNoValue(a) === isNoValue(b));
if (field && field.id === 'dm_door') {
const aRev = /перенавеш/.test(String(a));
const bRev = /\/|влево|вправо/.test(String(b));
return aRev && bRev;
}
if (field && field.id === 'fridge_hinge') {
if (/\/|влево|вправо/.test(String(b))) return isYesValue(a) || /справа|слева|перенавеш/.test(String(a));
return normValue(a, field.id) === normValue(b, field.id);
}
if (field && field.id === 'oven_light') {
const halA = /галоген/.test(String(a)), halB = /галоген/.test(String(b));
const dblA = /двусторон|двойн/.test(String(a)), dblB = /двусторон|двойн/.test(String(b));
return halA === halB && dblA === dblB;
}
if (field && field.id === 'wm_steelseal') {
return /steel seal|стальн.*уплотн|металлич.*уплотн/i.test(String(a)) === /steel seal|стальн.*уплотн/i.test(String(b));
}
if (field && HOB_POWER_IDS.has(field.id)) {
const pa = String(a).split('/').map(x => parseFlexibleNumber(x)).filter(x => x != null);
const pb = String(b).split('/').map(x => parseFlexibleNumber(x)).filter(x => x != null);
if (!pa.length || !pb.length) return null;
const n = Math.min(pa.length, pb.length);
for (let i = 0; i < n; i++) { if (Math.abs(pa[i] - pb[i]) > 0.06) return false; }
return true;
}
if (field && ZONE_SIZE_IDS.has(field.id)) {
const pa = parseAllNumbers(a).sort((x, y) => x - y);
const pb = parseAllNumbers(b).map(n => n >= 100 ? n / 10 : n).sort((x, y) => x - y);
if (!pa.length || !pb.length) return null;
if (pa.length !== pb.length) return false;
return pa.every((n, i) => Math.abs(n - pb[i]) < 0.21);
}
if (field && field.id === 'hob_expand') {
const oc = parseFlexibleNumber(b), ourC = parseFlexibleNumber(a);
if (ourC != null && oc != null) return ourC === oc;
if (isYesValue(a) || /двухконтур/i.test(String(a))) return oc != null && oc > 0;
if (isNoValue(a)) return oc == null || oc === 0;
return null;
}
if (field && field.id === 'wok') return /wok|вок/i.test(String(a)) === /wok|вок/i.test(String(b));
if (field && field.id === 'mount') {
const normM = s => String(s).toLowerCase().replace(/ё/g, 'е').split(/[,\/;\n]+/).map(x => {
x = x.trim();
if (/внакладку|над столешницей/.test(x)) return 'над';
if (/вровень|в один уровень/.test(x)) return 'уровень';
return x;
}).filter(Boolean).sort();
const ma = normM(a), mb = normM(b);
return ma.length && mb.length && ma.join(',') === mb.join(',');
}
if (field && field.id === 'material') {
const normMat = s => String(s || '').toLowerCase().replace(/ё/g, 'е')
.replace(/нерж\.?\s*сталь|нержавейк[аи]|нержавеющ[а-яё]*|inox/g, 'нержавеющая сталь')
.replace(/\s+и\s+/g, ', ').replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ').trim();
const a1 = normMat(a), b1 = normMat(b);
if (a1 && b1 && (a1 === b1 || a1.replace(/\s/g, '') === b1.replace(/\s/g, ''))) return true;
if (a1 && b1 && (a1.includes(b1) || b1.includes(a1)) && Math.min(a1.length, b1.length) >= 4) return true;
}
if (field && field.id === 'inverter') {
const ob = /инвертор|inverter/i.test(String(b)) || isYesValue(b);
if (isYesValue(a) || /инвертор|inverter/i.test(String(a))) return ob;
}
if (field && PRESENCE_IDS.has(field.id)) return isNoValue(a) === isNoValue(b);

const na = normValue(a, field && field.id), nb = normValue(b, field && field.id);
if (na === nb || na.replace(/\s/g, '') === nb.replace(/\s/g, '')) return true;
const fa = parseFlexibleNumber(na), fb = parseFlexibleNumber(nb);
if (fa != null && fb != null && Math.abs(fa - fb) < 0.051 && String(na).length < 24 && String(nb).length < 24) return true;
if ((na.includes(nb) || nb.includes(na)) && Math.min(na.length, nb.length) >= 3) return true;
return false;
}

function formatOfficialDisplay(field, offRaw, offName) {
if (offRaw == null || offRaw === '') return { display: '', notes: [] };
const notes = [];
let display = String(offRaw);
if (field && ZONE_SIZE_IDS.has(field.id)) {
display = parseAllNumbers(offRaw).map(n => n >= 100 ? n / 10 : n).join(' / ') + ' см';
notes.push('на оф. в мм → см');
return { display, notes };
}
if (field && DIM_IDS.has(field.id)) {
display = formatCm(offRaw, offName || field.namesOff[0]);
if (MM_NAME_RE.test(offName || '') || /\d{3,}/.test(String(offRaw))) notes.push('на оф. в мм → см: ' + display);
}
return { display, notes };
}

function extractModelText(text) {
const s = String(text || '').replace(/https?:\/\/[^\s]+/gi, ' ');
const m = s.match(/\b([A-Z]{1,3}\d{2,5}[A-Z]{0,3}\d{0,4}[A-Z]{0,2})\b/i);
if (m && /\d/.test(m[1])) return m[1].toUpperCase();
const m2 = s.match(/\b([A-Z]{1,5})\s?(\d{2,4}[A-Z0-9]{2,12})(?:[\s-]+([A-Z]\b))?/);
if (m2 && /\d/.test(m2[2])) return (m2[1] + ' ' + m2[2] + (m2[3] ? ' ' + m2[3] : '')).toUpperCase();
return '';
}
function extractModel(text) {
const fromText = extractModelText(text);
if (fromText) return fromText;
const urlMatch = String(location.pathname || '').match(/asko-([a-z0-9]+)\.html/i);
if (urlMatch) { const c = urlMatch[1].toUpperCase(); if (/[A-Z].*\d/.test(c)) return c; }
return '';
}
function modelCore(model) {
const m = String(model || '').toUpperCase().match(/([A-Z]{1,5}\d{2,6})/);
return m ? m[1] : '';
}
function normModelKey(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, ''); }

function parseOursDocument(doc) {
const map = {};
doc.querySelectorAll('.characteristics__row, .spec-row, .product-specs li, .props__item, tr').forEach(row => {
const nameEl = row.querySelector('.characteristics__name, .spec-name, dt, .name, th');
const valEl = row.querySelector('.characteristics__property, .spec-value, dd, .value, td:last-child');
if (nameEl && valEl) {
const name = textOf(nameEl).trim();
let val = textOf(valEl).trim();
const ul = valEl.querySelector('ul');
if (ul) val = [...ul.querySelectorAll('li')].map(textOf).join('\n');
if (name && map[name] == null) map[name] = val;
}
});
return map;
}

const CMP_ROW_SEL = '.compare-table-block__row.js-compare-row, .compare-table__row, .compare-row';
const CMP_NAME_SEL = '.js-compare-cell-title, .compare-table__name, .compare-cell--title, th';
const CMP_CELL_SEL = '.js-compare-cell:not(.js-compare-cell-title), .compare-table__value, .compare-cell--value, td:not(:first-child)';
const CMP_CARD_SEL = '.comparison-card.comparison__items-card, .comparison-card, .compare-item, .compare-table__col';

function parseOursCompare() {
const products = [...document.querySelectorAll(CMP_CARD_SEL)].map(card => {
const a = card.querySelector('a[href*="/catalog/"]') || card.querySelector('a');
const title = (a && (a.getAttribute('title') || a.innerText)) || card.innerText;
const href = a ? a.href : '';
return { href, title: String(title).replace(/\s+/g, ' ').trim(), model: extractModel(title) || extractModel(href) };
}).filter(p => p.model);
const specs = products.map(() => ({}));
document.querySelectorAll(CMP_ROW_SEL).forEach(row => {
const name = textOf(row.querySelector(CMP_NAME_SEL));
if (!name) return;
[...row.querySelectorAll(CMP_CELL_SEL)].forEach((cell, i) => {
if (specs[i]) specs[i][name] = textOf(cell);
});
});
return products.map((p, i) => Object.assign({ specs: specs[i] || {} }, p));
}

async function waitCompareItems() {
for (let i = 0; i < 12; i++) {
const items = parseOursCompare();
if (items.length) return items;
await sleep(700);
}
return parseOursCompare();
}

function gmFetch(url, ms) {
const wait = ms || GM_FETCH_TIMEOUT;
return new Promise((resolve, reject) => {
if (!url || typeof url !== 'string') { reject(new Error('пустой URL')); return; }
let done = false;
const finish = (fn, v) => { if (done) return; done = true; fn(v); };
try {
GM_xmlhttpRequest({
method: 'GET', url, timeout: wait,
headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Referer': OFFICIAL_ORIGIN + '/' },
onload: r => finish(resolve, r),
onerror: e => finish(reject, e || new Error('net')),
ontimeout: () => finish(reject, new Error('timeout'))
});
} catch (e) { finish(reject, e); }
setTimeout(() => finish(reject, new Error('timeout')), wait + 800);
});
}

async function fetchWithRetry(url, tries, ms) {
let lastErr = null;
for (let i = 0; i < (tries || 2); i++) {
try {
const r = await gmFetch(url, ms);
if (r && (r.status === 200 || r.status === 0) && (r.responseText || '').length > 500) return r;
lastErr = new Error('http ' + (r && r.status));
} catch (e) { lastErr = e; }
await sleep(900);
}
throw lastErr || new Error('fetch failed');
}

function enrichOfficial(map) {
const entries = Object.entries(map);
const renames = [
[/super cool/i, 'Super Cool'],
[/адаптивный контроль температуры/i, 'Адаптивный контроль температуры'],
[/statuslight/i, 'StatusLight'],
[/8 steel/i, '8 стальных элементов'],
[/^барабан active drum/i, 'Active Drum'],
[/защита от протечек aquasafe/i, 'Защита от протечек (AquaSafe™)']
];
renames.forEach(([re, nk]) => {
const orig = entries.find(([k, v]) => re.test(k) && String(v).length <= 40);
if (orig && map[nk] == null) map[nk] = orig[1];
});
const zoneEntries = entries.filter(([k]) => /зоны|zone/i.test(k));
if (!getByNames(map, ['Тип'])) {
const types = zoneEntries.filter(([k]) => /тип|type/i.test(k)).map(([_, v]) => String(v).toLowerCase()).join(' ');
const all = entries.map(([k, v]) => k + ' ' + v).join(' ').toLowerCase();
if (/индукцион/.test(types) || /индукцион/.test(all)) map['Тип'] = 'индукционная';
else if (/hi-?light|radiant|powerzone|экспресс/.test(types)) map['Тип'] = 'электрическая';
else if (/вок|wok|газ/.test(all)) map['Тип'] = 'газовая';
}
const POS = [
{ canon: 'Передняя левая', re: /передней левой|left front/i },
{ canon: 'Передняя правая', re: /передней правой|front right/i },
{ canon: 'Задняя левая', re: /задней левой|rear left/i },
{ canon: 'Задняя правая', re: /задней правой|rear right/i },
{ canon: 'Левая', re: /средней слева|средняя левая|middle left/i }
];
let boostAny = false, bridgeAny = false, wokAny = false, expandCount = 0, totalW = 0, totalAny = false;
POS.forEach(p => {
let nom = null, boost = null, size = null, type = null;
entries.forEach(([k, v]) => {
if (!p.re.test(k)) return;
const kl = k.toLowerCase();
if (/тип|type/.test(kl)) type = String(v);
else if (/размер|size|Ø|мм\)/.test(kl)) size = String(v);
else if (/максимальная|^2\.|boost/.test(kl) && /мощность|power/.test(kl)) boost = parseFlexibleNumber(v);
else if (/мощность|power/.test(kl) && !/подключени/.test(kl)) nom = parseFlexibleNumber(v);
});
if (type) {
if (/bridge|мост/i.test(type)) bridgeAny = true;
if (/вок|wok/i.test(type)) wokAny = true;
if (/двухконтур|double/i.test(type)) expandCount++;
}
const kw = n => String(Math.round((n / 1000) * 100) / 100);
if (nom != null) {
totalAny = true;
totalW += (boost != null ? boost : nom);
if (boost != null) boostAny = true;
const val = kw(nom) + (boost != null ? ' / ' + kw(boost) : '');
if (map[p.canon + ', кВт'] == null) map[p.canon + ', кВт'] = val;
}
if (size != null && map[p.canon + ', см'] == null) map[p.canon + ', см'] = size;
});
if (totalAny && map['Общая мощность конфорок, кВт'] == null) map['Общая мощность конфорок, кВт'] = String(Math.round((totalW / 1000) * 100) / 100);
if (boostAny && map['Функция Booster'] == null) map['Функция Booster'] = 'да';
if (bridgeAny && map['Объединение конфорок (Bridge)'] == null) map['Объединение конфорок (Bridge)'] = 'да';
if (wokAny && map['Конфорка повышенной мощности'] == null) map['Конфорка повышенной мощности'] = 'wok';
if (zoneEntries.length && map['Зоны расширения'] == null) map['Зоны расширения'] = expandCount > 0 ? String(expandCount) : 'нет';
if (map['Размеры ниши, см'] == null) {
const hc = parseFlexibleNumber(getByNames(map, ['Мин. высота ниши']) || '');
const w = parseFlexibleNumber(getByNames(map, ['Мин. ширина ниши']) || '');
const d = parseFlexibleNumber(getByNames(map, ['Глубина (включая расстояние от стены)']) || '');
const parts = [];
if (hc != null && hc >= 20) parts.push(hc);
if (w != null) parts.push(w);
if (d != null) parts.push(d);
if (parts.length >= 2) map['Размеры ниши, см'] = parts.join(' x ');
}
const hIn = getByNames(map, ['Длина заливного шланга']);
const hOut = getByNames(map, ['Длина сливного шланга']);
if (hIn && hOut && map['Длина заливного / сливного шланга, см'] == null) {
map['Длина заливного / сливного шланга, см'] = parseFlexibleNumber(hIn) + ' / ' + parseFlexibleNumber(hOut);
}
const inst = getByNames(map, ['Установка']);
if (inst && /антисифон/.test(String(inst)) && map['Встроенный антисифон'] == null) map['Встроенный антисифон'] = 'да';
return map;
}

function parseOfficialHtml(html) {
const doc = new DOMParser().parseFromString(html, 'text/html');
const map = {};
doc.querySelectorAll('.accordeon__item').forEach(item => {
const titleEl = item.querySelector('.accordeon__item-title');
const textEl = item.querySelector('.accordeon__item-text');
if (titleEl && textEl) {
const name = textOf(titleEl).trim();
const val = textOf(textEl).trim();
if (name && val && map[name] == null) map[name] = val;
}
});
doc.querySelectorAll('script[type="application/ld+json"]').forEach(sc => {
try {
const walk = o => {
if (Array.isArray(o)) { o.forEach(walk); return; }
if (o && typeof o === 'object') {
if (o.additionalProperty) walk(o.additionalProperty);
if (typeof o.name === 'string' && o.value != null && typeof o.value !== 'object') {
const n = o.name.trim();
if (n && map[n] == null) map[n] = String(o.value);
}
Object.values(o).forEach(walk);
}
};
walk(JSON.parse(sc.textContent || 'null'));
} catch (e) {}
});
enrichOfficial(map);
const title = textOf(doc.querySelector('h1')) || doc.title || '';
return { specs: map, title };
}

function quickTitle(html) {
const m = String(html || '').match(/<title[^>]*>([^<]*)<\/title>/i);
return m ? m[1].trim() : '';
}

function findProductLinks(doc, model) {
const wanted = normModelKey(model);
const wantCore = modelCore(model);
const exact = [], loose = [];
doc.querySelectorAll('a[href]').forEach(a => {
try {
const href = a.getAttribute('href');
if (!href || href.startsWith('#')) return;
if (!/\/\d+\/?$/.test(href)) return;
const txt = (a.getAttribute('title') || '') + ' ' + a.textContent;
const m = extractModelText(txt);
if (!m) return;
const key = normModelKey(m);
const abs = href.startsWith('http') ? href : OFFICIAL_ORIGIN + (href.startsWith('/') ? href : '/' + href);
if (key === wanted) exact.push(abs);
else if (wantCore && modelCore(m) === wantCore) loose.push(abs);
} catch (e) {}
});
return { links: [...new Set(exact)].concat([...new Set(loose)]), exactCount: new Set(exact).size, looseCount: new Set(loose).size };
}

function numericProductLinks(doc) {
const out = [];
doc.querySelectorAll('a[href]').forEach(a => {
try {
const href = a.getAttribute('href');
if (href && /\/(laundry|kitchen|dishcare|accessories|professional)\/.*\/\d+\/?$/i.test(href)) {
out.push(href.startsWith('http') ? href : OFFICIAL_ORIGIN + href);
}
} catch (e) {}
});
return [...new Set(out)];
}

async function loadOfficial(model, onProgress) {
const attempts = [];
if (!model) return { notFound: true, specs: {}, error: 'no_model', attempts };
const wanted = normModelKey(model);
const wantCore = modelCore(model);
const searchUrl = OFFICIAL_ORIGIN + '/search/?q=' + encodeURIComponent(model);
if (onProgress) onProgress('Поиск на ru.asko.com: «' + model + '»');
let searchHtml = '';
try {
const res = await fetchWithRetry(searchUrl, 2);
searchHtml = res.responseText || '';
} catch (e) {
attempts.push({ u: 'search:' + model, r: 'ошибка: ' + (e.message || e) });
return { notFound: true, specs: {}, error: String(e.message || e), attempts, model };
}
const sdoc = new DOMParser().parseFromString(searchHtml, 'text/html');
const fr = findProductLinks(sdoc, model);
let cands = fr.links;
attempts.push({ u: 'search:' + model, r: 'точных: ' + fr.exactCount + ', похожих: ' + fr.looseCount });
if (!cands.length) {
cands = numericProductLinks(sdoc).slice(0, 6);
attempts.push({ u: 'search:fallback', r: 'числовых ссылок: ' + cands.length });
}
if (!cands.length) return { notFound: true, specs: {}, error: 'not_found_in_search', attempts, model };
for (let i = 0; i < Math.min(cands.length, MAX_CANDIDATE_CHECKS); i++) {
const url = cands[i];
const short = url.replace(OFFICIAL_ORIGIN, '');
if (onProgress) onProgress('Проверяю карточку ' + (i + 1) + '/' + Math.min(cands.length, MAX_CANDIDATE_CHECKS) + ': ' + short);
try {
const res = await fetchWithRetry(url, 2);
const html = res.responseText || '';
const parsed = parseOfficialHtml(html);
const pageTitle = parsed.title || quickTitle(html);
const pageModel = extractModelText(pageTitle);
const pageKey = normModelKey(pageModel);
const pageCore = modelCore(pageModel);
if (pageCore && pageCore !== wantCore) { attempts.push({ u: short, r: 'другая модель: ' + (pageModel || '?') }); continue; }
if (pageKey && pageKey !== wanted && pageKey.indexOf(wanted) !== 0 && wanted.indexOf(pageKey) !== 0) { attempts.push({ u: short, r: 'другая модель: ' + (pageModel || '?') }); continue; }
const specCount = Object.keys(parsed.specs).length;
attempts.push({ u: short, r: 'полей: ' + specCount });
if (specCount < 3) continue;
parsed.url = url;
parsed.model = model;
return { found: true, specs: parsed.specs, url: url, title: pageTitle, model: model, attempts, source: 'html' };
} catch (e) {
attempts.push({ u: short, r: 'ошибка: ' + (e.message || e) });
}
}
return { notFound: true, specs: {}, error: 'no_matching_card', attempts, model };
}

const PROG_LIST_KEYS = ['Основные программы', 'Дополнительные функции', 'Специальные программы', 'Программы', 'Опции и режимы'];
const MODE_RULES = [
{id:'ov_trad', our:/^классический нагрев$/, off:/^нагрев снизу\+сверху$/},
{id:'ov_trad_fan', our:/классический нагрев \+ вентилятор/, off:/нагрев снизу\+сверху\+вентилятор/},
{id:'ov_bottom_fan', our:/нижний нагрев \+ вентиляционный/, off:/вент\. нагрев\+нагрев снизу/},
{id:'ov_bottom_grill', our:/^нижний нагрев \+ гриль$/, off:/^нагрев снизу\+гриль$/},
{id:'ov_bg_fan', our:/нижний нагрев \+ гриль \+ вентилятор/, off:/нагрев снизу\+гриль\+вентилятор/},
{id:'ov_grill', our:/^гриль большой площади$/, off:/^большой гриль \(/},
{id:'ov_grill_bottom', our:/^гриль большой площади \+ нагрев снизу$/, off:/^большой гриль\+нагрев снизу$/},
{id:'ov_grill_fan', our:/^гриль большой площади \+ вентилятор$/, off:/^большой гриль\+вентилятор$/},
{id:'ov_grill_bf', our:/гриль большой площади \+ нагрев снизу \+ вентиляционный/, off:/большой гриль\+нагрев снизу\+вент/},
{id:'ov_conv', our:/объемный горячий воздух|конвекция \/ вентиляционный|горячий воздух \//, off:/^вент\. нагрев$/},
{id:'ov_eco', our:/экоприготовление|вентиляционный нагрев эко|горячий воздух эко/, off:/вент\. нагрев эко/},
{id:'ov_airfry', our:/интенсивное запекание \(airfry\)/, off:/интенсивное запекание airfry/},
{id:'ov_defrost', our:/^размораживание$/, off:/^разморозка$/},
{id:'ov_preheat', our:/быстрый разогрев|быстрый нагрев духовки/, off:/^разогрев$/},
{id:'ov_warmplate', our:/подогрев посуды \(warmplate\)|^подогрев посуды$/, off:/подогрев посуды/},
{id:'ov_staywarm', our:/подогрев блюд \(staywarm\)|поддержание температуры/, off:/поддержание температуры блюда/},
{id:'ov_dough', our:/подъем теста/, off:/подъем теста/},
{id:'ov_steril', our:/пастеризация|стерилизация/, off:/стерилизация/},
{id:'ov_can', our:/консервация|консервирование/, off:/консервирование/},
{id:'ov_dry', our:/^сушка$/, off:/^сушка$/},
{id:'ov_sabbath', our:/шаббат/, off:/шаббат/},
{id:'wm_cotton', our:/^хлопок$/, off:/^хлопок$/},
{id:'wm_mix', our:/микс\/синтетика/, off:/микс\/синтетика/},
{id:'wm_eco', our:/экономичная стирка/, off:/эко 40/},
{id:'wm_sport', our:/^спорт$/, off:/^спорт$/},
{id:'wm_white', our:/белое белье/, off:/белое белье/},
{id:'wm_color', our:/цветное белье/, off:/цветное белье/},
{id:'wm_outdoor', our:/верхняя одежда/, off:/верхняя одежда/},
{id:'wm_delic', our:/деликатная стирка/, off:/деликатное белье/},
{id:'wm_wool', our:/шерсть\/ручная/, off:/стирка шерсти\/ручная стирка/},
{id:'wm_rinse', our:/^полоскание$/, off:/^полоскание$/},
{id:'wm_spin', our:/отжим и слив/, off:/отжим|слив/},
{id:'wm_time', our:/^по времени$/, off:/по времени/},
{id:'wm_clean', our:/очистка барабана/, off:/очистка барабана/},
{id:'dw_intens', our:/^интенсивная$/, off:/^интенсивная$/},
{id:'dw_quick', our:/^быстрая$/, off:/быстр/},
{id:'dw_eco', our:/^эко$/, off:/экологичная/},
{id:'dw_daily', our:/^ежедневная$/, off:/^ежедневная$/},
{id:'dw_sani', our:/гигиеничная/, off:/гигиена/},
{id:'dw_prerinse', our:/предварительное ополаскивание/, off:/предварительное ополаскивание/},
{id:'dw_odor', our:/удаление запахов/, off:/удаление запахов/},
{id:'dw_self', our:/^самоочистка$/, off:/^самоочистка$/}
];
function programRows(oursMap, offMap) {
const items = [];
PROG_LIST_KEYS.forEach(k => {
const v = getByNames(offMap, [k]);
if (v) String(v).split('/').forEach(s => { const t = s.trim(); if (t) items.push(normName(t)); });
});
if (!items.length) return [];
const rows = [];
const used = new Set();
MODE_RULES.forEach(r => {
const ourKey = Object.keys(oursMap).find(k => !used.has(k) && r.our.test(normName(k)) && (isYesValue(oursMap[k]) || isNoValue(oursMap[k])));
if (!ourKey) return;
used.add(ourKey);
const present = items.some(t => r.off.test(t));
const oursYes = isYesValue(oursMap[ourKey]);
rows.push({ id: 'prog:' + r.id, name: ourKey, ours: oursMap[ourKey], off: present ? 'да' : 'нет', offDisplay: present ? 'есть в списке оф. сайта' : 'нет в списке оф. сайта', notes: ['программа сверена по списку оф. сайта'], status: oursYes === present ? 'ok' : 'diff' });
});
return rows;
}

function compareSpecs(oursMap, offMap) {
const rows = [];
SPEC_FIELDS.forEach(field => {
const oursVal = getByNames(oursMap, field.namesOurs);
const offVal = getByNames(offMap, field.namesOff.concat(field.namesOurs));
if (oursVal == null && offVal == null) return;
const offNameHit = field.namesOff.concat(field.namesOurs).find(n => Object.keys(offMap).some(k => normName(k) === normName(n))) || field.namesOff[0] || '';
const fmt = formatOfficialDisplay(field, offVal, offNameHit);
let status = 'only_one';
let items = null;
if (field && LONG_LIST_IDS.has(field.id) && oursVal != null && offVal != null) {
const lr = compareLongLists(oursVal, offVal);
status = lr.status || 'only_one';
items = lr.items;
} else if (oursVal != null && offVal != null) {
status = valuesEqual(oursVal, offVal, field) ? 'ok' : 'diff';
} else {
status = oursVal != null ? 'only_ours' : 'only_off';
}
rows.push({ id: field.id, name: field.namesOurs[0], ours: oursVal, off: offVal, offDisplay: fmt.display || offVal, notes: fmt.notes, status, items });
});
return rows.concat(programRows(oursMap, offMap));
}

function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function copyText(s) { try { GM_setClipboard(s, 'text'); } catch (e) { navigator.clipboard && navigator.clipboard.writeText(s); } }
function miniIcon(status) { return status === 'diff' ? '❌' : (status === 'ok' ? '✔️' : (status === 'partial' ? '⚠️' : '❕')); }
function statusTitle(status) { return status === 'diff' ? 'Расхождение' : (status === 'ok' ? 'Совпадает' : (status === 'partial' ? 'Частичное совпадение: часть пунктов отличается' : 'Только с одной стороны')); }
function marksHtml(marks) { return (marks || []).map(m => '<div class="kb-li ' + (m.ok ? 'kb-li-ok' : 'kb-li-diff') + '">' + (m.ok ? '✅' : '❌') + ' ' + escapeHtml(m.text) + '</div>').join(''); }

/* ── НОВОЕ v1.4.4: CSV-экспорт ── */
function statusLabel(status) {
switch (status) {
case 'ok': return 'совпало';
case 'diff': return 'расхождение';
case 'partial': return 'частично';
case 'only_ours': return 'только у нас';
case 'only_off': return 'только оф.';
default: return status || '';
}
}
function csvEscape(v) {
const s = String(v == null ? '' : v).replace(/\r\n|\r|\n/g, ' / ').replace(/"/g, '""');
return '"' + s + '"';
}
function flattenItemsForCsv(marks, side) {
if (!marks || !marks.length) return '';
return marks.map(m => (m.ok ? '✅' : '❌') + ' ' + m.text).join(' | ');
}
function buildCsvRows(entries) {
const header = ['URL', 'Модель', 'Название товара', 'Поле', 'У нас', 'Оф. сайт', 'Статус', 'Заметки'];
const rows = [header.map(csvEscape).join(';')];
entries.forEach(e => {
const offText = e.rec.items ? flattenItemsForCsv(e.rec.items.off, 'off') : (e.rec.offDisplay || e.rec.off || '');
const oursText = e.rec.items ? flattenItemsForCsv(e.rec.items.ours, 'ours') : (e.rec.ours || '');
const notes = (e.rec.notes || []).join(' | ');
rows.push([e.url, e.model, e.title, e.rec.name, oursText, offText, statusLabel(e.rec.status), notes].map(csvEscape).join(';'));
});
return rows.join('\r\n');
}
function downloadCsvText(text, filename) {
const blob = new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8' });
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = filename;
document.body.appendChild(a);
a.click();
a.remove();
setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function safeFilename(s) {
return String(s || 'report').replace(/[^\wА-Яа-я\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'report';
}
function downloadProductCsv() {
if (!lastReport || lastReport.type !== 'product') return;
const entries = lastReport.rows.map(r => ({
url: location.href,
model: lastReport.model || '',
title: lastReport.title || '',
rec: r
}));
const text = buildCsvRows(entries);
const fn = 'asko-spec-' + safeFilename(lastReport.model || lastReport.title) + '.csv';
downloadCsvText(text, fn);
}
function downloadCompareCsv() {
if (!lastReport || lastReport.type !== 'compare') return;
const entries = [];
lastReport.items.forEach(it => {
(it.rows || []).forEach(r => {
entries.push({
url: location.origin + (it.href || ''),
model: it.model || '',
title: it.title || '',
rec: r
});
});
});
const text = buildCsvRows(entries);
const fn = 'asko-compare-' + new Date().toISOString().slice(0, 10) + '.csv';
downloadCsvText(text, fn);
}

GM_addStyle(`
#asko-spec-root{position:fixed;right:16px;bottom:16px;z-index:2147483646;font-family:Arial,sans-serif}
#asko-spec-toggle{background:#003057;color:#fff;border:0;border-radius:18px;padding:7px 12px;cursor:pointer;font-size:12px;font-weight:600}
#asko-spec-toggle.diff{background:#b42318}#asko-spec-toggle.ok{background:#067647}#asko-spec-toggle.wait{background:#b54708}#asko-spec-toggle.partial{background:#b45309}
#asko-spec-panel{display:none;position:fixed;right:12px;bottom:52px;width:min(480px,calc(100vw - 16px));max-height:min(62vh,520px);overflow:auto;background:#fff;color:#111;border-radius:10px;box-shadow:16px 50px rgba(0,0,0,.28);border:1px solid #e5e5e5}
#asko-spec-panel.open{display:block}
#asko-spec-panel header{position:sticky;top:0;background:#003057;color:#fff;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;z-index:2}
#asko-spec-panel header b{font-size:12px}#asko-spec-panel header .kb-ver{opacity:.75;font-size:10px;margin-left:6px}
#asko-spec-panel header button{background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:5px;padding:3px 7px;cursor:pointer;font-size:11px}
.kb-meta{padding:5px 10px;font-size:11px;color:#444;border-bottom:1px solid #eee}.kb-meta a{color:#003057}
.kb-meta details{margin:2px 0}.kb-meta summary{cursor:pointer;color:#003057}
.kb-meta details div{padding:2px 0 2px 8px;color:#777;font-size:10px;white-space:pre-line;font-family:monospace}
.kb-table{width:100%;border-collapse:collapse;font-size:11px}.kb-table th,.kb-table td{padding:4px 8px;border-bottom:1px solid #f0f0f0;vertical-align:top;text-align:left;white-space:pre-line}.kb-table th{background:#fafafa;position:sticky;top:36px}
.kb-st-diff{background:#fef3f2}.kb-st-partial{background:#fff8e1}
.kb-chip{display:inline-block;padding:1px 7px;border-radius:10px;background:#f2f2f2;margin-right:4px;font-size:10px}
.kb-notfound{background:#fff8e1;border-left:3px solid #f59e0b;padding:8px 10px;font-size:12px;color:#5b4300}
.kb-searchlink{display:inline-block;margin:6px 10px;padding:5px 12px;background:#003057;color:#fff !important;border-radius:6px;text-decoration:none;font-weight:600;font-size:12px;border:0;cursor:pointer}
.kb-csv-btn{display:inline-block;margin:6px 10px;padding:6px 14px;background:#067647;color:#fff !important;border-radius:6px;text-decoration:none;font-weight:600;font-size:12px;border:0;cursor:pointer}
.kb-csv-btn:hover{background:#04553b}
.kb-status{margin-left:6px;font-size:13px;line-height:1;vertical-align:middle;cursor:default}
.kb-showbtn{margin-left:6px;font-size:10px;line-height:1.5;border:1px solid #d0d7de;background:#fff;border-radius:10px;padding:1px 8px;cursor:pointer;color:#003057;vertical-align:middle}
.kb-row-ok .characteristics__property{background:#e9f7ef !important}
.kb-row-diff .characteristics__property{background:#fdecea !important}
.kb-row-partial .characteristics__property{background:#fff8e1 !important;box-shadow:inset 3px 0 0 #f59e0b}
.kb-cell-ok{background:#e9f7ef !important}
.kb-cell-diff{background:#fdecea !important;box-shadow:inset 0 -2px 0 #b42318}
.kb-cell-partial{background:#fff8e1 !important;box-shadow:inset 0 -2px 0 #f59e0b}
.kb-li{margin:2px 0;padding:3px 6px;border-radius:3px;font-size:11px;white-space:pre-line}
.kb-li-ok{background:#e9f7ef;color:#065f46;border-left:3px solid #067647}
.kb-li-diff{background:#fdecea;color:#991b1b;border-left:3px solid #b42318}
.kb-pop{position:absolute;z-index:2147483647;width:360px;background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.18);padding:10px;font-size:12px}
.kb-pop .kb-offval{margin:6px 0;padding:6px;background:#f6f6f6;border-radius:4px;white-space:pre-line}
.kb-pop .kb-note{white-space:pre-line;margin-top:2px;color:#666}
.kb-pop .kb-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.kb-pop button{font-size:11px;padding:4px 8px;border-radius:4px;border:1px solid #ccc;background:#003057;color:#fff;cursor:pointer}.kb-pop button.sec{background:#fff;color:#111}
`);

let lastReport = null;

function ensureUI() {
if (document.getElementById('asko-spec-root')) return;
const root = document.createElement('div');
root.id = 'asko-spec-root';
root.innerHTML = `<button type="button" id="asko-spec-toggle">Сверка ASKO v${SCRIPT_VERSION}</button>
<div id="asko-spec-panel">
<header><b>Сверка с ru.asko.com <span class="kb-ver">v${SCRIPT_VERSION}</span></b>
<span><button type="button" id="kb-run">Запустить</button> <button type="button" id="kb-close">Закрыть</button></span></header>
<div id="kb-spec-body"><div class="kb-meta">Нажмите «Запустить».</div></div>
</div>`;
document.body.appendChild(root);
document.getElementById('asko-spec-toggle').onclick = () => document.getElementById('asko-spec-panel').classList.toggle('open');
document.getElementById('kb-close').onclick = () => document.getElementById('asko-spec-panel').classList.remove('open');
document.getElementById('kb-run').onclick = () => runNow();
}

function setBody(html) { const el = document.getElementById('kb-spec-body'); if (el) el.innerHTML = html; }

let panelPops = [];
function closeKbPop() { document.querySelectorAll('.kb-pop').forEach(n => n.remove()); }

function showSpecPop(anchor, rec) {
closeKbPop();
const pop = document.createElement('div');
pop.className = 'kb-pop';
const oursBlock = rec.items
? '<div>У нас:</div><div class="kb-offval">' + marksHtml(rec.items.ours) + '</div>'
: '<div>У нас:</div><div class="kb-offval">' + escapeHtml(rec.ours || '—') + '</div>';
const offBlock = rec.items
? marksHtml(rec.items.off)
: escapeHtml(rec.offDisplay || rec.off || '—');
pop.innerHTML = `<b>${escapeHtml(rec.name)}</b>
${oursBlock}
<div>На оф. сайте:</div><div class="kb-offval">${offBlock}</div>
${(rec.notes || []).map(n => `<div class="kb-note">${escapeHtml(n)}</div>`).join('')}
<div class="kb-actions">
<button type="button" class="kb-copy">Копировать оф.</button>
<button type="button" class="sec kb-close-pop">Закрыть</button>
</div>`;
document.body.appendChild(pop);
const r = anchor.getBoundingClientRect();
pop.style.left = Math.min(innerWidth - 380, Math.max(8, r.left + scrollX)) + 'px';
pop.style.top = (r.bottom + scrollY + 6) + 'px';
pop.querySelector('.kb-copy').onclick = () => {
copyText(rec.items ? rec.items.off.map(m => m.text).join('\n') : (rec.offDisplay || rec.off));
pop.querySelector('.kb-copy').textContent = 'Скопировано';
};
pop.querySelector('.kb-close-pop').onclick = closeKbPop;
}

document.addEventListener('click', e => { if (!e.target.closest('.kb-pop, .kb-showbtn')) closeKbPop(); });

function renderProductBlock(title, model, official, rows) {
const diffs = rows.filter(r => r.status === 'diff');
const partials = rows.filter(r => r.status === 'partial');
const ok = rows.filter(r => r.status === 'ok').length;
const only = rows.filter(r => r.status === 'only_ours' || r.status === 'only_off').length;
const url = official.url || '';
const offCount = Object.keys(official.specs || {}).length;
if (official.notFound) {
const attemptsHtml = official.attempts && official.attempts.length
? `<details class="kb-meta" open><summary>🔍 Журнал попыток (Debug)</summary><div>${official.attempts.map(a => `<b>🔗 ${escapeHtml(a.u)}</b><br>➡️ ${escapeHtml(a.r)}`).join('<br><br>')}</div></details>`
: '';
const searchLink = `<a class="kb-searchlink" href="${OFFICIAL_ORIGIN}/search/?q=${encodeURIComponent(model)}" target="_blank">🔎 Искать «${escapeHtml(model)}» на ru.asko.com вручную</a>`;
return `<div class="kb-meta">${escapeHtml(title || '')}</div>
<div class="kb-meta">Модель: <b>${escapeHtml(model || 'Не определена')}</b></div>
<div class="kb-notfound">⚠ Не удалось автоматически найти и прочитать карточку на официальном сайте.</div>
${attemptsHtml}${searchLink}`;
}
const problem = diffs.concat(partials);
const rowsHtml = problem.map(r => {
const idx = panelPops.length;
panelPops.push({ rec: r });
const oursCell = r.items ? marksHtml(r.items.ours) : escapeHtml(r.ours || '—');
const offCell = r.items ? marksHtml(r.items.off) : escapeHtml(r.offDisplay || r.off || '—');
return `<tr class="${r.status === 'partial' ? 'kb-st-partial' : 'kb-st-diff'}">
<td>${escapeHtml(r.name)}</td>
<td>${oursCell}</td>
<td>${offCell}</td>
<td><button type="button" class="kb-showbtn" data-pop="${idx}">${r.status === 'partial' ? '⚠️' : '❌'}</button></td>
</tr>`;
}).join('');
return `<div class="kb-meta">${escapeHtml(title || '')}</div>
<div class="kb-meta"><span class="kb-chip">расхожд.: ${diffs.length}</span><span class="kb-chip">частично: ${partials.length}</span><span class="kb-chip">совпало: ${ok}</span><span class="kb-chip">только с одной стороны: ${only}</span><span class="kb-chip">оф. полей: ${offCount}</span></div>
<div class="kb-meta">Модель: <b>${escapeHtml(model || '')}</b> · <a href="${escapeHtml(url)}" target="_blank">открыть оф. карточку</a></div>
<table class="kb-table"><thead><tr><th>Поле</th><th>У нас</th><th>Оф.</th><th></th></tr></thead>
<tbody>${rowsHtml || '<tr><td colspan="4" style="text-align:center; padding:10px; color:green;">Расхождений не найдено ✔️</td></tr>'}</tbody></table>
<button type="button" class="kb-csv-btn" data-act="csv-product">⬇ Скачать отчёт CSV</button>`;
}

function bindPanelPops() {
document.querySelectorAll('#kb-spec-body .kb-showbtn[data-pop]').forEach(b => {
b.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); const p = panelPops[+b.getAttribute('data-pop')]; if (p) showSpecPop(b, p.rec); };
});
}

function paintListCell(row, marks) {
const valEl = row.querySelector('.characteristics__property');
if (!valEl || !marks || !marks.length) return;
const ul = valEl.querySelector('ul');
if (ul) {
const lis = [...ul.querySelectorAll('li')];
if (lis.length === marks.length) {
lis.forEach((li, i) => { li.classList.add('kb-li', marks[i].ok ? 'kb-li-ok' : 'kb-li-diff'); });
return;
}
}
const div = document.createElement('div');
div.className = 'kb-marks';
div.style.marginTop = '4px';
div.innerHTML = marksHtml(marks);
valEl.parentNode && valEl.parentNode.insertBefore(div, valEl.nextSibling);
}

function highlightProductPage(rows) {
document.querySelectorAll('.characteristics__row, .spec-row, .product-specs li').forEach(row => {
row.classList.remove('kb-row-diff', 'kb-row-ok', 'kb-row-partial');
row.querySelectorAll('.kb-status,.kb-showbtn,.kb-marks').forEach(n => n.remove());
row.querySelectorAll('li').forEach(li => li.classList.remove('kb-li', 'kb-li-ok', 'kb-li-diff'));
});
document.querySelectorAll('.characteristics__row, .spec-row, .product-specs li').forEach(row => {
const name = textOf(row.querySelector('.characteristics__name, .spec-name, dt, .name'));
const field = findFieldByName(name);
const rec = rows.find(r => (field && r.id === field.id) || normName(r.name) === normName(name));
if (!rec || rec.status === 'only_ours' || rec.status === 'only_off') return;
row.classList.add(rec.status === 'diff' ? 'kb-row-diff' : (rec.status === 'partial' ? 'kb-row-partial' : 'kb-row-ok'));
if (rec.items) paintListCell(row, rec.items.ours);
const target = row.querySelector('.characteristics__name, .spec-name, dt, .name') || row;
const st = document.createElement('span');
st.className = 'kb-status';
st.textContent = miniIcon(rec.status);
st.title = statusTitle(rec.status);
const btn = document.createElement('button');
btn.type = 'button';
btn.className = 'kb-showbtn';
btn.textContent = 'оф.';
btn.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); showSpecPop(btn, rec); };
target.appendChild(st);
target.appendChild(btn);
});
}

function highlightCompare(packs) {
document.querySelectorAll(CMP_ROW_SEL).forEach(row => {
const name = textOf(row.querySelector(CMP_NAME_SEL));
const field = findFieldByName(name);
if (!field) return;
[...row.querySelectorAll(CMP_CELL_SEL)].forEach((cell, i) => {
const pack = packs[i]; if (!pack) return;
cell.querySelectorAll('.kb-status,.kb-showbtn,.kb-marks').forEach(n => n.remove());
cell.classList.remove('kb-cell-ok', 'kb-cell-diff', 'kb-cell-partial');
cell.querySelectorAll('li').forEach(li => li.classList.remove('kb-li', 'kb-li-ok', 'kb-li-diff'));
if (pack.session && pack.session.found === false) return;
const rec = pack.rows.find(r => r.id === field.id || normName(r.name) === normName(name));
if (!rec || rec.status === 'only_ours' || rec.status === 'only_off') return;
cell.classList.add(rec.status === 'diff' ? 'kb-cell-diff' : (rec.status === 'partial' ? 'kb-cell-partial' : 'kb-cell-ok'));
if (rec.items) {
const div = document.createElement('div');
div.className = 'kb-marks';
div.style.marginTop = '4px';
div.innerHTML = marksHtml(rec.items.ours);
cell.appendChild(div);
}
const st = document.createElement('span');
st.className = 'kb-status';
st.textContent = miniIcon(rec.status);
st.title = statusTitle(rec.status);
const btn = document.createElement('button');
btn.type = 'button';
btn.className = 'kb-showbtn';
btn.textContent = 'оф.';
btn.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); showSpecPop(btn, rec); };
cell.appendChild(st);
cell.appendChild(btn);
});
});
}

async function runProduct() {
const title = textOf(document.querySelector('h1')) || document.title;
const model = extractModel(title) || extractModel(location.pathname);
const ours = parseOursDocument(document);
setBody(`<div class="kb-meta">Модель: <b>${escapeHtml(model || 'Не определена')}</b>. Ищу на ru.asko.com...</div>`);
let official;
try {
official = await Promise.race([
loadOfficial(model, msg => setBody(`<div class="kb-meta">${escapeHtml(msg)}</div>`)),
new Promise(res => setTimeout(() => res({ notFound: true, specs: {}, error: 'timeout', model, attempts: [{ u: 'timeout', r: 'Превышено время ожидания' }] }), OVERALL_TIMEOUT))
]);
} catch (e) {
official = { notFound: true, specs: {}, error: String(e), model };
}
const rows = compareSpecs(ours, official.specs || {});
highlightProductPage(rows);
panelPops = [];
lastReport = { type: 'product', title, model, url: official.url || location.href, rows };
setBody(renderProductBlock(title, model, official, rows));
bindPanelPops();
const t = document.getElementById('asko-spec-toggle');
if (t) {
const d = rows.filter(r => r.status === 'diff').length;
const p = rows.filter(r => r.status === 'partial').length;
t.className = official.notFound ? 'wait' : (d ? 'diff' : (p ? 'partial' : (rows.some(r => r.status === 'ok') ? 'ok' : '')));
const parts = [];
if (d) parts.push(d + ' расхожд.');
if (p) parts.push(p + ' частич.');
t.textContent = official.notFound ? 'Сверка: не найдено' : (parts.length ? `Сверка: ${parts.join(', ')}` : 'Сверка: совпало');
}
document.getElementById('asko-spec-panel').classList.add('open');
}

async function runCompare() {
setBody('<div class="kb-meta">Ищу товары на странице сравнения…</div>');
const items = await waitCompareItems();
if (!items.length) { setBody('<div class="kb-meta">Товары для сравнения не найдены</div>'); return; }
const blocks = [], packs = [];
let anyDiff = 0, anyPartial = 0, notFound = 0;
panelPops = [];
const compareItems = [];
for (let i = 0; i < items.length; i++) {
const item = items[i];
const model = item.model || extractModel(item.title);
setBody(`<div class="kb-meta">Проверка ${i + 1}/${items.length}: <b>${escapeHtml(model || item.title)}</b>…</div>`);
let official;
try { official = await loadOfficial(model); }
catch (e) { official = { notFound: true, specs: {}, error: String(e), model }; }
if (official.notFound) notFound++;
const rows = compareSpecs(item.specs || {}, official.specs || {});
anyDiff += rows.filter(r => r.status === 'diff').length;
anyPartial += rows.filter(r => r.status === 'partial').length;
packs.push({ rows, session: { url: official.url || '', found: !official.notFound } });
compareItems.push({ title: item.title, model, href: item.href, rows });
blocks.push(renderProductBlock(item.title, model, official, rows));
}
highlightCompare(packs);
lastReport = { type: 'compare', items: compareItems };
setBody(blocks.join('') + `<button type="button" class="kb-csv-btn" data-act="csv-compare">⬇ Скачать общий отчёт по сравнению (CSV)</button>`);
bindPanelPops();
const t = document.getElementById('asko-spec-toggle');
if (t) {
t.className = anyDiff ? 'diff' : (anyPartial ? 'partial' : (anyDiff === 0 && anyPartial === 0 && notFound === 0 ? 'ok' : 'wait'));
const parts = [];
if (anyDiff) parts.push(anyDiff + ' расхожд.');
if (anyPartial) parts.push(anyPartial + ' частич.');
if (notFound) parts.push(notFound + ' не найдено');
t.textContent = parts.length ? `Сверка: ${parts.join(', ')}` : 'Сверка: совпало';
}
document.getElementById('asko-spec-panel').classList.add('open');
}

async function runNow() {
document.getElementById('asko-spec-panel').classList.add('open');
if (location.pathname.includes('/compare/')) await runCompare();
else await runProduct();
}

function bindPanelActions() {
document.getElementById('kb-spec-body').addEventListener('click', e => {
const btn = e.target.closest('[data-act]');
if (!btn) return;
const act = btn.getAttribute('data-act');
if (act === 'csv-product') {
downloadProductCsv();
btn.textContent = '✓ Скачано';
setTimeout(() => { btn.textContent = '⬇ Скачать отчёт CSV'; }, 2000);
} else if (act === 'csv-compare') {
downloadCompareCsv();
btn.textContent = '✓ Скачано';
setTimeout(() => { btn.textContent = '⬇ Скачать общий отчёт по сравнению (CSV)'; }, 2000);
}
});
}

function init() {
if (!location.hostname.includes('asko-russia.ru')) return;
ensureUI();
bindPanelActions();
try { GM_registerMenuCommand('Сверить с ru.asko.com', runNow); } catch (e) {}
}

init();
})();
