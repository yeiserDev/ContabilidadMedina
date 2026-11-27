/* Tarjeta de crédito — vista aparte de la cuenta, con su propio ciclo de
   facturación (fecha de corte y de pago), línea de crédito y la importación
   de consumos desde los correos del banco (/api/card-emails).

   Los datos viven en app.js (`card`, `cardTxns`, `cardSync`) para que se
   guarden con persist() junto al resto, pero NO tocan depósitos ni gastos:
   el saldo de la cuenta no cambia por un consumo con tarjeta. */
(() => {
    'use strict';

    /* ---------- Cálculos puros (sin DOM, se prueban en tests/) ---------- */
    const pad = n => String(n).padStart(2, '0');
    const parts = s => s.split('-').map(Number);
    const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
    const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m: 1-12
    const shiftMonth = (y, m, by) => { const t = y * 12 + (m - 1) + by; return [Math.floor(t / 12), (t % 12) + 1]; };
    const addDays = (s, n) => { const [y, m, d] = parts(s); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
    // Día de corte 31 en un mes de 30 días cierra el 30.
    const closingOf = (y, m, day) => iso(y, m, Math.min(day, daysIn(y, m)));

    /** Ciclo de facturación que contiene `date`. offset -1 = ciclo anterior. */
    function cycleFor(date, closingDay, offset = 0) {
        const [y, m, d] = parts(date);
        let [cy, cm] = d <= Math.min(closingDay, daysIn(y, m)) ? [y, m] : shiftMonth(y, m, 1);
        [cy, cm] = shiftMonth(cy, cm, offset);
        const [py, pm] = shiftMonth(cy, cm, -1);
        return { start: addDays(closingOf(py, pm, closingDay), 1), end: closingOf(cy, cm, closingDay) };
    }

    /** Primera fecha después del corte cuyo día es el día de pago. */
    function dueDateFor(closing, dueDay) {
        const [y, m, d] = parts(closing);
        if (dueDay > d && dueDay <= daysIn(y, m)) return iso(y, m, dueDay);
        const [ny, nm] = shiftMonth(y, m, 1);
        return closingOf(ny, nm, dueDay);
    }

    /** Cuántos cortes hubo desde la compra hasta `until` (incluido). */
    function closingsBetween(date, until, closingDay) {
        let count = 0;
        let c = cycleFor(date, closingDay);
        while (c.end <= until && count < 120) { count++; c = cycleFor(addDays(c.end, 1), closingDay); }
        return count;
    }

    const active = t => t && t.status !== 'review';
    const sign = t => (t.kind === 'consumo' ? 1 : -1);

    /** Línea usada por moneda: consumos menos pagos y abonos (montos completos). */
    function usedByCurrency(txns) {
        const out = { PEN: 0, USD: 0 };
        txns.filter(active).forEach(t => { out[t.currency === 'USD' ? 'USD' : 'PEN'] += sign(t) * (+t.amount || 0); });
        out.PEN = Math.round(out.PEN * 100) / 100; out.USD = Math.round(out.USD * 100) / 100;
        return out;
    }

    /** Lo facturado hasta un corte: las compras en cuotas entran de a una por corte. */
    function billedUntil(txns, until, closingDay) {
        const out = { PEN: 0, USD: 0 };
        txns.filter(t => active(t) && t.date <= until).forEach(t => {
            const cur = t.currency === 'USD' ? 'USD' : 'PEN';
            let amount = +t.amount || 0;
            if (t.kind === 'consumo' && t.installments > 1) {
                amount = amount * Math.min(t.installments, closingsBetween(t.date, until, closingDay)) / t.installments;
            }
            out[cur] += sign(t) * amount;
        });
        return out;
    }

    /** Estado del último corte: cuánto se facturó, cuánto se pagó después y cuánto falta. */
    function statement(txns, settings, todayStr) {
        const current = cycleFor(todayStr, settings.closingDay);
        const prev = cycleFor(todayStr, settings.closingDay, -1);
        const billed = billedUntil(txns, prev.end, settings.closingDay);
        const paidAfter = { PEN: 0, USD: 0 };
        txns.filter(t => active(t) && t.kind !== 'consumo' && t.date > prev.end)
            .forEach(t => { paidAfter[t.currency === 'USD' ? 'USD' : 'PEN'] += +t.amount || 0; });
        const due = {};
        for (const cur of ['PEN', 'USD']) due[cur] = Math.max(0, Math.round((Math.max(0, billed[cur]) - paidAfter[cur]) * 100) / 100);
        return { current, prev, billed, paidAfter, due, dueDate: dueDateFor(prev.end, settings.dueDay) };
    }

    /* Línea en una moneda (la de Scotiabank: dólares) y consumos en ambas.
       Cada movimiento en la otra moneda guarda el tipo de cambio con el que se
       convirtió (el del correo del banco o el de Ajustes ese día), así cambiar
       el tipo de cambio de hoy no altera los consumos de ayer. */
    const lineCur = s => (s.lineCurrency === 'PEN' ? 'PEN' : 'USD');
    const round2 = n => Math.round(n * 100) / 100;
    function toLine(amount, currency, s, rate) {
        const line = lineCur(s);
        if ((currency === 'USD' ? 'USD' : 'PEN') === line) return +amount || 0;
        const r = +rate > 0 ? +rate : +s.fxRate;
        if (!(r > 0)) return 0;
        return line === 'USD' ? (+amount || 0) / r : (+amount || 0) * r;
    }
    const txnInLine = (t, s) => toLine(t.amount, t.currency, s, t.fxRate);
    /** Deuda total expresada en la moneda de la línea. */
    function usedInLine(txns, s) {
        return round2(txns.filter(active).reduce((sum, t) => sum + sign(t) * txnInLine(t, s), 0));
    }

    window.CardMath = { cycleFor, dueDateFor, closingsBetween, usedByCurrency, billedUntil, statement, addDays, toLine, txnInLine, usedInLine };
    if (typeof document === 'undefined' || !document.getElementById('cardView')) return;

    /* ---------- Interfaz ---------- */
    // Valores de la tarjeta Mastercard Clásica de Scotiabank (carta de bienvenida):
    // línea US$ 850, ciclo de facturación el 4 y último día de pago el 1.
    const DEFAULTS = { name: 'Scotiabank', last4: '', lineCurrency: 'USD', limit: 850, closingDay: 4, dueDay: 1, fxRate: 3.75, openedOn: '2026-10-06' };
    const MODE_KEY = 'ct_mode';
    const SWITCHES = '#acctSwitch [data-mode], .acct-mini [data-mode]';
    const SYNC_EVERY_MS = 2 * 3600_000;
    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmt = (n, cur) => cur === 'USD'
        ? `US$ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : money(n);
    const MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const short = s => { const [, m, d] = parts(s); return `${d} ${MES3[m - 1]}`; };
    const daysUntil = s => Math.round((Date.parse(s + 'T12:00:00') - Date.parse(today() + 'T12:00:00')) / 86_400_000);
    const settings = () => {
        const s = { ...DEFAULTS, ...(card || {}) };
        // Ajustes guardados antes de existir la línea en dólares.
        if (!(card && card.fxRate) && card && card.usdRate) s.fxRate = card.usdRate;
        if (card && !card.lineCurrency && card.limit) s.lineCurrency = 'PEN';
        // 20 y 5 eran los valores de ejemplo anteriores, no los del banco.
        if (card && !card.v && +card.closingDay === 20 && +card.dueDay === 5) { s.closingDay = DEFAULTS.closingDay; s.dueDay = DEFAULTS.dueDay; }
        return s;
    };
    const both = (pen, usd) => [pen ? fmt(pen, 'PEN') : '', usd ? fmt(usd, 'USD') : ''].filter(Boolean).join(' + ');

    let cycleOffset = 0;
    let syncing = false;
    // Estado del panel de lectura: { state: 'running'|'done'|'error', checked, added, review, left, message }
    let syncStatus = null;
    let editId = null;

    function setMode(mode) {
        const isCard = mode === 'tarjeta';
        document.body.classList.toggle('card-mode', isCard);
        document.querySelectorAll(SWITCHES).forEach(b => {
            const on = b.dataset.mode === mode;
            b.classList.toggle('on', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        // En móvil el saludo de la barra dice qué se está viendo.
        if ($('mshellHi')) $('mshellHi').textContent = isCard ? 'Tarjeta' : 'Bienvenido';
        if ($('mshellName')) $('mshellName').textContent = isCard ? settings().name : 'Conta Medina';
        try { localStorage.setItem(MODE_KEY, mode); } catch { /* modo privado */ }
        if (isCard) {
            renderCard();
            window.scrollTo({ top: 0 });
            const last = Date.parse(cardSync && cardSync.lastSync) || 0;
            if (currentUser && Date.now() - last > SYNC_EVERY_MS) syncEmails({ silent: true });
        }
    }

    function hero(s, used, st) {
        const line = lineCur(s);
        const usedLine = usedInLine(cardTxns || [], s);
        const limit = +s.limit || 0;
        const pct = limit > 0 ? Math.min(100, Math.max(0, usedLine / limit * 100)) : 0;
        const left = daysUntil(st.current.end);
        const toPay = daysUntil(st.dueDate);
        const owes = st.due.PEN || st.due.USD;
        const dueLine = round2(toLine(st.due.PEN, 'PEN', s) + toLine(st.due.USD, 'USD', s));
        const mixed = used.PEN > 0 && used.USD > 0;
        return `
        <article class="cc-card" aria-label="Resumen de la tarjeta">
            <div class="cc-card-top">
                <span class="cc-bank">${esc(s.name)}</span>
                <span class="cc-num">${s.last4 ? '•••• ' + esc(s.last4) : 'Crédito'}</span>
            </div>
            <div class="cc-used">
                <span class="cc-label">Deuda actual</span>
                <strong class="cc-amount">${fmt(Math.max(0, usedLine), line)}</strong>
                ${mixed ? `<span class="cc-usd">${both(used.PEN, used.USD)}</span>` : ''}
            </div>
            ${limit > 0 ? `
            <div class="cc-line" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct.toFixed(0)}" aria-label="Línea usada">
                <span style="width:${pct.toFixed(1)}%"></span>
            </div>
            <div class="cc-line-txt"><span>Disponible ${fmt(Math.min(limit, Math.max(0, limit - usedLine)), line)}</span><span>Línea ${fmt(limit, line)}</span></div>`
            : `<button type="button" class="cc-setup" data-cc="settings">Configura tu línea, corte y día de pago</button>`}
            ${usedLine < 0 ? '<p class="cc-gap">Hay pagos sin sus consumos anteriores. Carga tu estado de cuenta para que la deuda cuadre.</p>' : ''}
            <button type="button" class="cc-fx" data-cc="settings" aria-label="Cambiar tipo de cambio">TC banco S/ ${(+s.fxRate).toFixed(3)} por US$</button>
        </article>
        <div class="cc-facts">
            <div class="cc-fact">
                <span class="cc-fact-k">Ciclo actual</span>
                <strong>${short(st.current.start)} – ${short(st.current.end)}</strong>
                <span class="cc-fact-sub">${left === 0 ? 'Cierra hoy' : `Cierra en ${left} día${left === 1 ? '' : 's'}`}</span>
            </div>
            <div class="cc-fact ${toPay <= 3 && owes ? 'cc-fact--warn' : ''}">
                <span class="cc-fact-k">Pagar hasta el ${short(st.dueDate)}</span>
                <strong>${owes ? both(st.due.PEN, st.due.USD) : 'Nada pendiente'}</strong>
                <span class="cc-fact-sub">${owes ? `${st.due.PEN && st.due.USD ? `≈ ${fmt(dueLine, line)} · ` : ''}${toPay < 0 ? 'Vencido' : toPay === 0 ? 'Vence hoy' : `Faltan ${toPay} día${toPay === 1 ? '' : 's'}`}` : `Corte del ${short(st.prev.end)}`}</span>
            </div>
        </div>`;
    }

    function row(t) {
        const credit = t.kind !== 'consumo';
        const icon = t.kind === 'pago' ? 'payments' : t.kind === 'abono' ? 'undo' : 'shopping_bag';
        const badges = [
            t.installments > 1 ? `<span class="cc-badge">${t.installments} cuotas</span>` : '',
            t.source === 'email' ? '<span class="cc-badge cc-badge--mail" title="Importado del correo"><span class="material-symbols-outlined">mail</span></span>' : '',
        ].join('');
        return `<button type="button" class="cc-row ${credit ? 'cc-row--credit' : ''}" data-cc="edit" data-id="${esc(t.id)}">
            <span class="cc-row-ic material-symbols-outlined" aria-hidden="true">${icon}</span>
            <span class="cc-row-main"><span class="cc-row-name">${esc(t.kind === 'pago' ? 'Pago a la tarjeta' : t.merchant)}</span><span class="cc-row-meta">${short(t.date)} ${badges}</span></span>
            <span class="cc-row-amt">${credit ? '+' : '−'}${fmt(t.amount, t.currency)}${(t.currency === 'USD' ? 'USD' : 'PEN') !== lineCur(settings()) ? `<small class="cc-row-conv">≈ ${fmt(txnInLine(t, settings()), lineCur(settings()))}${+t.fxRate > 0 ? ` · TC ${(+t.fxRate).toFixed(3)}` : ''}</small>` : ''}</span>
        </button>`;
    }

    function reviewBlock(pending) {
        if (!pending.length) return '';
        return `<section class="cc-block cc-review" aria-labelledby="ccReviewTitle">
            <div class="cc-review-hd">
                <h3 id="ccReviewTitle"><span class="material-symbols-outlined">rule</span> Por revisar <span class="cc-count">${pending.length}</span></h3>
                ${pending.length > 1 ? '<button type="button" class="cc-link" data-cc="confirm-all">Confirmar todos</button>' : ''}
            </div>
            <p class="cc-hint">Estos correos no estaban claros. Confirma los que sean de tu tarjeta de crédito.</p>
            ${pending.map(t => `<div class="cc-review-item">
                ${row(t)}
                ${t.note ? `<p class="cc-note">${esc(t.note)}</p>` : ''}
                <div class="cc-review-actions">
                    <button type="button" class="mb mb--ghost" data-cc="discard" data-id="${esc(t.id)}">Descartar</button>
                    <button type="button" class="mb mb--blue" data-cc="confirm" data-id="${esc(t.id)}">Confirmar</button>
                </div>
            </div>`).join('')}
        </section>`;
    }

    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    const lastTxt = last => last ? `Última lectura: ${last.toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Aún no se leyeron correos del banco.';

    /** Panel bajo los botones: progreso, resultado o error de la lectura de correos. */
    function syncPanel(last) {
        const st = syncStatus;
        if (!st) return `<p class="cc-sync-txt">${lastTxt(last)}</p>`;
        if (st.state === 'running') {
            const total = st.checked + st.left;
            const pct = total ? Math.round(st.checked / total * 100) : 8;
            return `<div class="cc-sync cc-sync--run" role="status">
                <span class="cc-sync-ic material-symbols-outlined cc-spin" aria-hidden="true">progress_activity</span>
                <div class="cc-sync-body">
                    <strong>Leyendo tus correos de ${esc(settings().name)}</strong>
                    <span>${st.checked ? `${plural(st.checked, 'correo revisado', 'correos revisados')}${st.left ? ` · faltan ${st.left}` : ''}` : 'Buscando notificaciones…'}</span>
                    <span class="cc-sync-bar"><span style="width:${Math.max(8, pct)}%"></span></span>
                </div>
            </div>`;
        }
        if (st.state === 'error') {
            return `<div class="cc-sync cc-sync--err" role="alert">
                <span class="cc-sync-ic material-symbols-outlined" aria-hidden="true">error</span>
                <div class="cc-sync-body">
                    <strong>No se pudo terminar la lectura</strong>
                    <span>${esc(st.message)}</span>
                    ${st.added || st.review ? `<span>Antes del error se guardaron ${plural(st.added + st.review, 'movimiento', 'movimientos')}.</span>` : ''}
                </div>
                <button type="button" class="cc-sync-btn" data-cc="sync">Reintentar</button>
            </div>`;
        }
        const found = st.added + st.review;
        return `<div class="cc-sync cc-sync--ok" role="status">
            <span class="cc-sync-ic material-symbols-outlined" aria-hidden="true">${found ? 'mark_email_read' : 'done_all'}</span>
            <div class="cc-sync-body">
                <strong>${found ? plural(found, 'movimiento nuevo', 'movimientos nuevos') : 'Estás al día'}</strong>
                <span>${[
                    st.review ? `${st.review} por revisar abajo` : '',
                    st.checked ? plural(st.checked, 'correo revisado', 'correos revisados') : 'Sin correos nuevos del banco',
                ].filter(Boolean).join(' · ')}</span>
                <span class="cc-sync-when">${lastTxt(last)}</span>
            </div>
            <button type="button" class="cc-sync-x" data-cc="sync-close" aria-label="Cerrar"><span class="material-symbols-outlined">close</span></button>
        </div>`;
    }

    function renderCard() {
        const view = $('cardView');
        if (!view || !document.body.classList.contains('card-mode')) return;
        const s = settings();
        const txns = Array.isArray(cardTxns) ? cardTxns : [];
        const now = today();
        const st = statement(txns, s, now);
        const used = usedByCurrency(txns);
        const cyc = cycleFor(now, s.closingDay, cycleOffset);
        const inCycle = txns.filter(t => active(t) && t.date >= cyc.start && t.date <= cyc.end)
            .sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
        const spent = { PEN: 0, USD: 0 };
        inCycle.filter(t => t.kind === 'consumo').forEach(t => { spent[t.currency === 'USD' ? 'USD' : 'PEN'] += +t.amount || 0; });
        const spentLine = inCycle.filter(t => t.kind === 'consumo').reduce((sum, t) => sum + txnInLine(t, s), 0);
        const last = cardSync && cardSync.lastSync ? new Date(cardSync.lastSync) : null;
        const cycleName = cycleOffset === 0 ? 'Ciclo actual' : cycleOffset === -1 ? 'Ciclo anterior' : `Hace ${-cycleOffset} ciclos`;

        view.innerHTML = `
            ${hero(s, used, st)}
            <div class="cc-actions">
                <button type="button" class="cc-act cc-act--main" data-cc="sync" ${syncing ? 'disabled' : ''}>
                    <span class="material-symbols-outlined ${syncing ? 'cc-spin' : ''}">${syncing ? 'progress_activity' : 'mail'}</span>
                    <span>${syncing ? 'Leyendo…' : 'Leer correos'}</span>
                </button>
                <button type="button" class="cc-act" data-cc="add"><span class="material-symbols-outlined">add</span><span>Consumo</span></button>
                <button type="button" class="cc-act" data-cc="pay"><span class="material-symbols-outlined">payments</span><span>Pago</span></button>
                <button type="button" class="cc-act" data-cc="settings"><span class="material-symbols-outlined">tune</span><span>Ajustes</span></button>
            </div>
            ${syncPanel(last)}
            ${reviewBlock(txns.filter(t => t.status === 'review'))}
            <section class="cc-block" aria-labelledby="ccListTitle">
                <div class="cc-cycle-nav">
                    <button type="button" class="cc-nav" data-cc="prev" aria-label="Ciclo anterior"><span class="material-symbols-outlined">chevron_left</span></button>
                    <div class="cc-cycle-name">
                        <h3 id="ccListTitle">${cycleName}</h3>
                        <span>${short(cyc.start)} – ${short(cyc.end)}</span>
                    </div>
                    <button type="button" class="cc-nav" data-cc="next" aria-label="Ciclo siguiente" ${cycleOffset >= 0 ? 'disabled' : ''}><span class="material-symbols-outlined">chevron_right</span></button>
                </div>
                <div class="cc-spent">
                    <span>Consumido en el ciclo</span>
                    <strong>${fmt(spentLine, lineCur(s))}</strong>
                    ${spent.PEN && spent.USD ? `<span>${both(spent.PEN, spent.USD)}</span>` : ''}
                    <span>${inCycle.filter(t => t.kind === 'consumo').length} consumos</span>
                </div>
                ${cycleOffset === 0 && !inCycle.some(t => t.kind === 'consumo') ? `<p class="cc-tip"><span class="material-symbols-outlined" aria-hidden="true">tips_and_updates</span>Aún no hay consumos en este ciclo. Haz al menos uno antes del ${short(cyc.end)} para que no te cobren la membresía anual.</p>` : ''}
                <div class="cc-list">${inCycle.length ? inCycle.map(row).join('') : '<p class="cc-empty">Sin movimientos en este ciclo.</p>'}</div>
            </section>`;
    }

    /* ---------- Sincronización con los correos ---------- */
    async function syncEmails({ silent = false } = {}) {
        if (syncing) return;
        if (!currentUser || !auth || !auth.currentUser) { if (!silent) toast('Inicia sesión para leer tus correos', 'err'); return; }
        cardSync = cardSync || {};
        const seen = new Set(Array.isArray(cardSync.seen) ? cardSync.seen : []);
        const known = new Set((cardTxns || []).map(t => t.emailId).filter(Boolean));
        // La fecha de inicio solo avanza cuando una lectura termina completa; si
        // quedó a medias se sigue desde el mismo punto (los ya leídos se saltan).
        // v2: las lecturas anteriores marcaban "última lectura" aunque quedaran a
        // medias, así que esas se vuelven a revisar desde el inicio.
        const openedOn = settings().openedOn || '';
        // Completa = terminó y empezó en (o antes de) la apertura de la tarjeta.
        const done = cardSync.v === 2 && cardSync.lastSync && (!openedOn || (cardSync.from && cardSync.from <= openedOn));
        // Sin lectura completa: desde la apertura de la tarjeta (si se indicó) o los últimos 45 días.
        const opened = openedOn;
        const pending = cardSync.pendingSince || '';
        const since = done ? addDays(cardSync.lastSync.slice(0, 10), -3)
            : ([opened, pending].filter(Boolean).sort()[0] || undefined);
        syncing = true;
        syncStatus = { state: 'running', checked: 0, added: 0, review: 0, left: 0, message: '' };
        renderCard();
        let rounds = 0, more = false, error = '';
        try {
            do {
                const token = await auth.currentUser.getIdToken();
                const res = await fetch(`${BACKEND_URL}/api/card-emails`, {
                    method: 'POST', signal: AbortSignal.timeout(65_000),
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ since, skip: [...seen] }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) { error = data.error || 'No se pudieron leer los correos.'; break; }
                if (!done && data.since) cardSync.pendingSince = data.since;
                for (const m of data.movements || []) {
                    if (known.has(m.emailId)) continue;
                    known.add(m.emailId);
                    cardTxns.push({
                        id: uid(), emailId: m.emailId, source: 'email', kind: m.kind, amount: m.amount,
                        currency: m.currency, date: m.date, merchant: m.merchant, last4: m.last4 || null,
                        installments: m.installments || null, note: m.note || '', status: m.needsReview ? 'review' : 'ok',
                        fxRate: m.exchangeRate || +settings().fxRate || null,
                    });
                    if (m.needsReview) syncStatus.review++; else syncStatus.added++;
                }
                (data.processed || []).forEach(id => seen.add(id));
                syncStatus.checked += (data.processed || []).length;
                syncStatus.left = +data.remaining || 0;
                more = !!data.hasMore;
                rounds++;
                // Se guarda en cada ronda: si se cierra la app no se pierde lo leído.
                cardSync.seen = [...seen].slice(-3000);
                persist();
                renderCard();
            } while (more && rounds < 40);
            if (!error && !more) {
                if (!done) cardSync.from = cardSync.pendingSince || since || '';
                cardSync.lastSync = new Date().toISOString(); cardSync.v = 2; delete cardSync.pendingSince;
            }
            if (!error && more) error = 'Quedaron correos sin leer. Toca Reintentar para seguir donde quedó.';
        } catch (e) {
            error = e && e.name === 'TimeoutError' ? 'La lectura tardó demasiado.' : 'Sin conexión con el servidor.';
        }
        syncing = false;
        if (error) Object.assign(syncStatus, { state: 'error', message: error });
        else syncStatus.state = 'done';
        // Una lectura automática sin novedades no deja el panel abierto.
        if (silent && !error && !syncStatus.added && !syncStatus.review) syncStatus = null;
        persist();
        renderCard();
    }

    /* ---------- Formularios ---------- */
    function openTxn(kind, t) {
        editId = t ? t.id : null;
        $('cardTxnTitle').textContent = t ? 'Editar movimiento' : kind === 'pago' ? 'Registrar pago' : 'Nuevo consumo';
        $('ctxKind').value = t ? t.kind : kind;
        $('ctxDate').value = t ? t.date : today();
        $('ctxMerchant').value = t ? t.merchant : (kind === 'pago' ? 'Pago de tarjeta' : '');
        $('ctxAmount').value = t ? formatMoneyInput(t.amount) : '';
        $('ctxCurrency').value = t ? t.currency : 'PEN';
        $('ctxRate').value = t && +t.fxRate > 0 ? t.fxRate : settings().fxRate;
        $('ctxInstallments').value = t && t.installments > 1 ? String(t.installments) : '';
        $('ctxDelete').style.display = t ? '' : 'none';
        syncKindFields();
        openM('cardTxnModal');
    }
    const syncKindFields = () => {
        $('ctxInstallmentsWrap').style.display = $('ctxKind').value === 'consumo' ? '' : 'none';
        // El tipo de cambio solo aplica si el movimiento no está en la moneda de la línea.
        $('ctxRateWrap').style.display = $('ctxCurrency').value !== lineCur(settings()) ? '' : 'none';
    };

    function saveTxn() {
        const kind = $('ctxKind').value;
        const date = $('ctxDate').value;
        const merchant = $('ctxMerchant').value.trim().slice(0, 120);
        const amount = parseMoney($('ctxAmount').value);
        const currency = $('ctxCurrency').value === 'USD' ? 'USD' : 'PEN';
        const n = parseInt($('ctxInstallments').value, 10);
        const installments = kind === 'consumo' && n > 1 && n <= 60 ? n : null;
        if (!['consumo', 'pago', 'abono'].includes(kind) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !merchant || !Number.isFinite(amount) || amount <= 0) {
            toast('Completa correctamente', 'err'); return;
        }
        const fxRate = parseFloat($('ctxRate').value);
        if (currency !== lineCur(settings()) && !(fxRate > 0 && fxRate < 100)) { toast('Revisa el tipo de cambio', 'err'); return; }
        const values = { kind, date, merchant, amount: Math.round(amount * 100) / 100, currency, installments, fxRate: fxRate > 0 && fxRate < 100 ? fxRate : null };
        const t = editId && cardTxns.find(x => x.id === editId);
        if (t) Object.assign(t, values, { status: 'ok' });
        else cardTxns.push({ id: uid(), source: 'manual', status: 'ok', ...values });
        persist(); closeM('cardTxnModal'); renderCard();
        toast(t ? 'Movimiento actualizado' : kind === 'pago' ? 'Pago registrado' : 'Consumo agregado');
    }

    function openSettings() {
        const s = settings();
        $('ccsName').value = s.name; $('ccsLast4').value = s.last4;
        $('ccsLimit').value = s.limit ? formatMoneyInput(s.limit) : '';
        $('ccsClosing').value = s.closingDay; $('ccsDue').value = s.dueDay; $('ccsRate').value = s.fxRate;
        $('ccsLineCur').value = lineCur(s);
        $('ccsOpened').value = s.openedOn || '';
        openM('cardSettingsModal');
    }

    function saveSettings() {
        const closingDay = parseInt($('ccsClosing').value, 10), dueDay = parseInt($('ccsDue').value, 10);
        const limit = $('ccsLimit').value.trim() ? parseMoney($('ccsLimit').value) : 0;
        const fxRate = parseFloat($('ccsRate').value);
        const lineCurrency = $('ccsLineCur').value === 'PEN' ? 'PEN' : 'USD';
        const last4 = $('ccsLast4').value.trim();
        if (!(closingDay >= 1 && closingDay <= 31) || !(dueDay >= 1 && dueDay <= 31) || !Number.isFinite(limit) || limit < 0
            || (last4 && !/^\d{4}$/.test(last4)) || !(fxRate > 0 && fxRate < 100)) {
            toast('Revisa los datos de la tarjeta', 'err'); return;
        }
        const openedOn = $('ccsOpened').value;
        if (openedOn && (!/^\d{4}-\d{2}-\d{2}$/.test(openedOn) || openedOn > today())) { toast('Revisa la fecha de apertura', 'err'); return; }
        const prevOpened = settings().openedOn || '';
        card = { v: 2, name: $('ccsName').value.trim().slice(0, 40) || DEFAULTS.name, last4, lineCurrency, limit, closingDay, dueDay, fxRate, openedOn };
        // Si la apertura es anterior a lo ya leído, la próxima lectura vuelve a
        // revisar desde esa fecha (los correos ya procesados se saltan).
        if (openedOn && openedOn !== prevOpened) { cardSync = cardSync || {}; delete cardSync.v; cardSync.pendingSince = openedOn; }
        persist(); closeM('cardSettingsModal'); renderCard(); toast('Tarjeta actualizada');
    }

    /* ---------- Eventos ---------- */
    document.querySelectorAll(SWITCHES).forEach(b => b.addEventListener('click', () => { cycleOffset = 0; setMode(b.dataset.mode); }));
    $('cardView').addEventListener('click', e => {
        const b = e.target.closest('[data-cc]');
        if (!b || b.disabled) return;
        const act = b.dataset.cc, t = b.dataset.id && cardTxns.find(x => x.id === b.dataset.id);
        if (act === 'sync') syncEmails();
        else if (act === 'sync-close') { syncStatus = null; renderCard(); }
        else if (act === 'prev') { cycleOffset--; renderCard(); }
        else if (act === 'next') { cycleOffset = Math.min(0, cycleOffset + 1); renderCard(); }
        else if (!currentUser) toast('Inicia sesión para realizar esta acción', 'err');
        else if (act === 'add') openTxn('consumo');
        else if (act === 'pay') openTxn('pago');
        else if (act === 'settings') openSettings();
        else if (act === 'edit' && t) openTxn(t.kind, t);
        else if (act === 'confirm' && t) { t.status = 'ok'; persist(); renderCard(); }
        else if (act === 'confirm-all') { cardTxns.forEach(x => { if (x.status === 'review') x.status = 'ok'; }); persist(); renderCard(); }
        else if (act === 'discard' && t) { cardTxns = cardTxns.filter(x => x !== t); persist(); renderCard(); }
    });
    $('ctxKind').addEventListener('change', syncKindFields);
    $('ctxCurrency').addEventListener('change', syncKindFields);
    $('ctxSave').addEventListener('click', saveTxn);
    $('ctxDelete').addEventListener('click', () => {
        const id = editId;
        confirm_('Eliminar movimiento', '¿Eliminar este movimiento de la tarjeta?', () => {
            cardTxns = cardTxns.filter(x => x.id !== id); persist(); closeM('cardTxnModal'); renderCard(); toast('Movimiento eliminado');
        });
    });
    $('ccsSave').addEventListener('click', saveSettings);

    window.renderCard = renderCard;
    // app.js la llama al iniciar sesión: si la vista de tarjeta está abierta y
    // hace rato que no se leen los correos, se leen en segundo plano.
    window.cardAutoSync = () => {
        const last = Date.parse(cardSync && cardSync.lastSync) || 0;
        if (document.body.classList.contains('card-mode') && Date.now() - last > SYNC_EVERY_MS) syncEmails({ silent: true });
    };
    let saved = 'cuenta';
    try { saved = localStorage.getItem(MODE_KEY) || 'cuenta'; } catch { /* modo privado */ }
    setMode(saved === 'tarjeta' ? 'tarjeta' : 'cuenta');
})();
