<?php

use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\ProductAttributeValue;
use App\Services\Admin\ProductVariantEngine;

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

it('creates generated variants with nullable overrides for parent inheritance', function (): void {
    $product = variantProduct();
    [$red, $green] = variantAttribute('Color', ['Red', 'Green']);

    app(ProductVariantEngine::class)->sync($product, [
        ['attribute_values' => [$red->id], 'status' => 'active', 'price_cents' => null, 'stock_quantity' => null],
        ['attribute_values' => [$green->id], 'status' => 'inactive', 'price_cents' => 12500, 'stock_quantity' => 7, 'track_inventory' => false],
    ]);

    $variants = $product->variants()->with('attributeValues')->orderBy('id')->get();

    expect($variants)->toHaveCount(2)
        ->and($variants[0]->price_cents)->toBeNull()
        ->and($variants[0]->stock_quantity)->toBeNull()
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
        ['attribute_values' => [$green->id, $small->id], 'status' => 'active'],
    ]);

    $redSmall = $product->variants()->with('attributeValues')->get()
        ->first(fn ($variant) => $engine->combinationKey($variant->attributeValues->pluck('id')->all()) === $engine->combinationKey([$red->id, $small->id]));
    $originalId = $redSmall->id;
    $originalSku = $redSmall->sku;

    $engine->sync($product, [
        ['attribute_values' => [$red->id, $small->id], 'status' => 'inactive', 'price_cents' => 11500],
        ['attribute_values' => [$red->id, $medium->id], 'status' => 'active'],
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

it('persists one explicit default variant and mirrors its pricing to the product', function (): void {
    $product = variantProduct();
    [$oneKg, $twoKg] = variantAttribute('Weight', ['1kg', '2kg']);
    $engine = app(ProductVariantEngine::class);

    $engine->sync($product, [
        ['attribute_values' => [$oneKg->id], 'status' => 'active', 'price_cents' => 56000, 'compare_at_price_cents' => 60000, 'cost_price_cents' => 40000, 'is_default' => true],
        ['attribute_values' => [$twoKg->id], 'status' => 'active', 'price_cents' => 112000, 'is_default' => false],
    ]);

    $product->refresh();
    $defaultVariant = $product->variants()->with('attributeValues')->find($product->default_variant_id);

    expect($defaultVariant)->not->toBeNull()
        ->and($defaultVariant->attributeValues->pluck('id')->all())->toBe([$oneKg->id])
        ->and($product->base_price_cents)->toBe(56000)
        ->and($product->compare_at_price_cents)->toBe(60000)
        ->and($product->cost_price_cents)->toBe(40000);

    $engine->sync($product, [
        ['attribute_values' => [$oneKg->id], 'status' => 'active', 'price_cents' => 56000, 'is_default' => false],
        ['attribute_values' => [$twoKg->id], 'status' => 'active', 'price_cents' => 112000, 'is_default' => false],
    ]);

    expect($product->fresh()->default_variant_id)->toBeNull();
});
