const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// ---------- Cálculos de la tarjeta (public/card.js, sin DOM) ----------
const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/card.js'), 'utf8'), context);
const M = context.window.CardMath;
const plain = v => JSON.parse(JSON.stringify(v));

test('billing cycle follows the closing day, including short months', () => {
    assert.deepEqual(plain(M.cycleFor('2026-11-20', 20)), { start: '2026-10-21', end: '2026-11-20' });
    assert.deepEqual(plain(M.cycleFor('2026-11-21', 20)), { start: '2026-11-21', end: '2026-12-20' });
    assert.deepEqual(plain(M.cycleFor('2026-12-25', 20)), { start: '2026-12-21', end: '2027-01-20' });
    assert.deepEqual(plain(M.cycleFor('2026-11-26', 20, -1)), { start: '2026-10-21', end: '2026-11-20' });
    assert.deepEqual(plain(M.cycleFor('2026-02-15', 31)), { start: '2026-02-01', end: '2026-02-28' });
    assert.deepEqual(plain(M.cycleFor('2026-03-01', 31)), { start: '2026-03-01', end: '2026-03-31' });
});

test('due date is the first payment day after the closing', () => {
    assert.equal(M.dueDateFor('2026-11-20', 5), '2026-12-05');
    assert.equal(M.dueDateFor('2026-11-05', 25), '2026-11-25');
    assert.equal(M.dueDateFor('2026-01-20', 31), '2026-01-31');
    assert.equal(M.dueDateFor('2026-01-31', 30), '2026-02-28');
});

test('used line counts purchases minus payments per currency and skips pending reviews', () => {
    const used = M.usedByCurrency([
        { kind: 'consumo', amount: 100, currency: 'PEN' },
        { kind: 'consumo', amount: 50.5, currency: 'PEN' },
        { kind: 'pago', amount: 30, currency: 'PEN' },
        { kind: 'abono', amount: 10, currency: 'PEN' },
        { kind: 'consumo', amount: 20, currency: 'USD' },
        { kind: 'consumo', amount: 999, currency: 'PEN', status: 'review' },
    ]);
    assert.deepEqual(plain(used), { PEN: 110.5, USD: 20 });
});

test('statement bills installments one per closing and subtracts later payments', () => {
    const settings = { closingDay: 20, dueDay: 5 };
    const txns = [
        { kind: 'consumo', amount: 300, currency: 'PEN', date: '2026-09-10', installments: 3 }, // cortes: set, oct, nov
        { kind: 'consumo', amount: 120, currency: 'PEN', date: '2026-11-02' },
        { kind: 'consumo', amount: 80, currency: 'PEN', date: '2026-11-22' }, // ciclo actual: aún no facturado
        { kind: 'pago', amount: 200, currency: 'PEN', date: '2026-10-28' }, // antes del último corte
        { kind: 'pago', amount: 50, currency: 'PEN', date: '2026-11-24' },  // después del último corte
    ];
    const st = M.statement(txns, settings, '2026-11-26');
    assert.deepEqual(plain(st.prev), { start: '2026-10-21', end: '2026-11-20' });
    assert.equal(st.billed.PEN, 300 + 120 - 200);
    assert.equal(st.paidAfter.PEN, 50);
    assert.equal(st.due.PEN, 170);
    assert.equal(st.dueDate, '2026-12-05');
    assert.equal(M.closingsBetween('2026-09-10', '2026-11-20', 20), 3);
});

test('bank anchor replaces older history and only later movements change the debt', () => {
    const s = { closingDay: 4, dueDay: 1, lineCurrency: 'USD', fxRate: 3.75, anchor: { date: '2026-11-26', PEN: 550.95, USD: 30.97 } };
    const txns = [
        { kind: 'consumo', amount: 540, currency: 'PEN', date: '2026-11-22' },        // ya está dentro del saldo del banco
        { kind: 'pago', amount: 200, currency: 'PEN', date: '2026-11-10' },           // también
        { kind: 'consumo', amount: 30, currency: 'PEN', date: '2026-11-27' },         // posterior: suma
        { kind: 'pago', amount: 10.97, currency: 'USD', date: '2026-11-28' },         // posterior: resta
        { kind: 'consumo', amount: 999, currency: 'PEN', date: '2026-11-29', status: 'review' },
    ];
    assert.deepEqual(plain(M.usedByCurrency(txns, s)), { PEN: 580.95, USD: 20 });
    assert.equal(M.usedInLine(txns, s), Math.round((580.95 / 3.75 + 20) * 100) / 100);
    // Sin cuadre, se suma todo el historial como antes.
    assert.deepEqual(plain(M.usedByCurrency(txns, { ...s, anchor: null })), { PEN: 370, USD: -10.97 });
});

test('the copied monthly payment wins for its closing and later payments reduce it', () => {
    const s = { closingDay: 4, dueDay: 1, anchor: { date: '2026-11-26', PEN: 550.95, USD: 30.97 },
        statementOverride: { closing: '2026-11-04', PEN: 0, USD: 0.92, asOf: '2026-11-26' } };
    const before = M.statement([{ kind: 'pago', amount: 0.5, currency: 'USD', date: '2026-11-20' }], s, '2026-11-27');
    assert.deepEqual(plain(before.due), { PEN: 0, USD: 0.92 });
    assert.equal(before.dueDate, '2026-12-01');assert.equal(before.fromBank, true);
    const paid = M.statement([{ kind: 'pago', amount: 0.92, currency: 'USD', date: '2026-11-27' }], s, '2026-11-27');
    assert.deepEqual(plain(paid.due), { PEN: 0, USD: 0 });
    // En el siguiente ciclo ya no aplica: se calcula desde el saldo del banco.
    const next = M.statement([{ kind: 'consumo', amount: 100, currency: 'PEN', date: '2026-11-30' }], s, '2026-12-10');
    assert.equal(next.fromBank, false);assert.deepEqual(plain(next.due), { PEN: 650.95, USD: 30.97 });
});

test('daily spending counts purchases in soles, converting dollars with their own rate', () => {
    const d = M.dailySpend([
        { kind: 'consumo', amount: 17.9, currency: 'PEN', date: '2026-11-24' },
        { kind: 'consumo', amount: 10, currency: 'USD', fxRate: 3.7, date: '2026-11-24' },
        { kind: 'pago', amount: 500, currency: 'PEN', date: '2026-11-24' },
        { kind: 'consumo', amount: 4.9, currency: 'PEN', date: '2026-11-23' },
        { kind: 'consumo', amount: 99, currency: 'PEN', date: '2026-11-25', status: 'review' },
    ], { fxRate: 3.75 }, '2026-11-23', '2026-11-25');
    assert.deepEqual(plain(d.days.map(x => [x.date, x.total, x.count])), [['2026-11-23', 4.9, 1], ['2026-11-24', 54.9, 2], ['2026-11-25', 0, 0]]);
    assert.equal(d.total, 59.8);assert.equal(d.average, 19.93);
});

test('a dollar line converts soles purchases with the rate frozen on each movement', () => {
    const s = { lineCurrency: 'USD', fxRate: 4 };
    assert.equal(M.toLine(375, 'PEN', s, 3.75), 100);
    assert.equal(M.toLine(400, 'PEN', s), 100); // sin TC propio usa el de Ajustes
    assert.equal(M.toLine(12.5, 'USD', s), 12.5);
    assert.equal(M.toLine(10, 'USD', { lineCurrency: 'PEN', fxRate: 3.8 }), 38);
    const used = M.usedInLine([
        { kind: 'consumo', amount: 375, currency: 'PEN', fxRate: 3.75 },
        { kind: 'consumo', amount: 50, currency: 'USD' },
        { kind: 'pago', amount: 20, currency: 'USD' },
        { kind: 'consumo', amount: 999, currency: 'USD', status: 'review' },
    ], s);
    assert.equal(used, 130);
});

// ---------- Lectura de correos (lib/cardEmails.ts y la ruta) ----------
function load(file, requireMock) {
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const module = { exports: {} };
    new Function('require', 'exports', 'module', code)(requireMock || require, module.exports, module);
    return module.exports;
}
const lib = load('lib/cardEmails.ts');

test('email html becomes readable text and bodies are found in nested parts', () => {
    const text = lib.htmlToText('<style>.x{}</style><table><tr><td>Comercio</td><td>PLAZA VEA&nbsp;LIMA</td></tr><tr><td>Monto</td><td>S/ 45.90</td></tr></table><p>Gracias &amp; saludos</p>');
    assert.match(text, /Comercio \| PLAZA VEA LIMA/);
    assert.match(text, /Monto \| S\/ 45\.90/);
    assert.match(text, /Gracias & saludos/);
    const b64 = s => Buffer.from(s).toString('base64url');
    const payload = { mimeType: 'multipart/alternative', parts: [{ mimeType: 'text/plain', body: { data: b64('plano') } }, { mimeType: 'text/html', body: { data: b64('<b>Consumo S/ 10</b>') } }] };
    assert.equal(lib.extractBody(payload), 'Consumo S/ 10');
    assert.equal(lib.buildQuery('scotiabank.com.pe', '2026-10-01'), 'from:(scotiabank.com.pe) after:2026/10/01');
    assert.equal(lib.limaDate(Date.parse('2026-11-27T03:00:00Z')), '2026-11-26');
});

test('parsed movements are validated before they reach the app', () => {
    const email = { id: 'm1', subject: '', from: '', receivedDate: '2026-11-20', text: '' };
    const ok = { kind: 'consumo', amount: 45.904, currency: 'PEN', date: '2026-11-19', merchant: 'PLAZA VEA', last4: '1234', installments: null, needsReview: false, note: '' };
    assert.deepEqual(plain(lib.normalizeMovement(ok, email, '2026-11-26')), { emailId: 'm1', kind: 'consumo', amount: 45.9, currency: 'PEN', date: '2026-11-19', merchant: 'PLAZA VEA', last4: '1234', installments: null, exchangeRate: null, needsReview: false, note: '' });
    assert.equal(lib.normalizeMovement({ ...ok, exchangeRate: 3.7512 }, email, '2026-11-26').exchangeRate, 3.7512);
    assert.equal(lib.normalizeMovement({ ...ok, exchangeRate: 375 }, email, '2026-11-26').exchangeRate, null);
    assert.equal(lib.normalizeMovement({ ...ok, kind: 'ninguno' }, email, '2026-11-26'), null);
    assert.equal(lib.normalizeMovement({ ...ok, amount: -3 }, email, '2026-11-26'), null);
    const future = lib.normalizeMovement({ ...ok, date: '2027-01-01' }, email, '2026-11-26');
    assert.equal(future.date, '2026-11-20');assert.equal(future.needsReview, true);
    assert.equal(lib.normalizeMovement({ ...ok, currency: 'EUR' }, email, '2026-11-26').needsReview, true);
    assert.equal(lib.normalizeMovement({ ...ok, last4: '12ab', installments: 1 }, email, '2026-11-26').last4, null);
});

// Copias INVENTADAS con el formato de las constancias de Scotiabank (otros montos,
// comercio, números de operación y dígitos): el repositorio es público.
const parser = load('lib/scotiabankParser.ts', id => id === './cardEmails' ? lib : require(id));
const mail = (id, text, receivedDate = '2026-11-23') => ({ id, subject: 'Constancia de operación', from: 'bancadigital@scotiabank.com.pe', receivedDate, text });
const PAGO = `Hola CLIENTE,
Esta es la constancia de tu pago de Tarjeta de Crédito:
23 nov., 11:28 am
Pago de Tarjeta de Crédito
Número de operación 111.222.333.4444
Pagado con:
Cta. Free
*** ***9999
Monto pagado:
S/ 1,250.50
Tarjeta pagada
:
Mastercard Clásica
**** **** **** 1234
Muchas gracias.`;
const SERVICIO = (payer) => `Hola CLIENTE,
Esta es la
constancia de tu pago de servicio
:
23 nov., 07:07 pm
Pago de servicio
Número de operación 111.222.333.5555
Fecha de efectividad:
23 nov.
Pagado con:
${payer}
Monto pagado:
S/ 199.90
Empresa o institución:
Colegio Ejemplo Sac
Servicio:
Pension Soles
Dni/Ruc/Codigo:
[OCULTO]
N° Recibo:
ABC-123
Muchas gracias.`;
const PLIN = `Hola CLIENTE,
Esta es la constancia de tu transferencia Plin:
26 nov., 07:00 am
Transferencia Plin
Cuenta de origen:
Cta. Free
*** ***9999
Monto enviado:
S/ 50.00
Destino:
Yape`;
const QR = (payer) => `Hola CLIENTE,
Esta es la constancia de tu operación:
21 nov., 06:16 pm
Pago con QR
Pagaste con:
${payer}
Monto:
S/ 12.00
Pagaste a:
TIENDA EJEMPLO SAC
Muchas gracias.`;
const parse = (text, last4 = '1234', receivedDate) => plain(parser.parseScotiabankEmail(mail('x', text, receivedDate), last4));

test('reader takes card payments and card-paid services without any model', () => {
    assert.deepEqual(parse(PAGO), { status: 'movement', movement: { installments: null, exchangeRate: null, note: '', kind: 'pago', amount: 1250.5, currency: 'PEN', date: '2026-11-23', merchant: 'Pago a la tarjeta', last4: '1234', needsReview: false } });
    const service = parse(SERVICIO('Mastercard Clásica\n**** **** **** 1234'));
    assert.equal(service.status, 'movement');
    assert.deepEqual([service.movement.kind, service.movement.amount, service.movement.merchant, service.movement.date, service.movement.needsReview], ['consumo', 199.9, 'Colegio Ejemplo Sac', '2026-11-23', false]);
    // Las tablas del correo pueden llegar como "Etiqueta: | valor" en una sola línea.
    assert.equal(parse('Esta es la constancia de tu pago de Tarjeta de Crédito: | 23 nov., 11:28 am | Monto pagado: | S/ 80.00 | Tarjeta pagada | : | Mastercard Clásica | **** **** **** 1234').movement.amount, 80);
});

test('reader ignores Plin, transfers, debit, account-paid services and other cards', () => {
    assert.equal(parse(PLIN).status, 'ignored');
    assert.equal(parse(SERVICIO('Cta. Free\n*** ***9999')).reason, 'pago de servicio desde la cuenta');
    assert.equal(parse(QR('Débito Mastercard\n**** **** **** 5555')).status, 'ignored');
    assert.equal(parse(PAGO, '9876').reason, 'pago de otra tarjeta');
    assert.equal(parse('Has realizado la visualización de la información de tu Tarjeta de Crédito Mastercard **** 1234').status, 'ignored');
    // Con la tarjeta de crédito, el pago con QR sí es un consumo.
    const qr = parse(QR('Mastercard Clásica\n**** **** **** 1234'));
    assert.deepEqual([qr.status, qr.movement.merchant, qr.movement.amount], ['movement', 'TIENDA EJEMPLO SAC', 12]);
});

test('unknown credit card alerts come in for review and dates infer the year', () => {
    const unknown = parse('Realizaste un consumo con tu Tarjeta de Crédito **** 1234 Comercio: DON EJEMPLO Monto: US$ 9.99 Fecha: 02 dic 2026');
    assert.deepEqual([unknown.movement.kind, unknown.movement.currency, unknown.movement.amount, unknown.movement.merchant, unknown.movement.needsReview], ['consumo', 'USD', 9.99, 'DON EJEMPLO', true]);
    assert.equal(parser.operationDate('30 dic., 10:00 pm', '2027-01-02'), '2026-12-30');
    assert.equal(parser.operationDate('23 nov., 11:28 am', '2026-11-23'), '2026-11-23');
});

async function sync({ authorized = true, email = 'yo@example.com', allowed = '', messages = [], gmailError = null, body = {} } = {}) {
    const saved = { ...process.env }, originalFetch = global.fetch, originalWarn = console.warn;
    Object.assign(process.env, { CARD_ALLOWED_EMAILS: allowed });
    delete process.env.GEMINI_API_KEY;
    let fetchCalls = 0, query = null;
    console.warn = () => {};
    global.fetch = async () => { fetchCalls++; throw new Error('no network'); };
    try {
        const route = load('app/api/card-emails/route.ts', id => {
            if (id === '@/lib/verifyToken') return { verifyEmailUser: async () => authorized ? { sub: 'u', email } : null };
            if (id === '@/lib/cors') return { corsHeaders: () => ({}) };
            if (id === '@/lib/cardEmails') return lib;
            if (id === '@/lib/scotiabankParser') return parser;
            if (id === '@/lib/gmail') return {
                GmailConfigError: class extends Error {},
                listMessageIds: async q => { query = q; if (gmailError) throw gmailError; return messages.map(m => m.id); },
                getEmail: async id => messages.find(m => m.id === id),
            };
            return require(id);
        });
        const res = await route.POST(new Request('http://localhost/api/card-emails', { method: 'POST', body: JSON.stringify(body), headers: { authorization: 'Bearer t' } }));
        return { status: res.status, data: await res.json(), fetchCalls, query };
    } finally {
        process.env = saved; global.fetch = originalFetch; console.warn = originalWarn;
    }
}

test('card email sync requires a session and the allow-list, but no AI key', async () => {
    assert.equal((await sync({ authorized: false })).status, 401);
    assert.equal((await sync({ allowed: 'otro@example.com' })).status, 403);
    assert.equal((await sync({ allowed: 'YO@example.com' })).status, 200);
});

test('sync reads only card movements, skips seen ids and never calls an external model', async () => {
    const messages = [mail('a', PAGO), mail('b', PLIN), mail('c', SERVICIO('Mastercard Clásica **** 1234')), mail('d', SERVICIO('Cta. Free *** ***9999'))];
    const r = await sync({ messages, body: { since: '2026-11-01', skip: ['d'], last4: '1234' } });
    assert.equal(r.status, 200);assert.equal(r.fetchCalls, 0);
    assert.match(r.query, /^from:\(scotiabank\.com\.pe\) after:2026\/11\/01 -subject:Plin/);
    assert.deepEqual(plain(r.data.processed), ['a', 'b', 'c']);
    assert.deepEqual(r.data.movements.map(m => [m.emailId, m.kind, m.amount]), [['a', 'pago', 1250.5], ['c', 'consumo', 199.9]]);
    assert.equal(r.data.ignored['no es un movimiento de la tarjeta'], 1);
});

test('Gmail failures are explained', async () => {
    assert.equal((await sync({ gmailError: new Error('invalid_grant') })).data.code, 'GMAIL_AUTH');
    const badClient = await sync({ gmailError: Object.assign(new Error('invalid_client'), { response: { status: 401, data: { error: 'invalid_client' } } }) });
    assert.equal(badClient.data.code, 'GMAIL_CLIENT');
    assert.equal((await sync({ gmailError: Object.assign(new Error('Insufficient Permission'), { code: 403 }) })).data.code, 'GMAIL_SCOPE');
});
