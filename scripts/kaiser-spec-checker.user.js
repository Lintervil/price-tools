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
// @match        https://www.kaiser-olan.de/*
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
