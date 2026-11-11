# Admin order management

Admins can open My Account → Manage orders (`/admin/orders`). The page links to the existing product management page and lists orders with a status filter, pagination, item details, delivery address, contact details, and payment information.

All `/api/admin/orders` routes require authentication and the admin role:

- `GET /`: lists 20 orders per page, newest first. Accepts `page` and optional `status`. Returns `orders`, `page`, and `hasMore`.
- `PUT /:id/status`: accepts `{ "status": "processing" }`, or the next allowed status. Fulfilment follows placed → processing → shipped → delivered. Skipping, reversing, and editing terminal statuses are rejected. A conditional update rejects stale writes. Each successful change records the admin and timestamp in statusHistory.
- `PUT /:id/payment`: accepts `{ "paymentStatus": "paid" }` only for a delivered, unpaid COD order. The UI asks the admin to confirm receipt of the full order total. The server sets paidAt and paidBy; request-supplied audit values are ignored. Repeated or conflicting collection updates return 409.

This feature records cash already collected; it does not transfer money. Legacy orders without a recorded COD method cannot be marked paid through this action. Existing customer order pages show the updated fulfilment and payment information when loaded again.

Cancellation, returns, refunds, partial collections, reversal of collected payments, and stock restoration are not implemented. Delivered and cancelled statuses are terminal in this workflow. Fulfilment updates do not decrement stock again; reservation occurred at order placement.

Verification: 45 API/service tests and 18 frontend tests pass, plus production build and lint. Admin-route tests mock database calls and cover access control, filtering, allowed transitions, audit values, and collection restrictions. Live MongoDB concurrent updates and browser interactions still require verification.
