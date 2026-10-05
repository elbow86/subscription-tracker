# Changelog

Notable changes to Subscription Tracker are recorded here, newest first. Add changes under **Unreleased** as work is completed; move them into a dated version section when a release is published.

## Unreleased

### Security

- Prevent stored HTML injection in subscription names by rendering them with `textContent`.
- Assign subscription IDs through button `dataset` properties instead of interpolating them into HTML attributes.
- Render subscription metrics and billing notes as text.

### Added

- Currency selection for CAD, USD, and unconfirmed currencies.
- Editable billing notes and an additional-tax qualifier, persisted through the API.
- Unknown prices and ownership durations, represented by blank form fields rather than zero.
- Regression tests for HTML injection, currency totals, unknown values, editing, and API validation. Run with `npm test` or `node --test`.

### Changed

- Show CAD and USD totals separately without currency conversion. Exclude unconfirmed currencies and unknown values from the corresponding totals.
- Label lifetime costs as estimates at current prices rather than historical spending.
- Count tracked subscriptions without implying that every subscription is confirmed active.
- Reconciled local subscription records against the subscription inventory: corrected known prices, added missing plans, and separated account and plan entries. Retained existing ownership durations and marked unverified details explicitly.

Local subscription records, reconciliation evidence, and pre-update backups remain in the gitignored `data/` directory; personal billing details are not included in this changelog.
