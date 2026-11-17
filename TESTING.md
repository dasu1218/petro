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

### Stock-aware size selection

Desktop/mobile checks verify that a product whose first size is sold out starts on its first available size. Customers can inspect a sold-out size and its price, but cannot add it to the cart. Switching back to an available size permits purchase. A fully sold-out product keeps its first size selected and disables purchase and size-guide selection. The browser suite now contains 19 scenarios across two viewports (38 checks); stock is fixture data, and production availability is still validated by the API.

### Wishlist product details

Desktop/mobile checks load saved products with multiple sizes and an active promotion. They verify the lowest variant price rather than array order, available/sold-out labels, promotion text, and navigation from a saved card to the product's available size. The suite now contains 20 scenarios across two viewports (40 checks). Wishlist and catalog responses remain fixtures; no real account or saved list is changed.

### Unavailable wishlist removal

Desktop/mobile checks remove an unavailable saved product while retaining an available saved card. A failed DELETE response must leave the unavailable entry visible, show an error, and re-enable its removal button. Missing products are only identified after a successful catalog load. The suite now contains 22 scenarios across two viewports (44 checks). All wishlist writes use fixtures, not real accounts.

### Button and product image styling

The shared styles unify primary/secondary controls, focus outlines, disabled states, variant choices, wishlist controls, photo thumbnails and admin photo actions. Product images use `object-fit: contain` within bounded frames on shop, home, wishlist, detail and admin pages; this retains the entire original image, including any whitespace already in the uploaded photo. Existing image assets are unchanged. Hover effects are limited to hover-capable devices and reduced-motion preferences are respected.

After this styling change all 44 desktop/mobile browser checks, frontend lint and production build passed. Desktop shop and mobile admin screenshots were inspected. Fixture photos are not representative production photography; real uploaded photos should also be reviewed in the deployed catalog.

### Homepage photo management

Two new API/service checks validate photo references and descriptions and test public reading, rejected guest/customer publishing, admin publishing, invalid input, and removal. The default suite now has 100 API/service tests plus 39 frontend logic tests (139 total). API persistence remains mocked in these checks.

A desktop/mobile browser scenario uploads a fixture photo, verifies preview alone does not publish, saves its description, visits the homepage to find the image, and removes/saves it to restore the placeholder. The browser suite now contains 23 scenarios across two viewports (46 checks). Uploads and homepage persistence are fixtures; real Cloudinary and MongoDB verification still require configured services.

### Homepage draft recovery

The desktop/mobile suite checks that an unchanged homepage preview cannot be saved, an uploaded preview can be discarded without a publish request, a successful save becomes the new baseline, and description edits or unsaved removal can be reverted. The published-homepage link opens a separate tab. The browser suite now has 24 scenarios across two viewports (48 checks). The refresh/close warning uses the browser's standard `beforeunload` mechanism; browsers control whether it appears, and internal SPA navigation is outside its scope.

### Homepage error recovery

Desktop/mobile checks return a failed publish response, assert the photo and description remain available with Save enabled, then retry successfully. A second case keeps initial settings requests failing until explicit Reload, checking that uploads/saves are unavailable before a successful load. The browser suite now has 26 scenarios across two viewports (52 checks). Failures are injected HTTP fixtures; these checks do not require Cloudinary or a database.

### Product photo failures

The browser suite blocks one fixture product photo and serves a second. It checks readable placeholders in the shop, homepage, wishlist and detail gallery, then switches to the working gallery photo and back. The loaded photo must have nonzero natural dimensions. Thumbnail failures are decorative; the gallery buttons retain their accessible labels. The suite now has 27 scenarios across two viewports (54 checks). This verifies failed HTTP image rendering without contacting real image services.

### Cart thumbnails

Desktop/mobile scenarios add a product and verify its current catalog photo in both the cart drawer and full cart. A broken-photo case verifies placeholders in both views, quantity updates and removal. Products without a photo and bundle items retain the PETRO placeholder. Thumbnails are decorative because each cart line already has a named product link. Photos are looked up from the current catalog and are not persisted into cart requests. With the preceding photo fallback scenario, the browser suite now contains 29 scenarios across two viewports (58 checks).

### Clearing the cart

Desktop/mobile checks verify that Clear cart opens an inline confirmation without removing items. Focus moves to Keep my items; either that button or Escape cancels and restores focus to Clear cart. Confirming removes all items, and a reload retains the empty guest cart. The suite now contains 30 scenarios across two viewports (60 checks). Existing per-item removal stays immediate; only the full-cart clear action has confirmation.

### Active shop filters

Desktop/mobile checks open a URL with search, category, minimum/maximum price, stock, sort and page selections. Removing category preserves the other filters and sort, resets pagination, and updates results. Removing maximum price expands results; Clear filters removes all chips and URL selections. The browser suite now contains 31 scenarios across two viewports (62 checks), including the preceding uncommitted clear-cart scenario.

### Order history product previews

Desktop/mobile checks load 21 saved orders. The first card shows three saved products and sizes, the total purchased quantity across all items, and a link to the complete order. Its historical product name differs from the current catalog to ensure the order snapshot is displayed. Pagination shows the remaining order, and changing the status filter resets to page one. The suite now contains 32 scenarios across two viewports (64 checks). History responses are fixtures; backend ownership checks are unchanged.

### Printable order summaries

Desktop/mobile scenarios complete a fixture COD checkout and verify the print action invokes `window.print`. With print media enabled, site chrome and action controls are hidden while the order reference, address, products, quantities, unpaid amount due and total remain visible. Returning to screen media restores the controls. The suite now contains 33 scenarios across two viewports (66 checks). Print-dialog invocation is stubbed; physical printer output and operating-system PDF settings are not exercised.

### Copying order and tracking references

Desktop/mobile scenarios confirm a fixture order, refresh it with courier details, and verify that each copy button writes the correct reference. Print media hides both controls while keeping the tracking number. A denied clipboard write shows manual-copy guidance, retains the reference, re-enables the control, and succeeds on retry. Clipboard APIs are stubbed; actual operating-system clipboard permissions are not exercised. The browser suite now contains 35 scenarios across two viewports (70 checks).

### Password visibility controls

Desktop/mobile scenarios toggle login and registration password fields, retain typed values, exercise keyboard activation, and verify toggling confirmation does not reveal the primary password. Account checks independently toggle current/new/confirmation passwords and the password required to change email. Controls use `type="button"` and explicit labels; toggling sends no auth/profile requests. The browser suite now contains 37 scenarios across two viewports (74 checks). Password visibility is local input state and is not persisted.

### Order QR codes

Desktop/mobile tests independently decode generated PNG pixels with `jsqr` and assert the exact order-page URL without query parameters, tokens or address data. They verify PNG download, print visibility, and that a guest opening the scanned destination is redirected to login without order details. The QR encoder (`qrcode`) is loaded only when the order page needs it; codes are generated in the browser without a third-party QR service. Encoder documentation: https://github.com/soldair/node-qrcode

The suite now contains 39 scenarios across two viewports (78 checks), including the retained password-visibility scenarios. The existing 139 API/logic checks, lint and build also pass. Physical phone-camera behavior is not automated. For real scanning, open Petro at its deployed URL or a LAN address reachable by the phone before downloading/printing; a localhost QR points at the scanning device's own localhost. Scanning opens the protected order page; it does not grant access to another customer's order. The existing API still requires authentication and queries by both order ID and user ID.

### Sharing order links

Desktop/mobile scenarios stub the device share and clipboard APIs to verify only the clean order URL and reference title are passed, excluding current-page query parameters and private order content. They check copy-link feedback, cancelled and failed sharing, retained manual navigation and print exclusions. Unsupported browsers retain the copy-link action. Device share interfaces and actual delivery to another app are controlled by the operating system and are not automated. The browser suite now contains 41 scenarios across two viewports (82 checks). Sharing a link does not bypass login or backend order ownership checks.

### Cart-aware product stock

Desktop/mobile checks add two units of a three-unit size, verify only one more can be added and that the second feedback reports one added unit, then verify further adding is disabled. Another size remains purchasable, and removing the original cart line re-enables its Add to cart button. The browser suite now contains 42 scenarios across two viewports (84 checks). These are fixture availability limits, not inventory reservations; checkout still performs authoritative server-side stock validation.

### Homepage quick-add availability

Desktop/mobile checks start with a sold-out first size, verify the next purchasable size and its price, add its last unit, and verify quick-add moves to the next available size. Once all available units are in the cart, the action disables; removing a line re-enables its size. A fully sold-out product is also disabled. The browser suite now contains 44 scenarios across two viewports (88 checks). The selected size is shown before quick-add; cart contents still do not reserve inventory.

### Animated homepage entrance

Desktop/mobile scenarios inspect the supplied logo entrance, skip it, and verify navigation and reload do not repeat it within the tab session. They check automatic dismissal after 2.4 seconds, Escape dismissal, restored page scrolling, reduced-motion bypass, and direct-product navigation without an intro. The browser suite now contains 47 scenarios across two viewports (94 checks), including the retained homepage quick-add work. The intro uses a native modal dialog to keep keyboard focus inside it; browser session storage controls repeat visits. If storage is blocked it still works, but can repeat on a later homepage visit. Failed logo loading dismisses the intro. It does not load external animation services or replace existing store routes.

### Bundle product photography

Desktop/mobile scenarios load a two-product bundle with one working photo and one broken image. They verify the loaded image has natural dimensions, the failed image has a placeholder, included products link to their detail pages, and the bundle can still be added to the cart. A second scenario verifies original package artwork remains when neither product has an uploaded photo. Cards use at most two unique component products and their current main photos, without storing duplicate assets. The browser suite now contains 49 scenarios across two viewports (98 checks).
