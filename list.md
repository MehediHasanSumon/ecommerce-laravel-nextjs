# Project Remaining Work Audit

Scope: authorization/permission policy work বাদ দিয়ে এই তালিকা করা হয়েছে। নিচের আইটেমগুলো frontend page, backend flow, static/mock data, integration, cleanup, and production polish হিসেবে বাকি আছে।

## Admin Remaining Work

### Order management needs next production layer

- `/admin/orders`
- `/admin/orders/[order]`
  - Invoice generation/download missing.
  - Refund workflow missing.
  - Shipment/courier tracking missing.
  - Shipping logs are not implemented.
  - Bulk order actions are not implemented.
  - Admin notes UI exists partially in backend but not fully surfaced.

### Product/review cleanup

- `/admin/reviews`
  - Reply system exists now, but no separate threaded/multiple replies.

### Settings pages with placeholder/future text

- `/admin/settings/sms`
  - Firebase phone auth is still described as placeholder.
  - Custom SMS has example URL default.

- `/admin/settings/payment`
  - Some gateway implementations are configuration-driven, but not all are equally production-complete.
  - Settings navigation description still mentions placeholder/future providers.

### Admin module UX consistency follow-up

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

### Rocket

- `RocketService` explicitly returns unavailable.
- Needs official merchant API adapter only if Rocket official API is available.

### bKash/Nagad verification hardening

- bKash and Nagad services exist.
- Need official-doc re-check, signature validation hardening, webhook/callback replay prevention, and live sandbox test proof.

### Stripe/PayPal production features

- Need webhook event coverage audit.
- Refund support missing.
- Payment retry UX needs full gateway-specific testing.

## Backend/Data Cleanup

### Seed/demo data cleanup

Some seeders still use `example.com`, fake users, fake products, fake reviews, fake canonical URLs.

This is fine for local demo, but production seed profile should separate:

- Demo seeders
- Production defaults
- Test fixtures

## Testing Gaps

### Automated coverage still incomplete

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

### Existing test issue

`php artisan test --filter=Product` previously failed because of duplicate `collections.slug = new-arrivals` in test/seed data.

Needs test fixture cleanup before relying on full backend test suite.
