const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../public/app.js'), 'utf8');
function model(data = {}) {
    const context = vm.createContext({ deposits: [], expenses: [], categories: [], budgets: {}, ...data });
    for (const [start, end] of [['function annualTotals(', 'function renderAnnualSummary('], ['function renameCategory(', 'function renderCatList(']]) {
        vm.runInContext(source.slice(source.indexOf(start), source.indexOf(end)), context);
    }
    return context;
}
test('annual totals use calendar-year boundaries and count unique activity days', () => {
    const state = model({
        deposits: [{ date: '2025-12-31', amount: 900 }, { date: '2026-01-01', amount: '100' }, { date: '2026-12-31', amount: 50 }, { date: '2027-01-01', amount: 800 }],
        expenses: [{ date: '2026-01-01', amount: '25' }, { date: '2026-06-01', amount: 200 }]
    });
    assert.deepEqual(JSON.parse(JSON.stringify(state.annualTotals(2026))), { income: 150, spending: 225, moved: 375, net: -75, days: 3, count: 4 });
});
test('a year without records has zero totals', () => {
    assert.deepEqual(JSON.parse(JSON.stringify(model().annualTotals(2026))), { income: 0, spending: 0, moved: 0, net: 0, days: 0, count: 0 });
});
test('renaming migrates all historic expenses and budget without altering record data', () => {
    const expenses = [{ id: 'a', category: 'Viajes', amount: 30, date: '2025-01-01', imageUrls: ['receipt'] }, { id: 'b', category: 'Viajes', amount: 40 }, { id: 'c', category: 'Otros', amount: 20 }];
    const state = model({ categories: ['Viajes', 'Otros'], budgets: { Viajes: 150 }, expenses });
    assert.equal(state.renameCategory('Viajes', '  Transporte  '), '');
    assert.deepEqual(state.categories, ['Transporte', 'Otros']);
    assert.equal(state.budgets.Transporte, 150);
    assert.equal(Object.hasOwn(state.budgets, 'Viajes'), false);
    assert.deepEqual(expenses.map(row => row.category), ['Transporte', 'Transporte', 'Otros']);
    assert.equal(expenses[0].amount, 30);
    assert.deepEqual(expenses[0].imageUrls, ['receipt']);
});
test('blank, duplicate and stale names are rejected without changing data', () => {
    const state = model({ categories: ['Viajes', 'Otros'], budgets: { Viajes: 10 } });
    for (const [oldName, newName] of [['Viajes', ' '], ['Viajes', 'OTROS'], ['Inexistente', 'Nuevo']]) {
        assert.ok(state.renameCategory(oldName, newName));
        assert.deepEqual(state.categories, ['Viajes', 'Otros']);
        assert.equal(state.budgets.Viajes, 10);
    }
});
test('keeping the same name preserves its budget', () => {
    const state = model({ categories: ['Viajes'], budgets: { Viajes: 10 } });
    assert.equal(state.renameCategory('Viajes', 'Viajes'), '');
    assert.equal(state.budgets.Viajes, 10);
});
