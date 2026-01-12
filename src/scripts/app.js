const STORAGE_KEY = 'subscription-tracker:subscriptions';
const subscriptions = [];

const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD'
});

const elements = {
    form: document.getElementById('subscription-form'),
    name: document.getElementById('subscription-name'),
    price: document.getElementById('subscription-price'),
    years: document.getElementById('subscription-years'),
    list: document.getElementById('subscription-list'),
    count: document.getElementById('subscription-count'),
    summaryAnnual: document.getElementById('summary-annual'),
    summaryLifetime: document.getElementById('summary-lifetime'),
    summaryYears: document.getElementById('summary-years'),
    heroTotal: document.getElementById('hero-total')
};

elements.form.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = elements.name.value.trim();
    const price = Number.parseFloat(elements.price.value);
    const years = Number.parseInt(elements.years.value, 10);

    if (!name || Number.isNaN(price) || Number.isNaN(years)) {
        return;
    }

    subscriptions.push({
        id: crypto.randomUUID(),
        name,
        price,
        years
    });

    elements.form.reset();
    elements.name.focus();
    renderSubscriptions();
    saveSubscriptions();
});

function renderSubscriptions() {
    elements.list.innerHTML = '';

    if (subscriptions.length === 0) {
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
                    <button class="delete-button" data-id="${subscription.id}">Remove</button>
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

elements.list.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
        return;
    }

    const id = target.dataset.id;
    const index = subscriptions.findIndex((subscription) => subscription.id === id);
    if (index >= 0) {
        subscriptions.splice(index, 1);
        renderSubscriptions();
        saveSubscriptions();
    }
});

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

loadSubscriptions();
renderSubscriptions();

function loadSubscriptions() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        return;
    }

    try {
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) {
            return;
        }

        parsed.forEach((item) => {
            if (!item || typeof item.name !== 'string') {
                return;
            }

            const price = Number(item.price);
            const years = Number(item.years);

            if (Number.isNaN(price) || Number.isNaN(years)) {
                return;
            }

            subscriptions.push({
                id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
                name: item.name,
                price,
                years
            });
        });
    } catch (error) {
        console.warn('Failed to load subscriptions from localStorage', error);
    }
}

function saveSubscriptions() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
    } catch (error) {
        console.warn('Failed to save subscriptions to localStorage', error);
    }
}
