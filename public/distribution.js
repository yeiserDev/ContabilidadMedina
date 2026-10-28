/* Interactive distribution. Every view uses the explicitly selected cycle. */
(() => {
    'use strict';
    const get = id => document.getElementById(id);
    const legend = get('distributionLegend');
    if (!legend) return;
    let selected = null, unit = 'percent', order = 'amount', scopeKey = null;
    let returnFocus = null, recordOrder = 'date', detailReturn = null;
    const shortDate = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' });
    const node = (tag, className, text) => {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined) el.textContent = text;
        return el;
    };
    const amount = record => Number(record.amount) || 0;
    const sum = rows => rows.reduce((total, record) => total + amount(record), 0);
    function scope() {
        const key = get('monthFilter').value;
        const cycle = getCycles().find(item => item.id === key);
        // No fallback to all records or to the newest cycle.
        const rows = cycle ? expenses.filter(record => {
            const date = d2(record.date);
            return date >= cycle.start && date <= cycle.end;
        }) : [];
        return { key, cycle, rows };
    }
    function color(category) {
        const index = categories.indexOf(category);
        const hash = [...category].reduce((value, char) => value + char.charCodeAt(0), 0);
        return COLORS[(index < 0 ? hash : index) % COLORS.length];
    }
    function choose(category) {
        selected = selected === category ? null : category;
        render();
    }

    const overlay = node('div', 'modal-bg dist-overlay');
    overlay.id = 'distributionModal';
    overlay.innerHTML = `<section class="modal dist-sheet" role="dialog" aria-modal="true" aria-labelledby="distSheetTitle" tabindex="-1">
        <div class="dist-handle" aria-hidden="true"></div>
        <header class="dist-sheet-header"><div><h2 id="distSheetTitle">Gastos por rubro</h2><p id="distSheetCycle"></p></div><button type="button" id="distSheetClose" aria-label="Cerrar gastos"><span class="material-symbols-outlined" aria-hidden="true">close</span></button></header>
        <div class="dist-sheet-summary"><div><span id="distSheetTotalLabel">Total del rubro</span><strong id="distSheetTotal"></strong></div><span id="distSheetCount" aria-live="polite"></span></div>
        <div class="dist-sheet-tools">
            <label class="dist-search"><span class="material-symbols-outlined" aria-hidden="true">search</span><input id="distSheetSearch" type="search" placeholder="Buscar movimiento" aria-label="Buscar en los gastos del ciclo"></label>
            <div class="dist-record-order" role="group" aria-label="Orden de los gastos"><button type="button" data-dist-order="date" aria-pressed="true">Más recientes</button><button type="button" data-dist-order="amount" aria-pressed="false">Mayor importe</button></div>
        </div>
        <div id="distSheetRecords" class="dist-records"></div>
    </section>`;
    document.body.append(overlay);
    const sheet = overlay.querySelector('.dist-sheet');
    function renderSheet() {
        const period = scope();
        const query = get('distSheetSearch').value.trim().toLocaleLowerCase('es');
        const rows = period.rows.filter(record => (!selected || record.category === selected) &&
            (!query || `${record.description || ''} ${record.category || ''}`.toLocaleLowerCase('es').includes(query)))
            .sort((a, b) => recordOrder === 'amount' ? amount(b) - amount(a) || d2(b.date) - d2(a.date) : d2(b.date) - d2(a.date));
        get('distSheetTitle').textContent = selected || 'Gastos del ciclo';
        get('distSheetCycle').textContent = period.cycle?.name || 'Selecciona un ciclo';
        get('distSheetTotal').textContent = money(sum(rows));
        get('distSheetTotalLabel').textContent = query ? 'Total encontrado' : selected ? 'Total del rubro' : 'Total del ciclo';
        get('distSheetCount').textContent = `${rows.length} ${rows.length === 1 ? 'gasto' : 'gastos'}${query ? ' encontrados' : ''}`;
        sheet.querySelectorAll('[data-dist-order]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.distOrder === recordOrder)));
        const list = get('distSheetRecords');
        list.replaceChildren();
        if (!rows.length) list.append(node('p', 'dist-empty', query ? 'No hay gastos que coincidan con la búsqueda.' : 'No hay gastos en esta selección.'));
        let previousDay = null;
        const dayTotals = new Map();
        rows.forEach(record => dayTotals.set(record.date, (dayTotals.get(record.date) || 0) + amount(record)));
        rows.forEach(record => {
            if (recordOrder === 'date' && previousDay !== record.date) {
                const heading = node('div', 'dist-day-heading');
                heading.append(node('h3', '', d2(record.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })), node('span', '', money(dayTotals.get(record.date))));
                list.append(heading);previousDay = record.date;
            }
            const button = node('button', 'dist-record');button.type = 'button';
            button.dataset.recordId = record.id;
            const icon = node('span', 'dist-record-icon material-symbols-outlined', record.wallet === 'bcp' ? 'account_balance' : record.wallet === 'yape' ? 'smartphone' : 'payments');
            icon.setAttribute('aria-hidden', 'true');
            const copy = node('span', 'dist-record-copy');
            const method = record.wallet === 'bcp' ? 'BCP' : record.wallet === 'yape' ? 'Yape' : record.wallet === 'efectivo' ? 'Efectivo' : '';
            const metadata = [recordOrder === 'amount' ? shortDate.format(d2(record.date)) : '', !selected ? record.category || 'Sin rubro' : '', method].filter(Boolean).join(' · ');
            copy.append(node('strong', '', record.description || record.category || 'Gasto'),
                node('span', '', metadata || 'Ver movimiento'));
            const trailing = node('span', 'dist-record-trailing');
            const chevron = node('span', 'material-symbols-outlined', 'chevron_right');chevron.setAttribute('aria-hidden', 'true');
            trailing.append(node('strong', 'dist-record-value', money(amount(record))), chevron);
            button.append(icon, copy, trailing);
            button.addEventListener('click', () => {
                detailReturn = { id: record.id, scrollTop: list.scrollTop };
                detailBack.hidden = false;
                closeM(overlay.id);
                viewRecord('expense', record.id);
            });
            list.append(button);
        });
    }
    function openDetails() {
        if (!scope().cycle) return;
        detailReturn = null;
        returnFocus = document.activeElement;
        get('distSheetSearch').value = '';
        renderSheet();openM(overlay.id);sheet.focus({ preventScroll: true });
    }
    const detail = get('viewRecordModal');
    const detailBack = node('button', 'dist-detail-back', 'Volver a gastos');
    detailBack.type = 'button';detailBack.hidden = true;
    const backIcon = node('span', 'material-symbols-outlined', 'chevron_left');
    backIcon.setAttribute('aria-hidden', 'true');detailBack.prepend(backIcon);
    detail.querySelector('.modal').prepend(detailBack);
    detailBack.addEventListener('click', () => closeM(detail.id));
    // All existing exits (close, backdrop, Escape and swipe) use closeM.
    // Restore the parent sheet without openDetails(), which clears its search.
    new MutationObserver(() => {
        if (detail.classList.contains('active')) return;
        detailBack.hidden = true;
        if (!detailReturn) return;
        const saved = detailReturn;detailReturn = null;
        if (document.querySelector('.modal-bg.active')) return;
        renderSheet();openM(overlay.id);
        get('distSheetRecords').scrollTop = saved.scrollTop;
        requestAnimationFrame(() => {
            if (!overlay.classList.contains('active')) return;
            const record = [...get('distSheetRecords').querySelectorAll('.dist-record')]
                .find(button => button.dataset.recordId === String(saved.id));
            (record || sheet).focus({ preventScroll: true });
            get('distSheetRecords').scrollTop = saved.scrollTop;
        });
    }).observe(detail, { attributes: true, attributeFilter: ['class'] });
    get('distSheetClose').addEventListener('click', () => closeM(overlay.id));
    overlay.addEventListener('click', event => { if (event.target === overlay) closeM(overlay.id); });
    get('distSheetSearch').addEventListener('input', renderSheet);
    sheet.querySelectorAll('[data-dist-order]').forEach(button => button.addEventListener('click', () => {
        recordOrder = button.dataset.distOrder;renderSheet();get('distSheetRecords').scrollTop = 0;
    }));
    sheet.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const controls = [...sheet.querySelectorAll('button:not(:disabled), input')];
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === sheet)) { event.preventDefault();last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === sheet)) { event.preventDefault();first.focus(); }
    });
    new MutationObserver(() => {
        if (!overlay.classList.contains('active') && !document.querySelector('.modal-bg.active'))
            (returnFocus?.isConnected ? returnFocus : get('distributionDetails')).focus({ preventScroll: true });
    }).observe(overlay, { attributes: true, attributeFilter: ['class'] });

    function render() {
        const period = scope();
        if (scopeKey !== period.key) { selected = null;scopeKey = period.key;get('distSheetSearch').value = ''; }
        const grouped = new Map();
        period.rows.forEach(record => {
            const category = record.category || 'Sin rubro';
            if (!grouped.has(category)) grouped.set(category, []);
            grouped.get(category).push(record);
        });
        const groups = [...grouped].map(([category, rows]) => ({ category, rows, total: sum(rows) })).filter(group => group.total > 0);
        groups.sort((a, b) => order === 'amount' ? b.total - a.total : a.category.localeCompare(b.category, 'es'));
        if (!groups.some(group => group.category === selected)) selected = null;
        const total = groups.reduce((value, group) => value + group.total, 0);
        const chosen = groups.find(group => group.category === selected);
        const value = chosen ? chosen.total : total;
        const cycleButton = get('distributionCycle');
        cycleButton.textContent = period.cycle ? `${shortDate.format(period.cycle.start)} · Cambiar ciclo` : 'Elegir ciclo';
        cycleButton.setAttribute('aria-label', period.cycle ? `${period.cycle.name}. Cambiar ciclo` : 'Elegir ciclo');
        const activeCategory = document.activeElement?.dataset.distCategory;
        legend.replaceChildren();
        groups.forEach(group => {
            const row = node('button', 'distribution-row');row.type = 'button';row.dataset.distCategory = group.category;
            row.setAttribute('aria-pressed', String(selected === group.category));
            row.setAttribute('aria-label', `${group.category}, ${money(group.total)}, ${Math.round(group.total / total * 100)} por ciento. Seleccionar rubro`);
            const dot = node('i');dot.style.background = color(group.category);dot.setAttribute('aria-hidden', 'true');
            const label = node('span', '', group.category);label.title = group.category;
            row.append(dot, label, node('strong', '', unit === 'money' ? money(group.total) : `${Math.round(group.total / total * 100)}%`));
            row.addEventListener('click', () => choose(group.category));legend.append(row);
        });
        if (activeCategory) [...legend.children].find(row => row.dataset.distCategory === activeCategory)?.focus({ preventScroll: true });
        if (!groups.length) legend.append(node('p', 'dist-empty', period.cycle ? 'No hay gastos registrados en este ciclo.' : 'Elige un ciclo para ver su distribución.'));
        get('distributionCenterLabel').textContent = chosen ? 'Seleccionado' : 'Total';
        get('distributionCenterValue').textContent = !total ? '—' : unit === 'money' ? value.toLocaleString('es-PE', { notation: 'compact', maximumFractionDigits: 1 }) : `${Math.round(value / total * 100)}%`;
        get('distributionReset').disabled = !selected;
        get('distributionNote').textContent = chosen ? chosen.category : `${groups.length} rubros · ${period.rows.length} gastos`;
        get('distributionNote').title = selected || '';
        const details = get('distributionDetails');details.disabled = !period.cycle || !period.rows.length;
        details.textContent = chosen ? `Ver ${chosen.rows.length} gastos ›` : 'Ver todos ›';
        document.querySelectorAll('[data-dist-unit]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.distUnit === unit)));
        get('distributionSort').firstChild.textContent = order === 'amount' ? 'Mayor gasto ' : 'Nombre A–Z ';
        get('distributionSort').setAttribute('aria-label', order === 'amount' ? 'Ordenar rubros por nombre' : 'Ordenar rubros por mayor gasto');
        if (donutChart) { donutChart.destroy();donutChart = null; }
        if (typeof Chart !== 'undefined') {
            const dark = document.documentElement.getAttribute('data-theme') === 'dark';
            donutChart = new Chart(get('chartDonut'), {
                type: 'doughnut',
                data: { labels: groups.map(group => group.category), datasets: [{
                    data: groups.length ? groups.map(group => group.total) : [1],
                    backgroundColor: groups.length ? groups.map(group => color(group.category) + (selected && selected !== group.category ? '45' : '')) : [dark ? '#403d38' : '#eeece9'],
                    borderWidth: 0, borderRadius: 4, spacing: 3, hoverOffset: 3,
                    offset: groups.map(group => selected === group.category ? 4 : 0)
                }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: '78%',
                    animation: { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220 },
                    onClick: (_, elements) => {
                        const group = elements.length && groups[elements[0].index];
                        // Finish Chart.js's pointer event before replacing its instance.
                        if (group) requestAnimationFrame(() => { if (scope().key === period.key) choose(group.category); });
                    },
                    plugins: { legend: { display: false }, donutPct: false, tooltip: { enabled: false } }
                }
            });
        }
        if (overlay.classList.contains('active')) renderSheet();
    }
    get('distributionCycle').addEventListener('click', () => {
        openM('filterModal');
        requestAnimationFrame(() => get('filterModal').querySelector('.xsel-btn, select')?.focus());
    });
    get('distributionSort').addEventListener('click', () => { order = order === 'amount' ? 'name' : 'amount';render(); });
    document.querySelectorAll('[data-dist-unit]').forEach(button => button.addEventListener('click', () => { unit = button.dataset.distUnit;render(); }));
    get('distributionReset').addEventListener('click', () => { selected = null;render(); });
    get('distributionDetails').addEventListener('click', openDetails);
    new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.renderDistribution = render;
    render();
})();
