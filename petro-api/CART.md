# Cart persistence

`GET`, `PUT`, and `DELETE /api/cart` require a Bearer token. Ownership always comes from the authenticated user. MongoDB stores one cart per user with a unique user index.

Replace a cart with `PUT /api/cart`:

```json
{
  "items": [
    { "slug": "petal-cleanse-shampoo", "variantLabel": "250ml", "quantity": 2 }
  ]
}
```

Responses contain `{ "items": [...] }` with product names, prices, stock, and cart keys. The API validates variants and positive integer quantities, combines duplicate variants, caps quantities to stock, and accepts at most 100 input lines. Empty arrays clear the cart. Client-supplied prices and stock are ignored.

The current catalog source is `seed-data.json`. Replace this lookup with the Product model when product CRUD is implemented; MongoDB product edits do not yet affect cart prices or stock.

Guest carts stay in browser storage. On login, guest and account items merge using the larger quantity for matching variants, capped to stock. This prevents retries from adding the same guest quantities again. The guest cart is cleared only after a successful save. Logout returns to a separate guest cart.

Account changes save in request order. Pending changes remain in browser storage under the account ID until acknowledged, and recover on the next login. A sync error displays a retry button. Initial loading prevents cart edits until the account cart is available; a failed initial load also offers sign-out. Pending recovery takes precedence over the remote cart. Simultaneous sessions use the last completed write; there is no live cross-tab or cross-device synchronization.

Run `npm test` in `petro-api`. Tests exercise HTTP routes with mocked database operations plus catalog validation, merge behavior, and local recovery. For a live check, start MongoDB and the API, log in, add items, refresh, log out and back in, and confirm a second account has a separate cart. Stop the API to check retry and pending recovery.
