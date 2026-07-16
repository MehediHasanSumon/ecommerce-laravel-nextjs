<?php

use App\Models\Order;
use App\Models\PaymentTransaction;
use Illuminate\Support\Str;

function refundableOrder(array $overrides = []): Order
{
    return Order::query()->create(array_merge([
        'order_number' => 'ORD-REFUND-'.Str::upper(Str::random(10)),
        'status' => 'delivered',
        'payment_status' => 'paid',
        'shipping_status' => 'delivered',
        'payment_method' => 'stripe',
        'shipping_method_name' => 'Standard Delivery',
        'currency' => 'BDT',
        'subtotal_cents' => 100000,
        'item_discount_cents' => 0,
        'coupon_discount_cents' => 0,
        'shipping_cents' => 0,
        'tax_cents' => 0,
        'total_cents' => 100000,
        'billing_address' => ['full_name' => 'Refund Customer'],
        'shipping_address' => ['full_name' => 'Refund Customer'],
        'summary_snapshot' => [],
        'placed_at' => now(),
    ], $overrides));
}

it('creates an auditable pending refund request without changing payment state', function (): void {
    $order = refundableOrder();

    PaymentTransaction::query()->create([
        'transaction_key' => (string) Str::uuid(),
        'order_id' => $order->id,
        'gateway' => 'stripe',
        'status' => 'paid',
        'gateway_transaction_id' => 'pi_test_refund',
        'amount_cents' => $order->total_cents,
        'currency' => $order->currency,
        'paid_at' => now(),
    ]);

    $this->withToken(accessTokenWithPermissions(['can_edit_order']))
        ->postJson("/api/admin/orders/{$order->id}/refund", [
            'amount' => 250,
            'reason' => 'Customer request',
            'note' => 'Process through the provider dashboard.',
        ])
        ->assertOk()
        ->assertJsonPath('message', 'Refund request created successfully.')
        ->assertJsonPath('data.order.paymentStatus', 'paid')
        ->assertJsonPath('data.order.refunds.0.status', 'pending');

    $this->assertDatabaseHas('order_refunds', [
        'order_id' => $order->id,
        'amount_cents' => 25000,
        'status' => 'pending',
    ]);
    $this->assertDatabaseHas('order_status_histories', [
        'order_id' => $order->id,
        'type' => 'refund',
        'to_status' => 'pending',
        'title' => 'Refund requested',
    ]);

    expect($order->fresh()->payment_status)->toBe('paid');
});

it('rejects refund requests for orders that have not been paid', function (): void {
    $order = refundableOrder([
        'status' => 'pending',
        'payment_status' => 'pending',
        'shipping_status' => 'pending',
    ]);

    $this->withToken(accessTokenWithPermissions(['can_edit_order']))
        ->postJson("/api/admin/orders/{$order->id}/refund", [
            'amount' => 100,
            'reason' => 'Invalid refund attempt',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['order']);

    $this->assertDatabaseCount('order_refunds', 0);
});
