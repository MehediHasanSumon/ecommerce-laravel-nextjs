<?php

use App\Models\Category;
use App\Models\ProductAttribute;
use App\Models\Settings\ShippingMethod;
use App\Models\Settings\ShippingZone;
use App\Models\User;
use Spatie\Permission\Models\Permission;

function reorderAdminToken(array $permissions = []): string
{
    $user = User::factory()->create();

    foreach ($permissions as $permission) {
        Permission::query()->firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
    }

    $user->givePermissionTo($permissions);

    return $user
        ->createToken('reorder-access-token', ['access'], now()->addMinutes(15))
        ->plainTextToken;
}

it('reorders product management modules with continuous positions', function (): void {
    $token = reorderAdminToken(['can_edit_category']);
    $first = Category::query()->create(['name' => 'First', 'slug' => 'first', 'sort_order' => 0, 'home_display_order' => 0, 'navbar_display_order' => 0]);
    $second = Category::query()->create(['name' => 'Second', 'slug' => 'second', 'sort_order' => 1, 'home_display_order' => 1, 'navbar_display_order' => 1]);
    $third = Category::query()->create(['name' => 'Third', 'slug' => 'third', 'sort_order' => 2, 'home_display_order' => 2, 'navbar_display_order' => 2]);

    $this->withToken($token)->postJson('/api/admin/product-management/categories/reorder', [
        'items' => [
            ['id' => $third->id, 'sort_order' => 0],
            ['id' => $first->id, 'sort_order' => 1],
            ['id' => $second->id, 'sort_order' => 2],
        ],
    ])->assertOk()
        ->assertJsonPath('data.updated', 3);

    expect($third->refresh()->sort_order)->toBe(0)
        ->and($third->home_display_order)->toBe(0)
        ->and($third->navbar_display_order)->toBe(0)
        ->and($first->refresh()->sort_order)->toBe(1)
        ->and($second->refresh()->sort_order)->toBe(2);
});

it('validates duplicate reorder positions', function (): void {
    $token = reorderAdminToken(['can_edit_attribute']);
    $first = ProductAttribute::query()->create(['name' => 'Color', 'slug' => 'color', 'type' => 'color']);
    $second = ProductAttribute::query()->create(['name' => 'Size', 'slug' => 'size', 'type' => 'select']);

    $this->withToken($token)->postJson('/api/admin/product-management/attributes/reorder', [
        'items' => [
            ['id' => $first->id, 'sort_order' => 0],
            ['id' => $second->id, 'sort_order' => 0],
        ],
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['items.1.sort_order']);
});

it('reorders shipping zones and methods', function (): void {
    $token = reorderAdminToken(['can_edit_shipping_zone', 'can_edit_shipping_method']);
    $zoneA = ShippingZone::query()->create(['name' => 'A', 'countries' => ['BD'], 'status' => true, 'display_order' => 0]);
    $zoneB = ShippingZone::query()->create(['name' => 'B', 'countries' => ['US'], 'status' => true, 'display_order' => 1]);
    $methodA = ShippingMethod::query()->create([
        'shipping_zone_id' => $zoneA->id,
        'name' => 'Standard',
        'slug' => 'standard',
        'code' => 'standard',
        'type' => 'flat_rate',
        'delivery_type' => 'flat_rate',
        'rate_cents' => 100,
        'status' => true,
        'display_order' => 0,
    ]);
    $methodB = ShippingMethod::query()->create([
        'shipping_zone_id' => $zoneA->id,
        'name' => 'Express',
        'slug' => 'express',
        'code' => 'express',
        'type' => 'flat_rate',
        'delivery_type' => 'flat_rate',
        'rate_cents' => 200,
        'status' => true,
        'display_order' => 1,
    ]);

    $this->withToken($token)->postJson('/api/admin/shipping-zones/reorder', [
        'items' => [
            ['id' => $zoneB->id, 'sort_order' => 0],
            ['id' => $zoneA->id, 'sort_order' => 1],
        ],
    ])->assertOk();

    $this->withToken($token)->postJson('/api/admin/shipping-methods/reorder', [
        'items' => [
            ['id' => $methodB->id, 'sort_order' => 0],
            ['id' => $methodA->id, 'sort_order' => 1],
        ],
    ])->assertOk();

    expect($zoneB->refresh()->display_order)->toBe(0)
        ->and($zoneA->refresh()->display_order)->toBe(1)
        ->and($methodB->refresh()->display_order)->toBe(0)
        ->and($methodA->refresh()->display_order)->toBe(1);
});
