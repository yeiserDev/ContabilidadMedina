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
            const icon = node('span', 'dist-record-icon material-symbols-outlined', !record.wallet || record.wallet === 'efectivo' ? 'payments' : ['yape', 'plin'].includes(record.wallet) ? 'smartphone' : 'account_balance');
            icon.setAttribute('aria-hidden', 'true');
            const copy = node('span', 'dist-record-copy');
            const method = record.wallet && window.getWalletName ? window.getWalletName(record.wallet) : '';
            const metadata = [recordOrder === 'amount' ? shortDate.format(d2(record.date)) : '', !selected ? record.category || 'Sin rubro' : '', method].filter(Boolean).join(' · ');
            copy.append(node('strong', '', record.description || record.category || 'Gasto'),
                node('span', '', metadata || 'Ver movimiento'));
            const trailing = node('span', 'dist-record-trailing');
            const chevron = node('span', 'material-symbols-outlined', 'chevron_right');chevron.setAttribute('aria-hidden', 'true');
            trailing.append(node('strong', 'dist-record-value', money(amount(record))), chevron);
            button.append(icon, copy, trailing);
            button.classList.toggle('is-current', docked?.id === record.id);
            if (docked?.id === record.id) button.setAttribute('aria-current', 'true');
            button.addEventListener('click', () => {
                if (openDocked(record)) return;
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
    /* ---- Docked detail: on wide screens the record detail opens beside the
       sheet. A drop leaves the tapped row, travels to the panel and the panel
       grows out of it; closing reverses the path back into the row. ---- */
    const detailModal = detail.querySelector('.modal');
    const dockQuery = window.matchMedia('(min-width: 1000px)');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const GAP = 16;
    let docked = null, dockToken = 0, dockWidthNow = 0;
    const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
    function dockWidth(record) {
        const photos = (record.imageUrls || (record.imageUrl ? [record.imageUrl] : [])).length > 0;
        const width = Math.min(photos ? 800 : 420, window.innerWidth - 48 - sheet.offsetWidth - GAP);
        return width >= 340 ? width : 0;
    }
    function setDockLayout(width) {
        dockWidthNow = width;
        overlay.style.setProperty('--dist-sheet-shift', `${-(width + GAP) / 2}px`);
        detail.style.setProperty('--dist-dock-shift', `${(sheet.offsetWidth + GAP) / 2}px`);
        detail.style.setProperty('--dist-dock-width', `${width}px`);
    }
    function markCurrent() {
        get('distSheetRecords').querySelectorAll('.dist-record').forEach(button => {
            const current = docked !== null && button.dataset.recordId === String(docked.id);
            button.classList.toggle('is-current', current);
            if (current) button.setAttribute('aria-current', 'true');
            else button.removeAttribute('aria-current');
        });
    }
    // Where the drop leaves/enters the row, measured at the sheet's final position.
    function rowPoint(id, finalShift) {
        let shift = 0;
        try { shift = finalShift - new DOMMatrixReadOnly(getComputedStyle(sheet).transform).m41; } catch (error) { shift = 0; }
        const box = sheet.getBoundingClientRect();
        const row = [...get('distSheetRecords').querySelectorAll('.dist-record')].find(button => button.dataset.recordId === String(id));
        const rect = row ? row.getBoundingClientRect() : null;
        if (!rect || rect.bottom < box.top + 40 || rect.top > box.bottom - 20) return { x: box.right - 24 + shift, y: box.top + box.height / 2 };
        return { x: rect.right - 16 + shift, y: rect.top + rect.height / 2 };
    }
    function landing(from) {
        const panel = detailModal.getBoundingClientRect();
        return { x: panel.left + 6, y: clamp(from.y, panel.top + 48, panel.bottom - 48) };
    }
    function drop(from, to, tint, { reverse = false, delay = 0 } = {}) {
        const blob = node('span', 'dist-drop');
        blob.style.setProperty('--drop', tint);
        blob.setAttribute('aria-hidden', 'true');
        document.body.append(blob);
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const at = (point, sx, sy) => `translate(${point.x}px, ${point.y}px) translate(-50%, -50%) rotate(${angle}rad) scale(${sx}, ${sy})`;
        const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
        const frames = [
            { transform: at(from, 0, 0), offset: 0 },
            { transform: at(from, 1.15, .92), offset: .22 },
            { transform: at(mid, 1.75, .6), offset: .6 },
            { transform: at(to, .86, 1.12), offset: .86 },
            { transform: at(to, 1, 1), offset: 1 }
        ];
        const animation = blob.animate(frames, { duration: 440, delay, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'both', direction: reverse ? 'reverse' : 'normal' });
        animation.finished.catch(() => {}).then(() => {
            if (reverse || !blob.isConnected) { blob.remove(); return; }
            blob.animate([{ opacity: 1, transform: at(to, 1, 1) }, { opacity: 0, transform: at(to, 1.6, 1.6) }], { duration: 220, easing: 'ease-out', fill: 'forwards' })
                .finished.catch(() => {}).then(() => blob.remove());
        });
        return animation;
    }
    function bloom(point, { inverse = false, delay = 0 } = {}) {
        const panel = detailModal.getBoundingClientRect();
        const cx = point.x - panel.left, cy = point.y - panel.top;
        const radius = Math.hypot(Math.max(cx, panel.width - cx), Math.max(cy, panel.height - cy)) + 8;
        const frames = [
            { clipPath: `circle(0px at ${cx}px ${cy}px)`, scale: '0.97' },
            { clipPath: `circle(${radius}px at ${cx}px ${cy}px)`, scale: '1' }
        ];
        return detailModal.animate(inverse ? frames.reverse() : frames, {
            duration: inverse ? 320 : 520, delay, fill: 'both',
            easing: inverse ? 'cubic-bezier(.55,0,.8,.2)' : 'cubic-bezier(.2,.85,.25,1)'
        });
    }
    function clearDockEffects() {
        detailModal.getAnimations().forEach(animation => animation.cancel());
        document.querySelectorAll('.dist-drop').forEach(blob => blob.remove());
    }
    function openDocked(record) {
        if (!dockQuery.matches || !overlay.classList.contains('active')) return false;
        const width = dockWidth(record);
        if (!width) return false;
        const first = !docked;
        dockToken++;
        clearDockEffects();
        docked = { id: record.id };
        markCurrent();
        setDockLayout(width);
        detail.classList.remove('dist-docked-leaving');
        detail.classList.add('dist-docked');
        overlay.classList.add('is-docked');
        detailBack.hidden = true;
        window.viewRecord('expense', record.id);
        if (reduceMotion.matches) return true;
        const from = rowPoint(record.id, -(width + GAP) / 2);
        const to = landing(from);
        const delay = first ? 140 : 0;
        drop(from, to, color(record.category || ''), { delay });
        const opening = bloom(to, { delay: delay + 340 });
        opening.finished.then(() => opening.cancel(), () => {});
        return true;
    }
    function closeDocked(animated) {
        const token = ++dockToken;
        const record = docked ? expenses.find(item => item.id === docked.id) : null;
        const id = docked ? docked.id : null;
        docked = null;
        markCurrent();
        const finish = () => {
            if (token !== dockToken) return;
            detail.classList.remove('dist-docked', 'dist-docked-leaving');
            overlay.classList.remove('is-docked');
            // Keep the panel clipped while the hidden backdrop finishes fading.
            setTimeout(() => { if (token === dockToken) clearDockEffects(); }, 400);
        };
        clearDockEffects();
        if (!animated || reduceMotion.matches) { finish();return; }
        detail.classList.add('dist-docked-leaving');
        const target = rowPoint(id, 0);
        const from = landing(rowPoint(id, -(dockWidthNow + GAP) / 2));
        bloom(from, { inverse: true }).finished.then(() => {
            if (token !== dockToken) return;
            detail.classList.remove('dist-docked-leaving');
            overlay.classList.remove('is-docked');
            drop(from, target, color((record && record.category) || ''), { reverse: true }).finished.catch(() => {}).then(finish);
        }, () => {});
    }
    new MutationObserver(() => {
        if (!detail.classList.contains('dist-docked') || detail.classList.contains('active') || !docked) return;
        closeDocked(overlay.classList.contains('active'));
    }).observe(detail, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(() => {
        if (overlay.classList.contains('active') || !detail.classList.contains('dist-docked')) return;
        if (detail.classList.contains('active')) closeM(detail.id);
        else if (docked) closeDocked(false);
    }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
    // Editing or deleting leaves both panels, so the next modal is not covered.
    ['viewRecordEditBtn', 'viewRecordDelBtn'].forEach(id => get(id)?.addEventListener('click', () => {
        if (docked) closeM(overlay.id);
    }));
    window.addEventListener('resize', () => {
        if (!docked) return;
        const record = expenses.find(item => item.id === docked.id);
        const width = record && dockQuery.matches ? dockWidth(record) : 0;
        if (width) setDockLayout(width);
        else closeM(detail.id);
    });

    get('distSheetClose').addEventListener('click', () => closeM(overlay.id));
    overlay.addEventListener('click', event => { if (event.target === overlay) closeM(overlay.id); });
    get('distSheetSearch').addEventListener('input', renderSheet);
    sheet.querySelectorAll('[data-dist-order]').forEach(button => button.addEventListener('click', () => {
        recordOrder = button.dataset.distOrder;renderSheet();get('distSheetRecords').scrollTop = 0;
    }));
    // While the detail is docked beside the sheet, Tab cycles through both panels.
    function trapFocus(event) {
        if (event.key !== 'Tab') return;
        const visible = el => el.offsetParent !== null;
        const controls = [...sheet.querySelectorAll('button:not(:disabled), input'),
            ...(docked ? [...detailModal.querySelectorAll('button:not(:disabled), [href], input')] : [])].filter(visible);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === sheet)) { event.preventDefault();last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === sheet)) { event.preventDefault();first.focus(); }
    }
    sheet.addEventListener('keydown', trapFocus);
    detailModal.addEventListener('keydown', event => { if (docked) trapFocus(event); });
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
        const spent = get('distributionSpent');
        if (spent) {
            spent.textContent = period.cycle ? money(total) : '—';
            spent.parentElement.title = period.cycle ? `Total gastado en ${period.cycle.name}` : '';
        }
        groups.forEach(group => {
            const row = node('button', 'distribution-row');row.type = 'button';row.dataset.distCategory = group.category;
            row.setAttribute('aria-pressed', String(selected === group.category));
            row.setAttribute('aria-label', `${group.category}, ${money(group.total)}, ${Math.round(group.total / total * 100)} por ciento. Ver gastos del rubro`);
            const dot = node('i');dot.style.background = color(group.category);dot.setAttribute('aria-hidden', 'true');
            const label = node('span', '', group.category);label.title = group.category;
            row.append(dot, label, node('strong', '', unit === 'money' ? money(group.total) : `${Math.round(group.total / total * 100)}%`));
            row.addEventListener('click', () => { selected = group.category;render();openDetails(); });legend.append(row);
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
    // Opens the sheet with one category of the selected cycle; false if absent.
    window.openDistributionCategory = category => {
        if (!scope().cycle) return false;
        selected = category;
        render();
        if (selected !== category) return false;
        openDetails();
        return true;
    };
    render();
})();
