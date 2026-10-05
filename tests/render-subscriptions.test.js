const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../src/scripts/app.js'), 'utf8');

for (const name of [
    '<img src=x onerror="alert(1)">',
    '</div><svg onload="alert(1)"></svg>',
    'Music & Movies <Premium> "Family"'
]) {
    test(`renders a subscription name as literal text: ${name}`, () => {
        const htmlWrites = [];
        const nameElement = { textContent: '' };
        const buttons = [{ dataset: { action: 'edit' } }, { dataset: { action: 'delete' } }];
        const list = {
            children: [],
            addEventListener() {},
            set innerHTML(value) {
                htmlWrites.push(value);
                this.children = [];
            },
            appendChild(child) { this.children.push(child); }
        };
        const document = {
            getElementById(id) {
                return id === 'subscription-list' ? list : { addEventListener() {} };
            },
            createElement() {
                return {
                    set innerHTML(value) { htmlWrites.push(value); },
                    querySelector(selector) {
                        return selector === '.subscription-name' ? nameElement : { textContent: '' };
                    },
                    querySelectorAll(selector) {
                        assert.equal(selector, 'button[data-action]');
                        return buttons;
                    }
                };
            }
        };
        const id = 'id" onclick="alert(2)';
        const context = vm.createContext({
            document,
            // Leave initialization pending; render controlled API data below.
            fetch: () => new Promise(() => {}),
            fixture: { id, name, price: 12, years: 2 }
        });

        vm.runInContext(source, context);
        vm.runInContext(`
            subscriptions.push(fixture);
            state.isLoading = false;
            renderSubscriptions();
        `, context);

        assert.equal(list.children.length, 1);
        assert.equal(nameElement.textContent, name);
        assert.deepEqual(buttons.map((button) => button.dataset.id), [id, id]);
        for (const html of htmlWrites) {
            assert.ok(!html.includes(name), 'name must never reach the HTML parser');
            assert.ok(!html.includes(id), 'ID must never reach the HTML parser');
        }
    });
}
