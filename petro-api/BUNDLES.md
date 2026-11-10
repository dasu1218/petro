# Care bundles

`GET /api/bundles` is public and returns `{ "bundles": [...] }`. Each offer includes its contents, regular price, savings, and a single `Care bundle` variant with the bundle price and available stock. Unknown components and inactive bundles are hidden; sold-out offers remain visible with zero stock.

Bundle definitions live in MongoDB through `models/Bundle.js`. A new installation with an empty collection uses the two curated definitions in `data/bundles.js`. Once the collection has definitions, only those definitions are used. Setting all definitions inactive produces an empty list rather than restoring defaults.

`npm run seed` loads `.env`, generates the local seed file, and upserts curated bundle definitions by slug when MongoDB is configured. This existing seed command also replaces products and categories, so use it only with a development database. The bundle feature works without running the seed command first.

Availability is the minimum number of complete bundles that can be assembled from component stock. Repeated components are combined before calculating availability. Product prices and stock currently come from `seed-data.json`; bundle prices come from the Bundle model or the curated defaults. Shared component stock across different cart lines will require a final check when order placement is implemented.

Bundles can be added from the home section or `/bundles`. They use the normal guest cart, account sync, quantity controls, and removal behavior. Cart links point back to the Bundles page. Listing failures provide a retry control; the page also handles empty lists and sold-out offers.

Run `npm test` in `petro-api`. HTTP tests mock database operations and check public listing, canonical cart pricing, inactive definitions, component availability, and persistence through the cart routes. Live MongoDB and browser behavior still require manual verification with the API running.
