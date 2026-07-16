<?php

use App\Models\GuestCustomer;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;

function trackingOrder(array $overrides = []): Order
{
    $product = Product::query()->create([
        'name' => 'Tracked Product',
        'slug' => 'tracked-product-'.uniqid(),
        'status' => 'active',
        'sku' => 'TRACK-'.uniqid(),
        'product_type' => 'physical',
        'base_price_cents' => 150000,
        'currency' => 'BDT',
        'track_inventory' => false,
        'published_at' => now(),
    ]);

    $order = Order::query()->create(array_merge([
        'order_number' => 'ORD-20260716-TRACK123',
        'status' => 'shipped',
        'payment_status' => 'paid',
        'shipping_status' => 'shipped',
        'payment_method' => 'cash_on_delivery',
        'shipping_method_name' => 'Express Delivery',
        'currency' => 'BDT',
        'subtotal_cents' => 150000,
        'item_discount_cents' => 0,
        'coupon_discount_cents' => 0,
        'shipping_cents' => 10000,
        'tax_cents' => 0,
        'total_cents' => 160000,
        'billing_address' => ['full_name' => 'Tracking Customer', 'phone' => '01712345678', 'country' => 'Bangladesh', 'state' => 'Dhaka', 'district' => 'Dhaka', 'city' => 'Dhaka', 'address_line' => 'Road 1'],
        'shipping_address' => ['full_name' => 'Tracking Customer', 'phone' => '01712345678', 'country' => 'Bangladesh', 'state' => 'Dhaka', 'district' => 'Dhaka', 'city' => 'Dhaka', 'address_line' => 'Road 1'],
        'summary_snapshot' => [],
        'placed_at' => now(),
    ], $overrides));

    $order->items()->create([
        'product_id' => $product->id,
        'product_name' => $product->name,
        'sku' => $product->sku,
        'quantity' => 1,
        'unit_price_cents' => 150000,
        'line_subtotal_cents' => 150000,
        'line_discount_cents' => 0,
    ]);

    return $order;
}

it('tracks registered customer orders using order id and mobile number', function (): void {
    $user = User::factory()->create(['name' => 'Registered Customer', 'phone' => '01712345678']);
    trackingOrder(['user_id' => $user->id]);

    $this->postJson('/api/order-tracking', [
        'order_id' => 'ord-20260716-track123',
        'mobile_number' => '+8801712345678',
    ])->assertOk()
        ->assertJsonPath('data.order.orderId', 'ORD-20260716-TRACK123')
        ->assertJsonPath('data.order.customer.name', 'Registered Customer')
        ->assertJsonPath('data.order.status', 'shipped')
        ->assertJsonMissingPath('data.order.id')
        ->assertJsonMissingPath('data.order.userId');
});

it('tracks guest customer orders with the same public experience', function (): void {
    $guest = GuestCustomer::query()->create([
        'name' => 'Guest Customer',
        'phone' => '01712345678',
        'status' => 'active',
    ]);
    trackingOrder(['guest_customer_id' => $guest->id]);

    $this->postJson('/api/order-tracking', [
        'order_id' => 'ORD-20260716-TRACK123',
        'mobile_number' => '01712345678',
    ])->assertOk()
        ->assertJsonPath('data.order.customer.name', 'Guest Customer')
        ->assertJsonPath('data.order.items.0.name', 'Tracked Product');
});

it('returns the same generic response when either tracking credential is wrong', function (): void {
    trackingOrder();

    foreach ([
        ['order_id' => 'ORD-20260716-WRONG123', 'mobile_number' => '01712345678'],
        ['order_id' => 'ORD-20260716-TRACK123', 'mobile_number' => '01812345678'],
    ] as $payload) {
        $this->postJson('/api/order-tracking', $payload)
            ->assertNotFound()
            ->assertJsonPath('message', 'No order was found with the provided Order ID and Mobile Number.');
    }
});

it('requires valid order tracking credentials', function (): void {
    $this->postJson('/api/order-tracking', [
        'order_id' => 'invalid',
        'mobile_number' => '12',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['order_id', 'mobile_number']);
});
