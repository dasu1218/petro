# Deploy Petro on Render and Vercel

This repository now includes hosting configuration. It has not been published, and no hosting resources were created. Responsive browser checks and live MongoDB/Cloudinary checks from TESTING.md remain required before release.

## 1. Verify and push

Install both projects’ dependencies and Playwright Chromium, then run `npm run verify:release` from the repository root. This combines logic tests, lint/build, isolated database integration checks and all desktop/mobile browser tests. It does not replace the live-service checks below. Commit and push this branch. Keep actual `.env` files out of Git; `.env.example` contains placeholders only.

GitHub’s existing **Verify Petro / verify** check also runs the isolated deployment-checker tests. Wait for the branch’s required checks to pass before deployment. CI tests the checker itself using injected responses; run the live command in step 4 against your actual hosts afterward.

## 2. Deploy the API on Render

Connect this GitHub repository through Render's New Blueprint flow and select `render.yaml` on the branch you want to deploy. Review the service plan and account settings before creating it. The blueprint uses `petro-api` as its root, `npm ci` to build, `npm start` to run, and `/api/health` as its health check. Auto-deploy is disabled so deployment is an explicit action.

Enter these settings in Render:

- `CLIENT_URL`: the frontend HTTPS origin, without a path. Multiple explicitly trusted frontend origins may be comma-separated. Never use a wildcard.
- `MONGO_URI`: the actual MongoDB Atlas connection URI, including the database name. Orders require transaction support. Configure Atlas network access for the deployment's outbound network.
- Cloudinary cloud name, API key, and matching API secret, from the same account.

The blueprint generates JWT_SECRET and sets JWT_EXPIRES_IN to 7d. The API rejects incomplete production settings or a short/placeholder JWT secret before starting. Render provides PORT. The readiness check returns 503 if MongoDB disconnects. Record the deployed API URL.

## 3. Deploy the frontend on Vercel

Import the same repository and select the deployment branch. Set Root Directory to `petro-web`, framework to Vite, build command to `npm run build`, and output to `dist`. Use Node 22.x. Set `VITE_API_URL` to `https://YOUR-API-HOST/api` for each environment you deploy. The Vercel build fails clearly if this setting is missing, insecure, or points to localhost. Never put database, JWT, or Cloudinary secrets in VITE variables.

`petro-web/vercel.json` rewrites deep links to index.html so refreshing product, checkout, admin, and account routes works. After Vercel gives you the final domain, set Render CLIENT_URL to that exact origin and redeploy the API. Preview domains must be explicitly added if they need API access.

VITE_API_URL is compiled into the frontend. Redeploy the frontend after changing it. Changing API environment settings also requires restarting/redeploying the API.

## 4. Check the live deployment

Run the read-only smoke checker with your actual HTTPS origins (the API origin must not include `/api`):

```bash
npm run check:deployment -- https://YOUR-FRONTEND-HOST https://YOUR-API-HOST
```

It requests API health with the frontend Origin, checks matching CORS headers and an OPTIONS preflight for authenticated JSON order requests, verifies unauthenticated order access returns 401, and checks the homepage/shop/account URLs serve the application shell. It fails on redirects, times out each request after 15 seconds and sends no login credentials. It also fetches up to 20 same-origin homepage script/stylesheet assets and rejects failed responses, incorrect content types, empty files and HTML fallbacks. It does not execute JavaScript, resolve dynamic imports, execute real browser API requests, log in, place orders or upload photos; complete the manual checks below even when it passes.

Open API `/api/health` and confirm status ok. Visit the frontend, open a product, and refresh its URL. Register/login, add to cart, and verify profile/address/wishlist persistence. With an admin account, test a photo upload and product save. Use a development/test order to check placement, inventory, order access, fulfilment, and cash collection. Follow TESTING.md for concurrency and responsive checks.

Existing admin roles stay in the database. For a new database, register your account first and run the existing make-admin maintenance script against that database using a secure server environment. Do not seed a production database: the current seed script replaces product/category collections.

## Reference documentation

- Render Blueprint specification: https://render.com/docs/blueprint-spec
- Render environment variables: https://render.com/docs/configure-environment-variables
- Vercel Vite SPA configuration: https://vercel.com/docs/frameworks/frontend/vite
