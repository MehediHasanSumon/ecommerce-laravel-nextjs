<?php

use App\Models\Order;
use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

function customerManagementAdminToken(): string
{
    $permission = Permission::query()->firstOrCreate([
        'name' => 'can_view_customer',
        'guard_name' => 'web',
    ]);
    $admin = User::factory()->create();
    $admin->givePermissionTo($permission);

    return $admin->createToken('customer-management-access', ['access'], now()->addMinutes(15))->plainTextToken;
}

it('returns registered customer details with serialized order history', function (): void {
    $customerRole = Role::query()->firstOrCreate([
        'name' => 'user',
        'guard_name' => 'web',
    ]);
    $customer = User::factory()->create([
        'name' => 'Registered Customer',
        'phone' => '01700000000',
        'status' => 'active',
    ]);
    $customer->assignRole($customerRole);

    Order::query()->create([
        'order_number' => 'ORD-CUSTOMER-001',
        'user_id' => $customer->id,
        'status' => 'confirmed',
        'payment_status' => 'paid',
        'shipping_status' => 'processing',
        'payment_method' => 'cash_on_delivery',
        'currency' => 'BDT',
        'subtotal_cents' => 15000,
        'item_discount_cents' => 500,
        'coupon_discount_cents' => 0,
        'shipping_cents' => 1000,
        'tax_cents' => 0,
        'total_cents' => 15500,
        'billing_address' => ['full_name' => $customer->name, 'phone' => $customer->phone],
        'shipping_address' => ['full_name' => $customer->name, 'phone' => $customer->phone],
        'summary_snapshot' => [],
        'placed_at' => now(),
    ]);

    $this->withToken(customerManagementAdminToken())
        ->getJson("/api/admin/customers/registered-{$customer->id}")
        ->assertOk()
        ->assertJsonPath('data.customer.name', 'Registered Customer')
        ->assertJsonPath('data.customer.total_orders', 1)
        ->assertJsonPath('data.customer.lifetime_spending', 155)
        ->assertJsonPath('data.customer.orders.0.orderNumber', 'ORD-CUSTOMER-001')
        ->assertJsonPath('data.customer.orders.0.customer.name', 'Registered Customer')
        ->assertJsonPath('data.customer.orders.0.summary.total', 155);
});
