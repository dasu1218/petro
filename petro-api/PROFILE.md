# Profile and saved addresses

All endpoints require a Bearer token. The user comes from authentication; request fields cannot select another account, change roles, replace passwords, or replace the entire address book.

| Method | Endpoint | Body |
| --- | --- | --- |
| PUT | `/api/profile` | `name`, `email`; `currentPassword` when changing email |
| POST | `/api/profile/addresses` | Address fields, `label`, optional boolean `isDefault` |
| PUT | `/api/profile/addresses/:id` | Complete address fields, `label`, optional boolean `isDefault` |
| DELETE | `/api/profile/addresses/:id` | None |
| PATCH | `/api/profile/addresses/:id/default` | None |

Responses return `{ "user": ... }`, including the address book and `defaultAddressId`. `GET /api/auth/me` also includes these values. Password hashes are excluded from user responses.

Names and emails are validated and normalized. An email change verifies the current password; the unique email index rejects conflicts with another account. This feature does not change passwords or send email verification messages.

Each saved address includes `label`, `fullName`, `email`, `phone`, `addressLine1`, optional `addressLine2`, `city`, `postalCode`, and `country: "Sri Lanka"`. Address validation is shared with order placement. Accounts can save up to 10 addresses. The first address becomes the default. Deleting the default selects the first remaining address, or clears the default if none remain. Choose another address as default rather than unsetting the current default.

Addresses are embedded in User documents. Mongoose optimistic concurrency prevents concurrent profile/address saves from silently overwriting each other; a conflicting save returns 409 with instructions to refresh. Old accounts receive an empty address book without a migration.

The Account page supports profile editing and address creation, editing, deletion, and default selection. Checkout copies the default address initially and allows selecting another saved address or entering a new one. Editing a copied checkout address does not edit the saved address. Orders retain their original address snapshot even if the address book later changes. Account update responses cannot restore a session after logout.

Verification: `npm test` in `petro-api` exercises routes with mocked persistence and real Mongoose address documents, including access control, email password checks, duplicate emails, address lifecycle, limits, and conflict responses. `npm test`, `npm run build`, and `npm run lint` in `petro-web` cover address selection/copying and existing checkout rules. Live database persistence, concurrent saves, and browser form behavior still require verification.
