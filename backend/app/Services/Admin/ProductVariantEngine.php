<?php

namespace App\Services\Admin;

use App\Models\Product;
use App\Models\ProductAttributeValue;
use App\Models\ProductVariant;
use App\Support\Identifiers\SkuGenerator;

class ProductVariantEngine
{
    public function sync(Product $product, array $variants): void
    {
        $attributeValueIds = collect($variants)
            ->flatMap(fn (array $variant): array => $variant['attribute_values'] ?? [])
            ->map(fn ($id): int => (int) $id)
            ->filter()
            ->unique()
            ->values()
            ->all();

        $values = ProductAttributeValue::query()
            ->whereIn('id', $attributeValueIds)
            ->get(['id', 'attribute_id', 'value'])
            ->keyBy('id');

        $existing = $product->variants()
            ->withTrashed()
            ->with(['attributeValues:id'])
            ->get()
            ->mapWithKeys(fn (ProductVariant $variant): array => [$this->combinationKey($variant->attributeValues->pluck('id')->all()) => $variant])
            ->all();

        $seen = [];

        foreach ($variants as $variantData) {
            $combination = collect($variantData['attribute_values'] ?? [])
                ->map(fn ($id): int => (int) $id)
                ->filter(fn (int $id): bool => $values->has($id))
                ->unique()
                ->values()
                ->all();

            if ($combination === []) {
                continue;
            }

            $key = $this->combinationKey($combination);
            $seen[] = $key;

            $variant = $existing[$key] ?? new ProductVariant(['product_id' => $product->id]);
            if ($variant->trashed()) {
                $variant->restore();
            }

            $payload = $this->variantPayload($product, $variant, $variantData, $combination);
            $variant->fill($payload);
            $variant->save();

            $variant->attributeValues()->sync(
                collect($combination)
                    ->mapWithKeys(fn (int $id): array => [$id => ['attribute_id' => $values[$id]->attribute_id]])
                    ->all()
            );

        }

        $removeIds = collect($existing)
            ->reject(fn (ProductVariant $variant, string $key): bool => in_array($key, $seen, true))
            ->pluck('id')
            ->filter()
            ->all();

        if ($removeIds !== []) {
            $product->variants()->whereIn('id', $removeIds)->delete();
        }
    }

    public function combinationKey(array $attributeValueIds): string
    {
        $ids = collect($attributeValueIds)
            ->map(fn ($id): int => (int) $id)
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();

        return implode(':', $ids);
    }

    private function variantPayload(Product $product, ProductVariant $variant, array $data, array $combination): array
    {
        return [
            'product_id' => $product->id,
            'sku' => $variant->sku ?: $this->generateSku($product, $combination),
            'price_cents' => $data['price_cents'] ?? null,
            'compare_at_price_cents' => $data['compare_at_price_cents'] ?? null,
            'cost_price_cents' => $data['cost_price_cents'] ?? null,
            'stock_quantity' => $data['stock_quantity'] ?? null,
            'track_inventory' => array_key_exists('track_inventory', $data) ? $data['track_inventory'] : null,
            'status' => $data['status'] ?? 'active',
        ];
    }

    private function generateSku(Product $product, array $combination): string
    {
        $labels = ProductAttributeValue::query()
            ->whereIn('id', $combination)
            ->orderBy('attribute_id')
            ->orderBy('sort_order')
            ->pluck('value')
            ->all();

        return SkuGenerator::generate(trim($product->name.' '.implode(' ', $labels)), [Product::class, ProductVariant::class]);
    }
}
