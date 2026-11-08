/* Balance gauges — car-style speedometers of how much money is still left,
   each with a bar that breaks the spending down by category, heaviest first.
   - Right panel: saldo ÷ último depósito, with the selected cycle's spending.
   - Resumen anual: no dial, an iOS-style ring of the year's spending by category. */
(() => {
    'use strict';
    const NS = 'http://www.w3.org/2000/svg';
    const MAX_ROWS = 5;
    const START = 150, SWEEP = 240;           // degrees, clockwise from +x
    const CX = 100, CY = 88, R = 74;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Each dial keeps its own needle position between renders.
    const states = new Map();
    const stateOf = key => {
        if (!states.has(key)) states.set(key, { shown: null, frame: 0, booted: false });
        return states.get(key);
    };

    const get = id => document.getElementById(id);
    const node = (tag, className, text) => {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined) el.textContent = text;
        return el;
    };
    const svg = (tag, attrs = {}) => {
        const el = document.createElementNS(NS, tag);
        for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
        return el;
    };
    const amountOf = record => Number(record.amount) || 0;
    const clamp = value => Math.min(1, Math.max(0, value));
    const point = (p, r) => {
        const a = (START + SWEEP * p) * Math.PI / 180;
        return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
    };
    const zone = p => p <= 0.2 ? 'low' : p <= 0.5 ? 'mid' : 'high';

    function currentCycle() {
        const cycles = typeof getCycles === 'function' ? getCycles() : [];
        const key = get('monthFilter')?.value;
        return cycles.find(cycle => cycle.id === key) || cycles[0] || null;
    }
    function colorOf(category) {
        const index = categories.indexOf(category);
        const hash = [...category].reduce((value, char) => value + char.charCodeAt(0), 0);
        return COLORS[(index < 0 ? hash : index) % COLORS.length];
    }

    /* ---------- Dial ---------- */
    function arc(r, from = 0, to = 1) {
        const [x0, y0] = point(from, r), [x1, y1] = point(to, r);
        const large = SWEEP * (to - from) > 180 ? 1 : 0;
        return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
    }
    function buildGauge() {
        const root = svg('svg', { viewBox: '0 0 200 156', class: 'bg-dial', 'aria-hidden': 'true' });
        root.append(
            svg('path', { d: arc(R), class: 'bg-track' }),
            svg('path', { d: arc(R, 0, 0.2), class: 'bg-reserve' }),
            svg('path', { d: arc(R), class: 'bg-value', pathLength: 100, 'stroke-dasharray': '0 100' })
        );
        // Ticks every 5 %, longer and labelled every 25 %, like a dashboard dial.
        const ticks = svg('g', { class: 'bg-ticks' });
        for (let i = 0; i <= 20; i++) {
            const p = i / 20, major = i % 5 === 0;
            const [x0, y0] = point(p, R - 11), [x1, y1] = point(p, R - (major ? 19 : 15));
            ticks.append(svg('line', { x1: x0.toFixed(2), y1: y0.toFixed(2), x2: x1.toFixed(2), y2: y1.toFixed(2), class: major ? 'is-major' : '' }));
            if (major) {
                const [lx, ly] = point(p, R - 29);
                const label = svg('text', { x: lx.toFixed(1), y: ly.toFixed(1), class: 'bg-num' });
                label.textContent = i * 5;
                ticks.append(label);
            }
        }
        const needle = svg('g', { class: 'bg-needle' });
        needle.append(
            svg('path', { d: `M${CX - 10} ${CY - 2.2}L${CX + R - 16} ${CY - 0.6}L${CX + R - 16} ${CY + 0.6}L${CX - 10} ${CY + 2.2}Z` }),
            svg('circle', { cx: CX, cy: CY, r: 6.5, class: 'bg-hub' }),
            svg('circle', { cx: CX, cy: CY, r: 2.2, class: 'bg-hub-dot' })
        );
        // Readout sits below the hub, between the two ends of the arc, so the
        // needle never crosses it.
        const pct = svg('text', { x: CX, y: 134, class: 'bg-pct' });
        const sub = svg('text', { x: CX, y: 150, class: 'bg-sub' });
        root.append(ticks, needle, pct, sub);
        return { root, value: root.querySelector('.bg-value'), needle, pct, sub };
    }
    function paint(gauge, p) {
        gauge.value.setAttribute('stroke-dasharray', `${(p * 100).toFixed(2)} 100`);
        gauge.needle.setAttribute('transform', `rotate(${(START + SWEEP * p).toFixed(2)} ${CX} ${CY})`);
        gauge.pct.textContent = `${Math.round(p * 100)}%`;
    }
    // Needle motion: eased with a small settle, and on a dial's first paint a
    // full sweep to 100 % and back, like an instrument cluster at ignition.
    function animate(gauge, state, to) {
        const from = state.shown ?? 0;
        state.shown = to;
        cancelAnimationFrame(state.frame);
        if (reduceMotion.matches) { paint(gauge, to); return; }
        const legs = state.booted ? [[from, to, 1100]] : [[0, 1, 650], [1, to, 1000]];
        state.booted = true;
        paint(gauge, legs[0][0]);
        let leg = 0, t0 = 0;
        const ease = t => 1 - Math.pow(1 - t, 3) + Math.sin(t * Math.PI) * 0.035 * (1 - t);
        const step = time => {
            if (!t0) t0 = time;
            const [a, b, duration] = legs[leg];
            const t = Math.min(1, (time - t0) / duration);
            paint(gauge, clamp(a + (b - a) * ease(t)));
            if (t < 1) { state.frame = requestAnimationFrame(step); return; }
            if (++leg < legs.length) { t0 = time; state.frame = requestAnimationFrame(step); }
        };
        state.frame = requestAnimationFrame(step);
    }

    /* ---------- Breakdown ---------- */
    const openBiggest = group => {
        const biggest = [...group.rows].sort((a, b) => amountOf(b) - amountOf(a))[0];
        if (biggest) viewRecord('expense', biggest.id);
    };
    const openCategory = group => { if (!window.openDistributionCategory?.(group.category)) openBiggest(group); };

    // Categories heaviest first; past MAX_ROWS the tail folds into "Otros".
    function groupByCategory(rows, maxRows = MAX_ROWS) {
        const grouped = new Map();
        rows.forEach(record => {
            const category = record.category || 'Sin rubro';
            if (!grouped.has(category)) grouped.set(category, []);
            grouped.get(category).push(record);
        });
        let groups = [...grouped].map(([category, list]) => ({
            category, rows: list, color: colorOf(category), total: list.reduce((sum, r) => sum + amountOf(r), 0)
        })).filter(group => group.total > 0).sort((a, b) => b.total - a.total);
        if (groups.length > maxRows) {
            const rest = groups.slice(maxRows - 1);
            groups = groups.slice(0, maxRows - 1);
            groups.push({
                category: `Otros ${rest.length} rubros`, rest: true, rows: rest.flatMap(g => g.rows),
                color: 'var(--slate-gray)', total: rest.reduce((sum, g) => sum + g.total, 0)
            });
        }
        return groups;
    }

    function breakdown(groups, remaining, base, { onOpen, of, empty, action }) {
        const wrap = node('div', 'bg-break');
        const head = node('div', 'bg-break-head');
        const spent = groups.reduce((sum, group) => sum + group.total, 0);
        head.append(node('span', '', 'En qué se fue'), node('span', 'bg-break-total', `${money(spent)} gastado`));

        const bar = node('div', 'bg-bar');
        bar.setAttribute('aria-hidden', 'true');
        const segments = groups.map(group => {
            const seg = node('span', 'bg-seg');
            seg.style.setProperty('--c', group.color);
            seg.style.setProperty('--w', `${(group.total / base * 100).toFixed(3)}%`);
            bar.append(seg);
            return seg;
        });
        if (remaining > 0) {
            const left = node('span', 'bg-seg bg-seg--left');
            left.style.setProperty('--w', `${(remaining / base * 100).toFixed(3)}%`);
            bar.append(left);
        }

        const list = node('ol', 'bg-list');
        const max = groups[0]?.total || 1;
        groups.forEach((group, index) => {
            const item = node('li');
            const row = node('button', 'bg-row');
            row.type = 'button';
            row.style.setProperty('--c', group.color);
            row.style.setProperty('--fill', `${(group.total / max * 100).toFixed(1)}%`);
            const share = Math.round(group.total / base * 100);
            const count = group.rows.length;
            row.setAttribute('aria-label', `${index + 1}. ${group.category}: ${money(group.total)}, ${share}% ${of}${group.rest ? '' : `, ${count} ${count === 1 ? 'gasto' : 'gastos'}. ${action}`}`);
            const name = node('span', 'bg-name');
            name.append(node('span', 'bg-rank', String(index + 1)), node('span', 'bg-label', group.category));
            const value = node('span', 'bg-amt');
            value.append(node('strong', '', money(group.total)), node('span', 'bg-share', `${share}%`));
            const meter = node('span', 'bg-meter');
            meter.append(node('span'));
            row.append(name, value, meter);
            // Hovering a row lights its slice of the bar and dims the rest.
            const hot = on => { segments[index]?.classList.toggle('is-hot', on); bar.classList.toggle('has-hot', on); };
            row.addEventListener('pointerenter', () => hot(true));
            row.addEventListener('pointerleave', () => hot(false));
            row.addEventListener('focus', () => hot(true));
            row.addEventListener('blur', () => hot(false));
            if (group.rest) { row.setAttribute('aria-disabled', 'true'); row.classList.add('is-static'); }
            else row.addEventListener('click', () => onOpen(group));
            item.append(row);
            list.append(item);
        });
        if (!groups.length) list.append(node('li', 'bg-empty', empty));
        wrap.append(head, bar, list);
        return wrap;
    }

    // Dial + breakdown into `stage`. `p` is the share still left (0–1).
    function mount(stage, { key, p, sub, label, onDial, groups, remaining, base, breakdownOpts }) {
        const gauge = buildGauge();
        const dial = node(onDial ? 'button' : 'div', `bg-gauge is-${zone(p)}`);
        if (onDial) { dial.type = 'button'; dial.addEventListener('click', onDial); }
        else { dial.setAttribute('role', 'img'); dial.classList.add('is-static'); }
        dial.setAttribute('aria-label', label);
        gauge.sub.textContent = sub;
        dial.append(gauge.root);
        stage.replaceChildren(dial, breakdown(groups, remaining, base, breakdownOpts));
        animate(gauge, stateOf(key), p);
    }

    /* Phone card (iOS-style): dial + what's left beside it, then a capsule bar
       and glass chips for the heaviest categories. Fills the fixed-height
       carousel card instead of floating in it. */
    const STATUS = {
        low: ['En reserva', 'battery_alert'],
        mid: ['Con cuidado', 'battery_4_bar'],
        high: ['Vas bien', 'battery_full']
    };
    // Category glyphs, matched through the scene families of escenas.js.
    const ICONS = {
        combustible: 'local_gas_station', educacion: 'school', taller: 'build', comida: 'restaurant',
        viaje: 'directions_car', salud: 'medical_services', servicios: 'lightbulb', banco: 'account_balance',
        multa: 'gavel', prestamo: 'handshake', compras: 'shopping_bag', ingreso: 'savings'
    };
    const symbol = name => {
        const el = node('span', 'material-symbols-outlined', name);
        el.setAttribute('aria-hidden', 'true');
        return el;
    };
    function iconOf(group) {
        if (group.rest) return 'more_horiz';
        const family = window.escenaMovimiento?.familia;
        if (!family) return 'payments';
        const key = family(group.category) || group.rows.map(row => family(row.description)).find(Boolean);
        return ICONS[key] || 'payments';
    }
    function mountCompact(stage, { key, p, balance, top, label, onDial, groups, remaining, base, breakdownOpts }) {
        const gauge = buildGauge();
        gauge.root.setAttribute('viewBox', '0 0 200 140');
        gauge.sub.remove();
        const level = zone(p);
        const dial = node('button', `bg-gauge gm-dial is-${level}`);
        dial.type = 'button';
        dial.setAttribute('aria-label', label);
        dial.addEventListener('click', onDial);
        dial.append(gauge.root);

        const stats = node('div', `gm-stats is-${level}`);
        const status = node('span', 'gm-status');
        status.append(symbol(STATUS[level][1]), document.createTextNode(STATUS[level][0]));
        stats.append(node('span', 'gm-label', 'Te queda'), node('strong', 'gm-amount', money(balance)),
            node('span', 'gm-of', `de ${money(top)}`), status);
        const head = node('div', 'gm-top');
        head.append(dial, stats);

        const bar = node('div', 'gm-bar');
        bar.setAttribute('aria-hidden', 'true');
        const segs = groups.map(group => {
            const seg = node('span', 'gm-seg');
            seg.style.setProperty('--c', group.color);
            seg.style.setProperty('--w', `${(group.total / base * 100).toFixed(3)}%`);
            return seg;
        });
        bar.append(...segs);
        if (remaining > 0) {
            const left = node('span', 'gm-seg gm-seg--left');
            left.style.setProperty('--w', `${(remaining / base * 100).toFixed(3)}%`);
            bar.append(left);
        }
        const chips = node('div', 'gm-chips');
        chips.setAttribute('role', 'group');
        chips.setAttribute('aria-label', 'En qué se fue');
        groups.forEach((group, index) => {
            const chip = node('button', 'gm-chip');
            chip.type = 'button';
            chip.style.setProperty('--c', group.color);
            const share = Math.round(group.total / base * 100);
            chip.setAttribute('aria-label', `${group.category}: ${money(group.total)}, ${share}% ${breakdownOpts.of}${group.rest ? '' : `. ${breakdownOpts.action}`}`);
            const text = node('span', 'gm-chip-text');
            text.append(node('span', 'gm-chip-name', group.category), node('strong', 'gm-chip-amt', short(group.total)));
            const glyph = node('span', 'gm-chip-ic');
            glyph.append(symbol(iconOf(group)));
            chip.append(glyph, text);
            const hot = on => { segs[index].classList.toggle('is-hot', on); bar.classList.toggle('has-hot', on); };
            chip.addEventListener('pointerenter', () => hot(true));
            chip.addEventListener('pointerleave', () => hot(false));
            if (group.rest) { chip.setAttribute('aria-disabled', 'true'); chip.classList.add('is-static'); }
            else chip.addEventListener('click', () => breakdownOpts.onOpen(group));
            chips.append(chip);
        });
        if (!groups.length) chips.append(node('span', 'bg-empty', breakdownOpts.empty));
        const spent = groups.reduce((sum, group) => sum + group.total, 0);
        const label2 = node('div', 'gm-foot-head');
        label2.append(node('span', '', 'En qué se fue'), node('span', 'gm-spent', `${money(spent)} gastado`));
        const foot = node('div', 'gm-foot');
        foot.append(label2, bar, chips);

        const wrap = node('div', 'gm');
        wrap.append(head, foot);
        stage.replaceChildren(wrap);
        animate(gauge, stateOf(key), p);
    }

    /* Share of the last deposit still left, and the cycle's spending. Drawn in
       the right panel on desktop and in its own card of the phone carousel,
       which has room for fewer categories. */
    const DEPOSIT_CARDS = [
        { stage: 'balanceGauge', when: 'gaugeWhen', key: 'deposit', rows: MAX_ROWS },
        { stage: 'balanceGaugeM', when: 'gaugeWhenM', key: 'depositM', rows: 3, compact: true }
    ];
    function render() {
        const deposit = [...deposits].sort((a, b) => d2(b.date) - d2(a.date))[0];
        const cycle = currentCycle();
        const cycleRows = cycle ? expenses.filter(record => {
            const date = d2(record.date);
            return date >= cycle.start && date <= cycle.end;
        }) : [];
        for (const card of DEPOSIT_CARDS) {
            const stage = get(card.stage);
            if (!stage) continue;
            const when = get(card.when);
            if (!deposit) {
                if (when) when.textContent = '';
                stage.replaceChildren(node('p', 'bg-empty', 'Todavía no hay depósitos'));
                states.delete(card.key);
                continue;
            }
            const today = new Date(); today.setHours(12, 0, 0, 0);
            const days = Math.round((today - d2(deposit.date)) / 86400000);
            if (when) when.textContent = `${dayNum(deposit.date)} ${monShort(deposit.date)} · ${days <= 0 ? 'Hoy' : days === 1 ? 'Ayer' : `Hace ${days} días`}`;

            const top = Math.max(1, amountOf(deposit));
            const balance = totalBal();
            const p = clamp(balance / top);
            const groups = groupByCategory(cycleRows, card.rows);
            const spent = groups.reduce((sum, group) => sum + group.total, 0);
            const remaining = Math.max(0, balance);
            (card.compact ? mountCompact : mount)(stage, {
                key: card.key, p, balance, top,
                sub: `${money(balance)} de ${money(top)}`,
                label: `Queda ${Math.round(p * 100)}% del depósito: ${money(balance)} de ${money(top)}. Ver depósito`,
                onDial: () => viewRecord('deposit', deposit.id),
                groups, remaining, base: Math.max(top, spent + remaining),
                breakdownOpts: { onOpen: openCategory, of: 'del depósito', empty: 'Sin gastos en este ciclo', action: 'Ver gastos' }
            });
        }
    }

    /* ---------- Resumen anual: iOS-style ring of the year's spending ----------
       Rounded segments with small gaps, a soft glass centre that reads the
       total (or the hovered category), and an inset grouped list below. */
    const RING_R = 46, RING_W = 12;
    const CAP = RING_W / 2 / (2 * Math.PI * RING_R) * 100;   // round cap length in pathLength units
    const GAP = 1.4;
    const short = value => {
        const abs = Math.abs(value);
        if (abs < 1000) return money(value);
        const [div, unit] = abs >= 1e6 ? [1e6, 'M'] : [1e3, 'k'];
        return `S/ ${(value / div).toFixed(abs / div >= 100 ? 0 : 1).replace(/\.0$/, '')}${unit}`;
    };
    let ringDrawn = false;

    function renderAnnual(year) {
        const stage = get('annualGauge');
        if (!stage) return;
        const inYear = records => records.filter(record => String(record.date).slice(0, 4) === String(year));
        const income = inYear(deposits).reduce((sum, r) => sum + amountOf(r), 0);
        const groups = groupByCategory(inYear(expenses));
        const spent = groups.reduce((sum, group) => sum + group.total, 0);
        if (!spent) { stage.replaceChildren(node('p', 'bg-empty', `Sin gastos en ${year}`)); return; }

        const wrap = node('div', 'ar');
        const figure = node('div', 'ar-ring');
        const root = svg('svg', { viewBox: '0 0 120 120', 'aria-hidden': 'true' });
        const turn = svg('g', { transform: 'rotate(-90 60 60)' });
        turn.append(svg('circle', { cx: 60, cy: 60, r: RING_R, class: 'ar-track', pathLength: 100 }));
        let start = 0;
        const arcs = groups.map((group, index) => {
            const share = group.total / spent * 100;
            const single = groups.length === 1;
            const len = single ? 100 : Math.max(0.01, share - GAP - 2 * CAP);
            const circle = svg('circle', {
                cx: 60, cy: 60, r: RING_R, class: 'ar-seg', pathLength: 100,
                'stroke-dasharray': `${len} ${100 - len}`,
                'stroke-dashoffset': `${-(start + (single ? 0 : GAP / 2 + CAP))}`
            });
            circle.style.setProperty('--c', group.color);
            if (single) circle.setAttribute('stroke-linecap', 'butt');
            start += share;
            turn.append(circle);
            if (!ringDrawn && !reduceMotion.matches) circle.animate(
                [{ strokeDasharray: `0 100` }, { strokeDasharray: `${len} ${100 - len}` }],
                { duration: 700, delay: 120 + index * 90, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
            return circle;
        });
        ringDrawn = true;
        root.append(turn);

        // Glass centre: total by default, the hovered category otherwise.
        const centre = node('div', 'ar-centre');
        const cLabel = node('span', 'ar-c-label'), cValue = node('strong', 'ar-c-value'), cSub = node('span', 'ar-c-sub');
        centre.append(cLabel, cValue, cSub);
        const showTotal = () => {
            cLabel.textContent = 'Gastado';
            cValue.textContent = short(spent);
            cSub.textContent = income > 0 ? `${Math.round(spent / income * 100)}% de ingresos` : `${year}`;
            centre.style.removeProperty('--c');
        };
        showTotal();
        figure.append(root, centre);

        const list = node('ul', 'ar-list');
        const rows = groups.map((group, index) => {
            const share = Math.round(group.total / spent * 100);
            const count = group.rows.length;
            const row = node('button', 'ar-row');
            row.type = 'button';
            row.style.setProperty('--c', group.color);
            row.setAttribute('aria-label', `${group.category}: ${money(group.total)}, ${share}% del gasto de ${year}${group.rest ? '' : `, ${count} ${count === 1 ? 'gasto' : 'gastos'}. Ver el gasto más grande`}`);
            row.append(node('span', 'ar-dot'), node('span', 'ar-name', group.category), node('span', 'ar-amt', short(group.total)), node('span', 'ar-pct', `${share}%`));
            if (group.rest) { row.setAttribute('aria-disabled', 'true'); row.classList.add('is-static'); }
            else row.addEventListener('click', () => openBiggest(group));
            const hot = on => {
                wrap.classList.toggle('has-hot', on);
                arcs[index].classList.toggle('is-hot', on);
                row.classList.toggle('is-hot', on);
                if (!on) { showTotal(); return; }
                cLabel.textContent = group.rest ? 'Otros' : group.category;
                cValue.textContent = short(group.total);
                cSub.textContent = `${share}% del gasto`;
                centre.style.setProperty('--c', group.color);
            };
            for (const target of [row, arcs[index]]) {
                target.addEventListener('pointerenter', () => hot(true));
                target.addEventListener('pointerleave', () => hot(false));
            }
            row.addEventListener('focus', () => hot(true));
            row.addEventListener('blur', () => hot(false));
            arcs[index].addEventListener('click', () => row.click());
            const item = node('li');
            item.append(row);
            return item;
        });
        list.append(...rows);
        wrap.append(figure, list);
        stage.replaceChildren(wrap);
    }

    window.renderBalanceGauge = render;
    window.renderAnnualGauge = renderAnnual;
    // app.js may have drawn the annual summary before this script loaded.
    const year = get('summaryYear')?.value;
    if (year) renderAnnual(year);
})();
