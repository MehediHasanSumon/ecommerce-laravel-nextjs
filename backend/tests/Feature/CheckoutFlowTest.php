<?php

use App\Models\CustomerAddress;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Product;
use App\Models\Settings\PaymentGatewaySetting;
use App\Models\Settings\ShippingMethod;
use App\Models\Settings\ShippingZone;
use App\Models\User;

function checkoutUserToken(User $user): string
{
    return $user->createToken('access-token', ['access'], now()->addMinutes(15))->plainTextToken;
}

function checkoutProduct(array $overrides = []): Product
{
    return Product::query()->create(array_merge([
        'name' => 'Checkout Product',
        'slug' => 'checkout-product-'.uniqid(),
        'status' => 'active',
        'sku' => 'CHK-'.uniqid(),
        'product_type' => 'physical',
        'base_price_cents' => 120000,
        'currency' => 'BDT',
        'track_inventory' => true,
        'stock_quantity' => 10,
        'published_at' => now(),
    ], $overrides));
}

function checkoutShippingMethod(array $overrides = []): ShippingMethod
{
    $zone = ShippingZone::query()->create([
        'name' => 'Bangladesh',
        'countries' => ['Bangladesh'],
        'status' => true,
    ]);

    return ShippingMethod::query()->create(array_merge([
        'shipping_zone_id' => $zone->id,
        'name' => 'Home Delivery',
        'code' => 'home-delivery-'.uniqid(),
        'type' => 'flat_rate',
        'rate_cents' => 8000,
        'status' => true,
    ], $overrides));
}

it('manages customer addresses with billing and shipping defaults', function (): void {
    $user = User::factory()->create();
    $token = checkoutUserToken($user);

    $payload = [
        'fullName' => 'Ada Lovelace',
        'phone' => '+8801700000000',
        'email' => 'ada@example.test',
        'country' => 'Bangladesh',
        'state' => 'Dhaka',
        'district' => 'Dhaka',
        'city' => 'Dhaka',
        'area' => 'Dhanmondi',
        'postalCode' => '1205',
        'addressLine' => 'House 12, Road 8',
        'isDefaultBilling' => true,
        'isDefaultShipping' => true,
    ];

    $this->withToken($token)->postJson('/api/addresses', $payload)
        ->assertCreated()
        ->assertJsonPath('data.address.isDefaultBilling', true)
        ->assertJsonPath('data.address.isDefaultShipping', true);

    expect(CustomerAddress::query()->where('user_id', $user->id)->count())->toBe(1);

    $this->withToken($token)->getJson('/api/addresses')
        ->assertOk()
        ->assertJsonPath('data.items.0.fullName', 'Ada Lovelace');
});

it('places a cash on delivery order from the cart with server-side totals', function (): void {
    $user = User::factory()->create();
    $token = checkoutUserToken($user);
    $product = checkoutProduct();
    $shipping = checkoutShippingMethod();
    PaymentGatewaySetting::query()->create([
        'gateway' => 'cash_on_delivery',
        'enabled' => true,
        'sandbox_mode' => true,
        'display_order' => 0,
    ]);

    $this->withToken($token)->postJson('/api/cart/items', [
        'product_id' => $product->id,
        'quantity' => 2,
    ])->assertOk();

    $response = $this->withToken($token)->postJson('/api/checkout/place-order', [
        'billing_address' => [
            'fullName' => 'Ada Lovelace',
            'phone' => '+8801700000000',
            'country' => 'Bangladesh',
            'state' => 'Dhaka',
            'district' => 'Dhaka',
            'city' => 'Dhaka',
            'addressLine' => 'House 12, Road 8',
        ],
        'same_as_billing' => true,
        'shipping_method_id' => $shipping->id,
        'payment_method' => 'cash_on_delivery',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.payment.status', 'pending')
        ->assertJsonPath('data.order.paymentStatus', 'pending')
        ->assertJsonPath('data.order.summary.total', 2480);

    expect(Order::query()->count())->toBe(1)
        ->and(PaymentTransaction::query()->where('gateway', 'cash_on_delivery')->where('status', 'pending')->exists())->toBeTrue();
});

it('places checkout using a saved customer address id', function (): void {
    $user = User::factory()->create();
    $token = checkoutUserToken($user);
    $product = checkoutProduct();
    $shipping = checkoutShippingMethod();
    PaymentGatewaySetting::query()->create([
        'gateway' => 'cash_on_delivery',
        'enabled' => true,
        'sandbox_mode' => true,
        'display_order' => 0,
    ]);

    $address = CustomerAddress::query()->create([
        'user_id' => $user->id,
        'full_name' => 'Saved Customer',
        'phone' => '+8801700000001',
        'email' => 'saved@example.test',
        'country' => 'Bangladesh',
        'state' => 'Dhaka',
        'district' => 'Dhaka',
        'city' => 'Dhaka',
        'area' => 'Uttara',
        'postal_code' => '1230',
        'address_line' => 'House 99, Road 10',
        'is_default_billing' => true,
        'is_default_shipping' => true,
    ]);

    $this->withToken($token)->postJson('/api/cart/items', [
        'product_id' => $product->id,
        'quantity' => 1,
    ])->assertOk();

    $this->withToken($token)->postJson('/api/checkout/place-order', [
        'billing_address_id' => $address->id,
        'same_as_billing' => true,
        'shipping_method_id' => $shipping->id,
        'payment_method' => 'cash_on_delivery',
    ])->assertCreated()
        ->assertJsonPath('data.payment.status', 'pending');

    $order = Order::query()->firstOrFail();

    expect($order->billing_address['full_name'])->toBe('Saved Customer')
        ->and($order->billing_address['address_line'])->toBe('House 99, Road 10')
        ->and($order->shipping_address['full_name'])->toBe('Saved Customer')
        ->and($order->shipping_address['address_line'])->toBe('House 99, Road 10');
});

it('reuses duplicate customer addresses instead of creating a new record', function (): void {
    $user = User::factory()->create();
    $token = checkoutUserToken($user);

    $payload = [
        'fullName' => 'Md Mehedi Hasan',
        'phone' => '+8801711111111',
        'country' => 'Bangladesh',
        'state' => 'Dhaka',
        'district' => 'Dhaka',
        'city' => 'Dhanmondi',
        'postalCode' => '1205',
        'addressLine' => 'House 12, Road 8',
        'isDefaultBilling' => true,
    ];

    $firstId = $this->withToken($token)->postJson('/api/addresses', $payload)
        ->assertCreated()
        ->json('data.address.id');

    $secondId = $this->withToken($token)->postJson('/api/addresses', [
        ...$payload,
        'fullName' => '  md mehedi hasan  ',
        'addressLine' => 'House 12,   Road 8',
        'isDefaultShipping' => true,
    ])
        ->assertCreated()
        ->json('data.address.id');

    expect($secondId)->toBe($firstId)
        ->and(CustomerAddress::query()->where('user_id', $user->id)->count())->toBe(1)
        ->and(CustomerAddress::query()->first()->is_default_shipping)->toBeTrue();
});

it('saves an inline checkout address to the customer address book', function (): void {
    $user = User::factory()->create();
    $token = checkoutUserToken($user);
    $product = checkoutProduct();
    $shipping = checkoutShippingMethod();
    PaymentGatewaySetting::query()->create([
        'gateway' => 'cash_on_delivery',
        'enabled' => true,
        'sandbox_mode' => true,
        'display_order' => 0,
    ]);

    $this->withToken($token)->postJson('/api/cart/items', [
        'product_id' => $product->id,
        'quantity' => 1,
    ])->assertOk();

    $this->withToken($token)->postJson('/api/checkout/place-order', [
        'billing_address' => [
            'fullName' => 'Nusrat Jahan',
            'phone' => '+8801811111111',
            'country' => 'Bangladesh',
            'state' => 'Chattogram',
            'district' => 'Chattogram',
            'city' => 'Panchlaish',
            'postalCode' => '4000',
            'addressLine' => 'Road 2, House 4',
        ],
        'same_as_billing' => true,
        'shipping_method_id' => $shipping->id,
        'payment_method' => 'cash_on_delivery',
    ])->assertCreated()
        ->assertJsonPath('data.payment.status', 'pending');

    $address = CustomerAddress::query()->where('user_id', $user->id)->firstOrFail();
    $order = Order::query()->firstOrFail();

    expect(CustomerAddress::query()->where('user_id', $user->id)->count())->toBe(1)
        ->and($address->full_name)->toBe('Nusrat Jahan')
        ->and($order->billing_address['full_name'])->toBe('Nusrat Jahan')
        ->and($order->billing_address['address_line'])->toBe('Road 2, House 4');
});

it('rejects checkout when required address fields are missing or invalid', function (): void {
    $user = User::factory()->create();
    $token = checkoutUserToken($user);
    $product = checkoutProduct();
    $shipping = checkoutShippingMethod();
    PaymentGatewaySetting::query()->create([
        'gateway' => 'cash_on_delivery',
        'enabled' => true,
        'sandbox_mode' => true,
        'display_order' => 0,
    ]);

    $this->withToken($token)->postJson('/api/cart/items', [
        'product_id' => $product->id,
        'quantity' => 1,
    ])->assertOk();

    $this->withToken($token)->postJson('/api/checkout/place-order', [
        'billing_address' => [
            'fullName' => '',
            'phone' => '12345',
            'country' => 'Bangladesh',
            'state' => '',
            'district' => '',
            'city' => '',
            'addressLine' => '',
        ],
        'same_as_billing' => true,
        'shipping_method_id' => $shipping->id,
        'payment_method' => 'cash_on_delivery',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors([
            'billing_address.fullName',
            'billing_address.phone',
            'billing_address.state',
            'billing_address.district',
            'billing_address.city',
            'billing_address.addressLine',
        ]);
});

it('prevents checkout with another users saved address', function (): void {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $token = checkoutUserToken($user);
    $product = checkoutProduct();
    $shipping = checkoutShippingMethod();
    PaymentGatewaySetting::query()->create([
        'gateway' => 'cash_on_delivery',
        'enabled' => true,
        'sandbox_mode' => true,
        'display_order' => 0,
    ]);

    $address = CustomerAddress::query()->create([
        'user_id' => $otherUser->id,
        'full_name' => 'Other Customer',
        'phone' => '+8801911111111',
        'country' => 'Bangladesh',
        'state' => 'Dhaka',
        'district' => 'Dhaka',
        'city' => 'Mirpur',
        'address_line' => 'House 5',
    ]);

    $this->withToken($token)->postJson('/api/cart/items', [
        'product_id' => $product->id,
        'quantity' => 1,
    ])->assertOk();

    $this->withToken($token)->postJson('/api/checkout/place-order', [
        'billing_address_id' => $address->id,
        'same_as_billing' => true,
        'shipping_method_id' => $shipping->id,
        'payment_method' => 'cash_on_delivery',
    ])->assertNotFound();
});

it('rejects paypal checkout when company currency is unsupported instead of crashing', function (): void {
    $user = User::factory()->create();
    $token = checkoutUserToken($user);
    $product = checkoutProduct();
    $shipping = checkoutShippingMethod([
        'code' => 'paypal-home-delivery-'.uniqid(),
    ]);
    PaymentGatewaySetting::query()->create([
        'gateway' => 'paypal',
        'enabled' => true,
        'sandbox_mode' => true,
        'public_key' => 'client-id',
        'secret_key' => 'client-secret',
        'display_order' => 0,
    ]);

    $this->withToken($token)->postJson('/api/cart/items', [
        'product_id' => $product->id,
        'quantity' => 1,
    ])->assertOk();

    $this->withToken($token)->postJson('/api/checkout/place-order', [
        'billing_address' => [
            'fullName' => 'Ada Lovelace',
            'phone' => '+8801700000000',
            'country' => 'Bangladesh',
            'state' => 'Dhaka',
            'district' => 'Dhaka',
            'city' => 'Dhaka',
            'addressLine' => 'House 12, Road 8',
        ],
        'same_as_billing' => true,
        'shipping_method_id' => $shipping->id,
        'payment_method' => 'paypal',
    ])->assertStatus(422)
        ->assertJsonPath('message', 'PayPal does not support BDT. Please use a PayPal-supported company currency such as USD.');
});

it('restores inventory and reverses coupon redemption on payment cancellation callback', function (): void {
    $user = User::factory()->create();
    $token = checkoutUserToken($user);
    $product = checkoutProduct(['stock_quantity' => 10]);
    $shipping = checkoutShippingMethod();
    $gatewaySetting = PaymentGatewaySetting::query()->create([
        'gateway' => 'bkash',
        'enabled' => true,
        'sandbox_mode' => true,
        'public_key' => 'bkash-user',
        'secret_key' => 'bkash-secret',
        'api_key' => 'bkash-api-key',
        'merchant_id' => 'bkash-merchant',
        'display_order' => 0,
    ]);

    $coupon = \App\Models\Discount::query()->create([
        'name' => 'SAVE10',
        'code' => 'SAVE10',
        'type' => 'fixed_cart',
        'value' => 1000,
        'status' => 'active',
        'total_used' => 0,
        'starts_at' => now()->subDay(),
        'ends_at' => now()->addDays(5),
    ]);

    $this->withToken($token)->postJson('/api/cart/items', [
        'product_id' => $product->id,
        'quantity' => 2,
    ])->assertOk();

    $this->withToken($token)->postJson('/api/cart/coupon', ['code' => 'SAVE10'])->assertOk();

    \Illuminate\Support\Facades\Http::fake([
        '*/tokenized/checkout/create' => \Illuminate\Support\Facades\Http::response([
            'bkashURL' => 'https://sandbox.bkash.com/pay',
            'paymentID' => 'BKASH_PAY_12345',
        ]),
        '*/tokenized/checkout/token/grant' => \Illuminate\Support\Facades\Http::response([
            'id_token' => 'mock-id-token',
        ]),
    ]);

    $orderResponse = $this->withToken($token)->postJson('/api/checkout/place-order', [
        'billing_address' => [
            'fullName' => 'Ada Lovelace',
            'phone' => '+8801700000000',
            'country' => 'Bangladesh',
            'state' => 'Dhaka',
            'district' => 'Dhaka',
            'city' => 'Dhaka',
            'addressLine' => 'House 12, Road 8',
        ],
        'same_as_billing' => true,
        'shipping_method_id' => $shipping->id,
        'payment_method' => 'bkash',
    ])->assertCreated();

    // Verify stock was decremented from 10 to 8 and coupon was used
    expect($product->fresh()->stock_quantity)->toBe(8);
    expect($coupon->fresh()->total_used)->toBe(1);

    $orderNumber = $orderResponse->json('data.order.orderNumber');
    $order = Order::query()->where('order_number', $orderNumber)->firstOrFail();
    $transaction = PaymentTransaction::query()->where('order_id', $order->id)->firstOrFail();

    // Customer cancels at bKash payment gateway
    $callbackResponse = $this->get('/api/payments/bkash/callback/cancel?paymentID=BKASH_PAY_12345&status=cancel');
    $callbackResponse->assertRedirect();

    // Verify stock is restored to 10 and coupon total_used reversed to 0
    expect($product->fresh()->stock_quantity)->toBe(10);
    expect($coupon->fresh()->total_used)->toBe(0);
    expect($order->fresh()->status)->toBe('cancelled');
    expect($order->fresh()->inventory_released_at)->not->toBeNull();

    // Verify idempotency: calling releaseItems a second time does not double restore
    app(\App\Services\Orders\OrderCreator::class)->releaseItems($order->fresh());
    expect($product->fresh()->stock_quantity)->toBe(10);
});

it('rejects unscoped payment callbacks with no transaction identifiers', function (): void {
    $response = $this->get('/api/payments/bkash/callback/cancel');
    $response->assertStatus(400);
});
