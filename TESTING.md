# Petro verification

From the project root:

```bash
npm ci --prefix petro-api
npm ci --prefix petro-web
npm run verify
```

`npm run verify` runs the API suite, frontend logic suite, frontend lint, and production build. Tests use Node's built-in runner; no extra test dependencies are required. GitHub Actions runs the same command for pull requests and pushes to main, develop, and feature branches. The workflow has not been executed on GitHub until these changes are pushed.

Current result: 56 API/service tests and 18 frontend logic tests pass. API HTTP tests use ephemeral localhost ports and mocked persistence. They do not modify a real database or upload images to Cloudinary. Cryptographic authentication checks use real bcrypt comparison and JWT signing/verification. Frontend tests cover logic and request handling, not rendered browser interactions.

Authentication coverage now includes registration normalization, role-field rejection, password omission in responses, duplicate emails, malformed input, login failures, expired tokens, wrong signing secrets, deleted users, and customer access to admin routes. Registration validates string fields and bounds passwords to 8 or more characters and 72 UTF-8 bytes to avoid accepting inputs beyond bcrypt's effective input limit.

Live verification still required before release:

- Responsive layouts at 375px, 768px, and desktop widths; keyboard navigation and visible validation feedback.
- Customer registration/login, saved addresses, wishlist switching, and review editing in a browser.
- A real admin photo upload, original/enhanced comparison, product save, and storefront price/promotion refresh.
- MongoDB replica-set order commit and rollback, last-unit competition between buyers, and duplicate request retries.
- Admin fulfilment progression, stale concurrent updates, and cash collection displayed in the customer's order.

Use a development database and test account for live checks. Existing seed scripts replace product/category collections; automated tests do not run seed scripts.
