<?php

namespace App\Http\Resources;

use App\Services\Admin\Settings\BrandSettingsService;
use App\Support\Media\PublicStorageImage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductCardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $brandsEnabled = app(BrandSettingsService::class)->enabled();

        $imagesCollection = $this->images instanceof \Illuminate\Support\Collection || is_array($this->images)
            ? collect($this->images)
            : collect();

        $primaryImage = $imagesCollection->firstWhere('is_primary', true) ?? $imagesCollection->first();
        $imageUrl = PublicStorageImage::url(is_object($primaryImage) ? ($primaryImage->url ?? null) : (is_array($primaryImage) ? ($primaryImage['url'] ?? null) : null));

        $images = $imagesCollection
            ->map(fn ($image) => PublicStorageImage::object($image))
            ->filter(fn (array $image): bool => filled($image['url']))
            ->values();

        $activeVariantsCount = $this->active_variants_count;
        if ($activeVariantsCount === null) {
            if ($this->relationLoaded('variants') && $this->variants) {
                $activeVariantsCount = $this->variants->where('status', 'active')->count();
            } else {
                $activeVariantsCount = $this->variants()->where('status', 'active')->count();
            }
        }

        $hasVariants = (int) $activeVariantsCount > 0;
        $primaryVariant = $this->relationLoaded('primaryActiveVariant')
            ? $this->primaryActiveVariant
            : ($hasVariants ? ($this->relationLoaded('variants') && $this->variants ? ($this->variants->firstWhere('is_primary', true) ?? $this->variants->first()) : $this->primaryActiveVariant()->first()) : null);

        $priceCents = $this->catalog_price_cents
            ?? ($this->resource instanceof Product ? $this->effectivePriceCents($primaryVariant) : $this->base_price_cents);
        $compareAtPriceCents = $this->catalog_compare_at_price_cents
            ?? ($this->resource instanceof Product ? $this->effectiveCompareAtPriceCents($primaryVariant) : $this->compare_at_price_cents);

        $stock = $hasVariants
            ? ($primaryVariant
                ? ($primaryVariant->track_inventory
                    ? (int) ($primaryVariant->stock_quantity ?? 0)
                    : max(1, (int) ($primaryVariant->stock_quantity ?? 0)))
                : 0)
            : ($this->track_inventory
                ? (int) ($this->stock_quantity ?? 0)
                : max(1, (int) ($this->stock_quantity ?? 0)));

        $tags = $this->tags instanceof \Illuminate\Support\Collection || is_array($this->tags)
            ? collect($this->tags)->pluck('name')->filter()->values()->all()
            : [];

        return [
            'id' => (string) $this->id,
            'slug' => (string) ($this->slug ?? ''),
            'name' => (string) ($this->name ?? ''),
            'description' => (string) ($this->short_description ?: ''),
            'longDescription' => (string) ($this->description ?: ''),
            'price' => round(((int) ($priceCents ?? 0)) / 100, 2),
            'originalPrice' => $compareAtPriceCents ? round(((int) $compareAtPriceCents) / 100, 2) : null,
            'discount' => $this->discountPercent($priceCents !== null ? (int) $priceCents : null, $compareAtPriceCents !== null ? (int) $compareAtPriceCents : null),
            'category' => $this->category?->name ?: '',
            'categorySlug' => $this->category?->slug ?: '',
            'brand' => $brandsEnabled ? ($this->brand?->name ?: '') : '',
            'brandSlug' => $brandsEnabled ? ($this->brand?->slug ?: '') : '',
            'images' => $images->all(),
            'thumbnail' => $imageUrl ?: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop',
            'rating' => (float) ($this->rating_average ?? 0),
            'reviewCount' => (int) ($this->review_count ?? 0),
            'stock' => $stock,
            'sku' => $hasVariants ? ($primaryVariant?->sku ?: '') : ($this->sku ?: ''),
            'tags' => $tags,
            'badge' => $this->badge(),
            'isFeatured' => (bool) $this->is_featured,
            'isNew' => (bool) $this->is_new,
            'isBestSeller' => (bool) $this->is_best_seller,
            'isFlashSale' => (bool) $this->is_flash_sale,
            'flashSaleEndsAt' => optional($this->flash_sale_ends_at)->toISOString(),
            'freeShipping' => (bool) $this->free_shipping,
            'requiresVariantSelection' => $hasVariants,
            'primaryVariantId' => $hasVariants && $primaryVariant ? (int) $primaryVariant->id : null,
            'createdAt' => optional($this->created_at)->toISOString(),
        ];
    }

    private function discountPercent(?int $priceCents, ?int $compareAtPriceCents): ?int
    {
        if (! $compareAtPriceCents || ! $priceCents || $compareAtPriceCents <= $priceCents) {
            return null;
        }

        return (int) round((($compareAtPriceCents - $priceCents) / $compareAtPriceCents) * 100);
    }

    private function badge(): ?string
    {
        if ($this->is_flash_sale) {
            return 'sale';
        }

        if ($this->is_best_seller) {
            return 'bestseller';
        }

        if ($this->is_new) {
            return 'new';
        }

        return null;
    }
}
