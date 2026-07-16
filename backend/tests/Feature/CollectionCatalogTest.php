<?php

use App\Models\Product;
use App\Models\ProductCollection;

function collectionProduct(array $overrides = []): Product
{
    return Product::query()->create(array_merge([
        'name' => 'Test Product',
        'slug' => 'test-product-'.uniqid(),
        'status' => 'active',
        'sku' => 'SKU-'.uniqid(),
        'product_type' => 'physical',
        'base_price_cents' => 10000,
        'currency' => 'USD',
        'track_inventory' => true,
        'stock_quantity' => 10,
        'is_featured' => false,
        'is_new' => false,
        'is_best_seller' => false,
        'is_flash_sale' => false,
        'rating_average' => 4.5,
        'review_count' => 3,
        'published_at' => now(),
    ], $overrides));
}

it('serves active manual collections with promotional pricing', function (): void {
    $product = collectionProduct();
    $collection = ProductCollection::query()->create([
        'name' => 'Black Friday',
        'slug' => 'black-friday',
        'type' => 'manual',
        'collection_type' => 'manual',
        'status' => 'active',
        'show_on_home' => true,
        'product_limit' => 4,
        'priority' => 90,
        'display_position_anchor' => 'products',
        'display_position_placement' => 'before',
        'discount_enabled' => true,
        'discount_type' => 'percentage',
        'discount_value' => 20,
        'starts_at' => now()->subDay(),
        'ends_at' => now()->addDay(),
    ]);
    $collection->products()->sync([$product->id => ['sort_order' => 0]]);

    $this->getJson('/api/collections/black-friday')
        ->assertOk()
        ->assertJsonPath('data.collection.slug', 'black-friday')
        ->assertJsonPath('data.products.0.price', 80)
        ->assertJsonPath('data.products.0.originalPrice', 100);
});

it('hides expired collections from public pages', function (): void {
    ProductCollection::query()->create([
        'name' => 'Expired',
        'slug' => 'expired',
        'type' => 'manual',
        'collection_type' => 'manual',
        'status' => 'active',
        'display_position_anchor' => 'products',
        'display_position_placement' => 'before',
        'starts_at' => now()->subDays(2),
        'ends_at' => now()->subDay(),
    ]);

    $this->getJson('/api/collections/expired')->assertNotFound();
});

it('returns home collections separately from independent products section', function (): void {
    collectionProduct(['is_new' => true]);
    ProductCollection::query()->updateOrCreate(['slug' => 'new-arrivals'], [
        'name' => 'New Arrivals',
        'slug' => 'new-arrivals',
        'type' => 'automatic',
        'collection_type' => 'smart',
        'rule_key' => 'new_arrivals',
        'status' => 'active',
        'show_on_home' => true,
        'display_position_anchor' => 'products',
        'display_position_placement' => 'before',
        'home_sort_order' => 10,
        'product_limit' => 4,
    ]);

    $this->getJson('/api/home-page')
        ->assertOk()
        ->assertJsonPath('data.collections.0.collection.slug', 'new-arrivals')
        ->assertJsonStructure(['data' => ['sections' => ['products']]]);
});
