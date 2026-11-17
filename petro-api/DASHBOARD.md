# Admin overview

Open My Account → Admin dashboard (`/admin`). Customers cannot access the page or `GET /api/admin/dashboard`.

The overview shows:

- Total orders, including cancellations.
- Active orders in placed, processing, or shipped status.
- Recorded payments: the sum of order totals marked paid, including delivery charges. This is not profit or a refund-adjusted revenue figure.
- Delivered COD awaiting collection: only delivered orders explicitly marked COD and unpaid. Unshipped orders and legacy missing payment methods are excluded.
- Visible/hidden product counts.
- Low-stock sizes: visible product variants with five or fewer remaining units, including zero stock.

The order query groups by status, payment status, and method in MongoDB and returns summary groups rather than all orders. Product quantities use the live Inventory overlay, including seed and admin-created products. The low-stock preview contains at most ten sizes ordered by remaining stock, product name, and size label. Hidden products are excluded from restocking alerts but included in the total/hidden product counts.

Each low-stock card links to the selected product in Manage products. The overview also links to order and product management. Refresh dashboard reloads the figures and timestamp. This is an all-time operational summary; it has no date-range reporting, accounting reconciliation, or automatic polling. Separate order and catalog queries are not a single transactional snapshot.

The endpoint is protected by authentication and the admin role. Responses contain aggregate counts and public product identifiers, not customer names, emails, addresses, or full orders. Admin page metadata is marked noindex in the client; API authorization remains the access control.

Four new tests cover amount/status calculations, legacy payment exclusion from COD due, hidden-product stock filtering, the ten-row preview, zero-data behaviour, and endpoint authorization. Persistence and aggregation execution are mocked. The complete verification run has 136 passing tests, lint, and build. Live database aggregation and responsive browser behaviour remain to be verified.
