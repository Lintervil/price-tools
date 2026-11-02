// ==UserScript==
// @name         Kaiser: сверка характеристик (kaiser-store ↔ kaiser.ru & kaiser-olan.de)
// @namespace    kaiser-store.spec-checker
// @version      2.1.3
// @description  Глубокая смысловая сверка характеристик kaiser-store.ru с kaiser.ru и kaiser-olan.de (прозрачный поиск, ручной ввод URL, прямая ссылка на выдачу)
// @author       internal
// @updateURL    https://lintervil.github.io/price-tools/scripts/kaiser-spec-checker.user.js
// @downloadURL  https://lintervil.github.io/price-tools/scripts/kaiser-spec-checker.user.js
// @match        https://kaiser-store.ru/*
// @match        https://www.kaiser-store.ru/*
// @match        https://kaiser.ru/*
// @match        https://www.kaiser.ru/*
// @match        https://kaiser-olan.de/*
// @match        https://kaiser-olan.de/*
// @connect      kaiser.ru
// @connect      www.kaiser.ru
// @connect      kaiser-olan.de
// @connect      www.kaiser-olan.de
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

    const SCRIPT_VERSION = '2.1.3';
    const RU_ORIGIN = 'https://kaiser.ru';
    const DE_ORIGIN = 'https://kaiser-olan.de';
    const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

    function normKey(s) {
        return String(s || '')
            .toLowerCase()
            .replace(/ё/g, 'е')
            .replace(/[«»"'*:]/g, '')
            .replace(/\s*[\(\[,]\s*(см|cм|мм|m|л|l|кг|kg|квт|kw|вт|w|в|v|гц|hz|мес|дб|db|об\/мин|шт|°c|c)\.?\s*[\)\]]?/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function latinize(s) {
        const m = { 'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'Р': 'P', 'Т': 'T', 'О': 'O', 'Х': 'X', 'К': 'K', 'М': 'M',
                    'а': 'A', 'е': 'E', 'о': 'O', 'р': 'P', 'с': 'C', 'х': 'X', 'к': 'K', 'м': 'M' };
        return String(s || '').replace(/[АВСЕНРТОХКМаеорсхкм]/g, c => m[c] || c);
    }

    function parseFlexibleNumber(s) {
        const m = String(s || '').replace(',', '.').match(/-?\d+(?:\.\d+)?/);
        return m ? Number(m[0]) : null;
    }

    function parseAllNumbers(s) {
        const m = String(s || '').replace(/,/g, '.').match(/\d+(?:\.\d+)?/g);
        return m ? m.map(Number).filter(n => isFinite(n)) : [];
    }

    function isYes(s) {
        const v = String(s || '').toLowerCase().trim();
        return /^(да|есть|yes|ja|\+|включено)(\s*,|\s|$)/.test(v);
    }

    function isNo(s) {
        const v = String(s || '').toLowerCase().trim();
        return /^(нет|отсутствует|no|nein|—|-)(\s*,|\s|$)/.test(v);
    }

    function splitSubItems(val) {
        if (!val) return [];
        return String(val)
            .split(/[\n,;•·\/]+/)
            .map(s => s.replace(/^[-–—\s]+/, '').trim())
            .filter(s => s.length > 1 && !/^(и|или|с|со|в)$/i.test(s));
    }

    function canonicalTerm(s) {
        const l = String(s || '').toLowerCase().replace(/ё/g, 'е').trim();
        if (/черн|black|schwarz/.test(l)) return 'черный';
        if (/бел|white|weiss|weiß/.test(l)) return 'белый';
        if (/нерж|inox|edelstahl|серебр|сталь|silver|серый/.test(l)) return 'нержавеющая сталь';
        if (/антрацит|anthrazit/.test(l)) return 'антрацит';
        if (/слоновая кость|elfenbein|ivory/.test(l)) return 'слоновая кость';
        if (/античное золото|antique gold|altgold|золото|bronze|бронза/.test(l)) return 'античное золото';
        if (/электрон|elektron|intelligent system|logic control/.test(l)) return 'электронное';
        if (/механич|mechan/.test(l)) return 'механическое';
        if (/поворотн|ручк|knebel|drehknebel|schalter/.test(l)) return 'поворотные';
        if (/сенсор|touch|sensorgesteuert|slider/.test(l)) return 'сенсорные';
        if (/легкоочищ|легкая очистка|easy-clean|hypoallergen|antiallerg|self-clean/.test(l)) return 'легкоочищающаяся эмаль';
        if (/каталитич|katalytisch/.test(l)) return 'каталитическая';
        if (/пиролиз|pyrolyse/.test(l)) return 'пиролиз';
        if (/трехслойн|трёхслойн|dreifach|3 стекла|3-fach/.test(l)) return '3';
        if (/двухслойн|zweifach|2 стекла|2-fach/.test(l)) return '2';
        if (/четырехслойн|vierfach|4 стекла|4-fach/.test(l)) return '4';
        if (/nofrost|no frost|total no frost|full no-frost/.test(l)) return 'nofrost';
        if (/закаленное стекло|glaskochstelle/.test(l)) return 'закаленное стекло';
        if (/стеклокерамик|glaskeramik|schott ceran/.test(l)) return 'стеклокерамика';
        if (/чугун|gusseisen/.test(l)) return 'чугун';
        if (/встраиваем|einbau|vollintegriert/.test(l)) return 'встраиваемая';
        if (/отдельностоящ|freistehend/.test(l)) return 'отдельностоящий';
        if (/инвертор|inverter/.test(l)) return 'инверторный';
        return l;
    }

    function itemMatchesText(item, targetText) {
        const ci = canonicalTerm(item);
        const ct = canonicalTerm(targetText);
        if (ct.includes(ci) || ci.includes(ct)) return true;

        const tokens = ci.split(/\s+/).filter(t => t.length > 2);
        if (tokens.length && tokens.every(t => ct.includes(t))) return true;
        return false;
    }

    function extractDimension(specsMap, axis) {
        for (const [k, rawVal] of Object.entries(specsMap)) {
            const kn = normKey(k);
            const isPackage = kn.includes('упаковк') || kn.includes('verpackung');
            if (isPackage) continue;

            if ((axis === 'height' && (kn === 'высота' || kn === 'hohe')) ||
                (axis === 'width' && (kn === 'ширина' || kn === 'breite')) ||
                (axis === 'depth' && (kn === 'глубина' || kn === 'tiefe'))) {
                const n = parseFlexibleNumber(rawVal);
                if (n != null) return n >= 150 ? n / 10 : n;
            }

            if (kn.includes('габарит') || kn.includes('размер') || kn.includes('geratema') || kn.includes('abmessung') || kn.includes('kochfeldma')) {
                const nums = parseAllNumbers(rawVal);
                if (nums.length >= 2) {
                    const normNums = nums.map(n => n >= 150 ? n / 10 : n);
                    if (kn.includes('шxгxв') || kn.includes('шхгхв') || kn.includes('b x t x h') || kn.includes('bxtxh')) {
                        if (axis === 'width') return normNums[0];
                        if (axis === 'depth') return normNums[1];
                        if (axis === 'height' && normNums[2]) return normNums[2];
                    } else if (kn.includes('вxшxг') || kn.includes('вхшхг') || kn.includes('h x b x t') || kn.includes('hxbxt')) {
                        if (axis === 'height') return normNums[0];
                        if (axis === 'width') return normNums[1];
                        if (axis === 'depth') return normNums[2];
                    } else if (kn.includes('b × t') || kn.includes('ш х г')) {
                        if (axis === 'width') return normNums[0];
                        if (axis === 'depth') return normNums[1];
                    } else {
                        if (axis === 'height' && normNums.length >= 3) return normNums.find(n => n > 58 && n < 205) || normNums[0];
                        if (axis === 'width') return normNums.find(n => (n >= 28 && n <= 95)) || normNums[1];
                        if (axis === 'depth') return normNums.find(n => (n >= 30 && n <= 75)) || normNums[2];
                    }
                }
            }
        }
        return null;
    }

    function extractPackageDimension(specsMap, axis) {
        for (const [k, rawVal] of Object.entries(specsMap)) {
            const kn = normKey(k);
            if (!kn.includes('упаковк') && !kn.includes('verpackung')) continue;

            if ((axis === 'height' && kn.includes('высота')) || (axis === 'width' && kn.includes('ширина')) || (axis === 'depth' && kn.includes('глубина'))) {
                const n = parseFlexibleNumber(rawVal);
                if (n != null) return n >= 150 ? n / 10 : n;
            }

            const nums = parseAllNumbers(rawVal);
            if (nums.length >= 3) {
                const normNums = nums.map(n => n >= 150 ? n / 10 : n);
                if (kn.includes('шxгxв') || kn.includes('шхгхв')) {
                    if (axis === 'width') return normNums[0];
                    if (axis === 'depth') return normNums[1];
                    if (axis === 'height') return normNums[2];
                } else {
                    if (axis === 'height') return normNums[0];
                    if (axis === 'width') return normNums[1];
                    if (axis === 'depth') return normNums[2];
                }
            }
        }
        return null;
    }

    const SMART_RULES = [
        {
            id: 'height',
            matchOurs: k => k === 'высота' || (k.includes('высота') && !k.includes('упаковк')),
            extract: s => { const v = extractDimension(s, 'height'); return v != null ? `${v} см` : null; },
            compare: (a, b) => Math.abs(parseFlexibleNumber(a) - parseFlexibleNumber(b)) < 1.0
        },
        {
            id: 'width',
            matchOurs: k => k === 'ширина' || (k.includes('ширина') && !k.includes('упаковк')),
            extract: s => { const v = extractDimension(s, 'width'); return v != null ? `${v} см` : null; },
            compare: (a, b) => Math.abs(parseFlexibleNumber(a) - parseFlexibleNumber(b)) < 1.0
        },
        {
            id: 'depth',
            matchOurs: k => k === 'глубина' || (k.includes('глубина') && !k.includes('упаковк')),
            extract: s => { const v = extractDimension(s, 'depth'); return v != null ? `${v} см` : null; },
            compare: (a, b) => Math.abs(parseFlexibleNumber(a) - parseFlexibleNumber(b)) < 1.5
        },
        {
            id: 'pack_height',
            matchOurs: k => k.includes('высота упаковки'),
            extract: s => { const v = extractPackageDimension(s, 'height'); return v != null ? `${v} см` : null; },
            compare: (a, b) => Math.abs(parseFlexibleNumber(a) - parseFlexibleNumber(b)) < 2.0
        },
        {
            id: 'pack_width',
            matchOurs: k => k.includes('ширина упаковки'),
            extract: s => { const v = extractPackageDimension(s, 'width'); return v != null ? `${v} см` : null; },
            compare: (a, b) => Math.abs(parseFlexibleNumber(a) - parseFlexibleNumber(b)) < 2.0
        },
        {
            id: 'pack_depth',
            matchOurs: k => k.includes('глубина упаковки'),
            extract: s => { const v = extractPackageDimension(s, 'depth'); return v != null ? `${v} см` : null; },
            compare: (a, b) => Math.abs(parseFlexibleNumber(a) - parseFlexibleNumber(b)) < 2.0
        },
        {
            id: 'niche',
            matchOurs: k => k.includes('ниши для встраивания') || k.includes('размеры ниши') || k.includes('размеры для встраивания'),
            extract: s => {
                for (const [k, v] of Object.entries(s)) {
                    const kn = normKey(k);
                    if (kn.includes('ниши') || kn.includes('встраиван') || kn.includes('nischenma') || kn.includes('einbauma')) return v;
                }
                return null;
            },
            compare: (a, b) => {
                const na = parseAllNumbers(a).map(n => n >= 150 ? n / 10 : n);
                const nb = parseAllNumbers(b).map(n => n >= 150 ? n / 10 : n);
                if (na.length >= 2 && nb.length >= 2) {
                    return na.slice(0, 2).every((v, i) => Math.abs(v - nb[i]) < 2.0);
                }
                return null;
            }
        },
        {
            id: 'volume',
            matchOurs: k => k.includes('объем') || k.includes('объём') || k.includes('вместимость'),
            extract: s => {
                for (const [k, v] of Object.entries(s)) {
                    const kn = normKey(k);
                    if (kn.includes('объем') || kn.includes('объём') || kn.includes('volumen') || kn.includes('inhalt') || kn.includes('вместимость')) return v;
                }
                return null;
            },
            compare: (a, b) => {
                const na = parseFlexibleNumber(a), nb = parseFlexibleNumber(b);
                if (na && nb) return Math.abs(na - nb) < 15;
                return null;
            }
        },
        {
            id: 'power_connection',
            matchOurs: k => k.includes('мощность') || k.includes('энергопотребление') || k.includes('gesamtanschluss'),
            extract: s => {
                for (const [k, v] of Object.entries(s)) {
                    const kn = normKey(k);
                    if (kn.includes('потребляемая мощность') || kn.includes('мощность подключения') || kn.includes('gesamtanschluss') || kn.includes('anschlusswert') || kn.includes('энергопотребление')) return v;
                }
                return null;
            },
            compare: (a, b) => {
                const na = parseFlexibleNumber(a), nb = parseFlexibleNumber(b);
                if (!na || !nb) return null;
                if (na > 0 && nb > 0) {
                    if (na < 50 && nb >= 100) return Math.abs(na * 1000 - nb) < 80;
                    if (nb < 50 && na >= 100) return Math.abs(na - nb * 1000) < 80;
                    return Math.abs(na - nb) < 0.6;
                }
                return null;
            }
        },
        {
            id: 'burners_power_range',
            matchOurs: k => k.includes('передняя') || k.includes('задняя') || k.includes('правая') || k.includes('левая') || k.includes('центральная'),
            extract: (s, nameOurs) => {
                const no = normKey(nameOurs);
                for (const [k, v] of Object.entries(s)) {
                    const kn = normKey(k);
                    if (no.includes('передняя') && (kn.includes('vorne') || kn.includes('передняя') || kn.includes('ближняя'))) return v;
                    if (no.includes('задняя') && (kn.includes('hinten') || kn.includes('задняя') || kn.includes('дальняя'))) return v;
                    if (no.includes('центральная') && (kn.includes('mitte') || kn.includes('zentral') || kn.includes('центральная'))) return v;
                    if (no.includes('правая') && (kn.includes('rechts') || kn.includes('правая'))) return v;
                    if (no.includes('левая') && (kn.includes('links') || kn.includes('левая'))) return v;
                }
                return s['Описание конфорок'] || s['Kochzonen'] || null;
            },
            compare: (a, b) => {
                const numsA = parseAllNumbers(a);
                const numsB = parseAllNumbers(b);
                if (numsA.length && numsB.length) {
                    return numsA.some(x => numsB.some(y => Math.abs(x - y) < 0.15));
                }
                return null;
            }
        },
        {
            id: 'door_glasses',
            matchOurs: k => k.includes('стекол') || k.includes('остекление'),
            extract: s => {
                for (const [k, v] of Object.entries(s)) {
                    const kn = normKey(k), vn = normKey(v);
                    if (kn.includes('стекол') || kn.includes('остекление') || kn.includes('verglasung')) return v;
                    if (vn.includes('dreifach') || vn.includes('трехслойн') || vn.includes('3 стекла')) return '3 (трехслойное)';
                }
                return null;
            },
            compare: (a, b) => canonicalTerm(a) === canonicalTerm(b)
        },
        {
            id: 'rails_telescopic',
            matchOurs: k => k.includes('телескопические направляющие'),
            extract: s => {
                for (const [k, v] of Object.entries(s)) {
                    const full = normKey(k + ' ' + v);
                    if (full.includes('телескоп') || full.includes('teleskop')) return isNo(v) ? 'нет' : v;
                }
                return null;
            },
            compare: (a, b) => (isYes(a) && isYes(b)) || (isYes(a) && Boolean(b) && !isNo(b))
        },
        {
            id: 'voltage_range',
            matchOurs: k => k.includes('напряжение'),
            extract: s => {
                for (const [k, v] of Object.entries(s)) {
                    const kn = normKey(k);
                    if (kn.includes('напряжение') || kn.includes('netzspannung') || kn.includes('spannung')) return v;
                }
                return null;
            },
            compare: (a, b) => {
                const na = parseFlexibleNumber(a);
                const numsB = parseAllNumbers(b);
                if (na && numsB.length >= 2) return na >= Math.min(...numsB) && na <= Math.max(...numsB);
                if (na && numsB.length === 1) return Math.abs(na - numsB[0]) < 15;
                return null;
            }
        }
    ];

    function extractOfficialValue(nameOurs, specsMap) {
        if (!specsMap || !Object.keys(specsMap).length) return null;
        const normOurs = normKey(nameOurs);

        const rule = SMART_RULES.find(r => r.matchOurs(normOurs));
        if (rule) {
            const v = rule.extract(specsMap, nameOurs);
            if (v) return { val: v, rule };
        }

        for (const [k, v] of Object.entries(specsMap)) {
            if (normKey(k) === normOurs) return { val: v, rule: null };
        }

        for (const [k, v] of Object.entries(specsMap)) {
            const kn = normKey(k);
            if (kn.length >= 4 && (kn.includes(normOurs) || normOurs.includes(kn))) {
                return { val: v, rule: null };
            }
        }

        return null;
    }

    function smartCompareValues(oursVal, offVal, rule) {
        if (!oursVal || !offVal || offVal === '—' || oursVal === '—') return { status: 'only_one', subItems: null };

        const subItemsOurs = splitSubItems(oursVal);
        if (subItemsOurs.length > 1) {
            const marks = subItemsOurs.map(item => ({
                text: item,
                ok: itemMatchesText(item, offVal)
            }));
            const passed = marks.filter(m => m.ok).length;
            const status = passed === marks.length ? 'ok' : (passed > 0 ? 'partial' : 'diff');
            return { status, subItems: marks };
        }

        if (rule && rule.compare) {
            const res = rule.compare(oursVal, offVal);
            if (res !== null) return { status: res ? 'ok' : 'diff', subItems: null };
        }

        const ca = canonicalTerm(oursVal), cb = canonicalTerm(offVal);
        if (ca === cb || cb.includes(ca) || ca.includes(cb)) return { status: 'ok', subItems: null };

        const fa = parseFlexibleNumber(oursVal), fb = parseFlexibleNumber(offVal);
        if (fa != null && fb != null && Math.abs(fa - fb) < 0.051) return { status: 'ok', subItems: null };

        if (isYes(oursVal) && isYes(offVal)) return { status: 'ok', subItems: null };
        if (isNo(oursVal) && isNo(offVal)) return { status: 'ok', subItems: null };
        if ((isYes(oursVal) && isNo(offVal)) || (isNo(oursVal) && isYes(offVal))) return { status: 'diff', subItems: null };

        return { status: 'diff', subItems: null };
    }

    function compareAll(oursSpecs, ruSpecs, deSpecs) {
        const rows = [];
        for (const [name, valOurs] of Object.entries(oursSpecs)) {
            const ruExt = extractOfficialValue(name, ruSpecs);
            const deExt = extractOfficialValue(name, deSpecs);

            const valRu = ruExt ? ruExt.val : null;
            const valDe = deExt ? deExt.val : null;
            const rule = (ruExt && ruExt.rule) || (deExt && deExt.rule);

            const cmpRu = smartCompareValues(valOurs, valRu, rule);
            const cmpDe = smartCompareValues(valOurs, valDe, rule);

            let status = 'only_one';
            if (valRu && valDe) {
                status = (cmpRu.status === 'ok' && cmpDe.status === 'ok') ? 'ok' :
                         ((cmpRu.status === 'ok' || cmpDe.status === 'ok' || cmpRu.status === 'partial' || cmpDe.status === 'partial') ? 'partial' : 'diff');
            } else if (valRu) {
                status = cmpRu.status;
            } else if (valDe) {
                status = cmpDe.status;
            }

            rows.push({
                name,
                ours: valOurs || '—',
                ru: valRu || '—',
                de: valDe || '—',
                status,
                subItemsRu: cmpRu.subItems,
                subItemsDe: cmpDe.subItems
            });
        }
        return rows;
    }

    function textOf(el) {
        if (!el) return '';
        const c = el.cloneNode(true);
        c.querySelectorAll('script, style, svg, .glossary-tooltip').forEach(n => n.remove());
        return c.textContent.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function copyText(s) {
        try { GM_setClipboard(s, 'text'); } catch (e) { navigator.clipboard && navigator.clipboard.writeText(s); }
    }

    function extractModel(text) {
        let s = String(text || '').replace(/https?:\/\/[^\s]+/gi, ' ').replace(/\.html?/gi, ' ');
        try { s = decodeURIComponent(s); } catch (e) {}

        const sMatch = s.match(/\b(S\s*\d{2}\s*[A-Z]{1,2}\s*\d{2,4}(?:\s+[A-Z0-9]+)?)\b/i);
        if (sMatch) return sMatch[1].replace(/\s+/g, ' ').toUpperCase().trim();

        const m = s.match(/\b([A-ZА-Я]{1,4})\s*[-_]?\s*(\d{2,5}[A-ZА-Я0-9]*)(?:\s+([A-Za-zА-Яа-я0-9]{1,8}))?/i);
        if (m) {
            let res = `${latinize(m[1]).toUpperCase()} ${latinize(m[2]).toUpperCase()}`;
            if (m[3] && !/kaiser|духов|шкаф|панел|плит|вытяж|open|foto|side|by|retro|modern|avantgarde/i.test(m[3])) {
                res += ' ' + latinize(m[3]).toUpperCase();
            }
            return res.trim();
        }
        return '';
    }

    function modelKey(m) {
        try { m = decodeURIComponent(m); } catch (e) {}
        return String(latinize(m) || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
    }

    function gmFetch(url, ms = 8500) {
        return new Promise((resolve, reject) => {
            try {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    timeout: ms,
                    headers: {
                        'User-Agent': navigator.userAgent,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'ru,en;q=0.9,de;q=0.8'
                    },
                    onload: r => resolve(r),
                    onerror: e => reject(e || new Error('Network error')),
                    ontimeout: () => reject(new Error('Timeout'))
                });
            } catch (e) { reject(e); }
        });
    }

    function extractKeyValueMap(doc) {
        const map = {};
        doc.querySelectorAll('tr').forEach(tr => {
            const cells = Array.from(tr.querySelectorAll('th, td'));
            if (cells.length >= 2) {
                const k = textOf(cells[0]);
                const v = textOf(cells[cells.length - 1]);
                if (k && v && map[k] == null) map[k] = v;
            }
        });

        doc.querySelectorAll('.characteristics__row, .char-row, .tech-spec-row, [class*="param-row"]').forEach(row => {
            const kEl = row.querySelector('.characteristics__name, .name, .param, [class*="name"]');
            const vEl = row.querySelector('.characteristics__property, .value, [class*="value"]');
            if (kEl && vEl) {
                const k = textOf(kEl);
                let v = '';
                const lis = vEl.querySelectorAll('li');
                if (lis.length > 0) {
                    v = Array.from(lis).map(li => textOf(li)).join('; ');
                } else {
                    v = textOf(vEl);
                }
                if (k && v && map[k] == null) map[k] = v;
            }
        });

        doc.querySelectorAll('dl').forEach(dl => {
            const dts = dl.querySelectorAll('dt'), dds = dl.querySelectorAll('dd');
            dts.forEach((dt, i) => {
                if (dds[i]) {
                    const k = textOf(dt), v = textOf(dds[i]);
                    if (k && v && map[k] == null) map[k] = v;
                }
            });
        });

        return map;
    }

    function isRealKaiserRuProduct(doc, targetModel) {
        const hasTabs = !!doc.querySelector('#tab-attribute, table.attribute, .product-info, #product');
        const h1 = textOf(doc.querySelector('h1')) || doc.title;
        if (!h1 || /не найден|страница не найдена|404|каталог/i.test(h1)) return false;

        const digits = (targetModel.match(/\d{2,5}/) || [''])[0];
        if (digits && !h1.includes(digits) && !modelKey(doc.location ? doc.location.href : '').includes(digits)) {
            return false;
        }
        return hasTabs;
    }

    async function searchKaiserRu(model, onProgress) {
        const cacheKey = 'kaiser_ru_v7_' + modelKey(model);
        const cached = GM_getValue(cacheKey, null);
        if (cached && (Date.now() - cached.ts < CACHE_TTL_MS)) return cached;

        const clean = model.replace(/\s+/g, ' ').trim();
        const noSpaces = modelKey(clean);
        const digits = (clean.match(/\d{2,5}/) || [''])[0];
        const coreMatch = clean.match(/^([A-ZА-Я]{1,4}\s*\d{2,5})/i);
        const coreModel = coreMatch ? coreMatch[1] : clean;

        const queries = [clean, noSpaces];
        if (coreModel && !queries.includes(coreModel)) queries.push(coreModel);
        if (digits && digits.length >= 3 && !queries.includes(digits)) queries.push(digits);

        if (onProgress) onProgress(`Запрос к kaiser.ru (${clean})...`);

        const slug = clean.toLowerCase().replace(/\s+/g, '-');
        const directUrls = [
            `${RU_ORIGIN}/vstraivaemaia_tehnika/${encodeURIComponent(clean.toLowerCase())}.html`,
            `${RU_ORIGIN}/vstraivaemaia_tehnika/${clean.toLowerCase().replace(/\s+/g, '%20')}.html`,
            `${RU_ORIGIN}/vstraivaemaia_tehnika/${slug}.html`,
            `${RU_ORIGIN}/vstraivaemaia_tehnika/${noSpaces.toLowerCase()}.html`,
            `${RU_ORIGIN}/otdelnostoiashchaia_tehnika/${slug}.html`
        ];

        for (const dUrl of directUrls) {
            try {
                const res = await gmFetch(dUrl, 4000);
                if (res.status === 200) {
                    const doc = new DOMParser().parseFromString(res.responseText, 'text/html');
                    if (isRealKaiserRuProduct(doc, model)) {
                        const specs = extractKeyValueMap(doc);
                        if (Object.keys(specs).length > 2) {
                            const title = textOf(doc.querySelector('h1')) || clean;
                            const result = { ok: true, specs, url: dUrl, title, ts: Date.now() };
                            GM_setValue(cacheKey, result);
                            return result;
                        }
                    }
                }
            } catch (e) {}
        }

        for (const q of queries) {
            const searchUrl = `${RU_ORIGIN}/search/?search=${encodeURIComponent(q)}`;
            try {
                const res = await gmFetch(searchUrl, 6000);
                if (res.status === 403 || res.status === 429) {
                    return { ok: false, specs: {}, blocked: true, status: res.status, query: clean };
                }
                if (res.responseText && (res.responseText.includes('SmartCaptcha') || res.responseText.includes('challenge-form'))) {
                    return { ok: false, specs: {}, captcha: true, query: clean };
                }
                if (res.status !== 200) continue;

                const doc = new DOMParser().parseFromString(res.responseText, 'text/html');
                const allLinks = Array.from(doc.querySelectorAll('a[href]'));
                const candidateUrls = new Set();

                for (const a of allLinks) {
                    const href = a.getAttribute('href') || '';
                    if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;

                    let decHref = href;
                    try { decHref = decodeURIComponent(href); } catch (e) {}
                    const aText = textOf(a);
                    const combined = (decHref + ' ' + aText).toLowerCase();

                    if (combined.includes('/search/') || combined.includes('route=product/search') || combined.includes('/cart') || combined.includes('/checkout')) {
                        continue;
                    }

                    const keyMatches = (noSpaces && modelKey(combined).includes(noSpaces)) ||
                                       (digits && digits.length >= 3 && modelKey(combined).includes(digits));

                    if (keyMatches) {
                        try {
                            const fullUrl = new URL(href, RU_ORIGIN).href;
                            candidateUrls.add(fullUrl);
                        } catch (e) {}
                    }
                }

                for (const targetUrl of candidateUrls) {
                    try {
                        const prodRes = await gmFetch(targetUrl, 6000);
                        if (prodRes.status !== 200) continue;
                        const prodDoc = new DOMParser().parseFromString(prodRes.responseText, 'text/html');

                        if (isRealKaiserRuProduct(prodDoc, model)) {
                            const specs = extractKeyValueMap(prodDoc);
                            if (Object.keys(specs).length > 2) {
                                const title = textOf(prodDoc.querySelector('h1')) || clean;
                                const result = { ok: true, specs, url: targetUrl, title, ts: Date.now() };
                                GM_setValue(cacheKey, result);
                                return result;
                            }
                        }
                    } catch (e) {}
                }
            } catch (e) {}
        }

        return { ok: false, specs: {}, query: clean, notFound: true, searchUrl: `${RU_ORIGIN}/search/?search=${encodeURIComponent(clean)}` };
    }

    async function searchKaiserDe(model, onProgress) {
        const cacheKey = 'kaiser_de_v7_' + modelKey(model);
        const cached = GM_getValue(cacheKey, null);
        if (cached && (Date.now() - cached.ts < CACHE_TTL_MS)) return cached;

        const clean = model.replace(/\s+/g, ' ').trim();
        const slug = clean.toLowerCase().replace(/\s+/g, '-');
        const mKey = modelKey(clean);

        const candidates = [
            `${DE_ORIGIN}/einbaubackofen/${slug}/`,
            `${DE_ORIGIN}/kuhlschranke/${slug}/`,
            `${DE_ORIGIN}/produkt/${slug}/`,
            `${DE_ORIGIN}/${slug}/`,
            `${DE_ORIGIN}/?s=${encodeURIComponent(clean)}`
        ];

        if (onProgress) onProgress(`Запрос к kaiser-olan.de (${clean})...`);

        for (const url of candidates) {
            try {
                const res = await gmFetch(url);
                if (res.status === 404) continue;
                const doc = new DOMParser().parseFromString(res.responseText, 'text/html');

                if (url.includes('/?s=')) {
                    const links = Array.from(doc.querySelectorAll('a[href]'));
                    for (const a of links) {
                        const href = a.getAttribute('href') || '';
                        let dec = href;
                        try { dec = decodeURIComponent(href); } catch (e) {}

                        if ((modelKey(dec).includes(mKey) || modelKey(a.textContent).includes(mKey)) && !dec.includes('/?s=') && !dec.includes('/category/')) {
                            const target = new URL(href, DE_ORIGIN).href;
                            const prodRes = await gmFetch(target);
                            const prodDoc = new DOMParser().parseFromString(prodRes.responseText, 'text/html');
                            const specs = extractKeyValueMap(prodDoc);
                            if (Object.keys(specs).length > 2) {
                                const title = textOf(prodDoc.querySelector('h1')) || prodDoc.title;
                                const result = { ok: true, specs, url: target, title, ts: Date.now() };
                                GM_setValue(cacheKey, result);
                                return result;
                            }
                        }
                    }
                } else {
                    const specs = extractKeyValueMap(doc);
                    if (Object.keys(specs).length > 2) {
                        const title = textOf(doc.querySelector('h1')) || doc.title;
                        const result = { ok: true, specs, url: url, title, ts: Date.now() };
                        GM_setValue(cacheKey, result);
                        return result;
                    }
                }
            } catch (e) {}
        }
        return { ok: false, specs: {} };
    }

    GM_addStyle(`
        #ks-spec-root {
            position: fixed !important;
            right: 105px !important;
            bottom: 22px !important;
            z-index: 2147483647 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
        }
        #ks-spec-toggle {
            background: #0f172a !important;
            color: #ffffff !important;
            border: 2px solid #38bdf8 !important;
            border-radius: 20px !important;
            padding: 8px 16px !important;
            cursor: pointer !important;
            font-size: 12px !important;
            font-weight: 700 !important;
            box-shadow: 0 4px 18px rgba(0,0,0,0.45) !important;
            transition: 0.2s !important;
            display: inline-block !important;
        }
        #ks-spec-toggle:hover {
            transform: scale(1.04);
            background: #1e293b !important;
        }
        #ks-spec-toggle.diff { background: #dc2626 !important; border-color: #fca5a5 !important; }
        #ks-spec-toggle.ok { background: #16a34a !important; border-color: #86efac !important; }
        #ks-spec-toggle.wait { background: #d97706 !important; border-color: #fde68a !important; }

        #ks-spec-panel {
            display: none;
            position: fixed !important;
            right: 20px !important;
            bottom: 75px !important;
            width: min(780px, calc(100vw - 30px)) !important;
            max-height: min(80vh, 670px) !important;
            overflow: auto !important;
            background: #ffffff !important;
            color: #1e293b !important;
            border-radius: 12px !important;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5) !important;
            border: 1px solid #cbd5e1 !important;
            z-index: 2147483647 !important;
        }
        #ks-spec-panel.open { display: block !important; }
        #ks-spec-panel header { position: sticky; top: 0; background: #0f172a; color: #f8fafc; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; z-index: 2; font-size: 13px; font-weight: 600; }
        #ks-spec-panel header button { background: transparent; color: #f8fafc; border: 1px solid #475569; border-radius: 5px; padding: 4px 9px; cursor: pointer; font-size: 11px; }

        .ks-meta { padding: 6px 12px; font-size: 11px; color: #475569; border-bottom: 1px solid #f1f5f9; }
        .ks-meta a { color: #2563eb; text-decoration: none; font-weight: 500; }
        .ks-meta a:hover { text-decoration: underline; }
        .ks-chip { display: inline-block; padding: 2px 7px; border-radius: 6px; background: #f1f5f9; margin-right: 6px; font-size: 11px; font-weight: 500; }
        .ks-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .ks-table th, .ks-table td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; text-align: left; }
        .ks-table th { background: #f8fafc; position: sticky; top: 35px; font-weight: 600; color: #334155; }
        .ks-st-diff { background: #fef2f2; }
        .ks-st-partial { background: #fffbeb; }

        .characteristics__row.ks-row-ok {
            background: #dcfce7 !important;
            border-radius: 4px !important;
        }
        .characteristics__row.ks-row-ok .characteristics__property {
            background: #dcfce7 !important;
            color: #166534 !important;
            font-weight: 600 !important;
        }

        .characteristics__row.ks-row-diff {
            background: #fee2e2 !important;
            border-radius: 4px !important;
        }
        .characteristics__row.ks-row-diff .characteristics__name {
            color: #dc2626 !important;
            font-weight: 700 !important;
        }
        .characteristics__row.ks-row-diff .characteristics__property {
            background: #fee2e2 !important;
            color: #991b1b !important;
            font-weight: 600 !important;
        }

        .characteristics__row.ks-row-partial {
            background: #fef3c7 !important;
            border-radius: 4px !important;
        }
        .characteristics__row.ks-row-partial .characteristics__name {
            color: #d97706 !important;
            font-weight: 700 !important;
        }
        .characteristics__row.ks-row-partial .characteristics__property {
            background: #fef3c7 !important;
            color: #92400e !important;
            font-weight: 600 !important;
        }

        .ks-cell-ok { background: #dcfce7 !important; font-weight: 600 !important; }
        .ks-cell-diff { background: #fee2e2 !important; font-weight: 600 !important; box-shadow: inset 0 -3px 0 #dc2626 !important; }
        .ks-cell-partial { background: #fef3c7 !important; font-weight: 600 !important; box-shadow: inset 0 -3px 0 #d97706 !important; }

        .ks-showbtn {
            margin-left: 6px;
            font-size: 10px;
            border: 1px solid #cbd5e1;
            background: #ffffff;
            border-radius: 8px;
            padding: 2px 8px;
            cursor: pointer;
            color: #2563eb;
            vertical-align: middle;
            font-weight: 500;
        }
        .ks-showbtn:hover { background: #eff6ff; border-color: #2563eb; }
        .ks-status { margin-left: 6px; font-size: 13px; vertical-align: middle; }

        .ks-pop {
            position: fixed !important;
            z-index: 2147483647 !important;
            width: 360px !important;
            max-width: 90vw !important;
            background: #ffffff !important;
            border: 1px solid #94a3b8 !important;
            border-radius: 10px !important;
            box-shadow: 0 16px 36px rgba(0,0,0,0.35) !important;
            padding: 12px !important;
            font-size: 12px !important;
            color: #1e293b !important;
        }
        .ks-pop-val { margin: 4px 0; padding: 6px; background: #f8fafc; border-radius: 5px; border: 1px solid #e2e8f0; font-size: 11px; white-space: pre-line; }
        .ks-sub-item { margin: 2px 0; font-size: 11px; }

        .ks-inline-btn {
            display: inline-block;
            margin-left: 6px;
            padding: 2px 7px;
            border-radius: 5px;
            font-size: 11px;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            border: 1px solid #cbd5e1;
            background: #f1f5f9;
            color: #1e293b;
        }
        .ks-inline-btn:hover { background: #e2e8f0; }
    `);

    function ensureUI() {
        if (document.getElementById('ks-spec-root')) return;
        const root = document.createElement('div');
        root.id = 'ks-spec-root';
        root.innerHTML = `
            <button type="button" id="ks-spec-toggle">🔍 Сверка Kaiser v${SCRIPT_VERSION}</button>
            <div id="ks-spec-panel">
                <header>
                    <span>Сверка с kaiser.ru & kaiser-olan.de v${SCRIPT_VERSION}</span>
                    <div style="display:flex; gap:5px;">
                        <button type="button" id="ks-clear-cache" title="Очистить кэш">🔄 Кэш</button>
                        <button type="button" id="ks-run">Запустить</button>
                        <button type="button" id="ks-close">Закрыть</button>
                    </div>
                </header>
                <div id="ks-spec-body"><div class="ks-meta">Нажмите «Запустить» для проверки.</div></div>
            </div>
        `;
        document.body.appendChild(root);

        document.getElementById('ks-spec-toggle').onclick = () => {
            const panel = document.getElementById('ks-spec-panel');
            panel.classList.toggle('open');
        };
        document.getElementById('ks-close').onclick = () => {
            document.getElementById('ks-spec-panel').classList.remove('open');
        };
        document.getElementById('ks-run').onclick = () => runNow();
        document.getElementById('ks-clear-cache').onclick = () => {
            alert('Кэш ответов сброшен!');
            runNow();
        };
    }

    function setBody(html) {
        const b = document.getElementById('ks-spec-body');
        if (b) b.innerHTML = html;
    }

    function showPop(anchor, row, ruUrl, deUrl) {
        document.querySelectorAll('.ks-pop').forEach(p => p.remove());
        const pop = document.createElement('div');
        pop.className = 'ks-pop';

        let subItemsHtml = '';
        const subList = row.subItemsRu || row.subItemsDe;
        if (subList && subList.length) {
            subItemsHtml = '<div style="margin-top:5px; font-size:11px;"><b>Разбивка подпунктов:</b>' +
                subList.map(m => `<div class="ks-sub-item">${m.ok ? '✅' : '❌'} ${escapeHtml(m.text)}</div>`).join('') +
                '</div>';
        }

        pop.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">
                <b>${escapeHtml(row.name)}</b>
                <button type="button" class="ks-pop-close" style="background:none; border:none; color:#64748b; font-size:14px; cursor:pointer;">✕</button>
            </div>
            <div style="margin-top:6px; font-size:11px; color:#64748b;">У нас (kaiser-store.ru):</div>
            <div class="ks-pop-val">${escapeHtml(row.ours)}</div>
            ${subItemsHtml}
            <div style="font-size:11px; color:#64748b;">kaiser.ru:</div>
            <div class="ks-pop-val">${escapeHtml(row.ru)}</div>
            <div style="font-size:11px; color:#64748b;">kaiser-olan.de:</div>
            <div class="ks-pop-val">${escapeHtml(row.de)}</div>
            <div style="display:flex; gap:6px; margin-top:8px;">
                <button type="button" class="ks-copy-ru" style="padding:4px 8px; font-size:11px; background:#0f172a; color:#fff; border:none; border-radius:4px; cursor:pointer;">Копировать RU</button>
                <button type="button" class="ks-copy-de" style="padding:4px 8px; font-size:11px; background:#475569; color:#fff; border:none; border-radius:4px; cursor:pointer;">Копировать DE</button>
            </div>
        `;
        document.body.appendChild(pop);

        const r = anchor.getBoundingClientRect();
        let left = r.left;
        let top = r.bottom + 6;

        if (top + 280 > window.innerHeight) {
            top = Math.max(10, r.top - 290);
        }
        if (left + 370 > window.innerWidth) {
            left = window.innerWidth - 380;
        }

        pop.style.left = Math.max(10, left) + 'px';
        pop.style.top = Math.max(10, top) + 'px';

        pop.querySelector('.ks-copy-ru').onclick = () => { copyText(row.ru); pop.querySelector('.ks-copy-ru').textContent = 'Скопировано'; };
        pop.querySelector('.ks-copy-de').onclick = () => { copyText(row.de); pop.querySelector('.ks-copy-de').textContent = 'Скопировано'; };
        pop.querySelector('.ks-pop-close').onclick = () => pop.remove();
    }

    document.addEventListener('click', e => {
        if (!e.target.closest('.ks-pop, .ks-showbtn')) {
            document.querySelectorAll('.ks-pop').forEach(p => p.remove());
        }
    });

    function highlightSingleCard(rows, ruUrl, deUrl) {
        document.querySelectorAll('.characteristics__row, tr').forEach(row => {
            const nameEl = row.querySelector('.characteristics__name, td:first-child');
            if (!nameEl) return;
            const name = textOf(nameEl);
            const targetNorm = normKey(name);

            const rec = rows.find(r => normKey(r.name) === targetNorm);
            if (!rec) return;

            row.classList.remove('ks-row-ok', 'ks-row-diff', 'ks-row-partial');
            row.querySelectorAll('.ks-status, .ks-showbtn').forEach(n => n.remove());

            if (rec.status === 'ok') row.classList.add('ks-row-ok');
            else if (rec.status === 'diff') row.classList.add('ks-row-diff');
            else if (rec.status === 'partial') row.classList.add('ks-row-partial');

            const st = document.createElement('span');
            st.className = 'ks-status';
            st.textContent = rec.status === 'diff' ? '❌' : (rec.status === 'ok' ? '✔️' : '⚠️');

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ks-showbtn';
            btn.textContent = 'оф. сайты';
            btn.onclick = ev => {
                ev.preventDefault();
                ev.stopPropagation();
                showPop(btn, rec, ruUrl, deUrl);
            };

            nameEl.appendChild(st);
            nameEl.appendChild(btn);
        });
    }

    async function promptManualRuUrl(model) {
        const manual = prompt(`Вставьте прямую ссылку на товар "${model}" с сайта kaiser.ru:`);
        if (!manual || !manual.includes('kaiser.ru')) return;

        try {
            setBody(`<div class="ks-meta">Загрузка карточки по указанной ссылке: ${escapeHtml(manual)}...</div>`);
            const res = await gmFetch(manual);
            const doc = new DOMParser().parseFromString(res.responseText, 'text/html');
            const specs = extractKeyValueMap(doc);

            if (Object.keys(specs).length > 2) {
                const title = textOf(doc.querySelector('h1')) || model;
                const result = { ok: true, specs, url: manual, title, ts: Date.now() };
                const cacheKey = 'kaiser_ru_v7_' + modelKey(model);
                GM_setValue(cacheKey, result);
                alert('Характеристики с kaiser.ru успешно сохранены! Запускаю повторную сверку.');
                runOurProduct();
            } else {
                alert('На указанной странице не найдены характеристики товара.');
            }
        } catch (e) {
            alert('Ошибка при загрузке ссылки: ' + e.message);
        }
    }

    async function runOurProduct() {
        const title = textOf(document.querySelector('h1')) || document.title;
        const model = extractModel(title) || extractModel(location.pathname);

        if (!model) {
            setBody('<div class="ks-meta">Не удалось определить модель Kaiser из названия или URL.</div>');
            return;
        }

        const t = document.getElementById('ks-spec-toggle');
        if (t) { t.className = 'wait'; t.textContent = `Сверка: опрос kaiser.ru & de...`; }
        setBody(`<div class="ks-meta">Модель: <b>${escapeHtml(model)}</b>. Опрашиваю kaiser.ru и kaiser-olan.de...</div>`);

        const [ruRes, deRes] = await Promise.all([
            searchKaiserRu(model, msg => setBody(`<div class="ks-meta">${escapeHtml(msg)}</div>`)),
            searchKaiserDe(model, msg => setBody(`<div class="ks-meta">${escapeHtml(msg)}</div>`))
        ]);

        const ours = extractKeyValueMap(document);
        const rows = compareAll(ours, ruRes.specs, deRes.specs);

        const diffs = rows.filter(r => r.status === 'diff');
        const part = rows.filter(r => r.status === 'partial');
        const ok = rows.filter(r => r.status === 'ok');

        highlightSingleCard(rows, ruRes.url, deRes.url);

        if (t) {
            t.className = diffs.length > 0 ? 'diff' : (part.length > 0 ? 'wait' : 'ok');
            t.textContent = diffs.length > 0 ? `Сверка: ${diffs.length} расхожд.` : (part.length > 0 ? `Сверка: ${part.length} частич.` : `Сверка: совпало ✔️`);
        }

        const tableHtml = rows.map(r => `
            <tr class="${r.status === 'diff' ? 'ks-st-diff' : (r.status === 'partial' ? 'ks-st-partial' : '')}">
                <td><b>${escapeHtml(r.name)}</b></td>
                <td>${escapeHtml(r.ours)}</td>
                <td>${escapeHtml(r.ru)}</td>
                <td>${escapeHtml(r.de)}</td>
                <td style="text-align:center;">${r.status === 'diff' ? '❌' : (r.status === 'ok' ? '✔️' : '⚠️')}</td>
            </tr>
        `).join('');

        let ruStatusText = '';
        if (ruRes.url) {
            ruStatusText = `<a href="${ruRes.url}" target="_blank">🔗 kaiser.ru</a> (${Object.keys(ruRes.specs).length} хар.)`;
        } else if (ruRes.blocked) {
            ruStatusText = `⚠️ kaiser.ru блокирует (HTTP ${ruRes.status})`;
        } else {
            const sUrl = ruRes.searchUrl || `${RU_ORIGIN}/search/?search=${encodeURIComponent(model)}`;
            ruStatusText = `❌ kaiser.ru: не найден в каталоге <a href="${sUrl}" target="_blank" class="ks-inline-btn">🔍 Проверить поиск</a> <button type="button" class="ks-inline-btn" id="ks-btn-manual-ru">✏️ Задать URL</button>`;
        }

        setBody(`
            <div class="ks-meta">Товар: <b>${escapeHtml(title)}</b> (Модель: <b>${escapeHtml(model)}</b>)</div>
            <div class="ks-meta" style="line-height: 22px;">
                ${ruStatusText} |
                ${deRes.url ? `<a href="${deRes.url}" target="_blank">🔗 kaiser-olan.de</a> (${Object.keys(deRes.specs).length} хар.)` : '❌ kaiser-olan.de не найден'}
            </div>
            <div class="ks-meta">
                <span class="ks-chip" style="color:#dc2626;">Расхождений: ${diffs.length}</span>
                <span class="ks-chip" style="color:#d97706;">Частично: ${part.length}</span>
                <span class="ks-chip" style="color:#16a34a;">Совпало: ${ok.length}</span>
            </div>
            <table class="ks-table">
                <thead>
                    <tr>
                        <th>Характеристика</th>
                        <th>kaiser-store</th>
                        <th>kaiser.ru</th>
                        <th>kaiser-olan.de</th>
                        <th>Итог</th>
                    </tr>
                </thead>
                <tbody>${tableHtml || '<tr><td colspan="5" style="text-align:center; padding:10px;">Нет данных для отображения</td></tr>'}</tbody>
            </table>
        `);

        const manualBtn = document.getElementById('ks-btn-manual-ru');
        if (manualBtn) {
            manualBtn.onclick = () => promptManualRuUrl(model);
        }
    }

    function isComparePage() {
        return /\/compare\//.test(location.pathname);
    }

    function getCompareRowsDom() {
        const rows = [];
        document.querySelectorAll('.compare-table-block__row.js-compare-row').forEach(row => {
            const nameEl = row.querySelector('.js-compare-cell-title');
            if (!nameEl) return;
            const name = textOf(nameEl);
            if (!name) return;
            const cells = Array.from(row.querySelectorAll('.js-compare-cell:not(.js-compare-cell-title)'));
            if (cells.length > 0) {
                rows.push({ name, rowEl: row, cells });
            }
        });
        return rows;
    }

    function parseCompareProducts(rowsDom) {
        const cards = document.querySelectorAll('.comparison-card');
        if (!cards.length) return [];

        const products = [];
        cards.forEach((card, idx) => {
            const titleEl = card.querySelector('.card-type-and-title__title, a.card-type-and-title, [class*="title"], a');
            const linkEl = card.querySelector('a[href*=".html"], a');
            const title = titleEl ? textOf(titleEl) : '';
            const href = linkEl ? linkEl.getAttribute('href') : '';
            const fullUrl = href ? new URL(href, location.origin).href : '';
            const model = extractModel(title) || extractModel(href);

            const specs = {};
            rowsDom.forEach(r => {
                if (r.cells[idx]) {
                    specs[r.name] = textOf(r.cells[idx]);
                }
            });

            products.push({
                index: idx,
                title: title || model,
                model: model,
                url: fullUrl,
                specs: specs
            });
        });

        return products;
    }

    function highlightCompareTable(products, rowsDom) {
        rowsDom.forEach(r => {
            const targetNorm = normKey(r.name);
            r.cells.forEach((cell, idx) => {
                const prod = products[idx];
                if (!prod || !prod.comparisonRows) return;

                cell.querySelectorAll('.ks-status, .ks-showbtn').forEach(n => n.remove());
                cell.classList.remove('ks-cell-ok', 'ks-cell-diff', 'ks-cell-partial');

                const rec = prod.comparisonRows.find(row => normKey(row.name) === targetNorm);
                if (!rec) return;

                if (rec.status === 'ok') cell.classList.add('ks-cell-ok');
                else if (rec.status === 'diff') cell.classList.add('ks-cell-diff');
                else if (rec.status === 'partial') cell.classList.add('ks-cell-partial');

                const st = document.createElement('span');
                st.className = 'ks-status';
                st.textContent = rec.status === 'diff' ? '❌' : (rec.status === 'ok' ? '✔️' : '⚠️');

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'ks-showbtn';
                btn.textContent = 'оф. сайты';
                btn.onclick = ev => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    showPop(btn, rec, prod.ruRes ? prod.ruRes.url : '', prod.deRes ? prod.deRes.url : '');
                };

                cell.appendChild(st);
                cell.appendChild(btn);
            });
        });
    }

    async function runCompare() {
        const rowsDom = getCompareRowsDom();
        const products = parseCompareProducts(rowsDom);

        if (!products.length) {
            setBody('<div class="ks-meta">Товары на странице сравнения пока не загружены.</div>');
            return;
        }

        const t = document.getElementById('ks-spec-toggle');
        if (t) { t.className = 'wait'; t.textContent = `Сверка (${products.length} тов.): опрос оф. сайтов...`; }

        let totalDiffs = 0, totalParts = 0;
        const panelBlocks = [];

        for (let i = 0; i < products.length; i++) {
            const p = products[i];
            setBody(`<div class="ks-meta">Проверяю товар ${i + 1}/${products.length}: <b>${escapeHtml(p.model || p.title)}</b>...</div>`);

            const [ruRes, deRes] = await Promise.all([
                searchKaiserRu(p.model, null),
                searchKaiserDe(p.model, null)
            ]);

            p.ruRes = ruRes;
            p.deRes = deRes;
            p.comparisonRows = compareAll(p.specs, ruRes.specs, deRes.specs);

            const diffs = p.comparisonRows.filter(r => r.status === 'diff');
            const part = p.comparisonRows.filter(r => r.status === 'partial');
            const ok = p.comparisonRows.filter(r => r.status === 'ok');

            totalDiffs += diffs.length;
            totalParts += part.length;

            const tableHtml = p.comparisonRows.map(r => `
                <tr class="${r.status === 'diff' ? 'ks-st-diff' : (r.status === 'partial' ? 'ks-st-partial' : '')}">
                    <td><b>${escapeHtml(r.name)}</b></td>
                    <td>${escapeHtml(r.ours)}</td>
                    <td>${escapeHtml(r.ru)}</td>
                    <td>${escapeHtml(r.de)}</td>
                    <td style="text-align:center;">${r.status === 'diff' ? '❌' : (r.status === 'ok' ? '✔️' : '⚠️')}</td>
                </tr>
            `).join('');

            panelBlocks.push(`
                <div style="border-top: 2px solid #e2e8f0; margin-top: 10px; padding-top: 6px;">
                    <div class="ks-meta"><b>${escapeHtml(p.title)}</b> (${escapeHtml(p.model)})</div>
                    <div class="ks-meta">
                        ${ruRes.url ? `<a href="${ruRes.url}" target="_blank">🔗 kaiser.ru</a>` : '❌ kaiser.ru не найден'} |
                        ${deRes.url ? `<a href="${deRes.url}" target="_blank">🔗 kaiser-olan.de</a>` : '❌ kaiser-olan.de не найден'}
                    </div>
                    <div class="ks-meta">
                        <span class="ks-chip" style="color:#dc2626;">Расхождений: ${diffs.length}</span>
                        <span class="ks-chip" style="color:#d97706;">Частично: ${part.length}</span>
                        <span class="ks-chip" style="color:#16a34a;">Совпало: ${ok.length}</span>
                    </div>
                    <table class="ks-table">
                        <thead>
                            <tr>
                                <th>Характеристика</th>
                                <th>У нас</th>
                                <th>kaiser.ru</th>
                                <th>kaiser-olan.de</th>
                                <th>Итог</th>
                            </tr>
                        </thead>
                        <tbody>${tableHtml || '<tr><td colspan="5" style="text-align:center; padding:10px;">Нет данных</td></tr>'}</tbody>
                    </table>
                </div>
            `);
        }

        highlightCompareTable(products, rowsDom);

        if (t) {
            t.className = totalDiffs > 0 ? 'diff' : (totalParts > 0 ? 'wait' : 'ok');
            t.textContent = totalDiffs > 0 ? `Сверка: ${totalDiffs} расхожд.` : (totalParts > 0 ? `Сверка: ${totalParts} частич.` : `Сверка: всё совпало ✔️`);
        }

        setBody(`
            <div class="ks-meta" style="font-size:12px; font-weight:600;">Сверка сравнения (${products.length} товаров)</div>
            ${panelBlocks.join('')}
        `);
    }

    async function runNow() {
        const panel = document.getElementById('ks-spec-panel');
        if (panel) panel.classList.add('open');
        if (isComparePage()) {
            await runCompare();
        } else {
            await runOurProduct();
        }
    }

    function init() {
        if (!/kaiser-store\.ru$/.test(location.hostname.replace(/^www\./, ''))) return;
        ensureUI();
        try { GM_registerMenuCommand('Сверить с kaiser.ru & de', runNow); } catch (e) {}
        setTimeout(runNow, 900);
    }

    init();
})();
