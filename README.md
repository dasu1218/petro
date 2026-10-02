# 🐾 PETRO – Vibrant Pet Care Commerce (Web Application)

A responsive e-commerce web application for premium pet care: medicated shampoos, dog and cat nutrition, flea and tick control, tonics, and care bundles.

**Stack:** React (Vite) · Tailwind CSS · Node.js / Express · MongoDB (Atlas) · Cloudinary · GitHub

> Status: 🚧 In development – 30-day build plan (see [Roadmap](#-30-day-roadmap))

---

## 📑 Table of Contents
1. [Features](#-features)
2. [Tech Stack](#-tech-stack)
3. [Design System](#-design-system)
4. [Project Structure](#-project-structure)
5. [Getting Started](#-getting-started)
6. [Environment Variables](#-environment-variables)
7. [Data Models](#-data-models)
8. [API Endpoints](#-api-endpoints)
9. [Feature Branches](#-feature-branches)
10. [30-Day Roadmap](#-30-day-roadmap)
11. [Git Workflow](#-git-workflow)
12. [Daily Progress Log](#-daily-progress-log)
13. [Deployment](#-deployment)

---

## ✨ Features

**Customer website**
- Home page with fixed header, hero banner, category row, and featured best sellers with filter pills
- Product listing with search, filters, sorting, and pagination
- Product detail with size variants (e.g. 250ml / 500ml) and live price update
- Slide-over cart drawer with quantity stepper and free-shipping progress bar
- Care bundles (Puppy Starter Kit, Anti-Dermatitis Duo)
- Register / Login (JWT), profile, saved addresses
- Checkout, order history, order tracking
- Wishlist and ratings (amber star accent)
- Fully responsive: desktop, tablet, and mobile browsers

**Admin dashboard**
- Product, category, and bundle CRUD with Cloudinary image upload
- Order management and status updates

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Axios, Zustand / Context |
| Backend | Node.js, Express, JWT, bcrypt, multer, cors |
| Database | MongoDB Atlas, Mongoose |
| Media | Cloudinary (product images) |
| Hosting | Vercel / Netlify (frontend), Render / Railway (API) |
| Version control | Git + GitHub |

---

## 🎨 Design System

Derived from `DESIGN.md` (Epilogue + Plus Jakarta Sans, warm linen surfaces, crimson accents). Tokens are configured in `tailwind.config.js`.

| Token | Value | Use |
|---|---|---|
| Primary | `#DC2626` | CTAs, promos, brand |
| Primary (hover) | `#B91C1C` | Hover state |
| Secondary | `#F59E0B` | Ratings, loyalty |
| Tertiary | `#0D9488` | Vet-approved, organic badges |
| Neutral text | `#1E293B` | Typography |
| Canvas | `#FAF8F5` | Page background |
| Card | `#FFFFFF` | Card surface |
| Border | `#E2DCD5` | Card outline |

**Fonts:** Epilogue (headings, 700–800) · Plus Jakarta Sans (body and labels), loaded from Google Fonts
**Radius:** 8px controls · 16px product cards · 24px modals · pill for badges and filters
**Layout:** 12-column grid, max width `1360px`, 8-column on tablet, 1–2 columns on mobile

---

## 📁 Project Structure

```
petro/
├── petro-api/
│   ├── src/
│   │   ├── config/        # db.js, cloudinary.js
│   │   ├── models/        # User, Product, Category, Bundle, Cart, Order
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── middleware/    # auth.js, error.js, upload.js
│   ├── server.js
│   └── .env.example
│
└── petro-web/
    ├── public/
    ├── src/
    │   ├── assets/
    │   ├── components/    # Header, Footer, ProductCard, CartDrawer, Badge...
    │   ├── pages/         # Home, Shop, ProductDetail, Cart, Checkout, Orders, Profile, Admin
    │   ├── routes/        # AppRoutes, ProtectedRoute, AdminRoute
    │   ├── store/         # cart and auth state
    │   ├── services/      # api.js (Axios instance)
    │   ├── App.jsx
    │   └── main.jsx
    ├── tailwind.config.js
    ├── vite.config.js
    └── .env.example
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- MongoDB Atlas account
- Cloudinary account

### 1. Clone
```bash
git clone https://github.com/<your-username>/petro.git
cd petro
```

### 2. Backend
```bash
cd petro-api
npm install
cp .env.example .env     # fill in your values
npm run dev              # http://localhost:5000
```

### 3. Frontend
```bash
cd petro-web
npm install
cp .env.example .env
npm run dev              # http://localhost:5173
```

### 4. Seed sample data
```bash
cd petro-api
npm run seed
```

> Make sure `CLIENT_URL` in the API `.env` matches the frontend URL, so CORS allows requests.

---

## 🔐 Environment Variables

**`petro-api/.env`**
```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/petro
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**`petro-web/.env`**
```env
VITE_API_URL=http://localhost:5000/api
```

⚠️ Never commit `.env` files. Commit only `.env.example`.

---

## 🗄️ Data Models

**Product**
```js
{
  name, slug, description,
  category: ObjectId,
  images: [{ url, publicId }],
  variants: [{ label: "250ml", price: 2450, stock: 40 }],
  badges: ["Vet Formulated", "Sulfate-Free"],
  rating, numReviews, isFeatured
}
```

**Other collections:** `User`, `Category`, `Bundle`, `Cart`, `Order` (items, shippingAddress, paymentMethod, status, totals).

---

## 🔌 API Endpoints

Base URL: `/api`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Create account | – |
| POST | `/auth/login` | Login, returns JWT | – |
| GET | `/auth/me` | Current user | ✅ |
| GET | `/products` | List (search, filter, sort, page) | – |
| GET | `/products/:id` | Product details | – |
| POST | `/products` | Create product | 🔑 Admin |
| PUT | `/products/:id` | Update product | 🔑 Admin |
| DELETE | `/products/:id` | Delete product | 🔑 Admin |
| POST | `/upload` | Upload image to Cloudinary | 🔑 Admin |
| GET | `/categories` | List categories | – |
| GET | `/bundles` | List bundles | – |
| GET / POST / PUT / DELETE | `/cart` | Manage cart | ✅ |
| POST | `/orders` | Place order | ✅ |
| GET | `/orders/my` | My orders | ✅ |
| PUT | `/orders/:id/status` | Update status | 🔑 Admin |

---

## 🌿 Feature Branches

Every feature lives in its own branch, created from `dev` and merged back through a Pull Request. Never commit directly to `main` or `dev`.

| # | Branch | Scope | Days | Status |
|---|---|---|---|---|
| 1 | `feature/project-setup` | Repos, Vite + React and Express init, `.env`, MongoDB Atlas, Cloudinary account | 1–2 | ⬜ |
| 2 | `feature/design-system` | Tailwind tokens from `DESIGN.md`, Google Fonts, Button, Badge, Input, Card | 3–4 | ⬜ |
| 3 | `feature/backend-core` | Folder structure, DB connection, error handler, Mongoose models | 5–6 | ⬜ |
| 4 | `feature/product-api` | Product and Category CRUD, search, filter, sort, pagination | 8, 10 | ⬜ |
| 5 | `feature/cloudinary-upload` | multer + Cloudinary image upload, `publicId` storage | 9 | ⬜ |
| 6 | `feature/seed-data` | Seed script with the 8 PETRO products | 11 | ⬜ |
| 7 | `feature/layout-routing` | React Router, Header, Footer, page layout, responsive grid | 12 | ⬜ |
| 8 | `feature/home-page` | Hero banner, category row, featured grid, filter pills, API connection | 13–14 | ⬜ |
| 9 | `feature/product-detail` | Image gallery, size selector with live price, badges | 15 | ⬜ |
| 10 | `feature/auth` | Auth API (JWT and bcrypt), Login and Register pages, protected routes | 16–17 | ⬜ |
| 11 | `feature/cart` | Cart state, quantity stepper, subtotal, slide-over cart drawer, shipping progress bar | 18–19 | ⬜ |
| 12 | `feature/cart-api` | Cart persistence and sync for logged-in users | 20 | ⬜ |
| 13 | `feature/bundles` | Bundle model, API, and Bundles section | 21 | ⬜ |
| 14 | `feature/checkout` | Address form, delivery method, order summary | 22 | ⬜ |
| 15 | `feature/orders` | Order API, stock check, order history, status updates | 23, 25 | ⬜ |
| 16 | `feature/payments` | Cash on Delivery, then PayHere or Stripe | 24 | ⬜ |
| 17 | `feature/profile` | Profile page, edit details, saved addresses | 25 | ⬜ |
| 18 | `feature/admin-dashboard` | Admin product and order management pages | 26 | ⬜ |
| 19 | `feature/wishlist-reviews` | Wishlist, ratings and reviews (optional) | 27 | ⬜ |
| 20 | `feature/testing` | Jest and Supertest API tests, Vitest component tests, responsive checks | 28 | ⬜ |
| 21 | `release/v1.0.0` | Deploy, SEO and performance polish, screenshots | 29–30 | ⬜ |

Status key: ⬜ not started · 🟡 in progress · ✅ merged

### Create a feature branch
```bash
git checkout dev
git pull origin dev
git checkout -b feature/product-api
# ...work and commit...
git push -u origin feature/product-api
# open a Pull Request: feature/product-api → dev
```

### Merge and clean up
```bash
git checkout dev
git pull origin dev
git branch -d feature/product-api
git push origin --delete feature/product-api
```

---

## 🗓️ 30-Day Roadmap

Tick items off as you finish them. The branch for each task is shown in brackets.

### Week 1 – Setup and Foundation
- [ ] **Day 1:** GitHub repo, branches, README, Vite + React and Express projects `[feature/project-setup]`
- [ ] **Day 2:** MongoDB Atlas, Cloudinary, `.env` setup `[feature/project-setup]`
- [ ] **Day 3:** Tailwind config from `DESIGN.md`, Google Fonts `[feature/design-system]`
- [ ] **Day 4:** Reusable components (Button, Badge, Input, Card) `[feature/design-system]`
- [ ] **Day 5:** Backend structure, DB connection, error handler `[feature/backend-core]`
- [ ] **Day 6:** Mongoose models `[feature/backend-core]`
- [ ] **Day 7:** Review, fixes, merge `dev` into `main`

### Week 2 – Products and Home
- [ ] **Day 8:** Product CRUD API `[feature/product-api]`
- [ ] **Day 9:** Cloudinary upload (multer) `[feature/cloudinary-upload]`
- [ ] **Day 10:** Categories, search, filter, sort, pagination `[feature/product-api]`
- [ ] **Day 11:** Seed the 8 PETRO products `[feature/seed-data]`
- [ ] **Day 12:** React Router, Header, Footer, layout `[feature/layout-routing]`
- [ ] **Day 13:** Home page UI `[feature/home-page]`
- [ ] **Day 14:** Connect Home to API, loading and error states `[feature/home-page]`

### Week 3 – Details, Cart, Auth
- [ ] **Day 15:** Product Detail with size selector `[feature/product-detail]`
- [ ] **Day 16:** Auth API (JWT and bcrypt) `[feature/auth]`
- [ ] **Day 17:** Login and Register pages, protected routes `[feature/auth]`
- [ ] **Day 18:** Cart state (add, remove, stepper, subtotal) `[feature/cart]`
- [ ] **Day 19:** Slide-over cart drawer with shipping progress bar `[feature/cart]`
- [ ] **Day 20:** Cart API sync `[feature/cart-api]`
- [ ] **Day 21:** Bundles section and API `[feature/bundles]`

### Week 4 – Checkout, Admin, Release
- [ ] **Day 22:** Checkout page `[feature/checkout]`
- [ ] **Day 23:** Order API and stock check `[feature/orders]`
- [ ] **Day 24:** Payment (Cash on Delivery, then PayHere or Stripe) `[feature/payments]`
- [ ] **Day 25:** Orders and Profile pages `[feature/orders]` `[feature/profile]`
- [ ] **Day 26:** Admin dashboard: product and order management `[feature/admin-dashboard]`
- [ ] **Day 27:** Wishlist and reviews (optional) `[feature/wishlist-reviews]`
- [ ] **Day 28:** Testing (Jest, Supertest, Vitest, responsive checks) `[feature/testing]`
- [ ] **Day 29:** Deploy API (Render) and frontend (Vercel) `[release/v1.0.0]`
- [ ] **Day 30:** Polish, SEO meta tags, screenshots, tag `v1.0.0` `[release/v1.0.0]`

**Overall progress:** `0 / 30 days`

---

## 🔀 Git Workflow

```
main                      ← stable releases only (tagged)
 └─ dev                   ← integration branch
     ├─ feature/project-setup
     ├─ feature/design-system
     ├─ feature/backend-core
     ├─ feature/product-api
     ├─ feature/cloudinary-upload
     ├─ feature/seed-data
     ├─ feature/layout-routing
     ├─ feature/home-page
     ├─ feature/product-detail
     ├─ feature/auth
     ├─ feature/cart
     ├─ feature/cart-api
     ├─ feature/bundles
     ├─ feature/checkout
     ├─ feature/orders
     ├─ feature/payments
     ├─ feature/profile
     ├─ feature/admin-dashboard
     ├─ feature/wishlist-reviews
     ├─ feature/testing
     └─ fix/<short-description>      ← bug fixes
release/v1.0.0            ← created from dev, then merged into main
```

**Branch naming**

| Prefix | Use |
|---|---|
| `feature/` | New functionality |
| `fix/` | Bug fixes (e.g. `fix/price-update`) |
| `docs/` | README and documentation |
| `chore/` | Config, dependencies, tooling |
| `release/` | Release preparation |

**Commit message style**
```
feat: add product size selector
fix: correct cart subtotal rounding
docs: update API table
chore: add cloudinary config
test: add auth route tests
```

**Daily routine**
1. `git checkout dev && git pull`
2. `git checkout -b feature/<name>` (or continue your current feature branch)
3. Code, then commit in small steps
4. Push and open a PR into `dev`
5. Review, merge, and delete the branch
6. At the end of each week, merge `dev` into `main`

**Release (Day 29–30)**
```bash
git checkout dev
git checkout -b release/v1.0.0
# final fixes, version bump, README screenshots
git checkout main
git merge release/v1.0.0
git tag v1.0.0
git push origin main --tags
```

**Tip:** Turn on branch protection for `main` and `dev` in GitHub (Settings → Branches) so changes only go in through Pull Requests.

---

## 📝 Daily Progress Log

Add one entry per day.

| Day | Date | Done | Blockers / Notes |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| … | | | |

---

## ☁️ Deployment

- **API:** Render / Railway. Set all env vars in the dashboard, set `CLIENT_URL` to your frontend domain, and allow the host in the MongoDB Atlas IP access list.
- **Frontend:** Vercel / Netlify. Set `VITE_API_URL` to your deployed API URL. Build command: `npm run build`, output folder: `dist`. Add a rewrite rule so React Router routes work on refresh (all paths to `index.html`).
- **Images:** served from the Cloudinary CDN.

---

## 📄 License

MIT © 2026 – PETRO Pet Care
