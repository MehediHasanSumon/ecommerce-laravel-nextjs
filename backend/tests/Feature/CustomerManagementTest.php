<?php

use App\Models\Customer;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Spatie\Permission\Models\Permission;

beforeEach(function (): void {
    Cache::flush();
});

function customerAdminAccessToken(): string
{
    $permissions = [
        'can_view_customer',
        'can_create_customer',
        'can_edit_customer',
        'can_delete_customer',
    ];

    foreach ($permissions as $permission) {
        Permission::query()->firstOrCreate([
            'name' => $permission,
            'guard_name' => 'web',
        ]);
    }

    $user = User::factory()->create();
    $user->givePermissionTo($permissions);

    return $user->createToken('access-token', ['access'], now()->addMinutes(15))->plainTextToken;
}

it('lists customers with pagination, search, and status filter', function (): void {
    $token = customerAdminAccessToken();

    Customer::query()->create([
        'name' => 'Sakib Al Hasan',
        'mobile' => '01711111111',
        'email' => 'sakib@example.com',
        'address' => 'Mirpur, Dhaka',
        'status' => 'active',
    ]);
    Customer::query()->create([
        'name' => 'Tamim Iqbal',
        'mobile' => '01822222222',
        'email' => 'tamim@example.com',
        'address' => 'Kazir Dewri, Chattogram',
        'status' => 'inactive',
    ]);

    $response = $this->withToken($token)
        ->getJson('/api/admin/customers')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                'customers' => [
                    '*' => ['id', 'name', 'mobile', 'email', 'address', 'status', 'due', 'total_orders', 'created_at'],
                ],
            ],
            'meta' => ['pagination'],
        ]);

    expect(count($response->json('data.customers')))->toBeGreaterThanOrEqual(2);

    // Search by mobile
    $searchResponse = $this->withToken($token)
        ->getJson('/api/admin/customers?search=01711111111')
        ->assertOk();
    expect(count($searchResponse->json('data.customers')))->toBe(1);
    expect($searchResponse->json('data.customers.0.name'))->toBe('Sakib Al Hasan');

    // Filter by status
    $statusResponse = $this->withToken($token)
        ->getJson('/api/admin/customers?status=inactive')
        ->assertOk();
    expect(collect($statusResponse->json('data.customers'))->pluck('name'))->toContain('Tamim Iqbal');
});

it('creates a new customer manually', function (): void {
    $token = customerAdminAccessToken();

    $payload = [
        'name' => 'Mushfiqur Rahim',
        'mobile' => '01733333333',
        'email' => 'mushfiq@example.com',
        'address' => 'Bogura, Bangladesh',
        'status' => 'active',
    ];

    $this->withToken($token)
        ->postJson('/api/admin/customers', $payload)
        ->assertStatus(201)
        ->assertJsonPath('data.customer.name', 'Mushfiqur Rahim')
        ->assertJsonPath('data.customer.mobile', '01733333333')
        ->assertJsonPath('data.customer.status', 'active');

    $this->assertDatabaseHas('customers', [
        'name' => 'Mushfiqur Rahim',
        'mobile' => '01733333333',
        'email' => 'mushfiq@example.com',
    ]);
});

it('rejects duplicate mobile number when creating a customer', function (): void {
    $token = customerAdminAccessToken();

    Customer::query()->create([
        'name' => 'Existing Customer',
        'mobile' => '01744444444',
        'status' => 'active',
    ]);

    $this->withToken($token)
        ->postJson('/api/admin/customers', [
            'name' => 'Duplicate Mobile User',
            'mobile' => '01744444444',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['mobile']);

    // Also with standard BD +880 prefix normalization
    $this->withToken($token)
        ->postJson('/api/admin/customers', [
            'name' => 'Duplicate Mobile With Country Code',
            'mobile' => '+8801744444444',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['mobile']);
});

it('allows customer to update own details keeping own mobile', function (): void {
    $token = customerAdminAccessToken();

    $customer = Customer::query()->create([
        'name' => 'Mahmudullah Riyad',
        'mobile' => '01755555555',
        'status' => 'active',
    ]);

    $this->withToken($token)
        ->putJson("/api/admin/customers/{$customer->id}", [
            'name' => 'Mahmudullah Riyad (Updated)',
            'mobile' => '01755555555',
            'email' => 'riyad@example.com',
            'address' => 'Mymensingh, Bangladesh',
            'status' => 'inactive',
        ])
        ->assertOk()
        ->assertJsonPath('data.customer.name', 'Mahmudullah Riyad (Updated)')
        ->assertJsonPath('data.customer.status', 'inactive');

    expect($customer->fresh()->email)->toBe('riyad@example.com');
});

it('prevents customer from updating to another existing customer mobile', function (): void {
    $token = customerAdminAccessToken();

    $customer1 = Customer::query()->create([
        'name' => 'Customer One',
        'mobile' => '01766666661',
        'status' => 'active',
    ]);
    $customer2 = Customer::query()->create([
        'name' => 'Customer Two',
        'mobile' => '01766666662',
        'status' => 'active',
    ]);

    $this->withToken($token)
        ->putJson("/api/admin/customers/{$customer2->id}", [
            'name' => 'Customer Two',
            'mobile' => '01766666661', // Belongs to customer1
            'status' => 'active',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['mobile']);
});

it('deletes customer without orders and protects customer with orders', function (): void {
    $token = customerAdminAccessToken();

    $customerWithoutOrders = Customer::query()->create([
        'name' => 'No Order Customer',
        'mobile' => '01777777771',
        'status' => 'active',
    ]);

    $this->withToken($token)
        ->deleteJson("/api/admin/customers/{$customerWithoutOrders->id}")
        ->assertOk();

    $this->assertDatabaseMissing('customers', ['id' => $customerWithoutOrders->id]);

    $customerWithOrders = Customer::query()->create([
        'name' => 'With Order Customer',
        'mobile' => '01777777772',
        'status' => 'active',
    ]);

    Order::query()->create([
        'order_number' => 'ORD-TEST-CUSTOMER-1',
        'customer_id' => $customerWithOrders->id,
        'status' => 'pending',
        'payment_status' => 'pending',
        'payment_method' => 'cash_on_delivery',
        'currency' => 'BDT',
        'subtotal_cents' => 50000,
        'total_cents' => 50000,
        'billing_address' => ['full_name' => 'With Order Customer', 'phone' => '01777777772', 'address_line' => 'Dhaka'],
        'shipping_address' => ['full_name' => 'With Order Customer', 'phone' => '01777777772', 'address_line' => 'Dhaka'],
        'summary_snapshot' => [],
    ]);

    $this->withToken($token)
        ->deleteJson("/api/admin/customers/{$customerWithOrders->id}")
        ->assertStatus(422);

    $this->assertDatabaseHas('customers', ['id' => $customerWithOrders->id]);
});
