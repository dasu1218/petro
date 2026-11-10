# Checkout

The cart page and cart drawer link to `/checkout`. Authentication is required; login and registration preserve the return destination. An empty cart shows a browse-products link.

The address form starts with the account name and email. It collects phone number, street address, an optional second address line, city, and postal code for delivery within Sri Lanka. Required fields, field lengths, email format, and phone format are validated before review. Invalid submissions focus the first invalid field and show field errors.

Delivery settings live in `src/lib/checkout.js`. The initial estimated fees are LKR 350 for standard delivery and LKR 650 for express delivery. Standard delivery is free at a subtotal of LKR 4,500 or more. Express retains its fee above that threshold. These are configurable estimates, not carrier quotes; confirm the store's actual rates before enabling order placement. The cart progress bar and checkout share the same free-delivery threshold.

The summary includes products and bundles, quantities, subtotal, estimated delivery, and estimated total. Review is invalidated when the cart's prices, quantities or stock change, or when address or delivery selection changes. Before submission, address details stay in component memory and are not saved in browser storage. Placing an order sends them to the API for validation and storage with the order. Navigating away resets an unsubmitted address.

Checkout includes a Cash on Delivery payment option. After review, Place Cash on Delivery order sends product references, quantities, address, delivery selection, `paymentMethod: "cod"`, reviewed total, and a request ID to the protected order API. The API checks canonical prices, delivery charges, payment selection, and shared component stock. Successful placement opens an owner-protected confirmation and clears the cart. Orders begin unpaid, with the full order total due in cash on delivery and no COD surcharge. Checkout collects no online payment. See `petro-api/ORDERS.md` for transaction requirements and retry behavior. Address details are persisted in the order only after successful placement.

The confirmation and recent orders show payment details. Paid orders do not request another payment; cancelled orders do not request delivery payment. Legacy orders without a payment method are not labeled as COD. Card payments, PayHere/Stripe integration, and recording cash collection are not implemented.

Run `npm test`, `npm run build`, and `npm run lint` from `petro-web`. Tests cover address validation, delivery thresholds and fees, bundle quantities, and invalidation of reviewed details. Live browser checks remain: login return flow, autofill, error focus, delivery selection, reviewing and editing details, changing the cart through the drawer, empty-cart behavior, and mobile layout.
