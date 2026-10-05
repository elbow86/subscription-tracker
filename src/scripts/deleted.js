const deletedSubscriptions = [];

function formatMoney(amount, currency = 'UNK') {
    if (amount === null) return 'Unknown';
    const number = new Intl.NumberFormat('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    return `${['CAD', 'USD'].includes(currency) ? currency : 'Unconfirmed currency'} ${number}`;
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

const elements = {
    list: document.getElementById('deleted-list'),
    count: document.getElementById('deleted-count')
};

async function initialize() {
    try {
        await loadDeletedSubscriptions();
        renderDeletedSubscriptions();
    } catch (error) {
        console.error('Failed to load deleted subscriptions:', error);
        elements.list.innerHTML = `
            <div class="empty-state">
                <p>Error loading deleted subscriptions. Please try again later.</p>
            </div>
        `;
    }
}

async function loadDeletedSubscriptions() {
    const response = await fetch('/api/subscriptions/deleted');
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    const items = await response.json();
    deletedSubscriptions.splice(0, deletedSubscriptions.length, ...items);
}

function renderDeletedSubscriptions() {
    elements.list.innerHTML = '';

    if (deletedSubscriptions.length === 0) {
        elements.list.innerHTML = `
            <div class="empty-state">
                <p>No deleted subscriptions yet.</p>
            </div>
        `;
    } else {
        deletedSubscriptions.forEach((subscription) => {
            const item = document.createElement('article');
            item.className = 'subscription-item deleted-item';

            const lifetime = subscription.price === null || subscription.years === null
                ? null : subscription.price * subscription.years;

            item.innerHTML = `
                <div class="subscription-item-header">
                    <div class="subscription-name"></div>
                    <div class="deleted-date"></div>
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
            item.querySelector('.deleted-date').textContent = `Deleted: ${formatDate(subscription.deletedAt)}`;

            elements.list.appendChild(item);
        });
    }

    updateSummary();
}

function updateSummary() {
    const count = deletedSubscriptions.length;
    elements.count.textContent = `${count} deleted subscription${count === 1 ? '' : 's'}`;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}