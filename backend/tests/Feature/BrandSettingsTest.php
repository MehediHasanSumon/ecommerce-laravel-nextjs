<?php

use App\Models\Brand;
use App\Models\Product;
use App\Models\Settings\BrandSetting;
use App\Models\User;

function brandSettingsAdminToken(): string
{
    return User::factory()
        ->create()
        ->createToken('brand-settings-access-token', ['access'], now()->addMinutes(15))
        ->plainTextToken;
}

it('updates brand settings and exposes them in runtime navigation', function () {
    $token = brandSettingsAdminToken();

    $this->withToken($token)->putJson('/api/admin/settings/home-page', [
        'home' => [
            'enable_product_section' => true,
            'products_per_section' => 20,
            'enable_testimonial_section' => true,
        ],
        'categories' => [
            'enable_home_category_section' => true,
            'category_display_mode' => 'landing_page',
        ],
        'brand' => [
            'enabled' => false,
            'show_on_home' => true,
        ],
    ])->assertOk()
        ->assertJsonPath('data.settings.brand.enabled', false)
        ->assertJsonPath('data.settings.brand.show_on_home', false);

    $navigation = $this->getJson('/api/settings/navigation')
        ->assertOk()
        ->assertJsonPath('data.brand_settings.enabled', false)
        ->assertJsonPath('data.brand_settings.show_on_home', false);

    expect(collect($navigation->json('data.navigation.frontend'))->pluck('href')->all())
        ->not->toContain('/brands');
});

it('hides public brand routes and home brand section when disabled', function () {
    BrandSetting::query()->create(['enabled' => false, 'show_on_home' => false]);
    $brand = Brand::query()->create([
        'name' => 'Acme',
        'slug' => 'acme',
        'status' => 'active',
        'is_featured' => true,
    ]);
    Product::query()->create([
        'brand_id' => $brand->id,
        'name' => 'Acme Shirt',
        'slug' => 'acme-shirt',
        'status' => 'active',
        'product_type' => 'physical',
        'sku' => 'ACME-001',
        'base_price_cents' => 1000,
        'currency' => 'USD',
        'track_inventory' => false,
        'published_at' => now(),
    ]);

    $this->getJson('/api/brands')->assertNotFound();
    $this->getJson('/api/brands/acme')->assertNotFound();
    $this->getJson('/api/home-page')
        ->assertOk()
        ->assertJsonPath('data.sections.topBrands.enabled', false)
        ->assertJsonPath('data.sections.topBrands.items', []);
});

it('allows product creation without brand while brand module is disabled', function () {
    BrandSetting::query()->create(['enabled' => false, 'show_on_home' => false]);

    $this->withToken(brandSettingsAdminToken())->postJson('/api/admin/product-management/products', [
        'name' => 'No Brand Product',
        'short_description' => 'Created without a brand.',
        'product_type' => 'physical',
        'status' => 'draft',
        'base_price_cents' => 1500,
        'track_inventory' => true,
        'stock_quantity' => 5,
        'is_featured' => false,
        'is_new' => false,
        'is_best_seller' => false,
        'is_flash_sale' => false,
        'free_shipping' => false,
        'tags' => [],
        'attribute_values' => [],
        'images' => [],
        'features' => [],
        'specifications' => [],
        'variants' => [],
    ])->assertCreated()
        ->assertJsonPath('data.item.brand_id', null);

    $this->assertDatabaseHas('products', [
        'name' => 'No Brand Product',
        'brand_id' => null,
        'currency' => 'BDT',
    ]);
});
