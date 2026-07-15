<?php

namespace App\Http\Resources;

use App\Services\Admin\Settings\BrandSettingsService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ProductCardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $brandsEnabled = app(BrandSettingsService::class)->enabled();
        $primaryImage = $this->images->firstWhere('is_primary', true) ?? $this->images->first();
        $imageUrl = $this->assetUrl($primaryImage?->url);
        $activeVariantsCount = $this->active_variants_count;

        if ($activeVariantsCount === null) {
            $activeVariantsCount = $this->variants()->where('status', 'active')->count();
        }

        return [
            'id' => (string) $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'description' => $this->short_description ?: '',
            'longDescription' => $this->description,
            'price' => round(((int) $this->base_price_cents) / 100, 2),
            'originalPrice' => $this->compare_at_price_cents ? round(((int) $this->compare_at_price_cents) / 100, 2) : null,
            'discount' => $this->discountPercent(),
            'category' => $this->category?->name ?: '',
            'categorySlug' => $this->category?->slug ?: '',
            'brand' => $brandsEnabled ? ($this->brand?->name ?: '') : '',
            'brandSlug' => $brandsEnabled ? ($this->brand?->slug ?: '') : '',
            'images' => $this->images->map(fn ($image): ?string => $this->assetUrl($image->url))->filter()->values()->all(),
            'thumbnail' => $imageUrl ?: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop',
            'rating' => (float) ($this->rating_average ?? 0),
            'reviewCount' => (int) ($this->review_count ?? 0),
            'stock' => (int) ($this->stock_quantity ?? 0),
            'sku' => $this->sku ?: '',
            'tags' => $this->tags->pluck('name')->values()->all(),
            'badge' => $this->badge(),
            'isFeatured' => (bool) $this->is_featured,
            'isNew' => (bool) $this->is_new,
            'isBestSeller' => (bool) $this->is_best_seller,
            'isFlashSale' => (bool) $this->is_flash_sale,
            'flashSaleEndsAt' => optional($this->flash_sale_ends_at)->toISOString(),
            'freeShipping' => (bool) $this->free_shipping,
            'requiresVariantSelection' => (int) $activeVariantsCount > 0,
            'createdAt' => optional($this->created_at)->toISOString(),
        ];
    }

    private function discountPercent(): ?int
    {
        if (! $this->compare_at_price_cents || $this->compare_at_price_cents <= $this->base_price_cents) {
            return null;
        }

        return (int) round((($this->compare_at_price_cents - $this->base_price_cents) / $this->compare_at_price_cents) * 100);
    }

    private function badge(): ?string
    {
        if ($this->is_flash_sale && $this->discountPercent()) {
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

    private function assetUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        if (str_starts_with($path, '/storage/') || str_starts_with($path, 'storage/')) {
            return url($path);
        }

        return Storage::disk('public')->url($path);
    }
}
