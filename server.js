const express = require('express');
const Datastore = require('nedb-promises');
const fs = require('fs');
const path = require('path');

const app = express();
const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const dataDirectory = path.join(__dirname, 'data');
const databasePath = path.join(dataDirectory, 'subscriptions.nedb');
const deletedDatabasePath = path.join(dataDirectory, 'deleted-subscriptions.nedb');

fs.mkdirSync(dataDirectory, { recursive: true });

const db = Datastore.create({
    filename: databasePath,
    autoload: true,
    timestampData: true
});

const deletedDb = Datastore.create({
    filename: deletedDatabasePath,
    autoload: true,
    timestampData: true
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'src')));

app.get('/api/subscriptions', async (_request, response) => {
    const rows = await db.find({}).sort({ createdAt: -1, _id: -1 });

    response.json(rows.map(toSubscriptionResponse));
});

app.get('/api/subscriptions/costs', async (_request, response) => {
    const rows = await db.find({}).sort({ price: -1, _id: -1 });
    response.json(rows.map(toSubscriptionResponse));
});

app.post('/api/subscriptions', async (request, response) => {
    const validation = parseSubscriptionInput(request.body);
    if (validation.error) {
        response.status(400).json({ error: validation.error });
        return;
    }

    const subscription = {
        id: validation.value.id,
        name: validation.value.name,
        price: validation.value.price,
        years: validation.value.years,
        currency: validation.value.currency,
        plusTax: validation.value.plusTax,
        notes: validation.value.notes
    };

    try {
        await db.insert(subscription);
    } catch (error) {
        if (error.errorType === 'uniqueViolated') {
            response.status(409).json({ error: 'A subscription with that id already exists.' });
            return;
        }

        console.error('Failed to insert subscription', error);
        response.status(500).json({ error: 'Failed to save subscription.' });
        return;
    }

    response.status(201).json(subscription);
});

app.put('/api/subscriptions/:id', async (request, response) => {
    const validation = parseSubscriptionInput({
        ...request.body,
        id: request.params.id
    });

    if (validation.error) {
        response.status(400).json({ error: validation.error });
        return;
    }

    const subscription = {
        id: validation.value.id,
        name: validation.value.name,
        price: validation.value.price,
        years: validation.value.years,
        currency: validation.value.currency,
        plusTax: validation.value.plusTax,
        notes: validation.value.notes
    };

    const updatedCount = await db.update(
        { id: request.params.id },
        { $set: subscription },
        {}
    );

    if (updatedCount === 0) {
        response.status(404).json({ error: 'Subscription not found.' });
        return;
    }

    response.json(subscription);
});

app.delete('/api/subscriptions/:id', async (request, response) => {
    const subscription = await db.findOne({ id: request.params.id });
    
    if (!subscription) {
        response.status(404).json({ error: 'Subscription not found.' });
        return;
    }

    const deletedCount = await db.remove({ id: request.params.id }, {});
    
    if (deletedCount === 0) {
        response.status(404).json({ error: 'Subscription not found.' });
        return;
    }

    // Store the deleted subscription
    const deletedSubscription = {
        ...subscription,
        deletedAt: new Date()
    };
    
    try {
        await deletedDb.insert(deletedSubscription);
    } catch (error) {
        console.error('Failed to store deleted subscription', error);
    }

    response.status(204).send();
});

app.get('/api/subscriptions/deleted', async (_request, response) => {
    const rows = await deletedDb.find({}).sort({ deletedAt: -1, _id: -1 });
    response.json(rows.map(toSubscriptionResponse));
});

app.get(['/', '/index.html'], (_request, response) => {
    response.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.get('/chart.html', (_request, response) => {
    response.sendFile(path.join(__dirname, 'src', 'chart.html'));
});

app.get('/deleted.html', (_request, response) => {
    response.sendFile(path.join(__dirname, 'src', 'deleted.html'));
});

app.get('/{*path}', (_request, response) => {
    response.sendFile(path.join(__dirname, 'src', 'index.html'));
});

void startServer();

async function startServer() {
    await db.ensureIndex({ fieldName: 'id', unique: true });
    await deletedDb.ensureIndex({ fieldName: 'id', unique: true });

    app.listen(port, () => {
        console.log(`Subscription Tracker listening on http://localhost:${port}`);
    });
}

function toSubscriptionResponse(document) {
    const response = {
        id: document.id,
        name: document.name,
        price: document.price,
        years: document.years,
        currency: document.currency ?? 'UNK',
        plusTax: document.plusTax ?? false,
        notes: document.notes ?? ''
    };
    
    // Include deletedAt if it exists (for deleted subscriptions)
    if (document.deletedAt) {
        response.deletedAt = document.deletedAt;
    }
    
    return response;
}

function parseSubscriptionInput(payload) {
    const { id, name, price, years, currency = 'UNK', plusTax = false, notes = '' } = payload ?? {};

    if (typeof name !== 'string' || name.trim() === '') {
        return { error: 'Name is required.' };
    }

    const parsedPrice = price === null ? null : Number(price);
    if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
        return { error: 'Price must be a non-negative number.' };
    }

    const parsedYears = years === null ? null : Number(years);
    if (parsedYears !== null && (!Number.isInteger(parsedYears) || parsedYears < 0)) {
        return { error: 'Years must be a non-negative integer.' };
    }

    if (!['CAD', 'USD', 'UNK'].includes(currency) || typeof plusTax !== 'boolean' || typeof notes !== 'string') {
        return { error: 'Invalid currency, tax qualifier, or notes.' };
    }

    return {
        value: {
            id: typeof id === 'string' && id.trim() !== '' ? id : crypto.randomUUID(),
            name: name.trim(),
            price: parsedPrice,
            years: parsedYears,
            currency,
            plusTax,
            notes: notes.trim()
        }
    };
}
