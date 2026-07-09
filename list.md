# Project Remaining Work Audit

Scope: authorization/permission policy work বাদ দিয়ে এই তালিকা করা হয়েছে। নিচের আইটেমগুলো frontend page, backend flow, static/mock data, integration, cleanup, and production polish হিসেবে বাকি আছে।

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
