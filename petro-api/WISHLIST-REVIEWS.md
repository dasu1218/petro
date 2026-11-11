# Wishlists and reviews

Customers can save products from Home, Shop, or a product detail page and open My Account → My wishlist. Wishlists are stored per authenticated account; saving does not reserve stock or lock prices. Guests are directed to login. Account changes reset wishlist state so another user's saved items do not appear.

Wishlist API (all authenticated):
- `GET /api/wishlist`: returns the account's saved product slugs.
- `PUT /api/wishlist/:slug`: saves an existing catalog product, idempotently.
- `DELETE /api/wishlist/:slug`: removes only that account's saved entry.

Product pages show real customer reviews instead of seeded review statistics. Anyone can read paginated reviews and the actual average rating; an empty product has no rating. Logged-in users can create or edit one review per product and delete their own review. Ratings must be integers from 1 to 5; trimmed comments must contain 1–1,000 characters. Display names and review text are public; account IDs and email addresses are excluded. Reviews are not labeled as verified purchases. Public author names are snapshots taken when each review is saved.

Review API:
- `GET /api/reviews/:slug?page=1`: public list of up to 20 reviews, real count and average, plus hasMore.
- `GET /api/reviews/:slug/mine`: authenticated user's review, or null.
- `PUT /api/reviews/:slug`: authenticated upsert of rating and comment for that user/product.
- `DELETE /api/reviews/:slug`: authenticated removal of that user's review.

Ownership always comes from the Bearer token. Unique user/product indexes are initialized before the API starts accepting requests. Concurrent edits to the same review use the last completed update. Review moderation/reporting and cross-tab live updates are not implemented. Reviews are escaped as text by React.

Verification: 50 API/service tests and 18 frontend tests pass, plus production build and lint. New route tests mock persistence and cover access control, ownership, wishlist idempotence, review validation, summary calculations, and exclusion of private fields. Live MongoDB index behavior, persistence, and browser interactions still need verification.
