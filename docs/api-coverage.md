# Existing backend coverage and integration boundary

## Live Laravel v1 workspace

The live sidebar includes **Management → Receipt settings** (`/settings/slips`) for logo, text color, and creating, editing, activating, or deleting slip backgrounds. The saved appearance also renders on printed receipts. Transfer methods and customer sources have paginated create, edit, and delete screens. **Trash → Staff accounts** supports restore for staff managers. **Audit log** is visible to staff with audit access.

The customer directory supports activity counts, contact editing, and deletion without removing transactions. Rates support create, edit, delete, display ordering, and a history table. Team members supports create, edit, delete, password reset, and assigning an eligible role. Reports support Bangkok date ranges for both summary and export.

Remaining parity work: full customer identity editing and activity breakdown, rate history charts, multi-role editing, report filters beyond the date range and detail drill-down, full dashboard charts, transaction customer lookup/contact edits, and browser preferences in live mode. Public registration and HTTP storage-link setup were intentionally removed from Laravel.

From the workspace root, run `php .\mbx_web_backend\artisan serve --host=127.0.0.1 --port=8000` and, in another terminal, `npm --prefix mbx_web_frontend run dev:live`. Open `http://localhost:3000` with an existing staff account. Vite forwards `/api` and `/sanctum` to Laravel. The local Sanctum stateful origins must include `localhost:3000`. Do not put staff credentials in frontend environment variables.

The live workspace uses the existing admin shell and Laravel data, without demo fixtures. It has staff sign-in and sign-out, dashboard counts, transaction listing and creation, invoice editing and printing, transaction trash and restore, and profile updates and password changes.

Use `npm --prefix mbx_web_frontend run build:live` for the live build. In production, route `/api` and `/sanctum` to Laravel over HTTPS and use the admin hostname in the Sanctum stateful configuration. The Vite development proxy is not included in the build. The plain `dev` and `build` commands still use the demo workspace.

## Historical Laravel 8 assessment

Read from `../mbx_web_backend/routes/api.php`, web routes and controllers. No production requests were made.

| Frontend operation        | Existing API / web surface                                                         | Integration work                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Login                     | `POST /api/login`                                                                  | Returns a token including `Bearer ` prefix. Normalize exactly once; agree browser auth strategy.       |
| Dashboard                 | `GET /api/getDashboardData`, `POST /api/filterDashboardData`                       | Envelope exposes counts and rates; chart series and currency-specific totals need contracts.           |
| Transaction list          | `GET /api/transaction/index`, `POST /api/transaction/filter`                       | Review fields, response shapes, pagination and authorization.                                          |
| Create/update             | `POST /api/transaction/create`, `POST /api/transaction/update/{id}`                | Map form keys and make backend calculation/validation authoritative.                                   |
| Edit details              | `GET /api/transaction/edit/{id}`                                                   | Validate response schema and permissions.                                                              |
| Transaction trash         | `GET /api/transaction/trash`                                                       | Inspect ownership and restore semantics. No restore API was identified in the reviewed API route file. |
| Legacy deletion           | `GET /api/transaction/destroy/{id}`                                                | Replace with a CSRF/auth-protected mutation contract. Do not trigger destructive GET through a query.  |
| Customer lookup           | `GET /api/get_customer_name`, `POST /api/get_customer_data_by_id`                  | Map lookup/query fields; full admin directory coverage needs confirmation.                             |
| Transfer methods          | `GET /api/getTransferMethod`                                                       | Admin CRUD currently uses web routes; add JSON contracts.                                              |
| Rate history              | `GET /api/rate_history_by_rate/{id}`                                               | Response is grouped by date; adapt chart format. Rate write operations need admin JSON endpoints.      |
| Profile                   | `GET /api/getProfile`, `POST /api/updateProfile`                                   | Implement secure authenticated adapter and response validation.                                        |
| Password                  | `POST /api/changePassword`                                                         | Integrate validation, authorization and secure session behavior.                                       |
| Customer source           | `GET /api/get_customer_source`                                                     | Admin CRUD currently uses web routes.                                                                  |
| Slip metadata             | `GET /api/getActiveSlipImage`, `GET /api/get_font_color`, `GET /api/get_slip_logo` | Admin upload/editor contracts are separate work.                                                       |
| Users/admin/report/export | Primarily Blade web routes                                                         | Define JSON CRUD, permissions, report filtering and export contracts.                                  |

Existing middleware uses Sanctum. The current frontend is a demo administrator view; it does not authenticate or enforce production permissions. Real authorization must be checked by the server on every operation. Establish HTTPS, cookie/CSRF or bearer-token handling, CORS, session expiry and logout contracts during backend integration; do not persist bearer tokens in localStorage.

The backend currently declares Laravel 8 and PHP 7.3/8 compatibility. Its upgrade/security assessment belongs to backend work and is not covered by the frontend npm audit.
