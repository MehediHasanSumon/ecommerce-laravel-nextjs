<?php

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;

function dashboardAdminToken(): string
{
    return User::factory()
        ->create()
        ->createToken('dashboard-access-token', ['access'], now()->addMinutes(15))
        ->plainTextToken;
}

it('serves live admin dashboard analytics from persisted data', function () {
    $product = Product::query()->create([
        'name' => 'Dashboard Product',
        'slug' => 'dashboard-product',
        'status' => 'active',
        'product_type' => 'physical',
        'sku' => 'DASH-001',
        'base_price_cents' => 2500,
        'currency' => 'USD',
        'track_inventory' => true,
        'stock_quantity' => 2,
        'low_stock_threshold' => 5,
        'published_at' => now(),
    ]);
    $order = Order::query()->create([
        'order_number' => 'ORD-DASH-001',
        'user_id' => User::factory()->create()->id,
        'status' => 'pending',
        'payment_status' => 'paid',
        'shipping_status' => 'pending',
        'payment_method' => 'cash_on_delivery',
        'currency' => 'USD',
        'subtotal_cents' => 5000,
        'item_discount_cents' => 0,
        'coupon_discount_cents' => 0,
        'shipping_cents' => 200,
        'tax_cents' => 0,
        'total_cents' => 5200,
        'billing_address' => ['name' => 'Dashboard Customer'],
        'shipping_address' => ['name' => 'Dashboard Customer'],
        'summary_snapshot' => [],
        'placed_at' => now(),
    ]);
    OrderItem::query()->create([
        'order_id' => $order->id,
        'product_id' => $product->id,
        'product_name' => $product->name,
        'sku' => $product->sku,
        'quantity' => 2,
        'unit_price_cents' => 2500,
        'line_subtotal_cents' => 5000,
        'line_discount_cents' => 0,
        'selection_snapshot' => [],
    ]);

    $this->withToken(dashboardAdminToken())
        ->getJson('/api/admin/dashboard?preset=today')
        ->assertOk()
        ->assertJsonPath('data.dashboard.sales.summary.revenue', 52)
        ->assertJsonPath('data.dashboard.sales.summary.orders', 1)
        ->assertJsonPath('data.dashboard.tables.best_selling_products.0.name', 'Dashboard Product')
        ->assertJsonPath('data.dashboard.tables.low_stock_products.0.name', 'Dashboard Product')
        ->assertJsonPath('data.dashboard.notifications.0.value', 1);
});
