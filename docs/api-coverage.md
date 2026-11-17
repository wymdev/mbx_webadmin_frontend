# Existing backend coverage and integration boundary

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
