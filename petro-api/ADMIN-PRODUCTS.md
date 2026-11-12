# Product photos, prices, and promotions

The admin page is `/admin/products`, also linked from My Account for admins. It manages the seed products and products added by admins. Existing product settings cover photos, prices, and promotions. Click Add new product to create another catalog item. Restocking is available in the Stock management panel; see RESTOCKING.md. Editing product descriptions after creation is not included in this feature. Admin order management is available separately at /admin/orders.

## Access and setup

1. Configure the API's existing MongoDB and Cloudinary environment variables (see `.env.example`).
2. Register your own account through the app if needed.
3. From `petro-api`, run `npm run make-admin -- your-account-email` to grant that existing account admin access in the configured database. This is an explicit local maintenance command; it is not a public endpoint. Log out and back in afterward.
4. Open My Account → Manage products, or `/admin/products`.

No account was promoted automatically by this change. Customer accounts cannot upload or edit products.

## Editing

Choose a product, upload JPG/PNG/WebP photos (maximum six, 5 MB each), choose a main photo, set a whole-LKR base price for every size, and save. Upload uses the existing protected Cloudinary endpoint. A file signature check rejects unsupported image formats. Removing a photo from a product does not delete the underlying Cloudinary asset. Photos uploaded but never saved remain in Cloudinary; asset cleanup is manual.

Promotion settings include an enabled flag, label, integer discount from 1–90%, and optional start/end times. Browser inputs use the device's local timezone and send UTC timestamps to the API. Start is inclusive; end is exclusive. Blank times mean immediate and indefinite. Disabling an offer restores base prices. Discounts round to whole LKR and never reduce a price below LKR 1. Individual-product discounts do not stack onto fixed-price bundles.

The storefront shows photos, promotional labels, regular prices, and effective prices. Product detail supports multiple photos. The product catalog refreshes every minute and on window focus, plus immediately after an admin save. Cart prices refresh with the catalog. Order placement still recalculates all prices and rejects an outdated reviewed total. Existing order snapshots are unchanged.

## Storage and API

ProductSettings stores photo references, variant base-price overrides, and a promotion by unique product slug. The seed catalog continues to supply names, variants, and initial stock; Inventory supplies remaining stock. Startup initializes the settings index.

- `GET /api/products`: public effective catalog with active promotional prices.
- `GET /api/products/admin`: protected admin catalog with saved editable settings.
- `PUT /api/products/:slug`: admin-only replacement of that product's photo, price, and promotion settings. Only validated fields are saved.
- `POST /api/upload`: admin-only image upload.

Bundle savings use current individual-product prices, while the bundle selling price stays fixed. Multiple admins editing one product use the last completed save.

## Verification

API tests mock persistence and cover authorization, validation, image signatures, promotion boundaries, and canonical cart prices. Frontend tests cover refreshing cart prices and quantities. Build and lint checks also run. Real Cloudinary uploads, MongoDB persistence, and browser interactions require a configured running environment.

## Automatic photo enhancement

New uploads are enhanced by default. `POST /api/upload` accepts a multipart `enhance` field (`true` or `false`, default `true`). Cloudinary keeps the original and eagerly generates an improved copy before reporting success: automatic colour/contrast/brightness adjustment, full-image fitting within 1200 × 1200, white padding to a square canvas, and an optimized JPEG output. This does not remove the original scene/background or invent product details.

The response includes `url`, `publicId`, `originalUrl`, and (when enhanced) `enhancedUrl`. The admin photo controls let you compare by switching to the original, return to the enhanced version, and save the selected version. Both references survive a saved product edit. Existing photos are unchanged. Turn off Automatically enhance new photos to upload an original without generating a copy.

Enhancement failures leave the product unchanged and show an error. Retry or disable enhancement for another upload. The original asset may already exist in Cloudinary after a failed transformation. Cloudinary transformation usage applies to generated copies. See the official transformation reference: https://cloudinary.com/documentation/transformation_reference#improve

Enhancement tests mock Cloudinary and check eager upload options, result selection, preserved originals, validation, and error propagation. A real upload still needs verification against the configured Cloudinary account.


## Add a new product

On Manage products, click Add new product. Enter its name, a unique lowercase URL name, description, category, optional badges, and 1–10 sizes. Each size needs a unique label, whole-LKR price, and nonnegative initial stock. Products appear in the shop immediately after creation; use zero stock if you are not ready to sell. Then upload photos, choose the main photo, set any promotion, and Save product in the existing editor.

`POST /api/products` is admin-only. It validates and whitelists fields, rejects duplicate seed/custom/bundle URL names, and stores products in CatalogProduct documents with a unique slug index. The public and admin catalogs combine these documents with the existing seed products. Actual .env values, user roles, and request-supplied internal fields cannot be set through creation. Product URLs and size labels are fixed after creation; the editor updates photos, prices, and offers.

Cart normalization, wishlist/review existence checks, bundle component lookup, and transactional stock reservation all support persisted products outside the seed file. Initial inventory is taken from the product's variant when first reserved. Orders retain their original product and price snapshots. Existing seed commands do not delete CatalogProduct documents.

New-product tests mock database persistence and cover admin access, validation, duplicate/reserved URLs, catalog visibility, promotions, and ordering a non-seed product. Live persistence, creation forms, uploads, and concurrent last-unit checks still require verification.
