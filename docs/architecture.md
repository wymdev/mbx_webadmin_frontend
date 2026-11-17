# Application architecture

## Data flow

```text
Feature screen → TanStack Query hook → repository interface → demo in-memory state
        ↓                ↓
  React Hook Form    mutation invalidation
        ↓
     Zod schema → Decimal calculations
```

Screens do not own duplicated server caches. Query keys group transactions, customers, rates, settings and trash. Successful mutations invalidate Query consumers so counts and related lists refresh together. A future HTTP repository should implement the same operation contracts and validate responses at the service boundary. Do not silently mix live records with fixtures.

The singleton demo repository lasts for the current browser document. New customers created through a transaction are added to the demo directory. Historical transactions preserve customer and method text; changing an administration label does not rewrite historical records. UI preferences are the only persisted state.

## Domain and financial rules

`transactionSchema` validates customer/phone, distinct currencies, positive decimal amount/rate, applicable identity and bounded notes. Passport requires passport/nationality; NRC requires NRC text. The identity parser is a template validation rule, not an official document verifier.

The operator explicitly chooses multiply or divide, following the legacy form. `Decimal` preserves fractional input and rounds the displayed result **half up to two decimal places**. Reports keep each source currency separate. The dashboard chart converts decimal totals to numbers for plotting only. Financial totals use decimal arithmetic. Profit, settlement balances and converted aggregate revenue are not inferred.

The template permits up to 15-digit positive amounts/rates and limits field lengths. Backend integration must define official currency scales, maximums, rounding, rate direction and customer identity rules, then enforce those server-side. Client calculations are previews.

CSV values are quoted/escaped and formula-leading values are prefixed to reduce spreadsheet formula injection. Exports contain fictional customer information.

## UI responsibilities

- shadcn/Radix: keyboard-aware dialogs, menus, tabs, selects, popovers and controls.
- Tailwind: theme variables, responsive layout and reusable utility styling.
- TanStack Table 9: table state, filtering, sorting, selection, visibility and pagination.
- TanStack Virtual: bounded virtual ledger; separate mode from pagination.
- Recharts: overview trends and distribution.
- Apache ECharts: optional rate-history view, imported lazily with resize/dispose lifecycle.
- Zustand: sidebar, theme, table density only.
- Axios: configured future HTTP boundary with timeout, cancellation preservation and normalized error type. It is intentionally not used by demo queries.

Sidebar navigation is configuration-driven. Pages are lazy-loaded. An error boundary handles render failures, and query states support loading/error/empty data. Reduced-motion preferences disable CSS animation, and dashboard SVG charts render without entrance animation.

## Integration and delivery

`VITE_API_BASE_URL` configures a future client only. There is no live-mode switch and no token storage. Use a separate integration environment to implement and test authenticated contracts before enabling production requests. Production static hosting must rewrite unknown frontend paths to `index.html`; otherwise direct links to nested routes will return 404.

The ECharts module is intentionally loaded only when opening history; it is the largest optional bundle. Keep chart imports scoped to the required renderer, series and components when extending it.
