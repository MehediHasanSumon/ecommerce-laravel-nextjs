<?php

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

function productImagePayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Image Pipeline Product',
        'short_description' => 'A product created to verify image upload handling.',
        'product_type' => 'physical',
        'status' => 'draft',
        'pricing_mode' => Product::PRICING_MODE_GLOBAL,
        'base_price_cents' => 1500,
        'compare_at_price_cents' => null,
        'cost_price_cents' => null,
        'track_inventory' => true,
        'stock_quantity' => 5,
        'low_stock_threshold' => 1,
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
    ], $overrides);
}

it('stores uploaded product images as storage paths and returns normalized image objects', function (): void {
    Storage::fake('public');

    $response = $this
        ->withToken(accessTokenWithPermissions(['can_create_product']))
        ->post('/api/admin/product-management/products', productImagePayload([
            'featured_image_file' => UploadedFile::fake()->image('featured.jpg', 800, 800),
        ]), ['Accept' => 'application/json']);

    $response->assertCreated();
    $payload = $response->json('data.item.images.0');

    expect($payload['path'] ?? null)
        ->toBeString()
        ->toStartWith('products/featured/')
        ->and($payload['url'] ?? null)
        ->toBeString()
        ->toContain('/storage/products/featured/');

    $image = ProductImage::query()->firstOrFail();

    expect($image->url)
        ->toStartWith('products/featured/')
        ->not->toContain('http')
        ->not->toContain('blob:');

    Storage::disk('public')->assertExists($image->url);
});

it('rejects browser blob URLs as product image paths', function (): void {
    $this
        ->withToken(accessTokenWithPermissions(['can_create_product']))
        ->postJson('/api/admin/product-management/products', productImagePayload([
            'images' => [[
                'url' => 'blob:https://prokritimartbd.com/a2af2345-f33e-40d1-90c2-ba09a4ef4184',
                'type' => 'featured',
                'sort_order' => 0,
                'is_primary' => true,
            ]],
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['images.0.url']);

    expect(ProductImage::query()->count())->toBe(0);
});

it('does not generate storage URLs for legacy invalid blob image records', function (): void {
    $product = Product::query()->create([
        'name' => 'Legacy Blob Product',
        'slug' => 'legacy-blob-product',
        'status' => 'active',
        'product_type' => 'physical',
        'pricing_mode' => Product::PRICING_MODE_GLOBAL,
        'base_price_cents' => 1500,
        'track_inventory' => true,
        'stock_quantity' => 5,
        'published_at' => now(),
        'currency' => 'BDT',
    ]);
    $product->images()->create([
        'url' => 'blob:https://prokritimartbd.com/a2af2345-f33e-40d1-90c2-ba09a4ef4184',
        'type' => 'featured',
        'sort_order' => 0,
        'is_primary' => true,
    ]);

    $this->getJson('/api/products')
        ->assertOk()
        ->assertJsonPath('data.items.0.images', [])
        ->assertJsonMissingPath('data.items.0.images.0.url')
        ->assertJsonMissing(['thumbnail' => 'http://localhost/storage/blob:https://prokritimartbd.com/a2af2345-f33e-40d1-90c2-ba09a4ef4184']);
});
