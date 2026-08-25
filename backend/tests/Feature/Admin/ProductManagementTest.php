<?php

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\ProductAttributeValue;
use App\Models\ProductSeo;
use App\Models\ProductVariant;
use App\Models\Tag;
use App\Services\Admin\ProductModuleService;

function createTestAttribute(string $name, array $values, bool $isVariantDefining = true): array
{
    $attribute = ProductAttribute::query()->create([
        'name' => $name,
        'slug' => str($name)->slug()->toString().'-'.uniqid(),
        'type' => 'select',
        'is_variant_defining' => $isVariantDefining,
    ]);

    $valModels = collect($values)
        ->map(fn (string $value): ProductAttributeValue => ProductAttributeValue::query()->create([
            'attribute_id' => $attribute->id,
            'value' => $value,
            'slug' => str($value)->slug()->toString().'-'.uniqid(),
        ]))
        ->all();

    return [$attribute, $valModels];
}

it('creates a simple product with auto-generated sku and seo metadata', function (): void {
    $category = Category::query()->create(['name' => 'Men Fashion', 'slug' => 'men-fashion-'.uniqid(), 'status' => 'active']);
    $tag = Tag::query()->create(['name' => 'Trending', 'slug' => 'trending-'.uniqid()]);

    $token = accessTokenWithPermissions(['can_create_product', 'can_view_product']);

    $response = $this->withToken($token)
        ->postJson('/api/admin/product-management/products', [
            'name' => 'Classic Cotton T-Shirt',
            'category_id' => $category->id,
            'status' => 'active',
            'description' => '<p>High quality 100% premium cotton t-shirt for daily comfort.</p>',
            'base_price_cents' => 50000,
            'compare_at_price_cents' => 60000,
            'cost_price_cents' => 30000,
            'stock_quantity' => 50,
            'track_inventory' => true,
            'tags' => [$tag->id],
        ]);

    $response->assertCreated();

    $productId = $response->json('data.item.id');
    $product = Product::query()->with(['seo', 'variants'])->findOrFail($productId);

    expect($product->name)->toBe('Classic Cotton T-Shirt')
        ->and($product->slug)->not->toBeEmpty()
        ->and($product->sku)->not->toBeEmpty()
        ->and($product->base_price_cents)->toBe(50000)
        ->and($product->compare_at_price_cents)->toBe(60000)
        ->and($product->cost_price_cents)->toBe(30000)
        ->and($product->stock_quantity)->toBe(50)
        ->and($product->seo)->not->toBeNull()
        ->and($product->seo->meta_title)->toContain('Classic Cotton T-Shirt')
        ->and($product->seo->meta_description)->toContain('High quality 100% premium cotton');
});

it('creates a variable product with cartesian variants, auto primary variant and auto skus', function (): void {
    [$colorAttr, [$black, $white]] = createTestAttribute('Color', ['Black', 'White']);
    [$sizeAttr, [$m, $l]] = createTestAttribute('Size', ['M', 'L']);

    $token = accessTokenWithPermissions(['can_create_product', 'can_view_product']);

    $response = $this->withToken($token)
        ->postJson('/api/admin/product-management/products', [
            'name' => 'Premium Polo Shirt',
            'status' => 'active',
            'description' => 'Comfortable polo shirt for all seasons.',
            'pricing_mode' => 'variant',
            'variants' => [
                [
                    'attribute_values' => [$black->id, $m->id],
                    'cost_price_cents' => 30000,
                    'compare_at_price_cents' => 60000,
                    'price_cents' => 50000,
                    'stock_quantity' => 10,
                    'is_primary' => true,
                    'status' => 'active',
                ],
                [
                    'attribute_values' => [$black->id, $l->id],
                    'cost_price_cents' => 30000,
                    'compare_at_price_cents' => 60000,
                    'price_cents' => 50000,
                    'stock_quantity' => 5,
                    'is_primary' => false,
                    'status' => 'active',
                ],
                [
                    'attribute_values' => [$white->id, $m->id],
                    'cost_price_cents' => 30000,
                    'compare_at_price_cents' => 60000,
                    'price_cents' => 50000,
                    'stock_quantity' => 8,
                    'is_primary' => false,
                    'status' => 'active',
                ],
                [
                    'attribute_values' => [$white->id, $l->id],
                    'cost_price_cents' => 30000,
                    'compare_at_price_cents' => 60000,
                    'price_cents' => 50000,
                    'stock_quantity' => 4,
                    'is_primary' => false,
                    'status' => 'active',
                ],
            ],
        ]);

    $response->assertCreated();

    $productId = $response->json('data.item.id');
    $product = Product::query()->with('variants.attributeValues')->findOrFail($productId);

    expect($product->variants)->toHaveCount(4);

    $primaryVariants = $product->variants->where('is_primary', true);
    expect($primaryVariants)->toHaveCount(1);

    // Each variant has a distinct generated SKU
    $skus = $product->variants->pluck('sku')->filter();
    expect($skus)->toHaveCount(4)
        ->and($skus->unique())->toHaveCount(4);
});

it('supports 3 attributes generating 12 variants', function (): void {
    [$colorAttr, [$c1, $c2]] = createTestAttribute('Color', ['Red', 'Blue']);
    [$sizeAttr, [$s1, $s2, $s3]] = createTestAttribute('Size', ['S', 'M', 'L']);
    [$capAttr, [$cap1, $cap2]] = createTestAttribute('Storage', ['64GB', '128GB']);

    $variants = [];
    foreach ([$c1, $c2] as $c) {
        foreach ([$s1, $s2, $s3] as $s) {
            foreach ([$cap1, $cap2] as $cap) {
                $variants[] = [
                    'attribute_values' => [$c->id, $s->id, $cap->id],
                    'price_cents' => 99000,
                    'compare_at_price_cents' => 110000,
                    'cost_price_cents' => 70000,
                    'stock_quantity' => 15,
                    'status' => 'active',
                ];
            }
        }
    }

    expect($variants)->toHaveCount(12);

    $token = accessTokenWithPermissions(['can_create_product', 'can_view_product']);

    $response = $this->withToken($token)
        ->postJson('/api/admin/product-management/products', [
            'name' => 'Flagship Smartphone Pro',
            'status' => 'active',
            'description' => 'Flagship smart phone.',
            'pricing_mode' => 'variant',
            'variants' => $variants,
        ]);

    $response->assertCreated();

    $productId = $response->json('data.item.id');
    $product = Product::query()->with('variants')->findOrFail($productId);

    expect($product->variants)->toHaveCount(12)
        ->and($product->variants->where('is_primary', true))->toHaveCount(1);
});

it('allows reassigning the primary variant during product update', function (): void {
    [$colorAttr, [$black, $white]] = createTestAttribute('Color', ['Black', 'White']);

    $token = accessTokenWithPermissions(['can_create_product', 'can_edit_product', 'can_view_product']);

    $createRes = $this->withToken($token)
        ->postJson('/api/admin/product-management/products', [
            'name' => 'Sneakers',
            'status' => 'active',
            'description' => 'Sneakers shoes.',
            'pricing_mode' => 'variant',
            'variants' => [
                ['attribute_values' => [$black->id], 'price_cents' => 40000, 'stock_quantity' => 10, 'is_primary' => true, 'status' => 'active'],
                ['attribute_values' => [$white->id], 'price_cents' => 45000, 'stock_quantity' => 12, 'is_primary' => false, 'status' => 'active'],
            ],
        ]);

    $productId = $createRes->json('data.item.id');
    $product = Product::query()->with('variants')->findOrFail($productId);
    $blackVariant = $product->variants->first(fn ($v) => $v->combination_key === (string) $black->id);
    $whiteVariant = $product->variants->first(fn ($v) => $v->combination_key === (string) $white->id);

    expect((bool) $blackVariant->is_primary)->toBeTrue()
        ->and((bool) $whiteVariant->is_primary)->toBeFalse();

    // Now update making white the primary variant
    $this->withToken($token)
        ->putJson("/api/admin/product-management/products/{$productId}", [
            'name' => 'Sneakers',
            'status' => 'active',
            'description' => 'Sneakers shoes.',
            'pricing_mode' => 'variant',
            'variants' => [
                ['attribute_values' => [$black->id], 'price_cents' => 40000, 'stock_quantity' => 10, 'is_primary' => false, 'status' => 'active'],
                ['attribute_values' => [$white->id], 'price_cents' => 45000, 'stock_quantity' => 12, 'is_primary' => true, 'status' => 'active'],
            ],
        ])
        ->assertOk();

    $product->refresh();
    $blackVariant->refresh();
    $whiteVariant->refresh();

    expect((bool) $blackVariant->is_primary)->toBeFalse()
        ->and((bool) $whiteVariant->is_primary)->toBeTrue();
});
