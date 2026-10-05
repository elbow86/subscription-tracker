const subscriptions = [];
const LEGACY_STORAGE_KEY = 'subscription-tracker:subscriptions';

const state = {
    isLoading: true,
    loadError: false,
    editingId: null
};

function formatMoney(amount, currency = 'UNK') {
    if (amount === null) return 'Unknown';
    const number = new Intl.NumberFormat('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    return `${['CAD', 'USD'].includes(currency) ? currency : 'Unconfirmed currency'} ${number}`;
}

function costTotals(lifetime = false) {
    const totals = new Map();
    let unconfirmed = 0;
    for (const subscription of subscriptions) {
        if (subscription.price === null || (lifetime && subscription.years === null)) continue;
        const currency = subscription.currency ?? 'UNK';
        if (!['CAD', 'USD'].includes(currency)) {
            unconfirmed += 1;
            continue;
        }
        const total = totals.get(currency) ?? { amount: 0, plusTax: false };
        total.amount += subscription.price * (lifetime ? subscription.years : 1);
        total.plusTax ||= subscription.plusTax;
        totals.set(currency, total);
    }
    const lines = [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([currency, total]) =>
        `${formatMoney(total.amount, currency)}${total.plusTax ? ' + tax' : ''}`
    );
    if (unconfirmed) lines.push(`${unconfirmed} with unconfirmed currency excluded`);
    return lines.join('\n') || 'No known costs';
}

const elements = {
    form: document.getElementById('subscription-form'),
    formTitle: document.getElementById('form-title'),
    name: document.getElementById('subscription-name'),
    price: document.getElementById('subscription-price'),
    years: document.getElementById('subscription-years'),
    currency: document.getElementById('subscription-currency'),
    plusTax: document.getElementById('subscription-plus-tax'),
    notes: document.getElementById('subscription-notes'),
    submitButton: document.getElementById('form-submit-button'),
    cancelButton: document.getElementById('form-cancel-button'),
    list: document.getElementById('subscription-list'),
    count: document.getElementById('subscription-count'),
    summaryAnnual: document.getElementById('summary-annual'),
    summaryLifetime: document.getElementById('summary-lifetime'),
    summaryYears: document.getElementById('summary-years'),
    heroTotal: document.getElementById('hero-total')
};

elements.form.addEventListener('submit', (event) => {
    event.preventDefault();

    void handleSubmitSubscription();
});

elements.cancelButton.addEventListener('click', () => {
    resetForm();
});

elements.list.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
        return;
    }

    const id = target.dataset.id;
    if (!id) {
        return;
    }

    const action = target.dataset.action;
    if (action === 'edit') {
        beginEditing(id);
        return;
    }

    if (action === 'delete') {
        void handleDeleteSubscription(id, target);
    }
});

void initialize();

async function initialize() {
    renderSubscriptions();

    try {
        await loadSubscriptions();
        await migrateLegacySubscriptions();
        state.loadError = false;
    } catch (error) {
        state.loadError = true;
        console.warn('Failed to load subscriptions from the database', error);
    } finally {
        state.isLoading = false;
        renderSubscriptions();
    }
}

async function handleSubmitSubscription() {
    const name = elements.name.value.trim();
    const price = elements.price.value === '' ? null : Number(elements.price.value);
    const years = elements.years.value === '' ? null : Number(elements.years.value);
    const currency = elements.currency.value;
    const plusTax = elements.plusTax.checked;
    const notes = elements.notes.value;

    if (!name || (price !== null && (!Number.isFinite(price) || price < 0)) ||
        (years !== null && (!Number.isInteger(years) || years < 0))) {
        return;
    }

    try {
        if (state.editingId) {
            await updateSubscription(state.editingId, { name, price, years, currency, plusTax, notes });
        } else {
            await createSubscription({ name, price, years, currency, plusTax, notes });
        }
    } catch (error) {
        console.warn('Failed to save subscription to the database', error);
        return;
    }

    resetForm();
    renderSubscriptions();
}

function renderSubscriptions() {
    elements.list.innerHTML = '';

    if (state.isLoading) {
        elements.list.innerHTML = `
            <div class="empty-state">
                <p>Loading subscriptions from the database...</p>
            </div>
        `;
    } else if (state.loadError) {
        elements.list.innerHTML = `
            <div class="empty-state">
                <p>The local database is unavailable right now. Restart the app and try again.</p>
            </div>
        `;
    } else if (subscriptions.length === 0) {
        elements.list.innerHTML = `
            <div class="empty-state">
                <p>No subscriptions yet. Add your first one to get the summary.</p>
            </div>
        `;
    } else {
        subscriptions.forEach((subscription) => {
            const item = document.createElement('article');
            item.className = 'subscription-item';

            const lifetime = subscription.price === null || subscription.years === null
                ? null : subscription.price * subscription.years;

            item.innerHTML = `
                <div class="subscription-item-header">
                    <div class="subscription-name"></div>
                    <div class="subscription-item-actions">
                        <button class="edit-button" data-action="edit">Edit</button>
                        <button class="delete-button" data-action="delete">Remove</button>
                    </div>
                </div>
                <div class="subscription-metrics">
                    <div class="metric">Price/year: <strong class="annual-price"></strong></div>
                    <div class="metric">Years owned: <strong class="years-owned"></strong></div>
                    <div class="metric">Estimated lifetime cost: <strong class="lifetime-price"></strong></div>
                </div>
                <p class="subscription-notes"></p>
            `;

            item.querySelector('.subscription-name').textContent = subscription.name;
            const taxSuffix = subscription.plusTax && subscription.price !== null ? ' + tax' : '';
            item.querySelector('.annual-price').textContent = formatMoney(subscription.price, subscription.currency) + taxSuffix;
            item.querySelector('.years-owned').textContent = subscription.years ?? 'Unknown';
            item.querySelector('.lifetime-price').textContent = formatMoney(lifetime, subscription.currency) + (lifetime === null ? '' : taxSuffix);
            item.querySelector('.subscription-notes').textContent = subscription.notes ?? '';
            item.querySelectorAll('button[data-action]').forEach((button) => {
                button.dataset.id = subscription.id;
            });

            elements.list.appendChild(item);
        });
    }

    updateSummary();
}

function updateSummary() {
    const count = subscriptions.length;
    const knownYears = subscriptions.filter((subscription) => subscription.years !== null);
    const averageYears = knownYears.length === 0 ? 'Unknown'
        : Math.round(knownYears.reduce((sum, sub) => sum + sub.years, 0) / knownYears.length).toString();

    elements.count.textContent = `${count} tracked subscription${count === 1 ? '' : 's'}`;
    elements.summaryAnnual.textContent = costTotals();
    elements.summaryLifetime.textContent = costTotals(true);
    elements.summaryYears.textContent = averageYears;
    elements.heroTotal.textContent = costTotals(true);
}

async function loadSubscriptions() {
    const response = await fetch('/api/subscriptions');
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    const items = await response.json();
    subscriptions.splice(0, subscriptions.length, ...items);
}

async function createSubscription(subscription) {
    const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    const created = await response.json();
    subscriptions.push(created);
}

async function updateSubscription(id, subscription) {
    const response = await fetch(`/api/subscriptions/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    const updated = await response.json();
    const index = subscriptions.findIndex((item) => item.id === id);
    if (index >= 0) {
        subscriptions.splice(index, 1, updated);
    }
}

async function handleDeleteSubscription(id, button) {
    button.disabled = true;

    try {
        const response = await fetch(`/api/subscriptions/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });

        if (!response.ok && response.status !== 404) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const index = subscriptions.findIndex((subscription) => subscription.id === id);
        if (index >= 0) {
            subscriptions.splice(index, 1);
            if (state.editingId === id) {
                resetForm();
            }
            renderSubscriptions();
        }
    } catch (error) {
        button.disabled = false;
        console.warn('Failed to delete subscription from the database', error);
    }
}

async function migrateLegacySubscriptions() {
    if (subscriptions.length > 0) {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return;
    }

    const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!stored) {
        return;
    }

    let parsed;
    try {
        parsed = JSON.parse(stored);
    } catch (error) {
        console.warn('Failed to parse legacy localStorage subscriptions', error);
        return;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return;
    }

    for (const item of parsed) {
        if (!item || typeof item.name !== 'string') {
            continue;
        }

        const price = Number(item.price);
        const years = Number(item.years);

        if (Number.isNaN(price) || Number.isNaN(years)) {
            continue;
        }

        await createSubscription({
            id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
            name: item.name,
            price,
            years
        });
    }

    localStorage.removeItem(LEGACY_STORAGE_KEY);
}

function beginEditing(id) {
    const subscription = subscriptions.find((item) => item.id === id);
    if (!subscription) {
        return;
    }

    state.editingId = id;
    elements.formTitle.textContent = 'Edit subscription';
    elements.submitButton.textContent = 'Save changes';
    elements.cancelButton.hidden = false;
    elements.name.value = subscription.name;
    elements.price.value = subscription.price ?? '';
    elements.years.value = subscription.years ?? '';
    elements.currency.value = subscription.currency ?? 'UNK';
    elements.plusTax.checked = subscription.plusTax ?? false;
    elements.notes.value = subscription.notes ?? '';
    elements.name.focus();
}

function resetForm() {
    state.editingId = null;
    elements.form.reset();
    elements.formTitle.textContent = 'Add a subscription';
    elements.submitButton.textContent = 'Add subscription';
    elements.cancelButton.hidden = true;
    elements.name.focus();
}
