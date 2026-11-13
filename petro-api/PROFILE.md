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

Names and emails are validated and normalized. An email change verifies the current password; the unique email index rejects conflicts with another account. Password changes are available through the separate endpoint below. Email verification messages are not implemented.

Each saved address includes `label`, `fullName`, `email`, `phone`, `addressLine1`, optional `addressLine2`, `city`, `postalCode`, and `country: "Sri Lanka"`. Address validation is shared with order placement. Accounts can save up to 10 addresses. The first address becomes the default. Deleting the default selects the first remaining address, or clears the default if none remain. Choose another address as default rather than unsetting the current default.

Addresses are embedded in User documents. Mongoose optimistic concurrency prevents concurrent profile/address saves from silently overwriting each other; a conflicting save returns 409 with instructions to refresh. Old accounts receive an empty address book without a migration.

The Account page supports profile editing and address creation, editing, deletion, and default selection. Checkout copies the default address initially and allows selecting another saved address or entering a new one. Editing a copied checkout address does not edit the saved address. Orders retain their original address snapshot even if the address book later changes. Account update responses cannot restore a session after logout.

Verification: `npm test` in `petro-api` exercises routes with mocked persistence and real Mongoose address documents, including access control, email password checks, duplicate emails, address lifecycle, limits, and conflict responses. `npm test`, `npm run build`, and `npm run lint` in `petro-web` cover address selection/copying and existing checkout rules. Live database persistence, concurrent saves, and browser form behavior still require verification.


## Change password

My Account → Change password requires the current password, new password, and matching confirmation in the browser. `PUT /api/profile/password` accepts only currentPassword and newPassword for the authenticated account. The server verifies the current bcrypt hash, rejects reuse and invalid input, and saves the new password through the existing bcrypt pre-save hook. Passwords require at least eight characters and at most 72 UTF-8 bytes; passwords are not trimmed.

The same optimistic save increments the user's tokenVersion. JWTs include that version and protected endpoints compare it with the current database value. Old tokens, including tokens from other devices, fail after a successful change. Existing accounts/tokens default to version zero until their first password change; token versions and hashes are excluded from public user responses. A concurrent account update returns the existing 409 conflict response instead of overwriting it.

The browser clears the current session and returns to login with confirmation. Other browsers cannot use their old token on protected endpoints. The frontend now clears matching sessions on authenticated 401 responses and refreshes account roles when its window regains focus. Tabs on the same browser origin also synchronize token replacement and logout. There is no password-reset email or recovery link in this feature. Failed changes do not sign out the current session.

Four route tests use actual Mongoose validation and password pre-save hashing with the collection write mocked. They verify authorization, wrong/reused passwords, multibyte limits, hashed persistence, role preservation, old-token rejection, legacy token compatibility, and login with the new password. Two frontend tests cover matching confirmation and input rules. The full suite has 127 passing tests; lint and build pass. Live database persistence and browser session behaviour still require verification.


## Browser session synchronization

Login and logout changes to petro_token propagate to other open tabs on the same origin through storage events. A replacement token clears the previous account state and verifies the new session before showing account content. Logout removes admin controls and protected content in the other tab. No existing account roles are modified in the database by this feature.

Window focus triggers a fresh auth/me check so server-side role changes update the visible controls. Matching authenticated 401 responses clear the active session; 403 responses and login credential failures do not trigger global logout. Expiry events from an older token cannot clear a newer account. Session versions and request sequence guards prevent stale responses from restoring an older user or profile.

A temporary initial session-check failure keeps the stored token and offers Retry session check or Sign out. Protected content remains unavailable until verification succeeds. A refresh failure for an already-loaded account shows a nonfatal notice; server authorization remains authoritative on every protected request. The frontend does not infer or grant admin permissions.

Browser checks cover two-tab logout, two-tab replacement with a different account, refreshed roles, expired current tokens, unrelated old-token errors, and retry after temporary verification failure at desktop/mobile sizes. The API request unit test verifies that only authenticated 401 responses emit the session-expiry event. Tests use mocked browser APIs rather than live accounts.
