# Checkout

The cart page and cart drawer link to `/checkout`. Authentication is required; login and registration preserve the return destination. An empty cart shows a browse-products link.

The address form starts with the account name and email. It collects phone number, street address, an optional second address line, city, and postal code for delivery within Sri Lanka. Required fields, field lengths, email format, and phone format are validated before review. Invalid submissions focus the first invalid field and show field errors.

Delivery settings live in `src/lib/checkout.js`. The initial estimated fees are LKR 350 for standard delivery and LKR 650 for express delivery. Standard delivery is free at a subtotal of LKR 4,500 or more. Express retains its fee above that threshold. These are configurable estimates, not carrier quotes; confirm the store's actual rates before enabling order placement. The cart progress bar and checkout share the same free-delivery threshold.

The summary includes products and bundles, quantities, subtotal, estimated delivery, and estimated total. Review is invalidated when the cart's prices, quantities or stock change, or when address or delivery selection changes. Address details stay in component memory and are not sent to an API or saved in browser storage. Navigating away resets them.

This roadmap item stops at reviewing checkout. It does not submit orders, charge payments, clear the cart, or display an order confirmation. The next item is an order API with canonical prices and a final shared-stock check. That API must validate addresses and delivery charges on the server rather than trusting client totals.

Run `npm test`, `npm run build`, and `npm run lint` from `petro-web`. Tests cover address validation, delivery thresholds and fees, bundle quantities, and invalidation of reviewed details. Live browser checks remain: login return flow, autofill, error focus, delivery selection, reviewing and editing details, changing the cart through the drawer, empty-cart behavior, and mobile layout.
