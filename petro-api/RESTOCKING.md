# Admin restocking

Open My Account → Manage products, choose a product, and scroll to Stock management. The panel shows live remaining stock per size. Add the number of newly received units and a short note. It records an addition immediately; Save product is not required for stock changes.

Both seed products and admin-created products are supported. Adding stock refreshes the storefront catalog, cart stock limits, and derived bundle availability. Existing orders are unchanged.

## API

All `/api/admin/inventory` routes require authentication and the admin role.

- `GET /:slug`: current size quantities and the most recent 20 stock additions.
- `POST /:slug`: `{ "variantLabel": "250ml", "quantity": 10, "reason": "Supplier delivery", "requestId": "unique-request-id" }`.

Quantities must be positive integers up to 1,000,000; reasons contain 1–200 characters. The result cannot exceed 1,000,000,000 available units. The server owns audit fields and does not accept an absolute replacement stock total.

The first stock operation initializes Inventory from the product variant if necessary. A MongoDB transaction increments the authoritative remaining quantity and inserts a Restock audit document together. Failure rolls back both. Incrementing rather than replacing stock avoids overwriting concurrent order reservations. Transactions require a replica-set deployment, as order placement already does.

The unique user/request-ID index and payload hash make exact retries return the original result without adding stock again. The same ID with changed details is rejected. The history's stockAfter is a historical value, not necessarily the current available quantity. Audit records retain the admin reference, note, product, variant, added quantity, resulting stock, and creation time.

On an uncertain response, the mounted form retains the original request for retry and locks its fields. Retry state is memory-only; before leaving or refreshing, check recent additions to avoid accidentally submitting a new request for the same delivery.

This feature adds stock. Stock deductions, corrections, returns, and undo actions are not implemented.

## Verification

Seven new tests cover validation, initialization, additions to remaining stock after orders, replay protection, changed payloads, rollback, stock limits, unknown sizes, and admin-only access. Database calls and transaction rollback are mocked. The complete suite has 99 passing tests; lint and build pass. Verify real transaction concurrency, persistence, and browser interactions before release.
