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
            ->whereHas('attribute', fn ($query) => $query->where('is_variant_defining', true))
            ->get(['id', 'attribute_id', 'value'])
            ->keyBy('id');

        $existingGroups = $product->variants()
            ->withTrashed()
            ->with(['attributeValues:id'])
            ->orderBy('id')
            ->get()
            ->groupBy(fn (ProductVariant $variant): string => $this->combinationKey($variant->attributeValues->pluck('id')->all()));
        $existing = $existingGroups
            ->map(fn ($group): ProductVariant => $group->first(fn (ProductVariant $variant): bool => ! $variant->trashed()) ?? $group->first())
            ->all();
        $duplicateIds = $existingGroups
            ->flatMap(function ($group, string $key) use ($existing) {
                $primaryId = $existing[$key]->id;

                return $group
                    ->reject(fn (ProductVariant $variant): bool => $variant->id === $primaryId || $variant->trashed())
                    ->pluck('id');
            })
            ->values()
            ->all();

        $normalizedVariants = collect($variants)
            ->map(function (array $variantData) use ($values): ?array {
                $combination = collect($variantData['attribute_values'] ?? [])
                    ->map(fn ($id): int => (int) $id)
                    ->filter(fn (int $id): bool => $values->has($id))
                    ->unique()
                    ->values()
                    ->all();

                if ($combination === []) {
                    return null;
                }

                return [
                    'data' => $variantData,
                    'combination' => $combination,
                    'key' => $this->combinationKey($combination),
                ];
            })
            ->filter()
            ->unique('key')
            ->values();

        $seen = [];
        foreach ($normalizedVariants as $normalizedVariant) {
            $variantData = $normalizedVariant['data'];
            $combination = $normalizedVariant['combination'];
            $key = $normalizedVariant['key'];
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
            $existing[$key] = $variant;
        }

        $removeIds = collect($existing)
            ->reject(fn (ProductVariant $variant, string $key): bool => in_array($key, $seen, true))
            ->pluck('id')
            ->filter()
            ->merge($duplicateIds)
            ->unique()
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
            'combination_key' => $this->combinationKey($combination),
            'sku' => filled($data['sku'] ?? null)
                ? trim((string) $data['sku'])
                : ($variant->sku ?: $this->generateSku($product, $combination)),
            'price_cents' => $data['price_cents'] ?? null,
            'compare_at_price_cents' => $data['compare_at_price_cents'] ?? null,
            'cost_price_cents' => $data['cost_price_cents'] ?? null,
            'stock_quantity' => $data['stock_quantity'] ?? null,
            'track_inventory' => (bool) ($data['track_inventory'] ?? true),
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
