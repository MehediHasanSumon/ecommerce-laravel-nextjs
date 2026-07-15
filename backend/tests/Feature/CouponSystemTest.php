<?php

use App\Models\Category;
use App\Models\Discount;
use App\Models\DiscountUserUsage;
use App\Models\Product;
use App\Models\ProductCollection;
use App\Models\Settings\PaymentGatewaySetting;
use App\Models\Settings\ShippingMethod;
use App\Models\Settings\ShippingZone;
use App\Models\User;

function couponProduct(array $overrides = []): Product
{
    return Product::query()->create(array_merge([
        'name' => 'Coupon Product',
        'slug' => 'coupon-product-'.uniqid(),
        'status' => 'active',
        'sku' => 'CPN-'.uniqid(),
        'product_type' => 'physical',
        'base_price_cents' => 100000,
        'currency' => 'BDT',
        'track_inventory' => true,
        'stock_quantity' => 20,
        'published_at' => now(),
    ], $overrides));
}

function couponRecord(array $overrides = []): Discount
{
    return Discount::query()->create(array_merge([
        'name' => 'Coupon',
        'code' => 'SAVE'.strtoupper(substr(uniqid(), -6)),
        'type' => 'percentage',
        'value' => 10,
        'status' => 'active',
        'total_used' => 0,
    ], $overrides));
}

function couponGuestHeaders(?string $token = null): array
{
    return [
        'X-Guest-Token' => $token ?? 'coupon-guest-'.uniqid(),
        'X-Cart-Mode' => 'guest',
    ];
}

function addCouponCartItem($test, Product $product, array $headers, int $quantity = 1): void
{
    $test->withHeaders($headers)->postJson('/api/cart/items', [
        'product_id' => $product->id,
        'quantity' => $quantity,
    ])->assertOk();
}

it('applies percentage and fixed coupons with caps using money-safe calculations', function (): void {
    $headers = couponGuestHeaders();
    $product = couponProduct();
    addCouponCartItem($this, $product, $headers, 2);

    $percentage = couponRecord([
        'code' => 'PERCENT20',
        'type' => 'percentage',
        'value' => 20,
        'maximum_discount' => 25000,
    ]);

    $this->withHeaders($headers)->postJson('/api/cart/coupon', ['code' => $percentage->code])
        ->assertOk()
        ->assertJsonPath('data.cart.summary.couponDiscount', 250)
        ->assertJsonPath('data.cart.summary.total', 1750)
        ->assertJsonPath('data.cart.notice.message', 'Coupon Applied Successfully');

    $fixed = couponRecord([
        'code' => 'FIXED150',
        'type' => 'fixed',
        'value' => 15000,
    ]);

    $this->withHeaders($headers)->postJson('/api/cart/coupon', ['code' => $fixed->code])
        ->assertOk()
        ->assertJsonPath('data.cart.summary.couponDiscount', 150)
        ->assertJsonPath('data.cart.summary.total', 1850);
});

it('returns specific messages for missing, future, expired, minimum, and exhausted coupons', function (): void {
    $headers = couponGuestHeaders();
    addCouponCartItem($this, couponProduct(), $headers);

    $this->withHeaders($headers)->postJson('/api/cart/coupon', ['code' => 'MISSING'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['code'])
        ->assertJsonPath('errors.code.0', 'Coupon not found.');

    foreach ([
        ['code' => 'FUTURE', 'starts_at' => now()->addDay(), 'message' => 'Coupon is not active yet.'],
        ['code' => 'EXPIRED', 'ends_at' => now()->subSecond(), 'message' => 'Coupon expired.'],
        ['code' => 'MINIMUM', 'minimum_order_amount' => 200000, 'message' => 'Minimum order amount is ৳2,000.'],
        ['code' => 'EXHAUSTED', 'usage_limit' => 1, 'total_used' => 1, 'message' => 'Coupon usage limit reached.'],
    ] as $case) {
        $message = $case['message'];
        unset($case['message']);
        couponRecord($case);

        $this->withHeaders($headers)->postJson('/api/cart/coupon', ['code' => $case['code']])
            ->assertUnprocessable()
            ->assertJsonPath('errors.code.0', $message);
    }
});

it('enforces product, category, and collection coupon restrictions', function (): void {
    $category = Category::query()->create([
        'name' => 'Eligible Category',
        'slug' => 'eligible-category',
        'status' => 'active',
    ]);
    $eligible = couponProduct(['category_id' => $category->id]);
    $other = couponProduct();

    $productCoupon = couponRecord(['code' => 'PRODUCTONLY']);
    $productCoupon->products()->sync([$eligible->id]);

    $categoryCoupon = couponRecord(['code' => 'CATEGORYONLY']);
    $categoryCoupon->categories()->sync([$category->id]);

    $collection = ProductCollection::query()->create([
        'name' => 'Eligible Collection',
        'slug' => 'eligible-collection',
        'status' => 'active',
        'type' => 'manual',
        'collection_type' => 'manual',
    ]);
    $collection->products()->sync([$eligible->id => ['sort_order' => 0]]);
    $collectionCoupon = couponRecord(['code' => 'COLLECTIONONLY']);
    $collectionCoupon->collections()->sync([$collection->id]);

    foreach ([$productCoupon, $categoryCoupon, $collectionCoupon] as $coupon) {
        $eligibleHeaders = couponGuestHeaders();
        addCouponCartItem($this, $eligible, $eligibleHeaders);
        $this->withHeaders($eligibleHeaders)->postJson('/api/cart/coupon', ['code' => $coupon->code])
            ->assertOk()
            ->assertJsonPath('data.cart.summary.couponDiscount', 100);

        $otherHeaders = couponGuestHeaders();
        addCouponCartItem($this, $other, $otherHeaders);
        $this->withHeaders($otherHeaders)->postJson('/api/cart/coupon', ['code' => $coupon->code])
            ->assertUnprocessable()
            ->assertJsonPath('errors.code.0', 'Coupon is not applicable to selected products.');
    }
});

it('supports free shipping and recalculates against the selected method', function (): void {
    $zone = ShippingZone::query()->create([
        'name' => 'Coupon Zone',
        'countries' => ['Bangladesh'],
        'status' => true,
    ]);
    $shipping = ShippingMethod::query()->create([
        'shipping_zone_id' => $zone->id,
        'name' => 'Express',
        'code' => 'coupon-express',
        'type' => 'flat_rate',
        'rate_cents' => 12000,
        'status' => true,
    ]);
    $coupon = couponRecord([
        'code' => 'FREESHIP',
        'type' => 'fixed',
        'value' => 0,
        'free_shipping' => true,
    ]);
    $headers = couponGuestHeaders();
    addCouponCartItem($this, couponProduct(), $headers);

    $this->withHeaders($headers)->postJson('/api/cart/coupon', [
        'code' => $coupon->code,
        'shipping_method_id' => $shipping->id,
    ])->assertOk()
        ->assertJsonPath('data.cart.coupon.freeShipping', true)
        ->assertJsonPath('data.cart.coupon.shippingDiscount', 120);
});

it('enforces authenticated per-customer usage limits', function (): void {
    $user = User::factory()->create();
    $token = $user->createToken('coupon-test', ['access'])->plainTextToken;
    $coupon = couponRecord(['code' => 'ONCEONLY', 'usage_per_customer' => 1]);
    DiscountUserUsage::query()->create([
        'discount_id' => $coupon->id,
        'user_id' => $user->id,
        'usage_count' => 1,
        'last_used_at' => now(),
    ]);

    $this->withToken($token)->postJson('/api/cart/items', [
        'product_id' => couponProduct()->id,
        'quantity' => 1,
    ])->assertOk();

    $this->withToken($token)->postJson('/api/cart/coupon', ['code' => $coupon->code])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code.0', 'You have already used this coupon the maximum number of times.');
});

it('revalidates and records coupon redemption during order creation', function (): void {
    $user = User::factory()->create();
    $token = $user->createToken('coupon-checkout', ['access'])->plainTextToken;

    $zone = ShippingZone::query()->create([
        'name' => 'Checkout Coupon Zone',
        'countries' => ['Bangladesh'],
        'status' => true,
    ]);
    $shipping = ShippingMethod::query()->create([
        'shipping_zone_id' => $zone->id,
        'name' => 'Home Delivery',
        'code' => 'coupon-checkout-delivery',
        'type' => 'flat_rate',
        'rate_cents' => 8000,
        'status' => true,
    ]);
    PaymentGatewaySetting::query()->create([
        'gateway' => 'cash_on_delivery',
        'enabled' => true,
        'sandbox_mode' => true,
        'display_order' => 0,
    ]);
    $coupon = couponRecord([
        'code' => 'CHECKOUT10',
        'usage_limit' => 2,
        'usage_per_customer' => 1,
    ]);

    $this->withToken($token)->postJson('/api/cart/items', [
        'product_id' => couponProduct()->id,
        'quantity' => 1,
    ])->assertOk();
    $this->withToken($token)->postJson('/api/cart/coupon', [
        'code' => $coupon->code,
        'shipping_method_id' => $shipping->id,
    ])->assertOk();

    $this->withToken($token)->postJson('/api/checkout/place-order', [
        'billing_address' => [
            'fullName' => 'Coupon Customer',
            'phone' => '+8801700000000',
            'country' => 'Bangladesh',
            'state' => 'Dhaka',
            'district' => 'Dhaka',
            'city' => 'Dhaka',
            'addressLine' => 'House 10, Road 2',
        ],
        'same_as_billing' => true,
        'shipping_method_id' => $shipping->id,
        'payment_method' => 'cash_on_delivery',
    ])->assertCreated()
        ->assertJsonPath('data.order.summary.couponDiscount', 100);

    expect($coupon->fresh()->total_used)->toBe(1)
        ->and(DiscountUserUsage::query()
            ->where('discount_id', $coupon->id)
            ->where('user_id', $user->id)
            ->value('usage_count'))->toBe(1);
});

it('rejects checkout when an applied coupon becomes invalid before order creation', function (): void {
    $user = User::factory()->create();
    $token = $user->createToken('coupon-strict-checkout', ['access'])->plainTextToken;
    $zone = ShippingZone::query()->create([
        'name' => 'Strict Coupon Zone',
        'countries' => ['Bangladesh'],
        'status' => true,
    ]);
    $shipping = ShippingMethod::query()->create([
        'shipping_zone_id' => $zone->id,
        'name' => 'Standard Delivery',
        'code' => 'strict-coupon-delivery',
        'type' => 'flat_rate',
        'rate_cents' => 8000,
        'status' => true,
    ]);
    PaymentGatewaySetting::query()->create([
        'gateway' => 'cash_on_delivery',
        'enabled' => true,
        'sandbox_mode' => true,
        'display_order' => 0,
    ]);
    $coupon = couponRecord(['code' => 'STRICT10']);

    $this->withToken($token)->postJson('/api/cart/items', [
        'product_id' => couponProduct()->id,
        'quantity' => 1,
    ])->assertOk();
    $this->withToken($token)->postJson('/api/cart/coupon', ['code' => $coupon->code])->assertOk();
    $coupon->update(['ends_at' => now()->subSecond()]);

    $this->withToken($token)->postJson('/api/checkout/place-order', [
        'billing_address' => [
            'fullName' => 'Strict Coupon Customer',
            'phone' => '+8801700000000',
            'country' => 'Bangladesh',
            'state' => 'Dhaka',
            'district' => 'Dhaka',
            'city' => 'Dhaka',
            'addressLine' => 'House 11, Road 3',
        ],
        'same_as_billing' => true,
        'shipping_method_id' => $shipping->id,
        'payment_method' => 'cash_on_delivery',
    ])->assertUnprocessable()
        ->assertJsonPath('errors.code.0', 'Coupon expired.');
});
