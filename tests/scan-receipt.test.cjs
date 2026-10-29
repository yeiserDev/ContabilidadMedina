const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const code = ts.transpileModule(fs.readFileSync('app/api/scan-receipt/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const valid = { amount: 35.5, date: '2026-10-17', description: 'Almuerzo', category: 'Comida', wallet: 'yape', currency: 'PEN', isExpense: true, needsReview: false, note: '' };
const jpeg = 'data:image/jpeg;base64,' + Buffer.from([255,216,255,217]).toString('base64');

async function run({ authorized = true, key = 'test-key', body = { image: jpeg, categories: ['Comida'] }, output = valid, upstream = 200 } = {}) {
    const env = process.env.GEMINI_API_KEY, originalFetch = global.fetch;
    let calls = 0;
    process.env.GEMINI_API_KEY = key;
    global.fetch = async (_url, options) => {
        calls++;
        const request = JSON.parse(options.body);
        assert.equal(request.contents[0].parts[1].inlineData.mimeType, 'image/jpeg');
        assert.ok(request.generationConfig.responseFormat.text.schema.required.includes('amount'));
        return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(output) }] } }] }), { status: upstream });
    };
    try {
        const module = { exports: {} };
        new Function('require', 'exports', code)(id => {
            if (id === '@/lib/verifyToken') return { verifyEmailUser: async () => authorized ? { sub: 'user' } : null };
            if (id === '@/lib/cors') return { corsHeaders: () => ({}) };
            return require(id);
        }, module.exports);
        const response = await module.exports.POST(new Request('http://localhost/api/scan-receipt', {
            method: 'POST', body: JSON.stringify(body), headers: { authorization: 'Bearer test' },
        }));
        return { status: response.status, data: await response.json(), calls };
    } finally {
        global.fetch = originalFetch;
        if (env === undefined) delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY = env;
    }
}

test('rejects unauthorized requests and missing configuration before contacting Gemini', async () => {
    const denied = await run({ authorized: false });assert.equal(denied.status, 401);assert.equal(denied.calls, 0);
    const missing = await run({ key: '' });assert.equal(missing.status, 503);assert.equal(missing.calls, 0);
});
test('validates image type and payload size', async () => {
    assert.equal((await run({ body: { image: 'data:image/jpeg;base64,YWJj' } })).status, 400);
    assert.equal((await run({ body: { image: 'a'.repeat(4_200_001) } })).status, 413);
});
test('extracts complete expenses using structured output', async () => {
    const result = await run();assert.equal(result.status, 200);assert.deepEqual(result.data, valid);
});
test('invalid dates, categories, currencies and incoming transfers require review', async () => {
    for (const change of [{ date: '2026-02-30' }, { amount: -10 }, { category: 'Inventado' }, { currency: 'USD' }, { isExpense: false }, { wallet: 'inventado' }, { description: '' }]) {
        const result = await run({ output: { ...valid, ...change } });
        assert.equal(result.data.needsReview, true, JSON.stringify(change));
    }
});
test('handles provider errors and malformed output without exposing provider data', async () => {
    assert.equal((await run({ upstream: 429 })).status, 502);
    assert.equal((await run({ output: null })).status, 422);
});
