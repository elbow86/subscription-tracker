const subscriptions = [];

function formatMoney(amount, currency = 'UNK') {
    if (amount === null) return 'Unknown';
    const number = new Intl.NumberFormat('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    return `${['CAD', 'USD'].includes(currency) ? currency : 'Unconfirmed currency'} ${number}`;
}

async function initialize() {
    try {
        await loadSubscriptions();
        renderChart();
    } catch (error) {
        console.error('Failed to load subscriptions:', error);
        document.getElementById('total-count').textContent = 'Error loading data';
    }
}

async function loadSubscriptions() {
    const response = await fetch('/api/subscriptions/costs');
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    const items = await response.json();
    subscriptions.splice(0, subscriptions.length, ...items);
}

function renderChart() {
    const ctx = document.getElementById('costChart').getContext('2d');
    
    // Filter subscriptions with known prices
    const subscriptionsWithPrice = subscriptions.filter(sub => sub.price !== null);
    
    const labels = subscriptionsWithPrice.map(sub => sub.name);
    const data = subscriptionsWithPrice.map(sub => sub.price);
    const currencies = subscriptionsWithPrice.map(sub => sub.currency ?? 'UNK');
    
    // Update summary info
    document.getElementById('total-count').textContent = subscriptions.length;
    
    if (subscriptionsWithPrice.length > 0) {
        const highest = Math.max(...data);
        const lowest = Math.min(...data);
        document.getElementById('highest-cost').textContent = formatMoney(highest, currencies[data.indexOf(highest)]);
        document.getElementById('lowest-cost').textContent = formatMoney(lowest, currencies[data.indexOf(lowest)]);
    }
    
    // Destroy existing chart if it exists
    if (window.subscriptionChart) {
        window.subscriptionChart.destroy();
    }
    
    window.subscriptionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Annual Cost',
                data: data,
                backgroundColor: 'rgba(242, 106, 46, 0.8)',
                borderColor: 'rgba(242, 106, 46, 1)',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const subscription = subscriptionsWithPrice[context.dataIndex];
                            return `Cost: ${formatMoney(subscription.price, subscription.currency)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Annual Cost (sorted highest to lowest)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Subscription Name'
                    }
                }
            }
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}