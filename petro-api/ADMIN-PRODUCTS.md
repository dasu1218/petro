# Product photos, prices, and promotions

The admin page is `/admin/products`, also linked from My Account for admins. It manages the existing eight catalog products. Creating new products, changing inventory, and admin order management are separate features.

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
