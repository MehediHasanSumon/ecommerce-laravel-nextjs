# Project Remaining Work Audit

Scope: authorization/permission policy work বাদ দিয়ে এই তালিকা করা হয়েছে। নিচের আইটেমগুলো frontend page, backend flow, static/mock data, integration, cleanup, and production polish হিসেবে বাকি আছে।

## High Priority

### 1. Mock/static product data still used

- `/search`
  - Uses `frontend/mock/products.ts`.
  - Needs backend `/products` search API integration with pagination/filter/sort.

- `/deals`
  - Uses `frontend/mock/products.ts`.
  - Needs database-driven discounted/active collection or product query.

- `Header` search dropdown
  - Uses `frontend/mock/products.ts`.
  - Needs live product search/suggestion API.

- `/`
  - Customer reviews section uses `frontend/mock/reviews.ts`.
  - Hero slides, promo banners, mobile app block are hardcoded.
  - Needs database/admin-driven hero/banner/review/content settings or remove static sections.

### 2. Broken/missing public pages linked from footer/nav

These links exist in `frontend/constants/index.ts` or homepage but no matching page exists:

- `/careers`
- `/press`
- `/shipping-policy`
- `/return-policy`
- `/size-guide`
- `/cookies`
- `/gift-cards`
- `/reviews`

### 3. Legacy duplicate pages need removal or redirect

These routes duplicate newer account/payment flows or use old/static behavior:

- `/dashboard`
- `/profile`
- `/settings`
- `/order-success`

Recommended: redirect to `/account`, `/account/profile`, `/account/settings`, and `/payment/success` or remove if unused.

### 4. Contact page is static

- `/contact`
  - Form is frontend-only.
  - Needs backend contact message table/API/admin inbox/email notification.

### 5. Checkout/address placeholders still need cleanup

- `/checkout`
  - Some input placeholders still use examples like `Enter full name`, `Enter city`, etc.
  - Needs placeholder text normalized as requested.
  - Verify inline address creation/editing flow end-to-end after recent shipping/payment changes.

## Customer Account Remaining Work

### 6. Customer profile

- `/account/profile`
  - Avatar/profile picture upload is not complete.
  - Gender should be select-based, not free text.
  - Profile completion/member level are still basic.

### 7. Customer orders

- `/account/orders`
- `/account/orders/[order]`
  - Download invoice is not implemented.
  - Cancel order is not implemented.
  - Track order is future-only.
  - Reorder is future-only.

### 8. Customer notifications

- `/account/notifications`
  - Mark read exists.
  - Delete notification is not implemented.
  - Notification preferences are basic.

### 9. Customer reviews

- `/account/reviews`
  - Review edit/delete is not implemented.
  - Review status visibility exists but workflow can be improved.

### 10. Customer settings

- `/account/settings`
  - Only basic preferences exist.
  - Account preferences are not fully expanded.
  - Account deletion/deactivation is not implemented.

## Admin Remaining Work

### 11. Reports/analytics pages missing

No admin pages found for:

- Sales reports
- Revenue analytics
- Product performance
- Customer analytics
- Payment reports
- Shipping reports
- Inventory reports

### 12. Order management needs next production layer

- `/admin/orders`
- `/admin/orders/[order]`
  - Invoice generation/download missing.
  - Refund workflow missing.
  - Shipment/courier tracking missing.
  - Shipping logs are not implemented.
  - Bulk order actions are not implemented.
  - Admin notes UI exists partially in backend but not fully surfaced.

### 13. Product/review cleanup

- `/admin/reviews`
  - Reply system exists now, but no separate threaded/multiple replies.
  - Old DB tables/models still exist although UI/API removed them:
    - `product_review_images`
    - `product_review_votes`
    - `ProductReviewImage`
    - `ProductReviewVote`
  - Decide: permanently drop/remove or keep for future.

### 14. Settings pages with placeholder/future text

- `/admin/settings/sms`
  - Firebase phone auth is still described as placeholder.
  - Custom SMS has example URL default.

- `/admin/settings/payment`
  - Some gateway implementations are configuration-driven, but not all are equally production-complete.
  - Settings navigation description still mentions placeholder/future providers.

### 15. Admin module UX consistency follow-up

Most CRUD pages exist, but some still use generic drawer-based CRUD instead of dedicated pages:

- Brands
- Categories
- Attributes
- Attribute Values
- Tags
- Warehouses
- Currencies
- Discounts
- Reviews

If the final target is “no modal-based CRUD”, these still need separate create/edit/detail pages.

## Payment Gateway Remaining Work

### 16. Rocket

- `RocketService` explicitly returns unavailable.
- Needs official merchant API adapter only if Rocket official API is available.

### 17. bKash/Nagad verification hardening

- bKash and Nagad services exist.
- Need official-doc re-check, signature validation hardening, webhook/callback replay prevention, and live sandbox test proof.

### 18. Stripe/PayPal production features

- Need webhook event coverage audit.
- Refund support missing.
- Payment retry UX needs full gateway-specific testing.

### 19. Payment result/retry flow

- `/payment/success`
- `/payment/failed`
- `/payment/cancel`
  - Pages exist.
  - Retry payment flow needs gateway-specific end-to-end validation.
  - Old `/order-success` should be removed/redirected.

## Storefront Remaining Work

### 20. Content pages are mostly static

- `/about`
- `/faq`
- `/privacy`
- `/terms`

These should become CMS/settings/database-driven if production content management is required.

### 21. Blog route duplication

- `/blog`
- `/blogs`
- `/blog/[slug]`
- `/blogs/[slug]`

Need one canonical route strategy plus redirects/canonical tags.

### 22. Collection/category special pages

- `/best-sellers`
- `/flash-sale`
- `/new-arrivals`

Need verify they are fully database-driven from collection rules and not duplicated logic.

## Backend/Data Cleanup

### 23. Seed/demo data cleanup

Some seeders still use `example.com`, fake users, fake products, fake reviews, fake canonical URLs.

This is fine for local demo, but production seed profile should separate:

- Demo seeders
- Production defaults
- Test fixtures

### 24. Removed feature leftovers

After recent review changes:

- Review image/vote UI and API are removed.
- Local rows were cleared.
- Tables/models still remain and should be removed if not needed.

After Payment Methods page removal:

- API `/account/payment-history` still exists.
- Decide whether to keep for future payment history or remove from customer account API.

## Testing Gaps

### 25. Automated coverage still incomplete

Need focused tests for:

- Checkout place order
- Payment callbacks per gateway
- Payment result pages
- Order creation and duplicate prevention
- Shipping zones/method validation
- Customer dashboard APIs
- Review submission/reply flow
- Admin order status updates
- Product CRUD with select fields
- Storefront search/deals once made dynamic

### 26. Existing test issue

`php artisan test --filter=Product` previously failed because of duplicate `collections.slug = new-arrivals` in test/seed data.

Needs test fixture cleanup before relying on full backend test suite.

