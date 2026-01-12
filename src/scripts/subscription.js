const subscriptions = [];

export function addSubscription(name, cost, date) {
    const subscription = { name, cost, date };
    subscriptions.push(subscription);
    return subscription;
}

export function removeSubscription(name) {
    const index = subscriptions.findIndex(sub => sub.name === name);
    if (index !== -1) {
        return subscriptions.splice(index, 1)[0];
    }
    return null;
}

export function listSubscriptions() {
    return subscriptions;
}