<?php

use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\ProductAttributeValue;
use App\Models\User;
use App\Services\Admin\ProductVariantEngine;
use App\Services\Commerce\ProductSelectionService;
use Illuminate\Validation\ValidationException;

function variantProduct(array $overrides = []): Product
{
    return Product::query()->create(array_merge([
        'name' => 'Variant Hoodie',
        'slug' => 'variant-hoodie-'.uniqid(),
        'status' => 'active',
        'product_type' => 'physical',
        'base_price_cents' => 10000,
        'compare_at_price_cents' => 12000,
        'cost_price_cents' => 6000,
        'currency' => 'USD',
        'track_inventory' => true,
        'stock_quantity' => 20,
    ], $overrides));
}

function variantAttribute(string $name, array $values): array
{
    $attribute = ProductAttribute::query()->create([
        'name' => $name,
        'slug' => str($name)->slug()->toString().'-'.uniqid(),
        'type' => 'select',
        'is_variant_defining' => true,
    ]);

    return collect($values)
        ->map(fn (string $value): ProductAttributeValue => ProductAttributeValue::query()->create([
            'attribute_id' => $attribute->id,
            'value' => $value,
            'slug' => str($value)->slug()->toString().'-'.uniqid(),
        ]))
        ->all();
}

it('creates independent sellable skus for generated combinations', function (): void {
    $product = variantProduct();
    [$red, $green] = variantAttribute('Color', ['Red', 'Green']);

    app(ProductVariantEngine::class)->sync($product, [
        ['attribute_values' => [$red->id], 'status' => 'active', 'price_cents' => 11000, 'stock_quantity' => 4, 'track_inventory' => true],
        ['attribute_values' => [$green->id], 'status' => 'inactive', 'price_cents' => 12500, 'stock_quantity' => 7, 'track_inventory' => false],
    ]);

    $variants = $product->variants()->with('attributeValues')->orderBy('id')->get();

    expect($variants)->toHaveCount(2)
        ->and($variants[0]->price_cents)->toBe(11000)
        ->and($variants[0]->stock_quantity)->toBe(4)
        ->and($variants[0]->combination_key)->toBe((string) $red->id)
        ->and($variants[1]->price_cents)->toBe(12500)
        ->and($variants[1]->stock_quantity)->toBe(7)
        ->and($variants[1]->track_inventory)->toBeFalse();
});

it('preserves variant records and skus when combinations still exist', function (): void {
    $product = variantProduct();
    [$red, $green] = variantAttribute('Color', ['Red', 'Green']);
    [$small, $medium] = variantAttribute('Size', ['S', 'M']);
    $engine = app(ProductVariantEngine::class);

    $engine->sync($product, [
        ['attribute_values' => [$red->id, $small->id], 'status' => 'active', 'price_cents' => 11000],
        ['attribute_values' => [$green->id, $small->id], 'status' => 'active', 'price_cents' => 11200],
    ]);

    $redSmall = $product->variants()->with('attributeValues')->get()
        ->first(fn ($variant) => $engine->combinationKey($variant->attributeValues->pluck('id')->all()) === $engine->combinationKey([$red->id, $small->id]));
    $originalId = $redSmall->id;
    $originalSku = $redSmall->sku;

    $engine->sync($product, [
        ['attribute_values' => [$red->id, $small->id], 'status' => 'inactive', 'price_cents' => 11500],
        ['attribute_values' => [$red->id, $medium->id], 'status' => 'active', 'price_cents' => 11800],
    ]);

    $redSmall->refresh();

    expect($redSmall->id)->toBe($originalId)
        ->and($redSmall->sku)->toBe($originalSku)
        ->and($redSmall->status)->toBe('inactive')
        ->and($redSmall->price_cents)->toBe(11500)
        ->and($product->variants()->count())->toBe(2)
        ->and($product->variants()->whereHas('attributeValues', fn ($query) => $query->where('attribute_values.id', $green->id))->exists())->toBeFalse();
});

it('creates only one variant for a duplicated attribute combination', function (): void {
    $product = variantProduct();
    [$oneKg] = variantAttribute('Weight', ['1kg']);

    app(ProductVariantEngine::class)->sync($product, [
        ['attribute_values' => [$oneKg->id], 'status' => 'active', 'price_cents' => 56000],
        ['attribute_values' => [$oneKg->id], 'status' => 'active', 'price_cents' => 56000],
    ]);

    expect($product->variants()->count())->toBe(1)
        ->and($product->variants()->first()->attributeValues()->pluck('attribute_values.id')->all())
        ->toBe([$oneKg->id]);
});

it('persists variant sku and pricing without changing product pricing', function (): void {
    $product = variantProduct();
    [$oneKg, $twoKg] = variantAttribute('Weight', ['1kg', '2kg']);
    $engine = app(ProductVariantEngine::class);

    $engine->sync($product, [
        ['attribute_values' => [$oneKg->id], 'sku' => 'WEIGHT-1KG', 'status' => 'active', 'price_cents' => 56000, 'compare_at_price_cents' => 60000, 'cost_price_cents' => 40000],
        ['attribute_values' => [$twoKg->id], 'sku' => 'WEIGHT-2KG', 'status' => 'active', 'price_cents' => 112000],
    ]);

    $product->refresh();
    $oneKgVariant = $product->variants()->with('attributeValues')->where('sku', 'WEIGHT-1KG')->first();

    expect($oneKgVariant)->not->toBeNull()
        ->and($oneKgVariant->attributeValues->pluck('id')->all())->toBe([$oneKg->id])
        ->and($oneKgVariant->price_cents)->toBe(56000)
        ->and($product->base_price_cents)->toBe(10000)
        ->and($product->compare_at_price_cents)->toBe(12000)
        ->and($product->cost_price_cents)->toBe(6000);
});

it('uses the primary active variant when cart selection omits a variant', function (): void {
    $product = variantProduct(['published_at' => now()]);
    [$oneKg] = variantAttribute('Weight', ['1kg']);

    app(ProductVariantEngine::class)->sync($product, [
        [
            'attribute_values' => [$oneKg->id],
            'sku' => 'CART-1KG',
            'status' => 'active',
            'price_cents' => 56000,
            'stock_quantity' => 5,
            'track_inventory' => true,
        ],
    ]);

    $defaultSelection = app(ProductSelectionService::class)->resolveCartSelection([
        'product_id' => $product->id,
        'quantity' => 1,
    ]);

    $variant = $product->variants()->firstOrFail();
    $selection = app(ProductSelectionService::class)->resolveCartSelection([
        'product_id' => $product->id,
        'product_variant_id' => $variant->id,
        'quantity' => 2,
    ]);

    expect($defaultSelection['variant']->id)->toBe($variant->id)
        ->and($defaultSelection['unit_price_cents'])->toBe(56000)
        ->and($selection['variant']->id)->toBe($variant->id)
        ->and($selection['unit_price_cents'])->toBe(56000)
        ->and($selection['selection_snapshot']['selected_sku'])->toBe('CART-1KG');
});

it('inherits global product pricing without duplicating prices on variants', function (): void {
    $product = variantProduct([
        'published_at' => now(),
        'pricing_mode' => Product::PRICING_MODE_GLOBAL,
        'base_price_cents' => 120000,
        'compare_at_price_cents' => 135000,
        'cost_price_cents' => 80000,
    ]);
    [$red, $blue] = variantAttribute('Color', ['Red', 'Blue']);

    app(ProductVariantEngine::class)->sync($product, [
        ['attribute_values' => [$red->id], 'status' => 'active', 'stock_quantity' => 5, 'track_inventory' => true],
        ['attribute_values' => [$blue->id], 'status' => 'active', 'stock_quantity' => 8, 'track_inventory' => true],
    ], Product::PRICING_MODE_GLOBAL);

    $variants = $product->variants()->orderBy('id')->get();
    $selection = app(ProductSelectionService::class)->resolveCartSelection([
        'product_id' => $product->id,
        'quantity' => 1,
    ]);

    expect($variants)->toHaveCount(2)
        ->and($variants->every(fn ($variant) => $variant->price_cents === null))->toBeTrue()
        ->and($variants->every(fn ($variant) => $variant->compare_at_price_cents === null))->toBeTrue()
        ->and($variants->where('is_primary', true))->toHaveCount(1)
        ->and($variants->first()->is_primary)->toBeTrue()
        ->and($selection['variant']->id)->toBe($variants->first()->id)
        ->and($selection['unit_price_cents'])->toBe(120000)
        ->and($selection['pricing_snapshot']['compare_at_price_cents'])->toBe(135000);
});

it('returns variant-aware sku price and stock summaries in the admin product list', function (): void {
    $product = variantProduct();
    [$oneKg] = variantAttribute('Weight', ['1kg']);

    app(ProductVariantEngine::class)->sync($product, [
        [
            'attribute_values' => [$oneKg->id],
            'sku' => 'ADMIN-1KG',
            'status' => 'active',
            'price_cents' => 56000,
            'stock_quantity' => 5,
            'track_inventory' => true,
        ],
    ]);

    $product->forceFill([
        'sku' => null,
        'base_price_cents' => null,
        'compare_at_price_cents' => null,
        'cost_price_cents' => null,
        'track_inventory' => false,
        'stock_quantity' => null,
        'low_stock_threshold' => null,
    ])->save();

    $token = accessTokenWithPermissions(['can_view_product']);

    $this->withToken($token)
        ->getJson('/api/admin/product-management/products?search=ADMIN-1KG')
        ->assertOk()
        ->assertJsonCount(1, 'data.items')
        ->assertJsonPath('data.items.0.id', $product->id)
        ->assertJsonPath('data.items.0.display_sku', 'ADMIN-1KG')
        ->assertJsonPath('data.items.0.display_price_cents', 56000)
        ->assertJsonPath('data.items.0.display_stock_quantity', 5)
        ->assertJsonPath('data.items.0.display_inventory_mode', 'tracked')
        ->assertJsonPath('data.items.0.active_variants_count', 1);
});

it('returns inherited global pricing and the primary variant in admin order product search', function (): void {
    $product = variantProduct([
        'published_at' => now(),
        'pricing_mode' => Product::PRICING_MODE_GLOBAL,
        'base_price_cents' => 120000,
    ]);
    [$red, $blue] = variantAttribute('Color', ['Red', 'Blue']);

    app(ProductVariantEngine::class)->sync($product, [
        ['attribute_values' => [$red->id], 'sku' => 'ORDER-RED', 'status' => 'active', 'stock_quantity' => 5, 'track_inventory' => true],
        ['attribute_values' => [$blue->id], 'sku' => 'ORDER-BLUE', 'status' => 'active', 'stock_quantity' => 8, 'track_inventory' => true],
    ], Product::PRICING_MODE_GLOBAL);

    $primaryVariant = $product->variants()->where('is_primary', true)->firstOrFail();

    $this->withToken(accessTokenWithPermissions(['can_view_order']))
        ->getJson('/api/admin/orders/product-search?search=ORDER-RED')
        ->assertOk()
        ->assertJsonPath('data.products.0.id', $product->id)
        ->assertJsonPath('data.products.0.sku', 'ORDER-RED')
        ->assertJsonPath('data.products.0.price', 1200)
        ->assertJsonPath('data.products.0.primary_variant_id', $primaryVariant->id)
        ->assertJsonPath('data.products.0.variants.0.id', $primaryVariant->id)
        ->assertJsonPath('data.products.0.variants.0.price', 1200)
        ->assertJsonPath('data.products.0.variants.0.is_primary', true);
});

it('requires product view permission for admin product options', function (): void {
    $customer = User::factory()->create();
    $customerToken = $customer->createToken('customer-access', ['access'], now()->addMinutes(15))->plainTextToken;

    $this->withToken($customerToken)
        ->getJson('/api/admin/product-options')
        ->assertForbidden();

    $this->withToken(accessTokenWithPermissions(['can_view_product']))
        ->getJson('/api/admin/product-options')
        ->assertOk();
});
