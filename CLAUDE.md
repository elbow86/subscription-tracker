# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies
- `npm start` — run the Express server at `http://localhost:3000` (override with `PORT` env var)
- `npm run dev` — same, but restarts automatically when `server.js` changes (`node --watch`). Frontend files in `src/` are served from disk, so a browser refresh picks them up either way.

There is no build step, linter, or test suite; the `build` and `test` npm scripts are placeholders that only echo. The frontend must be served by `npm start` (not opened as a file) because it depends on the `/api` routes.

## Architecture

A single-page app with a vanilla-JS frontend and a small Express 5 backend, all in plain CommonJS/browser JS with no bundler or framework.

**Backend (`server.js`, single file):**
- Serves `src/` as static files, with a catch-all (`/{*path}`, Express 5 syntax) returning `src/index.html`.
- REST API at `/api/subscriptions`: `GET` (list, newest first), `POST`, `PUT /:id`, `DELETE /:id`.
- Persistence uses `nedb-promises`, an embedded file DB at `data/subscriptions.nedb`. The `data/` directory is created at startup and is gitignored. `timestampData` adds `createdAt`/`updatedAt`.
- Records are keyed by an app-level `id` field (UUID, with a unique index), **not** NeDB's `_id`. `toSubscriptionResponse` strips internal fields before responding.
- `parseSubscriptionInput` is the single validation point for POST and PUT. On PUT, the `id` comes from the URL param.

**Subscription data model:** `{ id, name, price, years }`. `price` is the annual cost and `years` is how long it has been owned. Lifetime cost is `price * years`, computed on the client.

**Frontend (`src/scripts/app.js`):**
- Loaded as a classic `<script>` (not a module) from `src/index.html`.
- Holds a module-level `subscriptions` array plus a `state` object (`isLoading`, `loadError`, `editingId`). Each API call updates that array in place, and `renderSubscriptions()` then re-renders the whole list and summary by writing `innerHTML`.
- List actions use event delegation on `#subscription-list`, dispatching on `data-action` (`edit`/`delete`) and `data-id`.
- On startup, `migrateLegacySubscriptions()` does a one-time import of the old `localStorage` data (key `subscription-tracker:subscriptions`) into the DB. It only runs when the DB is empty.

**Dead code to be aware of:** `src/scripts/subscription.js` and `src/scripts/utils.js` are ES modules that nothing loads. They use an older, incompatible schema (`cost`, `date`). The `lodash` dependency is also unused. Put new logic in `app.js` / `server.js` unless you are deliberately wiring those files in.
