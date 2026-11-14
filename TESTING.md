# Petro verification

From the project root:

```bash
npm ci --prefix petro-api
npm ci --prefix petro-web
npm run verify
```

`npm run verify` runs the API suite, frontend logic suite, frontend lint, and production build. Tests use Node's built-in runner; the default suite does not start MongoDB. GitHub Actions runs the same command for pull requests and pushes to main, develop, and feature branches. The workflow has not been executed on GitHub until these changes are pushed.

Current result: 98 API/service tests and 39 frontend logic tests pass. API HTTP tests use ephemeral localhost ports and mocked persistence. They do not modify a real database or upload images to Cloudinary. Cryptographic authentication checks use real bcrypt comparison and JWT signing/verification. Frontend tests cover logic and request handling, not rendered browser interactions.

Authentication coverage now includes registration normalization, role-field rejection, password omission in responses, duplicate emails, malformed input, login failures, expired tokens, wrong signing secrets, deleted users, and customer access to admin routes. Registration validates string fields and bounds passwords to 8 or more characters and 72 UTF-8 bytes to avoid accepting inputs beyond bcrypt's effective input limit.

Live verification still required before release:

- Responsive layouts at 375px, 768px, and desktop widths; keyboard navigation and visible validation feedback.
- Customer registration/login, saved addresses, wishlist switching, and review editing in a browser.
- A real admin photo upload, original/enhanced comparison, product save, and storefront price/promotion refresh.
- Production MongoDB/Atlas configuration and checkout against the deployed API; local replica-set transaction coverage is described below.
- Admin fulfilment progression, stale concurrent updates, and cash collection displayed in the customer's order.

Use a development database and test account for live checks. Existing seed scripts replace product/category collections; automated tests do not run seed scripts.

## Desktop and mobile browser smoke tests

From the repository root, after installing frontend dependencies:

```bash
npm --prefix petro-web run browser:install
npm run test:e2e
```

The Playwright suite launches an isolated Vite server on 127.0.0.1:4175 and runs 14 scenarios at 1440×900 and 375×812 in Chromium (28 checks total). It verifies full-width shop layout/no horizontal overflow, search and pagination, product add-to-cart/drawer interaction, customer UI hiding admin controls and redirecting direct admin navigation, admin access to product management, and choosing a photo then saving its reference. It also checks for browser runtime errors and unexpected API requests.

All API responses and image uploads are fixtures. External requests are blocked. No test signs into a real account, changes real products/orders, sends credentials, touches MongoDB, or uploads to Cloudinary. These are real-browser UI smoke tests, not full live-service integration tests. Firefox, WebKit, live backend checkout, email delivery, and real payment/shipping integrations are not covered by this suite.

Playwright writes full-page shop/admin screenshots under `petro-web/test-results`, an HTML report under `petro-web/playwright-report`, and traces on failure. These generated artifacts are ignored by Git. Open the report with `npx playwright show-report` from petro-web. The browser-smoke CI job installs Chromium and uploads reports/screenshots, retaining artifacts for seven days. Its first GitHub run still requires pushing this branch.

Current local results: 137 existing tests plus 28 browser checks pass, along with lint and production build. The browser screenshots use fixture product names and blocked external fonts; they are verification artifacts rather than production marketing screenshots.

References: https://playwright.dev/docs/test-webserver and https://playwright.dev/docs/ci


### Checkout browser coverage

The checkout scenarios start on a product page, add an item to the cart, open the drawer, and follow Continue to checkout. They verify that incomplete address details show errors and focus the first invalid field, the order cannot be submitted before review, express COD submits the reviewed amount and shipping address, and a confirmed order opens the details page and clears the cart.

A separate fixture persists a simulated order but returns a first-attempt 503 response. The test checks that the cart remains populated until success and that Retry original order sends exactly the same request ID and payload. The fixture then returns the original confirmation; no second simulated order is created. This verifies client retry behavior, not actual MongoDB transaction durability.

The empty-cart check verifies that direct checkout navigation offers no review/place-order controls and sends no order request. Checkout review screenshots are generated for both viewport sizes under test-results and included in existing CI artifacts. All uploads, accounts, orders and cart persistence in this suite remain isolated mock data.


### Session browser coverage

The desktop/mobile suite also checks storage-event logout and account replacement across two real browser tabs, role refresh on window focus, clearing an expired current token, preserving a newer session from an old-token error, and retaining the token with retry controls after a temporary session-check failure. These scenarios verify rendered customer/admin controls and protected navigation with isolated fixture accounts; backend authorization continues to have its own API tests.

## Isolated MongoDB transaction tests

```bash
npm run test:integration
```

This separate suite starts a real, temporary MongoDB 8.0.18 single-node replica set on loopback using `mongodb-memory-server`. The first run downloads the pinned MongoDB binary and requires network access; later runs use the cached binary. No existing MongoDB installation or Atlas credentials are needed. The suite never reads `MONGO_URI`, uses a dedicated temporary database, and stops its replica set after testing.

Nine checks cover canonical order totals and stock reservation, two buyers competing for the last unit, concurrent identical request IDs, actual inventory rollback after an injected order-write failure, retry-safe restocking and cancellation, and shared product/bundle stock shortages. These run the production services and Mongoose models against real transactions. They do not exercise HTTP authentication or production Atlas configuration.

All nine integration tests pass locally. The separate `inventory-integration` GitHub Actions job installs API dependencies and runs this command; its GitHub result requires pushing the branch. CI disables the dependency's postinstall download so other jobs do not download an unused MongoDB binary. The existing 137 logic/API tests remain in `npm run verify`; integration tests are explicitly separate because they require a MongoDB binary and local ports.

### Custom products and cancellation recovery

The replica-set suite also creates an admin catalog product and verifies order reservation, refusal of new orders after archival, and cancellation restoration from the original stock snapshot. A second case restocks a custom product before its first order, buys more than its original stock, and retries the restock without adding stock twice.

The cancellation failure case orders a two-component bundle, removes the later stock record, and verifies that cancellation rolls back the earlier component increment, order status, and audit history. After repairing the missing record, retrying cancellation restores both components once. Only the temporary test database is changed. These checks test services and persistence; they do not verify rendered admin controls or a deployed database.

### Admin product picker coverage

The desktop/mobile browser suite checks case-insensitive product URL search, visible/hidden filters, empty results, clearing filters, and selecting a hidden product. Editing a product name before filtering verifies that filtering preserves the current draft and sends no save request. Explicitly selecting another product opens that product's editor. The fixture supplies hidden products without changing real catalog data. The suite now contains 15 scenarios across two viewports (30 checks).

### Product size guide coverage

The desktop/mobile suite opens the size guide using a three-size fixture, checks current and regular prices, disables a sold-out size, and selects an available size. It verifies that the purchase selection changes and the quantity resets before adding to the cart. The check also rejects horizontal page overflow. The suite now contains 16 scenarios across two viewports (32 checks). This uses fixture catalog responses, not production stock.

### Review draft coverage

The desktop/mobile browser suite loads an existing customer review, changes its comment and rating, then browses forward and back through public reviews. Both draft fields must survive, pagination must not reload the private review, and pagination must send no review save request. Public listing and private review failures have separate feedback. Account and product switches continue to remount the review editor. The suite now contains 17 scenarios across two viewports (34 checks), using isolated fixture reviews.
