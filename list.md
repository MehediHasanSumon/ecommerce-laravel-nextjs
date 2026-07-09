# Project Remaining Work Audit

Scope: authorization/permission policy work বাদ দিয়ে এই তালিকা করা হয়েছে। নিচের আইটেমগুলো frontend page, backend flow, static/mock data, integration, cleanup, and production polish হিসেবে বাকি আছে।

## High Priority

### Done: Mock/static product data still used

- `/search`
  - Done: now uses backend `/products` search API with pagination/filter/sort support.

- `/deals`
  - Done: now uses database-driven sale product query through `/products?on_sale=1&sort=discount_desc`.

- `Header` search dropdown
  - Done: now uses live product search/suggestion API.

- `/`
  - Done: customer reviews now use approved backend reviews.
  - Done: hero slides now use collection banner data.
  - Done: hardcoded promo banner and mobile app blocks were removed.
  - Done: old mock product/review/order files were removed.

### Done: Broken/missing public pages linked from footer/nav

These links exist in `frontend/constants/index.ts` or homepage but no matching page exists:

- Done: `/careers`
- Done: `/press`
- Done: `/shipping-policy`
- Done: `/return-policy`
- Done: `/size-guide`
- Done: `/cookies`
- Done: `/gift-cards`
- Done: `/reviews`
  - Done: includes backend-driven approved reviews and URL pagination with 12 reviews per page.

### Done: Legacy duplicate pages need removal or redirect

These routes duplicate newer account/payment flows or use old/static behavior:

- Done: `/dashboard`
- Done: `/profile`
- Done: `/settings`
- Done: `/order-success`

Completed: routes were removed, auth fallback was updated to `/account`, and admin links no longer point to the deleted routes.

### 4. Contact page is static

- `/contact`
  - Form is frontend-only.
  - Needs backend contact message table/API/admin inbox/email notification.

### Done: Checkout/address placeholders still need cleanup

- `/checkout`
  - Done: address and coupon placeholders were normalized.
  - Done: verified checkout page still builds after recent shipping/payment changes.

## Customer Account Remaining Work

### Done: Customer profile

- `/account/profile`
  - Done: avatar/profile picture upload was added.
  - Done: gender is select-based.
  - Done: profile completion is now calculated from real profile fields.

### Done: Customer orders

- `/account/orders`
- `/account/orders/[order]`
  - Done: Download invoice is implemented.
  - Done: Cancel order is implemented for eligible orders.
  - Done: Track order action links to the order timeline.
  - Done: Reorder action adds order items back to cart.

### Done: Customer notifications

- `/account/notifications`
  - Mark read exists.
  - Done: Delete notification is implemented.
  - Done: Notification preferences are saved through account settings.

### Done: Customer reviews

- `/account/reviews`
  - Done: review edit is implemented.
  - Done: review delete is implemented.
  - Done: edited reviews are moved back to pending approval.
  - Done: review status remains visible.

### Done: Customer settings

- `/account/settings`
  - Done: Account preferences are expanded.
  - Done: Password update has separate loading state from preference toggles.

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
  - Done: old review image/vote DB tables and models were permanently removed:
    - `product_review_images`
    - `product_review_votes`
    - `ProductReviewImage`
    - `ProductReviewVote`

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
  - Done: old `/order-success` route was removed.

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
- Done: Storefront search/deals once made dynamic

### 26. Existing test issue

`php artisan test --filter=Product` previously failed because of duplicate `collections.slug = new-arrivals` in test/seed data.

Needs test fixture cleanup before relying on full backend test suite.
