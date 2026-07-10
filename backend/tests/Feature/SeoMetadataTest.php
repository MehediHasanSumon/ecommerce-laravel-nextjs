<?php

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Settings\CompanySetting;
use App\Models\Settings\SeoSetting;
use App\Models\Tag;
use Illuminate\Support\Facades\Cache;

beforeEach(function (): void {
    Cache::flush();
    config(['app.url' => 'https://store.test', 'app.name' => 'Fallback Store']);
});

it('serves the company favicon from global seo defaults with a cache-busting version', function (): void {
    $company = CompanySetting::query()->create([
        'company_name' => 'Sumon Store',
        'favicon' => 'settings/company/favicon.svg',
        'updated_at' => now()->setTimestamp(1234567890),
    ]);
    SeoSetting::query()->create([
        'site_title' => 'Sumon Store',
        'canonical_url' => 'https://shop.example.com',
    ]);

    $this->getJson('/api/seo/defaults')
        ->assertOk()
        ->assertJsonPath('data.metadata.siteName', 'Sumon Store')
        ->assertJsonPath('data.metadata.favicon', url('/storage/settings/company/favicon.svg').'?v='.$company->updated_at->timestamp);
});

it('generates product seo metadata automatically when no custom seo override exists', function (): void {
    SeoSetting::query()->create([
        'site_title' => 'Sumon Store',
        'meta_description' => 'Default store description',
        'canonical_url' => 'https://shop.example.com',
        'og_image' => 'settings/seo/default-og.png',
    ]);
    CompanySetting::query()->create(['company_name' => 'Sumon Store']);
    $brand = Brand::query()->create(['name' => 'Apple', 'slug' => 'apple', 'status' => 'active']);
    $category = Category::query()->create(['name' => 'Mobile Phones', 'slug' => 'mobile-phones', 'status' => 'active']);
    $tag = Tag::query()->create(['name' => 'Flagship', 'slug' => 'flagship']);
    $product = Product::query()->create([
        'brand_id' => $brand->id,
        'category_id' => $category->id,
        'name' => 'iPhone 16 Pro',
        'slug' => 'iphone-16-pro',
        'short_description' => 'A premium phone with a titanium design.',
        'description' => 'Long product description.',
        'status' => 'active',
        'base_price_cents' => 99900,
        'currency' => 'BDT',
        'published_at' => now(),
    ]);
    $product->tags()->sync([$tag->id]);
    ProductImage::query()->create([
        'product_id' => $product->id,
        'url' => 'products/iphone.jpg',
        'is_primary' => true,
        'sort_order' => 0,
    ]);

    $response = $this->getJson('/api/seo/product/iphone-16-pro');

    $response
        ->assertOk()
        ->assertJsonPath('data.metadata.title', 'iPhone 16 Pro | Sumon Store')
        ->assertJsonPath('data.metadata.description', 'A premium phone with a titanium design.')
        ->assertJsonPath('data.metadata.canonicalUrl', 'https://shop.example.com/products/iphone-16-pro')
        ->assertJsonPath('data.metadata.openGraph.image', url('/storage/products/iphone.jpg'))
        ->assertJsonPath('data.metadata.twitter.image', url('/storage/products/iphone.jpg'))
        ->assertJsonPath('data.metadata.openGraph.type', 'product');

    expect($response->json('data.metadata.keywords'))
        ->toContain('iphone')
        ->toContain('apple')
        ->toContain('mobile')
        ->toContain('flagship');
});

it('uses product seo overrides when custom metadata is saved', function (): void {
    SeoSetting::query()->create([
        'site_title' => 'Sumon Store',
        'canonical_url' => 'https://shop.example.com',
    ]);
    CompanySetting::query()->create(['company_name' => 'Sumon Store']);
    $product = Product::query()->create([
        'name' => 'iPhone 16 Pro',
        'slug' => 'iphone-16-pro',
        'short_description' => 'Automatic description.',
        'status' => 'active',
        'base_price_cents' => 99900,
        'currency' => 'BDT',
        'published_at' => now(),
    ]);
    $product->seo()->create([
        'meta_title' => 'Custom iPhone SEO',
        'meta_description' => 'Custom SEO description.',
        'meta_keywords' => 'custom, apple',
        'canonical_url' => 'https://shop.example.com/custom-iphone',
        'og_image_url' => 'seo/custom-iphone.png',
    ]);

    $this->getJson('/api/seo/product/iphone-16-pro')
        ->assertOk()
        ->assertJsonPath('data.metadata.title', 'Custom iPhone SEO | Sumon Store')
        ->assertJsonPath('data.metadata.description', 'Custom SEO description.')
        ->assertJsonPath('data.metadata.keywords', 'custom, apple')
        ->assertJsonPath('data.metadata.canonicalUrl', 'https://shop.example.com/custom-iphone')
        ->assertJsonPath('data.metadata.openGraph.image', url('/storage/seo/custom-iphone.png'));
});

it('invalidates generated product metadata after product updates', function (): void {
    SeoSetting::query()->create([
        'site_title' => 'Sumon Store',
        'canonical_url' => 'https://shop.example.com',
    ]);
    CompanySetting::query()->create(['company_name' => 'Sumon Store']);
    $product = Product::query()->create([
        'name' => 'Old Product Name',
        'slug' => 'cached-product',
        'short_description' => 'Original description.',
        'status' => 'active',
        'base_price_cents' => 10000,
        'currency' => 'BDT',
        'published_at' => now(),
    ]);

    $this->getJson('/api/seo/product/cached-product')
        ->assertOk()
        ->assertJsonPath('data.metadata.title', 'Old Product Name | Sumon Store');

    app(\App\Services\Admin\ProductModuleService::class)->update('products', $product->id, [
        'name' => 'Updated Product Name',
        'short_description' => 'Updated generated description.',
        'description' => 'Updated generated description.',
        'product_type' => 'physical',
        'status' => 'active',
        'base_price_cents' => 10000,
        'currency' => 'BDT',
        'track_inventory' => true,
        'stock_quantity' => 5,
        'images' => [],
        'tags' => [],
        'attribute_values' => [],
        'features' => [],
        'specifications' => [],
        'variants' => [],
        'seo' => null,
    ]);

    $this->getJson('/api/seo/product/cached-product')
        ->assertOk()
        ->assertJsonPath('data.metadata.title', 'Updated Product Name | Sumon Store')
        ->assertJsonPath('data.metadata.description', 'Updated generated description.');
});
