const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function appContext() {
    const fields = new Map();
    const context = vm.createContext({
        document: { getElementById(id) {
            if (!fields.has(id)) fields.set(id, { addEventListener() {}, focus() {} });
            return fields.get(id);
        } },
        fetch: () => new Promise(() => {})
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/scripts/app.js'), 'utf8'), context);
    return { context, fields };
}

test('totals separate currencies, retain additional tax, and exclude unknown values', () => {
    const { context, fields } = appContext();
    vm.runInContext(`
        subscriptions.push(
            { price: 145, years: 2, currency: 'CAD', plusTax: true },
            { price: 316.4, years: null, currency: 'CAD' },
            { price: 100, years: 1, currency: 'USD' },
            { price: null, years: null, currency: 'CAD' },
            { price: 20, years: 0 }
        );
        updateSummary();
    `, context);
    assert.equal(fields.get('summary-annual').textContent,
        'CAD 461.40 + tax\nUSD 100.00\n1 with unconfirmed currency excluded');
    assert.equal(fields.get('summary-lifetime').textContent,
        'CAD 290.00 + tax\nUSD 100.00\n1 with unconfirmed currency excluded');
    assert.equal(fields.get('summary-years').textContent, '1');
});

test('editing retains unknown fields, currency, tax and billing notes', () => {
    const { context, fields } = appContext();
    vm.runInContext(`
        subscriptions.push({ id: 'one', name: 'Google One', price: null, years: null,
            currency: 'CAD', plusTax: true, notes: 'Price unconfirmed' });
        beginEditing('one');
    `, context);
    assert.equal(fields.get('subscription-price').value, '');
    assert.equal(fields.get('subscription-years').value, '');
    assert.equal(fields.get('subscription-currency').value, 'CAD');
    assert.equal(fields.get('subscription-plus-tax').checked, true);
    assert.equal(fields.get('subscription-notes').value, 'Price unconfirmed');
});

test('API validation preserves nulls and rejects unsupported currencies and invalid amounts', () => {
    const context = vm.createContext({
        require(name) {
            if (name === 'express') return Object.assign(() => ({ use() {}, get() {}, post() {}, put() {}, delete() {} }), { json() {}, static() {} });
            if (name === 'nedb-promises') return { create: () => ({ ensureIndex: () => new Promise(() => {}) }) };
            if (name === 'fs') return { mkdirSync() {} };
            return require(name);
        },
        __dirname, process: { env: {} }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8'), context);
    const parse = (overrides) => {
        context.payload = { id: 'test', name: 'Plan', price: null, years: null, currency: 'CAD', plusTax: true, notes: 'Unconfirmed', ...overrides };
        return vm.runInContext('parseSubscriptionInput(payload)', context);
    };
    assert.equal(parse().value.price, null);
    assert.equal(parse().value.years, null);
    assert.equal(parse().value.plusTax, true);
    assert.equal(parse().value.notes, 'Unconfirmed');
    for (const invalid of [{ currency: '<img>' }, { price: -1 }, { years: 1.5 }, { plusTax: 'yes' }, { notes: {} }]) {
        assert.ok(parse(invalid).error);
    }
});
