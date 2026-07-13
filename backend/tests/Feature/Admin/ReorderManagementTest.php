<?php

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\Settings\BrandSetting;
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

    $this->getJson('/api/settings/navigation')
        ->assertOk()
        ->assertJsonPath('data.categories.0.slug', 'third')
        ->assertJsonPath('data.categories.1.slug', 'first')
        ->assertJsonPath('data.categories.2.slug', 'second');
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

it('uses brand drag order on the public brand catalog', function (): void {
    $token = reorderAdminToken(['can_edit_brand']);
    BrandSetting::query()->create(['enabled' => true, 'show_on_home' => true]);
    $first = Brand::query()->create(['name' => 'Alpha', 'slug' => 'alpha', 'status' => 'active', 'sort_order' => 0]);
    $second = Brand::query()->create(['name' => 'Beta', 'slug' => 'beta', 'status' => 'active', 'sort_order' => 1]);

    foreach ([$first, $second] as $brand) {
        Product::query()->create([
            'brand_id' => $brand->id,
            'name' => $brand->name.' Product',
            'slug' => $brand->slug.'-product',
            'status' => 'active',
            'product_type' => 'physical',
            'sku' => strtoupper($brand->slug),
            'base_price_cents' => 1000,
            'currency' => 'BDT',
            'track_inventory' => false,
            'published_at' => now(),
        ]);
    }

    $this->withToken($token)->postJson('/api/admin/product-management/brands/reorder', [
        'items' => [
            ['id' => $second->id, 'sort_order' => 0],
            ['id' => $first->id, 'sort_order' => 1],
        ],
    ])->assertOk();

    $this->getJson('/api/brands')
        ->assertOk()
        ->assertJsonPath('data.items.0.slug', 'beta')
        ->assertJsonPath('data.items.1.slug', 'alpha');
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
