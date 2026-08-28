<?php

namespace App\Services\Commerce;

use App\Models\Product;
use App\Models\ProductAttributeValue;
use App\Models\ProductVariant;
use App\Services\Collections\CollectionProductResolver;
use App\Support\Media\PublicStorageImage;
use Illuminate\Validation\ValidationException;

class ProductSelectionService
{
    public function __construct(
        private readonly CollectionProductResolver $collections,
    ) {}

    public function resolveCartSelection(array $payload): array
    {
        $product = Product::query()
            ->with([
                'brand:id,name,slug',
                'images:id,product_id,url,is_primary,sort_order',
                'variants.attributeValues.attribute:id,name,slug',
            ])
            ->findOrFail($payload['product_id']);

        $this->assertProductPurchasable($product);

        $activeVariants = $product->variants->where('status', 'active');
        $variant = null;
        if (! empty($payload['product_variant_id'])) {
            $variant = $activeVariants->firstWhere('id', (int) $payload['product_variant_id']);

            if (! $variant) {
                throw ValidationException::withMessages([
                    'product_variant_id' => ['The selected variant is invalid or inactive.'],
                ]);
            }
        } elseif ($activeVariants->isNotEmpty()) {
            $variant = $activeVariants->firstWhere('is_primary', true)
                ?? $activeVariants->first();
        } elseif ($product->variants->isNotEmpty()) {
            throw ValidationException::withMessages([
                'product_id' => ['This product has no active variants.'],
            ]);
        }

        $quantity = max(1, (int) ($payload['quantity'] ?? 1));
        $stock = $variant?->stock_quantity ?? $product->stock_quantity;
        $trackInventory = $variant
            ? (bool) $variant->track_inventory
            : (bool) $product->track_inventory;

        if ($trackInventory && $stock !== null && $quantity > (int) $stock) {
            throw ValidationException::withMessages([
                'quantity' => ['Requested quantity exceeds available stock.'],
            ]);
        }

        $variantSelection = $variant ? $this->variantSelection($variant) : collect();
        $selectedAttributes = collect($payload['selected_attributes'] ?? [])
            ->map(fn ($attribute) => [
                'name' => (string) ($attribute['name'] ?? ''),
                'value' => (string) ($attribute['value'] ?? ''),
                'label' => (string) ($attribute['label'] ?? $attribute['value'] ?? ''),
            ])
            ->filter(fn (array $attribute) => $attribute['name'] !== '' && $attribute['value'] !== '')
            ->values();
        if ($selectedAttributes->isEmpty() && $variantSelection->isNotEmpty()) {
            $selectedAttributes = $variantSelection->values();
        }

        $selectedOptions = collect($payload['selected_options'] ?? [])
            ->mapWithKeys(fn ($value, $key) => [(string) $key => $value])
            ->all();
        if ($selectedOptions === [] && $variant) {
            $selectedOptions = $variant->attributeValues
                ->mapWithKeys(fn (ProductAttributeValue $value): array => [
                    (string) ($value->attribute?->name ?: 'Option') => [
                        'id' => $value->id,
                        'name' => $value->value,
                        'value' => $value->slug,
                        'display_value' => $value->display_value,
                        'hex' => $value->hex_color,
                    ],
                ])
                ->all();
        }

        $unitPrice = (int) ($product->effectivePriceCents($variant)
            ?? $variant?->price_cents
            ?? $product->base_price_cents
            ?? 0);
        $compareAt = (int) ($product->effectiveCompareAtPriceCents($variant)
            ?? $variant?->compare_at_price_cents
            ?? $product->compare_at_price_cents
            ?? 0);

        $activeCollection = $this->collections->activeCollectionForProduct($product);
        $discountedPrice = $this->applyCollectionDiscount($unitPrice, $activeCollection?->discount_type, $activeCollection?->discount_value);

        $selectedImage = $this->resolveImagePath($product);
        $itemKey = sha1(json_encode([
            'product_id' => (int) $product->id,
            'variant_id' => $variant?->id,
            'selected_color' => $payload['selected_color'] ?? null,
            'selected_size' => $payload['selected_size'] ?? null,
            'selected_attributes' => $selectedAttributes->all(),
            'selected_options' => $selectedOptions,
        ]));

        return [
            'product' => $product,
            'variant' => $variant,
            'quantity' => $quantity,
            'item_key' => $itemKey,
            'unit_price_cents' => $unitPrice,
            'discounted_price_cents' => $discountedPrice < $unitPrice ? $discountedPrice : null,
            'line_subtotal_cents' => $unitPrice * $quantity,
            'line_discount_cents' => max(0, ($unitPrice - ($discountedPrice ?: $unitPrice)) * $quantity),
            'selection_snapshot' => [
                'product_name' => $product->name,
                'product_slug' => $product->slug,
                'brand_name' => $product->brand?->name,
                'selected_variant' => $variant ? $this->variantLabel($variant) : null,
                'selected_size' => $payload['selected_size'] ?? null,
                'selected_color' => $payload['selected_color'] ?? null,
                'selected_attributes' => $selectedAttributes->all(),
                'selected_options' => $selectedOptions,
                'selected_sku' => $variant?->sku ?: $product->sku,
                'selected_image' => $selectedImage,
            ],
            'pricing_snapshot' => [
                'base_price_cents' => $unitPrice,
                'compare_at_price_cents' => $compareAt ?: null,
                'discounted_price_cents' => $discountedPrice < $unitPrice ? $discountedPrice : null,
                'collection_discount' => $activeCollection ? [
                    'id' => $activeCollection->id,
                    'name' => $activeCollection->name,
                    'slug' => $activeCollection->slug,
                    'type' => $activeCollection->discount_type,
                    'value' => $activeCollection->discount_value,
                    'ends_at' => optional($activeCollection->ends_at)->toISOString(),
                ] : null,
            ],
            'tax_snapshot' => [
                'tax_class' => null,
                'estimated_tax_cents' => 0,
            ],
        ];
    }

    public function wishlistProduct(int $productId): Product
    {
        $product = Product::query()
            ->withSellableVariantMetrics()
            ->with(['brand:id,name,slug', 'category:id,name,slug', 'images:id,product_id,url,is_primary,sort_order', 'tags:id,name'])
            ->findOrFail($productId);

        $this->assertProductVisible($product);

        return $product;
    }

    public function refreshCartItem(Product $product, ?ProductVariant $variant, int $quantity, array $selectionSnapshot): array
    {
        $payload = [
            'product_id' => $product->id,
            'product_variant_id' => $variant?->id,
            'quantity' => $quantity,
            'selected_color' => $selectionSnapshot['selected_color'] ?? null,
            'selected_size' => $selectionSnapshot['selected_size'] ?? null,
            'selected_attributes' => $selectionSnapshot['selected_attributes'] ?? [],
            'selected_options' => $selectionSnapshot['selected_options'] ?? [],
        ];

        return $this->resolveCartSelection($payload);
    }

    private function assertProductVisible(Product $product): void
    {
        if ($product->status !== 'active') {
            throw ValidationException::withMessages([
                'product_id' => ['The selected product is unavailable.'],
            ]);
        }

        if ($product->published_at && $product->published_at->isFuture()) {
            throw ValidationException::withMessages([
                'product_id' => ['The selected product is unavailable.'],
            ]);
        }
    }

    private function assertProductPurchasable(Product $product): void
    {
        $this->assertProductVisible($product);

        $activeVariants = $product->variants->where('status', 'active');
        if ($activeVariants->isNotEmpty()) {
            $hasAvailableVariant = $activeVariants->contains(fn (ProductVariant $variant): bool => ! $variant->track_inventory
                || (int) ($variant->stock_quantity ?? 0) > 0);

            if (! $hasAvailableVariant) {
                throw ValidationException::withMessages([
                    'product_id' => ['This product is currently out of stock.'],
                ]);
            }

            return;
        }

        if ($product->variants->isNotEmpty() && $activeVariants->isEmpty()) {
            throw ValidationException::withMessages([
                'product_id' => ['This product has no active variants.'],
            ]);
        }

        if ($product->track_inventory && (int) ($product->stock_quantity ?? 0) <= 0) {
            throw ValidationException::withMessages([
                'product_id' => ['This product is currently out of stock.'],
            ]);
        }
    }

    private function applyCollectionDiscount(int $unitPrice, ?string $type, mixed $value): int
    {
        if (! $type || ! $value) {
            return $unitPrice;
        }

        return match ($type) {
            'percentage' => (int) round($unitPrice * max(0, 100 - (int) $value) / 100),
            'fixed' => max(0, $unitPrice - (int) $value),
            default => $unitPrice,
        };
    }

    private function resolveImagePath(Product $product): ?string
    {
        return PublicStorageImage::path(
            $product->images->firstWhere('is_primary', true)?->url
                ?: $product->images->sortBy('sort_order')->first()?->url
        );
    }

    private function variantLabel(ProductVariant $variant): string
    {
        $parts = $variant->attributeValues
            ->map(function (ProductAttributeValue $value): string {
                $name = $value->attribute?->name ?: 'Option';

                return "{$name}: {$value->value}";
            })
            ->values()
            ->all();

        return implode(', ', $parts);
    }

    private function variantSelection(ProductVariant $variant)
    {
        return $variant->attributeValues
            ->map(function (ProductAttributeValue $value): array {
                $name = (string) ($value->attribute?->name ?: 'Option');

                return [
                    'name' => $name,
                    'value' => (string) $value->slug,
                    'label' => (string) $value->value,
                ];
            });
    }

}
