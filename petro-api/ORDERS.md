# Orders

- `POST /api/orders` creates an order for the authenticated user.
- `GET /api/orders/my` returns a paginated list of that user's orders.
- `GET /api/orders/:id` returns an order only to its owner. Other owners and invalid IDs receive 404.

The create payload contains `requestId`, `items` (`slug`, `variantLabel`, `quantity`), `shippingAddress`, `deliveryMethod`, `paymentMethod: "cod"`, and `expectedTotal`. The API ignores supplied ownership and item prices. It validates address/contact details, resolves canonical prices, calculates delivery, and rejects changed totals with 409 so the customer can review again. Initial rates remain standard LKR 350, free from LKR 4,500, or express LKR 650. Confirm these store rates before release.

## Transactions and inventory

Order placement requires MongoDB Atlas or another deployment supporting multi-document transactions. There is intentionally no non-transactional fallback. Startup creates the unique Inventory key and Order user/request-ID indexes before accepting requests.

Inventory records store remaining stock by `slug:variantLabel`. A missing record starts from the product seed catalog on its first reservation. Product prices and initial stock still come from `seed-data.json`; Bundle definitions use MongoDB with the existing curated fallback. Cart loading and bundle listing overlay remaining Inventory stock. The static frontend product catalog may display older stock; the order API always checks the final available quantity.

ProductSettings now overrides product photos and base prices and applies active scheduled promotions. The storefront uses the live catalog and periodically refreshes it. Order placement uses these same effective prices; saved orders retain their original price snapshots. See `ADMIN-PRODUCTS.md`.

Each order expands bundle quantities into their product components, combines demand across all individual and bundle lines, and rejects shortages. Within one transaction, conditional stock updates decrement each component and an immutable order snapshot is inserted. A failure aborts both operations. Order cancellation and restocking are not implemented; do not adjust status manually expecting inventory to be restored. Existing development seed commands do not reset Inventory or Orders.

## Retry behavior

The unique `(user, requestId)` index prevents repeated requests with the same ID from creating another order. A hash binds that ID to the original normalized payload. Exact retries return the saved order without another stock decrement; changing details with the same ID returns 409. Request IDs and hashes are omitted from public order responses.

Checkout locks cart edits during submission, clears the cart only after the API acknowledges a saved order, and loads the confirmation from the owner-protected endpoint. On an uncertain network/server response, the same mounted checkout retains the original payload and ID for retry. That retry state is memory-only: after leaving or refreshing the page, check My Orders before submitting again. New request IDs represent new orders.

New orders require Cash on Delivery (`paymentMethod: "cod"`) and start with status `placed` and payment status `unpaid`. Client-supplied payment confirmations, amounts paid, or paid timestamps are ignored. Confirmation and history show the payment method; unpaid COD confirmations show the full order total due on delivery. Checkout collects no online payment and adds no COD surcharge. Unsupported methods are rejected before inventory is reserved.

Existing orders with no payment method retain that historical value and display "Payment method not recorded". Exact retries of those saved orders still use their original request hash. A missing method cannot create a new order, and a retry cannot change a saved order's method. Online payment providers, recording cash collection, admin status updates, cancellation, and email notifications are future work.

## Verification

Run `npm test` in `petro-api` and `npm test`, `npm run build`, `npm run lint` in `petro-web`. API tests mock MongoDB operations and transaction rollback; they do not prove real MongoDB concurrency or durability. Before release, verify transaction commit/rollback on a replica set, concurrent buyers competing for the last unit, repeated request IDs, ownership, checkout retries, and the confirmation in a browser.

Admin fulfilment progression and COD cash collection are now available through `/api/admin/orders` and `/admin/orders`. See `ADMIN-ORDERS.md` for endpoints, restrictions, and audit fields. Cancellation, refunds, and restocking remain unimplemented.


## Customer order history

My Orders now shows ten orders per page with order-status and payment-status filters. The controls are stored in URL parameters so browser back/forward and copied links retain the view. Changing either filter resets to page one. Empty pages provide a route back to the first unfiltered page, and order cards link to tracking/details.

`GET /api/orders/my?page=1&status=shipped&payment=unpaid` accepts optional status and payment filters. Status uses the fulfilment enum; payment is paid or unpaid. Page must be an integer from 1 to 10,000. The response contains orders, page, and hasMore. The API fetches one extra row to determine hasMore and uses createdAt plus _id for deterministic newest-first ordering. A user/createdAt/_id index supports the owner-scoped listing. Pagination is offset-based and may shift if orders are inserted or deleted between requests.

The account is always derived from authentication. Supplied user IDs, unknown ownership query fields, and frontend state cannot select another customer's orders. Retry request IDs/hashes remain excluded from order responses. Existing clients still receive an orders array; the default result size is now ten rather than fifty.

Three new API tests cover validated filters, multiple pages, hasMore boundaries, empty pages, owner isolation, and private-field stripping. Two frontend tests check filter URL handling and exclusion of ownership parameters. The full verification run passes 132 tests, lint, and build. Live database indexing, persistence, and browser navigation remain to be verified.
