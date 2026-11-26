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
    const DEFAULTS = { name: 'Scotiabank', last4: '', lineCurrency: 'USD', limit: 850, closingDay: 20, dueDay: 5, fxRate: 3.75 };
    const MODE_KEY = 'ct_mode';
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
        return s;
    };
    const both = (pen, usd) => [pen ? fmt(pen, 'PEN') : '', usd ? fmt(usd, 'USD') : ''].filter(Boolean).join(' + ');

    let cycleOffset = 0;
    let syncing = false;
    let editId = null;

    function setMode(mode) {
        const isCard = mode === 'tarjeta';
        document.body.classList.toggle('card-mode', isCard);
        document.querySelectorAll('#acctSwitch [data-mode]').forEach(b => {
            const on = b.dataset.mode === mode;
            b.classList.toggle('on', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
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
            <div class="cc-line-txt"><span>Disponible ${fmt(Math.max(0, limit - usedLine), line)}</span><span>Línea ${fmt(limit, line)}</span></div>`
            : `<button type="button" class="cc-setup" data-cc="settings">Configura tu línea, corte y día de pago</button>`}
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
            <span class="cc-row-main"><span class="cc-row-name">${esc(t.merchant)}</span><span class="cc-row-meta">${short(t.date)} ${badges}</span></span>
            <span class="cc-row-amt">${credit ? '+' : '−'}${fmt(t.amount, t.currency)}${(t.currency === 'USD' ? 'USD' : 'PEN') !== lineCur(settings()) ? `<small class="cc-row-conv">≈ ${fmt(txnInLine(t, settings()), lineCur(settings()))}${+t.fxRate > 0 ? ` · TC ${(+t.fxRate).toFixed(3)}` : ''}</small>` : ''}</span>
        </button>`;
    }

    function reviewBlock(pending) {
        if (!pending.length) return '';
        return `<section class="cc-block cc-review" aria-labelledby="ccReviewTitle">
            <h3 id="ccReviewTitle"><span class="material-symbols-outlined">rule</span> Por revisar <span class="cc-count">${pending.length}</span></h3>
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
                    <span>${syncing ? 'Leyendo correos…' : 'Leer correos'}</span>
                </button>
                <button type="button" class="cc-act" data-cc="add"><span class="material-symbols-outlined">add</span><span>Consumo</span></button>
                <button type="button" class="cc-act" data-cc="pay"><span class="material-symbols-outlined">payments</span><span>Pago</span></button>
                <button type="button" class="cc-act" data-cc="settings" aria-label="Ajustes de la tarjeta"><span class="material-symbols-outlined">tune</span></button>
            </div>
            <p class="cc-sync-txt">${last ? `Última lectura: ${last.toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Aún no se leyeron correos del banco.'}</p>
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
                <div class="cc-list">${inCycle.length ? inCycle.map(row).join('') : '<p class="cc-empty">Sin movimientos en este ciclo.</p>'}</div>
            </section>`;
    }

    /* ---------- Sincronización con los correos ---------- */
    async function syncEmails({ silent = false } = {}) {
        if (syncing) return;
        if (!currentUser || !auth || !auth.currentUser) { if (!silent) toast('Inicia sesión para leer tus correos', 'err'); return; }
        syncing = true; renderCard();
        cardSync = cardSync || {};
        const seen = new Set(Array.isArray(cardSync.seen) ? cardSync.seen : []);
        const known = new Set((cardTxns || []).map(t => t.emailId).filter(Boolean));
        // Un margen de 3 días cubre correos que llegan con retraso.
        const since = cardSync.lastSync ? addDays(cardSync.lastSync.slice(0, 10), -3) : undefined;
        let added = 0, review = 0, rounds = 0, error = '', more = false;
        try {
            do {
                const token = await auth.currentUser.getIdToken();
                const res = await fetch(`${BACKEND_URL}/api/card-emails`, {
                    method: 'POST', signal: AbortSignal.timeout(65_000),
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ since, skip: [...seen] }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) { error = data.error || 'No se pudieron leer los correos'; break; }
                for (const m of data.movements || []) {
                    if (known.has(m.emailId)) continue;
                    known.add(m.emailId);
                    cardTxns.push({
                        id: uid(), emailId: m.emailId, source: 'email', kind: m.kind, amount: m.amount,
                        currency: m.currency, date: m.date, merchant: m.merchant, last4: m.last4 || null,
                        installments: m.installments || null, note: m.note || '', status: m.needsReview ? 'review' : 'ok',
                        fxRate: m.exchangeRate || +settings().fxRate || null,
                    });
                    if (m.needsReview) review++; else added++;
                }
                (data.processed || []).forEach(id => seen.add(id));
                more = !!data.hasMore;
                rounds++;
            } while (more && rounds < 5);
            if (!error) cardSync.lastSync = new Date().toISOString();
        } catch (e) {
            error = e && e.name === 'TimeoutError' ? 'La lectura tardó demasiado. Intenta de nuevo.' : 'Sin conexión con el servidor';
        }
        // Se guarda lo leído aunque una ronda posterior haya fallado.
        cardSync.seen = [...seen].slice(-800);
        syncing = false;
        persist();
        renderCard();
        if (error) toast(error, 'err');
        else if (added || review) toast(`${added} movimiento${added === 1 ? '' : 's'} nuevo${added === 1 ? '' : 's'}${review ? ` · ${review} por revisar` : ''}`);
        else if (!silent) toast('No hay movimientos nuevos');
        if (!error && more) toast('Quedan correos por leer: vuelve a tocar “Leer correos”');
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
        card = { name: $('ccsName').value.trim().slice(0, 40) || DEFAULTS.name, last4, lineCurrency, limit, closingDay, dueDay, fxRate };
        persist(); closeM('cardSettingsModal'); renderCard(); toast('Tarjeta actualizada');
    }

    /* ---------- Eventos ---------- */
    document.querySelectorAll('#acctSwitch [data-mode]').forEach(b => b.addEventListener('click', () => { cycleOffset = 0; setMode(b.dataset.mode); }));
    $('cardView').addEventListener('click', e => {
        const b = e.target.closest('[data-cc]');
        if (!b || b.disabled) return;
        const act = b.dataset.cc, t = b.dataset.id && cardTxns.find(x => x.id === b.dataset.id);
        if (act === 'sync') syncEmails();
        else if (act === 'prev') { cycleOffset--; renderCard(); }
        else if (act === 'next') { cycleOffset = Math.min(0, cycleOffset + 1); renderCard(); }
        else if (!currentUser) toast('Inicia sesión para realizar esta acción', 'err');
        else if (act === 'add') openTxn('consumo');
        else if (act === 'pay') openTxn('pago');
        else if (act === 'settings') openSettings();
        else if (act === 'edit' && t) openTxn(t.kind, t);
        else if (act === 'confirm' && t) { t.status = 'ok'; persist(); renderCard(); toast('Movimiento confirmado'); }
        else if (act === 'discard' && t) { cardTxns = cardTxns.filter(x => x !== t); persist(); renderCard(); toast('Descartado'); }
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
