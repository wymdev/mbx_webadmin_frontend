# MBX Ledger — Web Frontend

Independent, interactive MBX admin template built with React, TypeScript, Vite and shadcn/ui. Forest-green/gold branding, medium-rounded surfaces, readable compact tables, responsive navigation and dark mode.

## Run locally

Use Node **22.12+** (tested on Node 24.12) and npm.

```powershell
cd mbx_web_frontend
npm ci
npm run dev
```

Open **http://127.0.0.1:5174**. `npm run build` creates `dist/`; `npm run preview` serves the build locally.

This is **demo mode**, with 840 fictional transactions and 24 fictional customers. All record changes live in memory and reset when the page reloads. Theme, density and sidebar preferences are saved locally. No production API requests are made. The existing backend, mobile app and customer site are separate and unchanged.

## Screens

- Overview with date/currency filtering, Recharts trends and transfer-method distribution.
- Transaction ledger with search, filters, numeric sorting, selection, column controls, pagination and TanStack Virtual mode.
- Customer lookup, conditional passport/NRC validation, decimal-safe exchange calculation, edit and receipt preview/print.
- Reports with date/type/method/customer filtering, currency-separated totals and CSV export.
- Exchange-rate editing, draggable display order (with keyboard and move-button alternatives), and lazy-loaded Apache ECharts history.
- Customer directory and details.
- Team, transfer-method, customer-source and receipt-template metadata forms.
- Profile and password-validation examples; no real credentials are changed.
- Preferences and transaction/user trash with confirmed restore.
- Command search (`Ctrl+K` / `⌘K`), workspace/account dropdowns, notifications and mobile drawer.

## Checks

```powershell
npm test
npm run lint
npm run typecheck
npm run build
npm audit
npm audit --omit=dev
npm run test:e2e
```

Browser tests use Playwright with installed Chrome on this Windows workspace. Set `PLAYWRIGHT_CHROME_EXECUTABLE` to another Chrome/Chromium executable, or install a Playwright Chromium browser and adapt the config to your environment. No personal browser profile is used.

Exact package versions are pinned in `package.json` and `package-lock.json`. TypeScript 6.0.3 is selected because the current typescript-eslint release supports TypeScript below 6.1; the latest TypeScript 7 release exceeds that range. Dependency audit reports are in `audit-full.json` and `audit-production.json`. Audit results reflect known advisories at verification time, not a guarantee against future issues.

## Architecture

```text
src/
  app/                 routing, providers, error boundary, shell, navigation
  components/
    ui/                shadcn registry components, locally owned
    data-table.tsx     shared TanStack Table 9 + virtual ledger
    form-field.tsx     accessible field and select composition
  domain/              Zod domain schema, decimal calculations, types
  features/
    account/           profile and password form examples
    customers/         directory and details
    dashboard/         Recharts overview
    rates/             rate editing and lazy ECharts chart
    reports/           filters, totals and safe CSV export
    settings/          demo administration and preferences
    transactions/      ledger, form, receipt and table columns
    trash/             recovery screens
  services/            fixtures, session-local repository, queries, Axios boundary
  stores/              persisted Zustand UI preferences
  lib/                 formatting and class composition
e2e/                   browser workflow tests
docs/                  architecture and API integration coverage
```

See [architecture](docs/architecture.md) and [backend endpoint coverage](docs/api-coverage.md) before integrating a real service.

## Design and component sources

Design follows shadcn admin conventions with custom MBX tokens. No AdminLTE assets or runtime are used. Components in `src/components/ui` were fetched from the official [shadcn new-york-v4 registry](https://ui.shadcn.com/), with import paths normalized for this application. The shadcn CLI can extend the component collection using `components.json`.

Receipt settings are sample template metadata; a production receipt-template/image editor is not included. Account provisioning, authentication, authorization, real password updates, backend optimization and deployment are separate integration work.

## Loading behavior

Production chunks are split automatically at route and chart boundaries. ECharts is loaded only when opening rate history. Icons use official per-icon exports to avoid pulling the entire icon catalog into development requests. Date formatters are reused, and the shell remains visible while a page loads.

Vite compiles development dependencies on the first start after installation or a lockfile change. Use `npm run build` followed by `npm run preview` to assess the production experience. Rate display order is shared with the dashboard and remains local to the demo session.
