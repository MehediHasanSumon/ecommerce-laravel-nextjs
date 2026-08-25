<?php

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\IpBlock;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SecurityAttempt;
use App\Models\Settings\PaymentGatewaySetting;
use App\Models\Settings\SecuritySetting;
use App\Models\Settings\ShippingMethod;
use App\Models\Settings\ShippingZone;
use App\Models\User;
use App\Services\Security\CheckoutSecurityService;
use App\Services\Security\IpBlockStateService;
use Illuminate\Support\Facades\Cache;

beforeEach(function (): void {
    Cache::flush();
    SecuritySetting::query()->updateOrCreate(['scope' => 'global'], [
        'auto_blocking_enabled' => true,
        'enable_checkout_security' => true,
        'enable_cod_security' => true,
        'enable_payment_security' => true,
        'auto_block_critical_ips' => false,
        'max_failed_login_attempts' => 5,
        'max_password_reset_attempts' => 5,
        'max_payment_failures' => 3,
        'failed_cod_threshold' => 3,
        'time_window_minutes' => 10,
        'temporary_block_duration_minutes' => 30,
        'permanent_block_threshold' => 3,
    ]);

    PaymentGatewaySetting::query()->updateOrCreate(
        ['gateway' => 'cash_on_delivery'],
        ['enabled' => true, 'name' => 'Cash On Delivery', 'display_order' => 1]
    );
});

function createTestProduct(): Product
{
    $product = Product::query()->create([
        'name' => 'Test Security Product',
        'slug' => 'test-security-product-'.uniqid(),
        'status' => 'active',
        'published_at' => now()->subDay(),
        'pricing_mode' => 'global',
        'base_price_cents' => 25000,
        'track_inventory' => true,
        'stock_quantity' => 100,
    ]);

    ProductVariant::query()->create([
        'product_id' => $product->id,
        'sku' => 'SEC-PROD-'.uniqid(),
        'is_primary' => true,
        'status' => 'active',
        'track_inventory' => true,
        'stock_quantity' => 100,
    ]);

    return $product;
}

function createTestShippingMethod(): ShippingMethod
{
    $zone = ShippingZone::query()->firstOrCreate(
        ['name' => 'Bangladesh Zone'],
        ['countries' => ['Bangladesh', 'BD'], 'is_active' => true]
    );

    return ShippingMethod::query()->create([
        'shipping_zone_id' => $zone->id,
        'code' => 'standard-'.uniqid(),
        'name' => 'Standard Delivery',
        'rate_cents' => 6000,
        'status' => true,
    ]);
}

it('allows normal browsing, searching, and cart operations without recording api_request abuse or blocking IP', function (): void {
    $product = createTestProduct();
    $testIp = '198.51.100.88';
    $guestToken = 'guest-token-'.uniqid();

    // 1. Browse products
    for ($i = 0; $i < 5; $i++) {
        $this->withServerVariables(['REMOTE_ADDR' => $testIp])
            ->getJson('/api/products')
            ->assertOk();
    }

    // 2. View single product
    $this->withServerVariables(['REMOTE_ADDR' => $testIp])
        ->getJson("/api/products/{$product->slug}")
        ->assertOk();

    // 3. Cart operations
    $this->withServerVariables(['REMOTE_ADDR' => $testIp])
        ->withHeader('X-Guest-Token', $guestToken)
        ->getJson('/api/cart')
        ->assertOk();

    $this->withServerVariables(['REMOTE_ADDR' => $testIp])
        ->withHeader('X-Guest-Token', $guestToken)
        ->postJson('/api/cart/items', [
            'product_id' => $product->id,
            'quantity' => 2,
        ])
        ->assertOk();

    // Verify no IP block was created
    expect(IpBlock::query()->where('ip_address', $testIp)->exists())->toBeFalse();
    // Verify no api_request abuse attempt was logged
    expect(SecurityAttempt::query()->where('ip_address', $testIp)->where('event_type', 'api_request')->exists())->toBeFalse();
});

it('rejects checkout from an already blocked IP with a generic message', function (): void {
    $blockedIp = '198.51.100.99';
    IpBlock::query()->create([
        'ip_address' => $blockedIp,
        'ip_version' => 4,
        'type' => 'manual',
        'status' => 'active',
        'reason' => 'Previous Malicious Activity',
        'blocked_at' => now(),
        'block_count' => 1,
    ]);

    $this->withServerVariables(['REMOTE_ADDR' => $blockedIp])
        ->postJson('/api/checkout/place-order', [
            'payment_method' => 'cash_on_delivery',
        ])
        ->assertForbidden()
        ->assertJsonPath('message', 'Your request could not be completed at this time. Please contact support if you believe this is an error.');
});

it('does not block IP after a single payment failure but tracks failures until threshold', function (): void {
    $testIp = '198.51.100.111';
    $service = app(CheckoutSecurityService::class);
    $request = request();
    $request->server->set('REMOTE_ADDR', $testIp);

    // 1st failure - No block
    $service->recordPaymentFailure($request, null, 'bkash', 'Invalid OTP');
    expect(app(IpBlockStateService::class)->isBlocked($testIp))->toBeFalse();

    // 2nd failure - No block
    $service->recordPaymentFailure($request, null, 'bkash', 'Insufficient balance');
    expect(app(IpBlockStateService::class)->isBlocked($testIp))->toBeFalse();

    // 3rd failure (threshold = 3) - Automatically blocks IP
    $service->recordPaymentFailure($request, null, 'bkash', 'Transaction limit exceeded');
    expect(app(IpBlockStateService::class)->isBlocked($testIp))->toBeTrue();
    expect(IpBlock::query()->where('ip_address', $testIp)->where('status', 'active')->exists())->toBeTrue();
});

it('restricts COD when customer has exceeded failed COD threshold', function (): void {
    $user = User::factory()->create(['phone' => '01812345678']);
    $shippingMethod = createTestShippingMethod();
    $product = createTestProduct();

    // Create 3 previously returned/cancelled COD orders
    for ($i = 0; $i < 3; $i++) {
        Order::query()->create([
            'order_number' => 'ORD-OLD-'.$i.'-'.uniqid(),
            'user_id' => $user->id,
            'payment_method' => 'cash_on_delivery',
            'status' => 'cancelled',
            'shipping_status' => 'returned',
            'subtotal_cents' => 10000,
            'total_cents' => 16000,
            'currency' => 'BDT',
            'billing_address' => ['phone' => '01812345678', 'full_name' => 'COD Abuser'],
            'shipping_address' => ['phone' => '01812345678', 'full_name' => 'COD Abuser'],
            'summary_snapshot' => [],
        ]);
    }

    $cart = Cart::query()->create(['user_id' => $user->id, 'status' => 'active']);
    CartItem::query()->create([
        'cart_id' => $cart->id,
        'item_key' => 'item-'.uniqid(),
        'product_id' => $product->id,
        'product_variant_id' => $product->variants->first()->id,
        'quantity' => 1,
        'unit_price_cents' => 25000,
        'line_subtotal_cents' => 25000,
        'selection_snapshot' => [],
        'pricing_snapshot' => [],
        'tax_snapshot' => [],
    ]);

    $response = $this->actingAs($user)
        ->postJson('/api/checkout/place-order', [
            'payment_method' => 'cash_on_delivery',
            'shipping_method_id' => $shippingMethod->id,
            'billing_address' => [
                'full_name' => 'COD Abuser',
                'phone' => '01812345678',
                'country' => 'Bangladesh',
                'state' => 'Dhaka',
                'district' => 'Dhaka',
                'city' => 'Dhaka',
                'address_line' => 'House 1, Road 2',
            ],
            'same_as_billing' => true,
        ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors('payment_method');

    // Verify cart items are STILL intact
    expect(CartItem::query()->where('cart_id', $cart->id)->count())->toBe(1);
});

it('rejects critical risk checkout attempts, preserves the cart, and optionally blocks the IP', function (): void {
    SecuritySetting::query()->updateOrCreate(['scope' => 'global'], [
        'auto_block_critical_ips' => true,
        'auto_blocking_enabled' => true,
        'max_payment_failures' => 3,
    ]);

    \App\Models\Settings\StoreSetting::query()->updateOrCreate(['scope' => 'global'], [
        'fraud_auto_reject_critical_risk_orders' => true,
        'fraud_critical_score_threshold' => 85,
    ]);

    $user = User::factory()->create(['phone' => '01912345678']);
    $shippingMethod = createTestShippingMethod();
    $product = createTestProduct();
    $testIp = '198.51.100.222';

    // Simulate 3 payment failures from this IP to push internal risk score into critical range (>= 85)
    $service = app(CheckoutSecurityService::class);
    $req = request();
    $req->server->set('REMOTE_ADDR', $testIp);
    for ($i = 0; $i < 3; $i++) {
        $service->recordPaymentFailure($req, null, 'sslcommerz', 'Failed card attempt');
    }

    $cart = Cart::query()->create(['user_id' => $user->id, 'status' => 'active']);
    CartItem::query()->create([
        'cart_id' => $cart->id,
        'item_key' => 'item-'.uniqid(),
        'product_id' => $product->id,
        'product_variant_id' => $product->variants->first()->id,
        'quantity' => 1,
        'unit_price_cents' => 25000,
        'line_subtotal_cents' => 25000,
        'selection_snapshot' => [],
        'pricing_snapshot' => [],
        'tax_snapshot' => [],
    ]);

    $response = $this->actingAs($user)
        ->withServerVariables(['REMOTE_ADDR' => $testIp])
        ->postJson('/api/checkout/place-order', [
            'payment_method' => 'cash_on_delivery',
            'shipping_method_id' => $shippingMethod->id,
            'billing_address' => [
                'full_name' => 'Abuse User',
                'phone' => '01912345678',
                'country' => 'Bangladesh',
                'state' => 'Dhaka',
                'district' => 'Dhaka',
                'city' => 'Dhaka',
                'address_line' => 'House 9, Road 9',
            ],
            'same_as_billing' => true,
        ]);

    $response->assertForbidden()
        ->assertJsonPath('message', 'Your request could not be completed at this time. Please contact support if you believe this is an error.');

    // Cart is preserved!
    expect(CartItem::query()->where('cart_id', $cart->id)->count())->toBe(1);

    // IP is blocked due to critical risk and payment failure threshold!
    expect(app(IpBlockStateService::class)->isBlocked($testIp))->toBeTrue();
});

