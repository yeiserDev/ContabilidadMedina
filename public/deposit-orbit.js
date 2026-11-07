/* Deposit orbit — the latest deposit drawn as a shining cheque, with the
   heaviest expense categories of the selected cycle orbiting around it.
   Each orbiting figure opens the expenses of its category. */
(() => {
    'use strict';
    const ICONS = {
        combustible: 'local_gas_station', educacion: 'school', taller: 'build', comida: 'restaurant',
        viaje: 'directions_car', salud: 'medical_services', servicios: 'lightbulb', banco: 'account_balance',
        multa: 'gavel', prestamo: 'handshake', compras: 'shopping_bag', ingreso: 'savings'
    };
    const MAX_BUBBLES = 6;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = value => value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : Math.round(value).toString();
    let bubbles = [], phase = 0, last = 0, frame = 0, paused = false, onScreen = true;
    let geo = { cx: 0, cy: 0, rx: 0, ry: 0 }, observedStage = null, defaultHint = '', entered = false;

    const get = id => document.getElementById(id);
    const node = (tag, className, text) => {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined) el.textContent = text;
        return el;
    };
    const symbol = name => {
        const el = node('span', 'material-symbols-outlined', name);
        el.setAttribute('aria-hidden', 'true');
        return el;
    };
    const amountOf = record => Number(record.amount) || 0;

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
    function iconOf(category, rows) {
        const family = window.escenaMovimiento?.familia;
        if (!family) return 'payments';
        const key = family(category) || rows.map(row => family(row.description)).find(Boolean);
        return ICONS[key] || 'payments';
    }

    function cheque(deposit) {
        if (!deposit) {
            const empty = node('div', 'orbit-cheque orbit-cheque--empty');
            empty.append(node('span', 'chq-to', 'Todavía no hay depósitos'));
            return empty;
        }
        const card = node('button', 'orbit-cheque');
        card.type = 'button';
        card.setAttribute('aria-label', `Último depósito: ${money(deposit.amount)}, ${fmtDate(deposit.date)}. Ver movimiento`);
        // A quiet cheque: label, amount, then a perforated stub with issuer and date.
        const top = node('span', 'chq-row');
        top.append(node('span', 'chq-label', `Depósito ${deposit.type || ''}`.trim()), symbol('south_west'));
        const amount = node('span', 'chq-amount');
        amount.append(node('span', 'chq-cur', '+S/'), document.createTextNode(money(deposit.amount).replace(/^[^\d-]+/, '')));
        const stub = node('span', 'chq-row chq-stub');
        stub.append(node('span', '', 'Conta Medina'),
            node('span', '', d2(deposit.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')));
        card.append(top, amount, stub, node('span', 'chq-sheen'));
        card.addEventListener('click', () => viewRecord('deposit', deposit.id));
        return card;
    }

    function openCategory(group) {
        if (window.openDistributionCategory?.(group.category)) return;
        // Fall back to the heaviest expense when the sheet cannot show this cycle.
        const biggest = [...group.rows].sort((a, b) => amountOf(b) - amountOf(a))[0];
        if (biggest) viewRecord('expense', biggest.id);
    }

    function bubble(group, max) {
        const size = Math.round(34 + 10 * Math.sqrt(group.total / max));
        const button = node('button', 'orbit-bubble');
        button.type = 'button';
        button.style.setProperty('--c', colorOf(group.category));
        button.style.setProperty('--s', `${size}px`);
        const count = `${group.rows.length} ${group.rows.length === 1 ? 'gasto' : 'gastos'}`;
        button.setAttribute('aria-label', `${group.category}: ${money(group.total)}, ${count}. Ver gastos`);
        const orb = node('span', 'orbit-orb');
        orb.append(symbol(iconOf(group.category, group.rows)));
        button.append(orb, node('span', 'orbit-tag', `S/ ${compact(group.total)}`));
        const describe = () => setHint(group.category, `${money(group.total)} · ${count}`);
        button.addEventListener('mouseenter', describe);
        button.addEventListener('focus', describe);
        button.addEventListener('mouseleave', () => setHint());
        button.addEventListener('blur', () => setHint());
        button.addEventListener('click', () => openCategory(group));
        return button;
    }

    function setHint(title, detail) {
        const hint = get('orbitHint');
        if (!hint) return;
        hint.replaceChildren();
        if (!title) { hint.textContent = defaultHint; return; }
        hint.append(node('strong', '', title), document.createTextNode(` · ${detail}`));
    }

    function measure() {
        const stage = get('depositOrbit');
        if (!stage) return;
        const w = stage.clientWidth, h = stage.clientHeight;
        geo = { cx: w / 2, cy: h / 2, rx: Math.max(60, w / 2 - 30), ry: Math.max(60, h / 2 - 42) };
        const path = stage.querySelector('.orbit-path');
        if (path) Object.assign(path.style, {
            left: `${geo.cx - geo.rx}px`, top: `${geo.cy - geo.ry}px`, width: `${geo.rx * 2}px`, height: `${geo.ry * 2}px`
        });
    }

    function place() {
        const count = bubbles.length;
                bubbles.forEach((el, index) => {
            // Start the heaviest category at the front (bottom) of the orbit.
            const angle = phase + Math.PI / 2 + index * 2 * Math.PI / count;
            const sin = Math.sin(angle), depth = (sin + 1) / 2;
            const x = geo.cx + geo.rx * Math.cos(angle);
            const y = geo.cy + geo.ry * sin;
            el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${(0.86 + 0.14 * depth).toFixed(3)})`;
            el.style.zIndex = sin > -0.2 ? '3' : '1';
            el.style.opacity = (0.7 + 0.3 * depth).toFixed(2);
        });
    }

    const running = () => bubbles.length && onScreen && !document.hidden && !reduceMotion.matches;
    function tick(time) {
        frame = 0;
        const delta = last ? Math.min(64, time - last) : 0;
        last = time;
        if (!paused) phase += delta * 0.00007; // about one turn every 90 s
        place(time);
        if (running()) frame = requestAnimationFrame(tick);
    }
    function start() {
        if (frame || !running()) { if (!running()) place(0); return; }
        last = 0;
        frame = requestAnimationFrame(tick);
    }

    function watch(stage) {
        if (observedStage === stage) return;
        observedStage = stage;
        new ResizeObserver(() => { measure(); place(performance.now()); }).observe(stage);
        new IntersectionObserver(entries => { onScreen = entries[0].isIntersecting; start(); }).observe(stage);
        stage.addEventListener('pointerenter', () => { paused = true; });
        stage.addEventListener('pointerleave', () => { paused = false; });
        stage.addEventListener('focusin', () => { paused = true; });
        stage.addEventListener('focusout', () => { paused = false; });
    }

    function render() {
        const stage = get('depositOrbit');
        if (!stage) return;
        watch(stage);
        const cycle = currentCycle();
        const rows = cycle ? expenses.filter(record => {
            const date = d2(record.date);
            return date >= cycle.start && date <= cycle.end;
        }) : [];
        const grouped = new Map();
        rows.forEach(record => {
            const category = record.category || 'Sin rubro';
            if (!grouped.has(category)) grouped.set(category, []);
            grouped.get(category).push(record);
        });
        const groups = [...grouped].map(([category, list]) => ({ category, rows: list, total: list.reduce((sum, r) => sum + amountOf(r), 0) }))
            .filter(group => group.total > 0).sort((a, b) => b.total - a.total).slice(0, MAX_BUBBLES);
        const deposit = [...deposits].sort((a, b) => d2(b.date) - d2(a.date))[0];

        const when = get('orbitWhen');
        if (when) {
            if (deposit) {
                const today = new Date(); today.setHours(12, 0, 0, 0);
                const days = Math.round((today - d2(deposit.date)) / 86400000);
                when.textContent = `${dayNum(deposit.date)} ${monShort(deposit.date)} · ${days <= 0 ? 'Hoy' : days === 1 ? 'Ayer' : `Hace ${days} días`}`;
            } else when.textContent = '';
        }
        defaultHint = groups.length ? 'Toca una figura para ver sus gastos' : 'Sin gastos en este ciclo';

        const path = node('span', 'orbit-path');
        path.setAttribute('aria-hidden', 'true');
        const max = groups[0]?.total || 1;
        bubbles = groups.map(group => bubble(group, max));
        const list = node('div', 'orbit-bubbles');
        list.setAttribute('role', 'group');
        list.setAttribute('aria-label', 'Rubros con más gasto en el ciclo');
        list.append(...bubbles);
        stage.replaceChildren(path, cheque(deposit), list);
        setHint();
        measure();
        place(performance.now());
        if (!entered && !reduceMotion.matches) {
            // First paint only: the figures settle in one after another.
            entered = true;
            bubbles.forEach((el, index) => el.firstChild.animate(
                [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }],
                { duration: 520, delay: 120 + index * 70, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
        }
        start();
    }

    document.addEventListener('visibilitychange', start);
    reduceMotion.addEventListener?.('change', start);
    window.renderDepositOrbit = render;
})();
