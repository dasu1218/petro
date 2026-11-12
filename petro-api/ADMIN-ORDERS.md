# Admin order management

Admins can open My Account → Manage orders (`/admin/orders`). The page links to the existing product management page and lists orders with a status filter, pagination, item details, delivery address, contact details, and payment information.

All `/api/admin/orders` routes require authentication and the admin role:

- `GET /`: lists 20 orders per page, newest first. Accepts `page` and optional `status`. Returns `orders`, `page`, and `hasMore`.
- `PUT /:id/status`: accepts `{ "status": "processing" }`, or the next allowed status. Fulfilment follows placed → processing → shipped → delivered. Skipping, reversing, and editing terminal statuses are rejected. A conditional update rejects stale writes. Each successful change records the admin and timestamp in statusHistory.
- `PUT /:id/payment`: accepts `{ "paymentStatus": "paid" }` only for a delivered, unpaid COD order. The UI asks the admin to confirm receipt of the full order total. The server sets paidAt and paidBy; request-supplied audit values are ignored. Repeated or conflicting collection updates return 409.

This feature records cash already collected; it does not transfer money. Legacy orders without a recorded COD method cannot be marked paid through this action. Existing customer order pages show the updated fulfilment and payment information when loaded again.

Cancellation of unpaid placed/processing orders with transactional stock restoration is now supported. Returns, refunds, partial collections, and reversal of collected payments are not implemented. Delivered and cancelled statuses are terminal in this workflow. Fulfilment updates do not decrement stock again; reservation occurred at order placement.

Verification: 45 API/service tests and 18 frontend tests pass, plus production build and lint. Admin-route tests mock database calls and cover access control, filtering, allowed transitions, audit values, and collection restrictions. Live MongoDB concurrent updates and browser interactions still require verification.


## Cancel before shipment

In Manage orders, select Cancel order for an unpaid placed/processing order, enter a customer-visible reason, and confirm. `POST /api/admin/orders/:id/cancel` requires admin access and `{ "reason": "..." }` with 1–200 nonblank characters. Customers cannot call this endpoint.

Cancellation marks the order cancelled and restores all reserved components in one MongoDB transaction. Restoration uses the saved order snapshot, including shared components across individual products and bundles; it does not use today's product or bundle definitions. Stock changes and the status update roll back together if anything fails. Audit fields record reason, admin, time, restoration completion, and a status-history event. No automatic refund is attempted because paid and shipped orders cannot be cancelled through this workflow.

Exact repeated cancellation calls return the existing cancellation without restoring stock twice or replacing its reason. Older cancelled orders without a recorded restoration are rejected for manual investigation. Missing component snapshots or inventory rows also block automatic restoration instead of guessing quantities. Hidden product inventory can still be restored because the ledger is independent of public catalog visibility.

Customer order details display the cancellation and reason. Cancellation is final in this workflow; returning it to processing is not supported. A customer must place a new order if needed. Concurrent shipment/cancellation operations require the same transaction conflict handling as other inventory operations.

Verification: 115 tests, lint, and build pass. New tests cover component aggregation, repeat requests, shipped/paid restrictions, rollback, missing records, stale status changes, customer access restrictions, and frontend button eligibility. Real replica-set transaction concurrency and browser confirmation flows still require verification.
