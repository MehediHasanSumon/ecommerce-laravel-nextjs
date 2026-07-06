<?php

use App\Models\CustomerAddress;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Product;
use App\Models\Settings\PaymentGatewaySetting;
use App\Models\Settings\ShippingMethod;
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
    $shipping = ShippingMethod::query()->create([
        'name' => 'Home Delivery',
        'code' => 'home-delivery-'.uniqid(),
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
