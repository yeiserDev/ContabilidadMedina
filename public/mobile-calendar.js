/* Calendario móvil: usa los mismos movimientos y el detalle de app.js. */
(function () {
    'use strict';
    const calendar = document.getElementById('activityCalendar');
    if (!calendar) return;
    const now = new Date();
    let month = now.getMonth(), year = now.getFullYear();
    let selectedDate = today(), filter = 'all', returnFocus = null;
    let lastScopeKey = null;
    const dateLabel = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
    const monthLabel = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' });
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const palette = ['#cd501c', '#3967d5', '#8852c5', '#167d71', '#b33f79'];
    const compactAmount = value => value < 1000
        ? value.toLocaleString('es-PE', { maximumFractionDigits: 2 })
        : (value / (value < 1000000 ? 1000 : 1000000)).toLocaleString('es-PE', { maximumFractionDigits: 1 }) + (value < 1000000 ? 'k' : 'M');
    function categoryColor(name) {
        const index = categories.indexOf(name);
        return palette[(index < 0 ? [...name].reduce((s, c) => s + c.charCodeAt(0), 0) : index) % palette.length];
    }
    function recordIcon(record) {
        if (record.kind === 'deposit') return 'south_west';
        const text = `${record.category || ''} ${record.description || ''}`.toLowerCase();
        if (/petróleo|petroleo|combustible|gasolina/.test(text)) return 'local_gas_station';
        if (/almuerzo|comida|cena|desayuno|restauran/.test(text)) return 'restaurant';
        if (/compra|víveres|viveres|supermercado|mass/.test(text)) return 'shopping_bag';
        if (/viático|viatico|viaje/.test(text)) return 'directions_bus';
        if (/devolución|devolucion|préstamo|prestamo/.test(text)) return 'currency_exchange';
        return 'receipt_long';
    }
    function animateContent(node, direction = 1) {
        if (reducedMotion.matches || !node.animate) return;
        node.getAnimations().forEach(a => a.cancel());
        node.animate([{ opacity: 0.45, transform: `translateX(${direction * 12}px)` }, { opacity: 1, transform: 'translateX(0)' }], { duration: 230, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }
    function icon(name) {
        const node = el('span', 'material-symbols-outlined', name);
        node.setAttribute('aria-hidden', 'true');
        return node;
    }
    function records(date) {
        return [
            ...deposits.filter(r => !date || r.date === date).map(r => ({ ...r, kind: 'deposit' })),
            ...expenses.filter(r => !date || r.date === date).map(r => ({ ...r, kind: 'expense' }))
        ];
    }
    const amount = r => Number(r.amount) || 0;
    const total = rows => rows.reduce((sum, r) => sum + amount(r), 0);
    const iso = day => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const shortDate = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' });
    function scope() {
        const key = document.getElementById('monthFilter').value || 'all';
        const cycle = getCycles().find(c => c.id === key);
        const end = new Date(Math.min(d2(today()).getTime(), cycle ? cycle.end.getTime() : Infinity));
        // Los ciclos terminan justo antes del mediodía del siguiente inicio.
        // Traducir ese límite a fechas conserva el día inicial del nuevo ciclo fuera del anterior.
        if (d2(localDate(end)) > end) end.setDate(end.getDate() - 1);
        return { key, cycle, start: cycle ? localDate(cycle.start) : null, end: localDate(end) };
    }
    const inScope = (date, period) => (!period.start || date >= period.start) && date <= period.end;

    // Se crea antes de abrir; el detalle existente sigue siendo la única ficha del movimiento.
    const overlay = el('div', 'modal-bg activity-day-overlay');
    overlay.id = 'activityDayModal';
    overlay.innerHTML = `
        <section class="modal activity-day" role="dialog" aria-modal="true" aria-labelledby="activityDayTitle" tabindex="-1">
            <div class="ad-handle" aria-hidden="true"></div>
            <header class="ad-header"><div><h2 id="activityDayTitle"></h2><p id="adDate"></p></div><button type="button" id="adClose" class="ad-close" aria-label="Cerrar movimientos del día"><span class="material-symbols-outlined" aria-hidden="true">close</span></button></header>
            <div class="ad-day-nav"><button type="button" id="adPrev" aria-label="Día anterior"><span class="material-symbols-outlined" aria-hidden="true">chevron_left</span></button><span id="adDayPosition"></span><button type="button" id="adNext" aria-label="Día siguiente"><span class="material-symbols-outlined" aria-hidden="true">chevron_right</span></button></div>
            <div class="ad-scroll">
                <section class="ad-summary" aria-label="Resumen del día"><div class="ad-spending"><div class="ad-spending-copy"><span>Gastos del día</span><strong id="adExpense"></strong><span id="adExpenseCount"></span></div><div id="adRing" class="ad-ring"></div></div><div class="ad-totals"><div><span id="adIncomeLabel"></span><strong id="adIncome"></strong></div><div><span>Saldo disponible</span><strong id="adBalance"></strong></div></div><p class="ad-balance-note">Saldo acumulado al cierre de este día</p></section>
                <section id="adCategories" class="ad-categories" aria-labelledby="adCategoriesTitle"><div class="ad-section-heading"><h3 id="adCategoriesTitle">Distribución del gasto</h3><span>Por rubro</span></div><div id="adCategoryBars"></div></section>
                <div class="ad-list-heading"><h3>Movimientos</h3><span id="adCount" aria-live="polite"></span></div>
                <div class="ad-filters" role="group" aria-label="Filtrar movimientos del día"><span class="ad-filter-thumb" aria-hidden="true"></span><button type="button" data-kind="all" aria-pressed="true">Todos</button><button type="button" data-kind="expense" aria-pressed="false">Gastos</button><button type="button" data-kind="deposit" aria-pressed="false">Depósitos</button></div>
                <div id="adRecords" class="ad-records"></div>
            </div>
        </section>`;
    document.body.appendChild(overlay);
    const sheet = overlay.querySelector('.activity-day');
    const get = id => document.getElementById(id);

    function render() {
        const period = scope();
        if (period.key !== lastScopeKey) {
            if (!inScope(selectedDate, period)) selectedDate = period.end;
            const anchor = d2(selectedDate);
            month = anchor.getMonth(); year = anchor.getFullYear();
            lastScopeKey = period.key;
        }
        get('acMonth').textContent = monthLabel.format(new Date(year, month, 1));
        const byDate = new Map();
        const prefix = iso(1).slice(0, 7);
        const monthly = records().filter(r => r.date.startsWith(prefix + '-') && inScope(r.date, period));
        const visibleStart = period.start && period.start > iso(1) ? period.start : iso(1);
        const visibleEnd = period.end < iso(new Date(year, month + 1, 0).getDate()) ? period.end : iso(new Date(year, month + 1, 0).getDate());
        get('acScope').textContent = visibleStart <= visibleEnd
            ? `${period.cycle ? 'Ciclo seleccionado' : 'Todos los ciclos'} · ${shortDate.format(d2(visibleStart))} – ${shortDate.format(d2(visibleEnd))}`
            : 'Este mes no tiene días dentro del periodo seleccionado';
        monthly.forEach(r => {
            if (!byDate.has(r.date)) byDate.set(r.date, []);
            byDate.get(r.date).push(r);
        });
        const spentByDate = [...byDate].map(([date, rows]) => [date, total(rows.filter(r => r.kind === 'expense'))]);
        const maxSpent = Math.max(0, ...spentByDate.map(([, value]) => value));
        const grid = get('acDays');
        grid.replaceChildren();
        const offset = (new Date(year, month, 1).getDay() + 6) % 7;
        for (let i = 0; i < offset; i++) grid.appendChild(el('span', 'ac-blank'));
        for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
            const date = iso(day), rows = byDate.get(date) || [];
            const income = rows.filter(r => r.kind === 'deposit').length;
            const expense = rows.length - income;
            const spent = total(rows.filter(r => r.kind === 'expense'));
            const received = total(rows.filter(r => r.kind === 'deposit'));
            const button = el('button', 'ac-day', '');
            button.type = 'button';
            button.dataset.date = date;
            button.disabled = !inScope(date, period);
            button.appendChild(el('span', 'ac-day-number', day));
            if (date === today()) { button.classList.add('is-today'); button.setAttribute('aria-current', 'date'); }
            if (date === selectedDate) button.classList.add('is-selected');
            if (rows.length) button.classList.add('has-activity');
            if (spent) {
                button.dataset.heat = String(Math.max(1, Math.ceil(spent / maxSpent * 4)));
                button.appendChild(el('span', 'ac-day-amount', compactAmount(spent)));
            } else {
                button.appendChild(el('span', `ac-day-amount${received ? ' is-income' : ''}`, received ? '+' + compactAmount(received) : ''));
            }
            const dots = el('span', 'ac-day-dots');
            dots.setAttribute('aria-hidden', 'true');
            if (income) dots.appendChild(el('i', 'ac-dot ac-dot--income'));
            button.appendChild(dots);
            button.setAttribute('aria-label', `${dateLabel.format(d2(date))}: ${expense} gastos, ${money(spent)}; ${income} depósitos, ${money(received)}`);
            button.title = `Gastos: ${money(spent)} · Depósitos: ${money(received)}`;
            if (!button.disabled) button.addEventListener('click', e => openDay(date, button, e.detail > 0));
            grid.appendChild(button);
        }
        const insight = get('acMonthInsight');
        insight.replaceChildren();
        if (maxSpent) {
            const peak = spentByDate.find(([, value]) => value === maxSpent);
            const peakButton = el('button', 'ac-peak');
            peakButton.type = 'button';
            peakButton.append(icon('local_fire_department'), el('span', '', `Mayor gasto · ${dayNum(peak[0])} ${monShort(peak[0])}`), el('strong', '', money(maxSpent)), icon('chevron_right'));
            peakButton.addEventListener('click', e => openDay(peak[0], peakButton, e.detail > 0));
            insight.appendChild(peakButton);
        } else {
            insight.appendChild(el('p', 'ac-no-spending', byDate.size ? 'Este periodo solo tiene depósitos registrados.' : 'No hay movimientos en el periodo visible.'));
        }
        get('acIncome').textContent = money(total(monthly.filter(r => r.kind === 'deposit')));
        get('acExpense').textContent = money(total(monthly.filter(r => r.kind === 'expense')));
        if (overlay.classList.contains('active')) renderDay();
    }

    function renderDay() {
        const rows = records(selectedDate);
        const incoming = total(rows.filter(r => r.kind === 'deposit'));
        const outgoing = total(rows.filter(r => r.kind === 'expense'));
        const openingBalance = balBefore(selectedDate);
        const balance = openingBalance + incoming - outgoing;
        get('activityDayTitle').textContent = `${weekday(selectedDate)}, ${dayNum(selectedDate)}`;
        get('adDate').textContent = dateLabel.format(d2(selectedDate));
        get('adBalance').textContent = `${balance < 0 ? '−' : ''}${money(Math.abs(balance))}`;
        get('adBalance').classList.toggle('is-negative', balance < 0);
        get('adIncomeLabel').textContent = incoming ? 'Depósitos del día' : 'Saldo al iniciar';
        const initialValue = incoming || openingBalance;
        get('adIncome').textContent = `${initialValue < 0 ? '−' : ''}${money(Math.abs(initialValue))}`;
        get('adIncome').classList.toggle('is-negative', initialValue < 0);
        const period = scope();
        const previous = d2(selectedDate); previous.setDate(previous.getDate() - 1);
        const next = d2(selectedDate); next.setDate(next.getDate() + 1);
        get('adPrev').disabled = !inScope(localDate(previous), period);
        get('adNext').disabled = !inScope(localDate(next), period);
        get('adExpense').textContent = money(outgoing);
        const expenseCount = rows.filter(r => r.kind === 'expense').length;
        get('adExpenseCount').textContent = `${expenseCount} ${expenseCount === 1 ? 'gasto registrado' : 'gastos registrados'}`;
        get('adDayPosition').textContent = selectedDate === today() ? 'Hoy' : `Día ${dayNum(selectedDate)} de ${new Date(d2(selectedDate).getFullYear(), d2(selectedDate).getMonth() + 1, 0).getDate()}`;
        const categories = new Map();
        rows.filter(r => r.kind === 'expense').forEach(r => categories.set(r.category || 'Sin rubro', (categories.get(r.category || 'Sin rubro') || 0) + amount(r)));
        get('adCategories').hidden = !outgoing;
        const bars = get('adCategoryBars');
        bars.replaceChildren();
        const sorted = [...categories].sort((a, b) => b[1] - a[1]);
        const groups = sorted.slice(0, 4);
        if (sorted.length > 4) groups.push(['Otros rubros', sorted.slice(4).reduce((s, row) => s + row[1], 0)]);
        const ring = get('adRing');
        ring.replaceChildren();
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', outgoing ? groups.map(([name, value]) => `${name}: ${Math.round(value / outgoing * 100)}%`).join(', ') : 'Sin gastos registrados');
        const circumference = 2 * Math.PI * 40;
        function segment(color, size, offset) {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            for (const [key, value] of Object.entries({ cx: 50, cy: 50, r: 40, fill: 'none', stroke: color, 'stroke-width': 10, 'stroke-dasharray': `${size} ${circumference}`, 'stroke-dashoffset': -offset })) circle.setAttribute(key, value);
            svg.appendChild(circle);
        }
        segment('var(--ac-track)', circumference, 0);
        let offset = 0;
        groups.forEach(([name, value]) => {
            const length = value / outgoing * circumference;
            segment(categoryColor(name), Math.max(0, length - (groups.length > 1 ? 3 : 0)), offset);
            offset += length;
        });
        ring.appendChild(svg);
        const ringCenter = el('span', 'ad-ring-center');
        ringCenter.append(icon(outgoing ? 'donut_small' : 'check'), el('span', '', `${groups.length} ${groups.length === 1 ? 'rubro' : 'rubros'}`));
        ring.appendChild(ringCenter);
        groups.forEach(([name, value]) => {
            const row = el('div', 'ad-category');
            row.style.setProperty('--category-color', categoryColor(name));
            const label = el('div', 'ad-category-label');
            const categoryName = el('span', 'ad-category-name', name);
            categoryName.prepend(el('i', 'ad-category-dot'));
            label.append(categoryName, el('span', 'ad-category-percent', `${Math.round(value / outgoing * 100)}%`), el('strong', '', money(value)));
            const track = el('div', 'ad-category-track');
            const fill = el('span'); fill.style.width = `${value / outgoing * 100}%`;
            track.appendChild(fill); row.append(label, track); bars.appendChild(row);
        });
        const visible = rows.filter(r => filter === 'all' || r.kind === filter);
        get('adCount').textContent = `${visible.length} ${visible.length === 1 ? 'movimiento' : 'movimientos'}`;
        overlay.querySelectorAll('[data-kind]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === filter)));
        overlay.querySelector('.ad-filter-thumb').style.transform = `translateX(${['all', 'expense', 'deposit'].indexOf(filter) * 100}%)`;
        const list = get('adRecords');
        list.replaceChildren();
        visible.forEach(r => {
            const isIncome = r.kind === 'deposit';
            const card = el('button', `ad-record ${isIncome ? 'is-income' : 'is-expense'}`);
            card.type = 'button';
            card.style.setProperty('--category-color', isIncome ? 'var(--ac-income)' : categoryColor(r.category || 'Sin rubro'));
            const figure = el('span', 'ad-record-icon');
            figure.appendChild(icon(recordIcon(r)));
            const copy = el('span', 'ad-record-copy');
            copy.appendChild(el('strong', '', r.description || (isIncome ? 'Depósito' : r.category || 'Gasto')));
            const subtitle = isIncome ? `Depósito ${r.type || ''}`.trim() : `${r.category || 'Sin rubro'} · ${r.wallet === 'bcp' ? 'BCP' : r.wallet === 'yape' ? 'Yape' : 'Efectivo'}`;
            copy.appendChild(el('span', '', subtitle));
            const photos = (r.imageUrls || (r.imageUrl ? [r.imageUrl] : [])).length;
            if (photos) {
                const evidence = el('span', 'ad-evidence', `${photos} ${photos === 1 ? 'comprobante' : 'comprobantes'}`);
                evidence.prepend(icon('attach_file')); copy.appendChild(evidence);
            }
            const value = el('span', 'ad-record-value');
            value.appendChild(el('strong', 'ad-record-amount', `${isIncome ? '+' : '−'}${money(amount(r))}`));
            if (!isIncome && outgoing) value.appendChild(el('span', 'ad-record-share', `${Math.round(amount(r) / outgoing * 100)}% del día`));
            card.append(figure, copy, value, icon('chevron_right'));
            if (!isIncome && outgoing) {
                const track = el('span', 'ad-record-track');
                const fill = el('span'); fill.style.transform = `scaleX(${amount(r) / outgoing})`;
                track.appendChild(fill); card.appendChild(track);
            }
            card.addEventListener('click', () => {
                closeM(overlay.id);
                window.viewRecord(r.kind, r.id);
                back.hidden = false;
                detail.querySelector('.modal-x').focus();
            });
            list.appendChild(card);
        });
        if (!visible.length) {
            const empty = el('div', 'ad-empty');
            empty.append(icon('event_available'), el('strong', '', rows.length ? 'Sin movimientos de este tipo' : 'Un día sin movimientos'), el('p', '', rows.length ? 'Prueba con otro filtro para ver el resto.' : 'Los gastos y depósitos que registres aquí aparecerán en este día.'));
            list.appendChild(empty);
        }
    }

    function openDay(date, source, animated = true) {
        if (!inScope(date, scope())) return;
        selectedDate = date;
        filter = 'all';
        returnFocus = source || calendar.querySelector(`[data-date="${date}"]`) || get('acToday');
        calendar.querySelectorAll('.ac-day').forEach(b => b.classList.toggle('is-selected', b.dataset.date === date));
        renderDay();
        overlay.classList.toggle('is-instant', !animated);
        openM(overlay.id);
        overlay.querySelector('.ad-scroll').scrollTop = 0;
        get('adClose').focus();
    }
    get('adClose').addEventListener('click', () => closeM(overlay.id));
    overlay.addEventListener('click', e => { if (e.target === overlay) closeM(overlay.id); });
    overlay.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', e => {
        if (filter === b.dataset.kind) return;
        filter = b.dataset.kind; renderDay();
        if (e.detail > 0) animateContent(get('adRecords'));
    }));
    function moveDay(delta, animated) {
        const date = d2(selectedDate); date.setDate(date.getDate() + delta);
        if (!inScope(localDate(date), scope())) return;
        selectedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        month = date.getMonth(); year = date.getFullYear();
        filter = 'all'; render();
        returnFocus = calendar.querySelector(`[data-date="${selectedDate}"]`);
        overlay.querySelector('.ad-scroll').scrollTop = 0;
        if (animated) animateContent(overlay.querySelector('.ad-scroll'), delta);
    }
    get('adPrev').addEventListener('click', e => moveDay(-1, e.detail > 0));
    get('adNext').addEventListener('click', e => moveDay(1, e.detail > 0));
    overlay.addEventListener('keydown', e => {
        if (e.key !== 'Tab') return;
        const focusable = [...sheet.querySelectorAll('button:not([hidden])')].filter(b => b.offsetParent !== null);
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    function restoreCalendarFocus() {
        if (document.querySelector('.modal-bg.active')) return;
        const target = returnFocus?.isConnected ? returnFocus : calendar.querySelector(`[data-date="${selectedDate}"]`);
        target?.focus({ preventScroll: true });
    }
    new MutationObserver(() => {
        if (!overlay.classList.contains('active')) restoreCalendarFocus();
    }).observe(overlay, { attributes: true, attributeFilter: ['class'] });

    // Arrastrar la cabecera permite cerrar sin interferir con el scroll de las tarjetas.
    let dragStart = null;
    const header = overlay.querySelector('.ad-header');
    header.style.touchAction = 'pan-x';
    overlay.querySelector('.ad-handle').style.touchAction = 'none';
    sheet.addEventListener('pointerdown', e => {
        if (!e.target.closest('.ad-header, .ad-handle') || e.target.closest('button') || e.pointerType === 'mouse' || !e.isPrimary || dragStart) return;
        dragStart = { y: e.clientY, time: performance.now(), pointerId: e.pointerId };
        sheet.setPointerCapture(e.pointerId);
        sheet.style.transition = 'none';
    });
    sheet.addEventListener('pointermove', e => {
        if (dragStart && e.pointerId === dragStart.pointerId) {
            const delta = e.clientY - dragStart.y;
            sheet.style.transform = `translateY(${delta >= 0 ? delta : delta * 0.15}px)`;
        }
    });
    function releaseDrag(e) {
        if (!dragStart || e.pointerId !== dragStart.pointerId) return;
        const distance = Math.max(0, e.clientY - dragStart.y);
        const speed = distance / Math.max(1, performance.now() - dragStart.time);
        dragStart = null;
        sheet.style.transition = '';
        sheet.style.transform = '';
        if (e.type !== 'pointercancel' && (distance > 100 || (distance > 35 && speed > 0.5))) closeM(overlay.id);
    }
    sheet.addEventListener('pointerup', releaseDrag);
    sheet.addEventListener('pointercancel', releaseDrag);

    const detail = get('viewRecordModal');
    const back = el('button', 'ad-back', 'Volver al día');
    back.type = 'button'; back.hidden = true; back.prepend(icon('arrow_back'));
    detail.querySelector('.modal').prepend(back);
    back.addEventListener('click', () => { closeM(detail.id); openDay(selectedDate); });
    new MutationObserver(() => {
        if (!detail.classList.contains('active')) {
            if (!back.hidden) restoreCalendarFocus();
            back.hidden = true;
        }
    }).observe(detail, { attributes: true, attributeFilter: ['class'] });

    function moveMonth(delta, animated) {
        const next = new Date(year, month + delta, 1);
        month = next.getMonth(); year = next.getFullYear(); render();
        if (animated) animateContent(get('acDays'), delta);
    }
    get('acPrev').addEventListener('click', e => moveMonth(-1, e.detail > 0));
    get('acNext').addEventListener('click', e => moveMonth(1, e.detail > 0));
    get('acToday').addEventListener('click', () => {
        selectedDate = inScope(today(), scope()) ? today() : scope().end;
        const current = d2(selectedDate); month = current.getMonth(); year = current.getFullYear(); render();
        calendar.querySelector(`[data-date="${selectedDate}"]`)?.focus();
    });
    document.addEventListener('conta:calendar-update', render);
    render();
})();
