# Petro verification

From the project root:

```bash
npm ci --prefix petro-api
npm ci --prefix petro-web
npm run verify
```

`npm run verify` runs the API suite, frontend logic suite, frontend lint, and production build. Tests use Node's built-in runner; the default suite does not start MongoDB. GitHub Actions runs the same command for pull requests and pushes to main, develop, and feature branches. The workflow has not been executed on GitHub until these changes are pushed.

Current default suite: 104 API/service tests and 66 frontend logic tests (170 total). API HTTP tests use ephemeral localhost ports and mocked persistence. They do not modify a real database or upload images to Cloudinary. Cryptographic authentication checks use real bcrypt comparison and JWT signing/verification. Frontend tests cover logic and request handling, not rendered browser interactions.

Authentication coverage now includes registration normalization, role-field rejection, password omission in responses, duplicate emails, malformed input, login failures, expired tokens, wrong signing secrets, deleted users, and customer access to admin routes. Registration validates string fields and bounds passwords to 8 or more characters and 72 UTF-8 bytes to avoid accepting inputs beyond bcrypt's effective input limit.

Manual verification against the deployed services is still required before release (the browser suite below uses API fixtures):

- Responsive layouts at 375px, 768px, and desktop widths; keyboard navigation and visible validation feedback.
- Customer registration/login, saved addresses, wishlist switching, and review editing in a browser.
- A real admin photo upload, original/enhanced comparison, product save, and storefront price/promotion refresh.
- Production MongoDB/Atlas configuration and checkout against the deployed API; local replica-set transaction coverage is described below.
- Admin fulfilment progression, stale concurrent updates, and cash collection displayed in the customer's order.

Use a development database and test account for live checks. Existing seed scripts replace product/category collections; automated tests do not run seed scripts.

## Combined release verification

After installing both projects’ dependencies and Playwright Chromium, run `npm run verify:release` from the repository root. It runs logic tests, lint/build, deployment-checker tests, isolated MongoDB integration tests and the full desktop/mobile browser suite in sequence, stopping at the first failure. Integration tests may download a MongoDB binary on their first run and need local ports. They use an isolated temporary replica set, never the configured production database. Browser tests use API fixtures; this command does not publish or verify deployed services.

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

Desktop/mobile checks load 11 saved orders. The first card shows three saved products and sizes, the total purchased quantity across all items, and a link to the complete order. Its historical product name differs from the current catalog to ensure the order snapshot is displayed. Pagination shows the remaining order, and changing the status filter resets to page one. The suite now contains 32 scenarios across two viewports (64 checks). History responses are fixtures; backend ownership checks are unchanged.

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

### Browser CI timing and failure diagnostics

A CI-mode run reproduced an intermittent strict-selector failure in the bundle-photo test: both images were still present when the test used a selector that assumed only the successfully loaded image remained. The test now selects the intended product image by accessible name and holds the broken photo request open until the successful photo is verified, then explicitly releases it to check the fallback. This exercises both images being present without relying on request timing.

The entrance tests pause Playwright's clock before visiting the page, keeping the production 2.4-second dismissal timer from racing screenshots and Skip/Escape assertions. The automatic-dismissal test explicitly advances through 2.3 seconds (still visible) and then 2.5 seconds (dismissed). The gallery image check polls until decoding completes. Production animation timing is unchanged.

CI enables Playwright's GitHub reporter alongside the existing list and HTML reports, so future test failures appear as named source annotations. The original remote push failure's full log was unavailable; the reproduced local bundle-test failure was verified directly rather than assuming the screenshot proved a specific cause.

After these changes, all 98 browser checks passed locally with `CI=1` and retries disabled. The bundle scenarios also passed 12 repeated checks with no retries, and the entrance/image timing scenarios passed 18 repeats. Frontend lint passed. GitHub checks require a new pushed commit before their result changes.

### Per-bundle cart limits

Desktop/mobile checks add the last two copies of a fixture bundle, verify the remaining quantity message and disabled add control, remove its cart line, then add it again. A separate case verifies sold-out bundles stay disabled. The suite now contains 51 scenarios across two viewports (102 checks). This is a per-bundle UI limit based on fetched availability; it does not reserve stock or subtract other products/bundles using the same components. The API still aggregates all component demand and validates real inventory during checkout.

### Review deletion confirmation

Desktop/mobile scenarios load a saved review, open deletion confirmation, verify no DELETE request is sent before confirmation, and cancel by button and Escape with focus restored. Confirming deletes once and refreshes to an empty review form. An injected failed DELETE keeps the existing review and confirmation available, then succeeds on retry. Review fixtures now retain PUT/DELETE state. The browser suite contains 53 scenarios across two viewports (106 checks); actual review ownership enforcement remains in the API tests.

### Review draft recovery

Desktop/mobile scenarios edit a saved review, inject one failed save, and verify the edited comment/rating remain for a successful retry. A second scenario keeps the public review list unavailable while allowing the customer's own review to load, edits a draft, then reloads only the public list and verifies the draft survives without another private-review request. Public, private-load and mutation errors now have separate recovery paths. The browser suite contains 55 scenarios across two viewports (110 checks). Successful saves/deletes intentionally refresh both datasets; account/product changes still reset the editor.

### Order CSV downloads

Three logic checks verify historical line values, totals, unpaid COD amount due, CSV punctuation/newline escaping, spreadsheet formula neutralization, and omission of a COD amount due for paid/cancelled/unknown-method orders. The default suite now contains 100 API/service and 42 frontend logic checks (142 total).

Desktop/mobile browser checks open a fixture order, download the CSV, read its contents, verify the filename and saved line/totals, and confirm the download control is hidden in print media. The suite now contains 56 scenarios across two viewports (112 checks). The export is generated locally from the already-authorized order response; it does not read the current catalog or send an extra API request. It includes products and order/payment metadata, not shipping contact details or session credentials.

### Searching customer order references

The API test searches an uppercase reference, combines fulfilment/payment filters, rejects malformed and repeated values, and verifies another customer's reference is not returned even with a forged user parameter. Frontend logic tests cover normalization, URL serialization and invalid-reference fallback. The default suite contains 101 API/service and 43 frontend logic checks (144 total).

Desktop/mobile checks submit a reference, retain the status filter, reset pagination, clear search, reject short input before submission, and show empty results for an unmatched reference. History fixtures now use the real API's 10-order page size; the existing preview/pagination case uses 11 records to cover the next page. The browser suite contains 58 scenarios across two viewports (116 checks).

### Customer order-history sorting

API checks verify oldest-first direction, deterministic creation-date/ID sorting, owner scope, pagination and rejection of unsupported/repeated sort values. Frontend logic checks verify URL round trips and newest-first fallback. The default suite now contains 102 API/service and 44 frontend logic checks (146 total).

Desktop/mobile scenarios change sorting from page two with active fulfilment/payment filters, verify the page resets, reload to retain oldest-first selection, browse the next page, then clear back to newest-first. Browser history fixtures are supplied newest-first and reverse for oldest-first. The suite now contains 59 scenarios across two viewports (118 checks).

### Wishlist search, sorting and filters

Three logic checks cover multi-term case-insensitive search, combined stock/promotions, lowest-size price sorting, preserving input lists, bounded queries and safe defaults for unsupported URL values. The default suite now contains 102 API/service and 47 frontend logic checks (149 total).

Desktop/mobile scenarios sort saved products by price, search a product URL, reload to retain selections, clear filters and combine stock/promotion filters. They verify unavailable saved entries remain removable even when no visible products match, and filtering sends no wishlist mutation requests. The browser suite contains 61 scenarios across two viewports (122 checks). Results are drawn only from the customer's existing saved list, and clearing filters does not remove saved products.

### Admin inventory refresh

Desktop/mobile scenarios edit a stock-addition draft, refresh changed quantities and verify the fields remain intact. A failed refresh retains the last loaded figures with a warning; a later refresh recovers. Another scenario simulates a committed restock whose response fails, refreshes to see the new stock, then retries the original request ID/payload without another stock increment or history record. These are isolated fixture transactions; real transaction/replay checks remain in the separate MongoDB integration suite. The browser suite now contains 63 scenarios across two viewports (126 checks).

### Customer order history refresh

Desktop/mobile scenarios refresh a paginated, filtered, oldest-first history view and verify updated saved order details appear without changing page/filter/sort parameters or an unfinished reference input. A failed refresh leaves previously loaded orders visible with a warning; retry fetches fresh data while retaining the input. Cached results are keyed by signed-in account and query, so data from another account or filter selection is not reused as the current view. The browser suite contains 65 scenarios across two viewports (130 checks). This changes only the customer view; API ownership requirements remain in force.

### Admin order payment filtering

An API check combines fulfilment and paid/unpaid filters, rejects unsupported/repeated payment values, and verifies guests/customers cannot use the admin listing. The default suite contains 103 API/service and 47 frontend logic checks (150 total).

Desktop/mobile scenarios filter a 23-order fixture by payment from page two, confirm pagination resets while fulfilment is retained, reload the saved view, paginate through unpaid orders, and clear filters. Another case combines paid status with different fulfilment states. Admin list fixtures use the API's 20-order page size. The browser suite contains 67 scenarios across two viewports (134 checks). Filter changes clear pending cancellation/cash confirmation state; authorization and mutation rules remain on the API.

### Admin order reference lookup

An API check verifies case normalization, combined reference/status/payment criteria, empty results for unknown references, malformed/repeated input rejection and admin-only authorization. Customer and admin history routes share the reference normalizer. The default suite contains 104 API/service and 47 frontend logic checks (151 total).

Desktop/mobile scenarios search from page two, preserve payment/fulfilment filters, reset pagination, reload the reference view and clear it. Another case rejects short input and checks an unknown reference. The browser suite contains 69 scenarios across two viewports (138 checks).

### Admin shown-page CSV export

Two logic checks verify that only the supplied page is exported, filter/page metadata are included, saved quantities/totals are used, CSV text is escaped and formula-like cells are neutralized, and paid orders have no COD amount due. Customer and admin downloads now share CSV formatting and browser download utilities. The default suite contains 104 API/service and 49 frontend logic checks (153 total).

Desktop/mobile scenarios export page two of a 21-order admin fixture and read the downloaded file to verify page/filter context, the one visible order, historical products and totals, and exclusion of a page-one order. Empty views disable export, and a customer role cannot retain the admin export view. The browser suite contains 71 scenarios across two viewports (142 checks). The control explicitly exports only the orders currently shown and does not fetch the complete filtered history or include shipping contact fields.

### Recent stock-addition CSV

Two logic checks verify product context, shown-record count, total added units, preserved note punctuation and historical stock-after values, formula-safe text and an empty dataset. The default suite contains 104 API/service and 51 frontend logic checks (155 total).

Desktop/mobile scenarios create a fixture restock and download the shown history, verifying its filename, product URL, note, added units and historical stock count. Another case checks empty-history disabling and failed-refresh disabling/recovery. The browser suite contains 73 scenarios across two viewports (146 checks). The export uses the existing admin inventory response, which returns up to 20 recent additions; it does not fetch the full ledger or calculate current stock from those records.

### Product detail draft controls

Desktop/mobile scenarios verify unchanged product details cannot be submitted, edits are marked unpublished, discarding sends no mutation request, and a normalized successful response becomes the new saved baseline. Another case fails a save, retains edited fields and enabled retry/discard controls, then retries the same data successfully. Detail fixtures now apply saved metadata to admin/public catalog responses. The browser suite contains 75 scenarios across two viewports (150 checks), including the retained restock-history export work. Drafts are local to the selected product editor; switching products or leaving the page does not persist them. Discard changes the local preview and does not write to the API.

### Draft product and promotion price preview

Three frontend logic checks cover whole-LKR discount rounding, the minimum price of LKR 1, disabled promotions, input immutability and invalid price/discount values. The default suite contains 104 API/service and 54 frontend logic checks (158 total).

Two browser scenarios across desktop and mobile verify live size prices and savings, toggling discounts, invalid-value recovery, no automatic save requests and contained mobile table scrolling. The browser suite contains 77 scenarios across two viewports (154 checks). The preview shows prices while the discount is active; scheduled dates remain controlled by the server, and publishing requires Save product.

### Promotion schedule preview

Three logic checks cover disabled promotions, immediate/open-ended schedules, local date formatting and invalid/equal/reversed dates. The default suite contains 104 API/service and 57 frontend logic checks (161 total). A desktop/mobile browser scenario verifies invalid windows send no mutation, correction restores the schedule preview, and saving sends an ordered date range. This scenario and the existing price-preview scenarios passed six targeted browser checks. The complete browser suite now contains 78 scenarios across two viewports (156 checks); the full suite was not rerun for this change.

### Product badge preview

Two logic checks cover whitespace, empty entries, ordered deduplication and server-compatible count/length limits. The default suite contains 104 API/service and 59 frontend logic checks (163 total). A desktop/mobile browser scenario checks preview badges, invalid-value guidance, blocked submission, corrected publishing and empty badges (two targeted checks passed). The complete browser suite now contains 79 scenarios across two viewports (158 checks); the full suite was not rerun for this change.

### New product URL suggestions

Two logic checks cover accent/punctuation normalization, empty suggestions, the 100-character limit and valid product path previews. The default suite contains 104 API/service and 61 frontend logic checks (165 total). A desktop/mobile scenario verifies explicit suggestion, editable preview, preservation of custom URLs when the name changes and invalid URL recovery (two targeted browser checks passed). The complete browser suite now contains 80 scenarios across two viewports (160 checks); the full suite was not rerun for this change. URL uniqueness remains checked by the API during creation.

### Initial stock preview

Three logic checks verify totals, stocked-size counts, unchanged drafts, duplicate/reserved/invalid size labels and whole stock limits. The default suite contains 104 API/service and 64 frontend logic checks (168 total). A desktop/mobile scenario checks zero-stock guidance, changing totals, duplicate names, correction and removal. This and existing URL suggestion scenarios are covered by four targeted browser checks. The complete browser suite contains 81 scenarios across two viewports (162 checks); the full suite was not rerun for this change.

### New product badge validation

The creation form reuses the tested badge parser from product editing. The default suite remains 104 API/service and 64 frontend logic checks (168 total). A desktop/mobile scenario fills a valid product draft, verifies oversized and excessive badges send no creation request, corrects badges and checks the trimmed/deduplicated payload, then verifies a failed creation preserves the draft. It also checks clearing badges. Run together with existing product-badge and initial-stock previews for six targeted checks. The complete browser suite contains 82 scenarios across two viewports (164 checks); the full suite was not rerun for this change.

### New product price preview

The creation form reuses the tested price-preview helper and table; publication guidance says Create product. The default suite remains 104 API/service and 64 frontend logic checks (168 total). A desktop/mobile scenario checks placeholder and edited size labels, temporary duplicate labels, multiple prices, fractional-price recovery, removing a size and mobile overflow. Run with existing promotion preview and new-product badge scenarios for eight targeted checks. The complete browser suite contains 83 scenarios across two viewports (166 checks); the full suite was not rerun for this change.

### New product draft cancellation

The default suite remains 168 checks. Two desktop/mobile scenarios verify edited drafts survive Cancel and Keep editing, Escape restores focus to Cancel, explicit discard opens a fresh form, untouched forms close directly and size-only changes are protected. Run with new-product badge recovery for six targeted browser checks. The complete browser suite contains 85 scenarios across two viewports (170 checks); the full suite was not rerun for this change. This confirmation covers the form’s Cancel button; drafts are not persisted after leaving the page.

### New product size ordering

The default suite remains 168 checks. A desktop/mobile scenario verifies first/last movement boundaries, moving both directions, preserving prices and quantities, submitted variant order and retaining reordered sizes after a failed creation. Run with price-preview and cancellation scenarios for eight targeted browser checks. The complete browser suite contains 86 scenarios across two viewports (172 checks); the full suite was not rerun for this change. Existing published products and historical orders are not reordered.

### Undo draft size removal

The default suite remains 168 checks. Two desktop/mobile scenarios verify restoration of a removed size’s name, price, stock and position without overwriting edits to remaining sizes; the undo action disappears after use, a later removal is recoverable, and restoration is disabled at ten sizes. Run with existing size-order checks for six targeted browser checks. The complete browser suite contains 88 scenarios across two viewports (176 checks); the full suite was not rerun for this change. Recovery stores only the last removal in the open form.

### Product creation validation feedback

The default suite remains 168 checks. A desktop/mobile scenario verifies invalid URL and price fields produce a visible named-field alert, receive browser focus and send no creation request. Correcting them reaches the API, and a simulated failure replaces validation feedback while preserving values. Run with badge creation and size-order scenarios for six targeted checks. The complete browser suite contains 89 scenarios across two viewports (178 checks); the full suite was not rerun for this change. Native validation wording follows the browser locale.

### Initial stock retail value

Two logic checks cover summed size-price × stock values, zero stock, unchanged drafts and invalid/duplicate sizes. The default suite contains 104 API/service and 66 frontend logic checks (170 total). A desktop/mobile scenario verifies live totals across sizes, invalid-price recovery and removal. Run with retained creation-validation scenarios for four targeted checks. The complete browser suite contains 90 scenarios across two viewports (180 checks); the full suite was not rerun for this change. The preview is regular-price retail value, not profit or expected revenue.

### New product refresh protection

The default suite remains 170 checks. A desktop/mobile scenario dispatches cancelable beforeunload events to verify no protection for untouched drafts, protection after text/size edits, removal after reverting text and cleanup after discard/reopening. Run with cancellation scenarios for six targeted browser checks. These tests verify event registration and cancellation, not browser-specific native dialog presentation. The complete browser suite contains 91 scenarios across two viewports (182 checks); the full suite was not rerun for this change. Internal navigation is not intercepted and drafts are not persisted.

### Product detail refresh protection

The default suite remains 170 checks. Two desktop/mobile scenarios verify unload event cancellation for unsaved product details, cleanup after discard/successful save and protection retained after a failed save. Run with new-product refresh coverage for six targeted checks. Tests exercise event registration and cancellation rather than native browser dialog presentation. The complete browser suite contains 93 scenarios across two viewports (186 checks); the full suite was not rerun for this change. Protection uses a shared hook; internal app navigation is not blocked and drafts are not persisted.

## Full launch-readiness verification — 23 November 2026

Executed all three commands used by `verify:release`: `npm run verify`, `npm run test:integration` and `npm run test:e2e`. Results: 104 API/service + 66 frontend logic tests (170 total), lint and production build passed; all 9 isolated MongoDB integration tests passed; all 186 browser checks (93 scenarios across desktop/mobile) passed without retries. No application code fixes were required by this run. The combined command was added afterward using these same commands in sequence. This validates local code and fixture browser flows, not deployed Vercel/Render services, production Atlas, real Cloudinary uploads or real customer orders. Follow DEPLOYMENT.md for live verification.

## Deployment checker tests — 23 November 2026

`npm run test:deployment` passes four isolated tests covering expected GET requests, credential-free options, origin validation, failed health/protected-route checks, missing deep-link rewrites and unrelated HTML. These tests use injected fetch responses and never call deployed services. The suite is included in `verify:release`; the default verification remains 170 API/frontend logic checks plus lint/build. Run `npm run check:deployment -- https://FRONTEND-HOST https://API-HOST` with actual origins for a read-only live smoke check. Actual deployment was not checked in this change because live origins were not supplied. Frontend/browser/database code is unchanged, so the prior full 186 browser and nine database checks were not repeated.

## Deployment CORS checks — 24 November 2026

`npm run test:deployment` now passes six isolated checker tests. Added cases reject missing/wildcard/wrong origins and preflights without POST, authorization or content-type permission. The live checker sends the supplied frontend Origin on the health request and an OPTIONS order preflight; it never sends an authenticated POST. These are HTTP header checks, not a substitute for real browser requests. Default verification remains 170 API/frontend logic checks plus lint/build. No actual hosted services were checked because deployment origins were not supplied. Application/browser/database code is unchanged; the prior full browser/database suites were not repeated.

## Deployment asset checks — 24 November 2026

`npm run test:deployment` passes eight isolated tests, including missing/empty scripts, incorrect script/style MIME types, HTML fallback bodies and external asset references. The checker fetches up to 20 unique same-origin scripts/styles declared in the homepage, without credentials, query strings or redirects. It does not execute scripts or resolve dynamic imports. Pending CORS checks are retained in this branch. Default verification remains 170 API/frontend logic checks plus lint/build. No live deployment was checked; application/browser/database code is unchanged, so full browser/database suites were not repeated.
