const subscriptions = [];
const LEGACY_STORAGE_KEY = 'subscription-tracker:subscriptions';

const state = {
    isLoading: true,
    loadError: false,
    editingId: null
};

const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD'
});

const elements = {
    form: document.getElementById('subscription-form'),
    formTitle: document.getElementById('form-title'),
    name: document.getElementById('subscription-name'),
    price: document.getElementById('subscription-price'),
    years: document.getElementById('subscription-years'),
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
    const price = Number.parseFloat(elements.price.value);
    const years = Number.parseInt(elements.years.value, 10);

    if (!name || Number.isNaN(price) || Number.isNaN(years)) {
        return;
    }

    try {
        if (state.editingId) {
            await updateSubscription(state.editingId, { name, price, years });
        } else {
            await createSubscription({ name, price, years });
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

            const lifetime = subscription.price * subscription.years;

            item.innerHTML = `
                <div class="subscription-item-header">
                    <div class="subscription-name">${subscription.name}</div>
                    <div class="subscription-item-actions">
                        <button class="edit-button" data-action="edit" data-id="${subscription.id}">Edit</button>
                        <button class="delete-button" data-action="delete" data-id="${subscription.id}">Remove</button>
                    </div>
                </div>
                <div class="subscription-metrics">
                    <div class="metric">Price/year: <strong>${formatter.format(subscription.price)}</strong></div>
                    <div class="metric">Years owned: <strong>${subscription.years}</strong></div>
                    <div class="metric">Lifetime cost: <strong>${formatter.format(lifetime)}</strong></div>
                </div>
            `;

            elements.list.appendChild(item);
        });
    }

    updateSummary();
}

function updateSummary() {
    const count = subscriptions.length;
    const totalAnnual = subscriptions.reduce((sum, subscription) => sum + subscription.price, 0);
    const totalLifetime = subscriptions.reduce(
        (sum, subscription) => sum + subscription.price * subscription.years,
        0
    );
    const averageYears = count === 0
        ? 0
        : Math.round(subscriptions.reduce((sum, sub) => sum + sub.years, 0) / count);

    elements.count.textContent = `${count} active subscription${count === 1 ? '' : 's'}`;
    elements.summaryAnnual.textContent = formatter.format(totalAnnual);
    elements.summaryLifetime.textContent = formatter.format(totalLifetime);
    elements.summaryYears.textContent = averageYears.toString();
    elements.heroTotal.textContent = formatter.format(totalLifetime);
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
    elements.price.value = subscription.price.toString();
    elements.years.value = subscription.years.toString();
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
