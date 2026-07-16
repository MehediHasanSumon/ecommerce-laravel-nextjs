<?php

use App\Models\Product;
use App\Models\Settings\HomePageSetting;
use Illuminate\Support\Facades\Cache;

beforeEach(function (): void {
    Cache::flush();
});

function homePageSettingsAdminToken(): string
{
    return accessTokenWithPermissions(['can_edit_home_page_setting']);
}

function homePageSettingsProduct(int $index): Product
{
    return Product::query()->create([
        'name' => "Home Product {$index}",
        'slug' => "home-product-{$index}",
        'status' => 'active',
        'product_type' => 'physical',
        'sku' => "HOME-{$index}",
        'base_price_cents' => 1000 + $index,
        'currency' => 'BDT',
        'track_inventory' => false,
        'is_featured' => $index % 2 === 0,
        'published_at' => now()->subMinutes($index),
    ]);
}

it('updates home page settings and exposes runtime settings', function (): void {
    $token = homePageSettingsAdminToken();

    $this->withToken($token)->putJson('/api/admin/settings/home-page', [
        'home' => [
            'enable_product_section' => false,
            'products_per_section' => 12,
            'enable_testimonial_section' => false,
            'announcement_enabled' => true,
            'announcement_text' => 'Weekend deal is live.',
            'announcement_link_text' => 'Shop Now',
            'announcement_link_url' => '/shop',
        ],
        'categories' => [
            'enable_home_category_section' => true,
            'category_display_mode' => 'home_grid_navbar_dropdown',
        ],
        'brand' => [
            'enabled' => true,
            'show_on_home' => false,
        ],
    ])->assertOk()
        ->assertJsonPath('data.settings.home.enable_product_section', false)
        ->assertJsonPath('data.settings.home.products_per_section', 12)
        ->assertJsonPath('data.settings.home.enable_testimonial_section', false)
        ->assertJsonPath('data.settings.home.announcement_text', 'Weekend deal is live.')
        ->assertJsonPath('data.settings.categories.category_display_mode', 'home_grid_navbar_dropdown')
        ->assertJsonPath('data.settings.brand.show_on_home', false);

    $this->getJson('/api/settings/navigation')
        ->assertOk()
        ->assertJsonPath('data.home_page_settings.product_section.enabled', false)
        ->assertJsonPath('data.home_page_settings.product_section.limit', 12)
        ->assertJsonPath('data.home_page_settings.testimonial_section.enabled', false)
        ->assertJsonPath('data.home_page_settings.announcement_bar.text', 'Weekend deal is live.')
        ->assertJsonPath('data.home_page_settings.announcement_bar.link_url', '/shop');
});

it('applies product section visibility and limit to the home page API', function (): void {
    foreach (range(1, 14) as $index) {
        homePageSettingsProduct($index);
    }

    HomePageSetting::query()->create([
        'enable_product_section' => true,
        'products_per_section' => 8,
        'enable_testimonial_section' => false,
    ]);

    $this->getJson('/api/home-page')
        ->assertOk()
        ->assertJsonPath('data.sections.products.enabled', true)
        ->assertJsonCount(8, 'data.sections.products.items')
        ->assertJsonPath('data.sections.testimonials.enabled', false);

    HomePageSetting::query()->first()->update(['enable_product_section' => false]);
    Cache::flush();

    $this->getJson('/api/home-page')
        ->assertOk()
        ->assertJsonPath('data.sections.products.enabled', false)
        ->assertJsonPath('data.sections.products.items', []);
});

it('validates home page product limits', function (): void {
    $this->withToken(homePageSettingsAdminToken())->putJson('/api/admin/settings/home-page', [
        'home' => [
            'enable_product_section' => true,
            'products_per_section' => 99,
            'enable_testimonial_section' => true,
            'announcement_enabled' => true,
            'announcement_text' => 'Sale',
            'announcement_link_text' => 'Shop',
            'announcement_link_url' => '/shop',
        ],
        'categories' => [
            'enable_home_category_section' => true,
            'category_display_mode' => 'landing_page',
        ],
        'brand' => [
            'enabled' => true,
            'show_on_home' => true,
        ],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['home.products_per_section']);
});
