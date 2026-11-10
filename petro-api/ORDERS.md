# Orders

- `POST /api/orders` creates an order for the authenticated user.
- `GET /api/orders/my` returns that user's latest 50 orders.
- `GET /api/orders/:id` returns an order only to its owner. Other owners and invalid IDs receive 404.

The create payload contains `requestId`, `items` (`slug`, `variantLabel`, `quantity`), `shippingAddress`, `deliveryMethod`, `paymentMethod: "cod"`, and `expectedTotal`. The API ignores supplied ownership and item prices. It validates address/contact details, resolves canonical prices, calculates delivery, and rejects changed totals with 409 so the customer can review again. Initial rates remain standard LKR 350, free from LKR 4,500, or express LKR 650. Confirm these store rates before release.

## Transactions and inventory

Order placement requires MongoDB Atlas or another deployment supporting multi-document transactions. There is intentionally no non-transactional fallback. Startup creates the unique Inventory key and Order user/request-ID indexes before accepting requests.

Inventory records store remaining stock by `slug:variantLabel`. A missing record starts from the product seed catalog on its first reservation. Product prices and initial stock still come from `seed-data.json`; Bundle definitions use MongoDB with the existing curated fallback. Cart loading and bundle listing overlay remaining Inventory stock. The static frontend product catalog may display older stock; the order API always checks the final available quantity.

Each order expands bundle quantities into their product components, combines demand across all individual and bundle lines, and rejects shortages. Within one transaction, conditional stock updates decrement each component and an immutable order snapshot is inserted. A failure aborts both operations. Order cancellation and restocking are not implemented; do not adjust status manually expecting inventory to be restored. Existing development seed commands do not reset Inventory or Orders.

## Retry behavior

The unique `(user, requestId)` index prevents repeated requests with the same ID from creating another order. A hash binds that ID to the original normalized payload. Exact retries return the saved order without another stock decrement; changing details with the same ID returns 409. Request IDs and hashes are omitted from public order responses.

Checkout locks cart edits during submission, clears the cart only after the API acknowledges a saved order, and loads the confirmation from the owner-protected endpoint. On an uncertain network/server response, the same mounted checkout retains the original payload and ID for retry. That retry state is memory-only: after leaving or refreshing the page, check My Orders before submitting again. New request IDs represent new orders.

New orders require Cash on Delivery (`paymentMethod: "cod"`) and start with status `placed` and payment status `unpaid`. Client-supplied payment confirmations, amounts paid, or paid timestamps are ignored. Confirmation and history show the payment method; unpaid COD confirmations show the full order total due on delivery. Checkout collects no online payment and adds no COD surcharge. Unsupported methods are rejected before inventory is reserved.

Existing orders with no payment method retain that historical value and display "Payment method not recorded". Exact retries of those saved orders still use their original request hash. A missing method cannot create a new order, and a retry cannot change a saved order's method. Online payment providers, recording cash collection, admin status updates, cancellation, and email notifications are future work.

## Verification

Run `npm test` in `petro-api` and `npm test`, `npm run build`, `npm run lint` in `petro-web`. API tests mock MongoDB operations and transaction rollback; they do not prove real MongoDB concurrency or durability. Before release, verify transaction commit/rollback on a replica set, concurrent buyers competing for the last unit, repeated request IDs, ownership, checkout retries, and the confirmation in a browser.
