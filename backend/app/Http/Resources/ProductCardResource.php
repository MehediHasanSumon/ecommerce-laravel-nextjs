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
        $primaryImage = $this->images->firstWhere('is_primary', true) ?? $this->images->first();
        $imageUrl = PublicStorageImage::url($primaryImage?->url);
        $images = $this->images
            ->map(fn ($image) => PublicStorageImage::object($image))
            ->filter(fn (array $image): bool => filled($image['path']) && filled($image['url']))
            ->values();
        $activeVariantsCount = $this->active_variants_count;

        if ($activeVariantsCount === null) {
            $activeVariantsCount = $this->variants()->where('status', 'active')->count();
        }

        $hasVariants = (int) $activeVariantsCount > 0;
        $primaryVariant = $this->relationLoaded('primaryActiveVariant')
            ? $this->primaryActiveVariant
            : ($hasVariants ? $this->primaryActiveVariant()->first() : null);
        $priceCents = $this->catalog_price_cents
            ?? $this->effectivePriceCents($primaryVariant);
        $compareAtPriceCents = $this->catalog_compare_at_price_cents
            ?? $this->effectiveCompareAtPriceCents($primaryVariant);
        $stock = $hasVariants
            ? ($primaryVariant
                ? ($primaryVariant->track_inventory
                    ? (int) ($primaryVariant->stock_quantity ?? 0)
                    : max(1, (int) ($primaryVariant->stock_quantity ?? 0)))
                : 0)
            : ($this->track_inventory
                ? (int) ($this->stock_quantity ?? 0)
                : max(1, (int) ($this->stock_quantity ?? 0)));

        return [
            'id' => (string) $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'description' => $this->short_description ?: '',
            'longDescription' => $this->description,
            'price' => round(((int) $priceCents) / 100, 2),
            'originalPrice' => $compareAtPriceCents ? round(((int) $compareAtPriceCents) / 100, 2) : null,
            'discount' => $this->discountPercent($priceCents, $compareAtPriceCents),
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
            'tags' => $this->tags->pluck('name')->values()->all(),
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
        if (! $compareAtPriceCents || $compareAtPriceCents <= $priceCents) {
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
