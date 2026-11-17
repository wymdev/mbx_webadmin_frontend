# Verification — 17 November 2026

The delivered application remains React + Vite, as confirmed by the user. No Next.js migration was performed.

## Checks

- Production build and TypeScript: passed.
- ESLint: passed without warnings.
- Unit tests: 11 passed across three files, including fractional/large-value exchange arithmetic, conditional identity validation, decimal formatting/sorting, record recovery and rate ordering.
- Production browser workflows: 6 passed with an isolated Chrome profile. Coverage includes deferred ECharts loading, actual HTML drag/drop, keyboard/button ordering, filtered reorder guards, search/export, pagination, virtualization, theme, command search, administration options, transaction receipt/recovery and mobile screens.
- Development browser workflow: passed, including opening ECharts history with the explicit dependency-optimizer configuration.
- Full and production-only npm audits: zero known vulnerabilities; JSON reports are saved at the project root.

## Startup observations

Measured on this Windows workspace; these are observations, not performance guarantees:

- Production overview ready in fresh browser contexts: approximately 1.5–3.6 seconds.
- Separate first-run development dependency cache: server ready in 14.6 seconds, overview ready 7.6 seconds after browser navigation.
- Reused development dependency cache: server ready in 1.4 seconds, overview ready 6.5 seconds after browser navigation.

Development still performs dependency optimization and module transforms. Use the production preview to assess the deployment experience. `node scripts/check-startup.mjs` measures startup in a separate cache without resetting the normal development cache.

The initial custom chunk grouping incorrectly preloaded ECharts from the entry HTML. Automatic splitting now keeps rate-history code off the initial request path, verified in the browser. Per-icon imports, cached date formatters, explicit dependency optimization and a route-level loading boundary reduce startup work and keep navigation visible while pages load.

One production navigation was aborted while simultaneous browser/startup checks were running. The complete production suite subsequently passed in a standalone run. No production backend was contacted or changed.

## Template limits

Records are fictional and session-local. Preferences persist locally. Authentication, server authorization, real password changes, production receipt-template editing and live API integration remain separate work. Receipt settings currently demonstrate editable template metadata.
