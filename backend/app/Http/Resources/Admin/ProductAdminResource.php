<?php

namespace App\Http\Resources\Admin;

use App\Services\Admin\Settings\BrandSettingsService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductAdminResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $brandsEnabled = app(BrandSettingsService::class)->enabled();
        $hasVariants = (int) ($this->active_variants_count ?? 0) > 0;
        $trackedVariants = (int) ($this->tracked_active_variants_count ?? 0);
        $primaryVariant = $this->relationLoaded('primaryActiveVariant')
            ? $this->primaryActiveVariant
            : null;

        return [
            'id' => $this->id,
            'brand_id' => $brandsEnabled ? $this->brand_id : null,
            'category_id' => $this->category_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'short_description' => $this->short_description,
            'description' => $this->description,
            'product_type' => $this->product_type,
            'status' => $this->status,
            'pricing_mode' => $this->pricing_mode ?: 'global',
            'sku' => $this->sku,
            'base_price_cents' => $this->base_price_cents,
            'compare_at_price_cents' => $this->compare_at_price_cents,
            'cost_price_cents' => $this->cost_price_cents,
            'currency' => $this->currency,
            'track_inventory' => (bool) $this->track_inventory,
            'stock_quantity' => $this->stock_quantity,
            'display_sku' => $this->sku ?? $primaryVariant?->sku,
            'display_price_cents' => $this->effectivePriceCents($primaryVariant),
            'display_stock_quantity' => $hasVariants
                ? (int) ($this->active_variants_stock ?? 0)
                : $this->stock_quantity,
            'display_inventory_mode' => $hasVariants
                ? ($trackedVariants === 0 ? 'untracked' : ($trackedVariants < (int) $this->active_variants_count ? 'mixed' : 'tracked'))
                : ($this->track_inventory ? 'tracked' : 'untracked'),
            'active_variants_count' => $hasVariants ? (int) $this->active_variants_count : 0,
            'low_stock_threshold' => $this->low_stock_threshold,
            'is_featured' => (bool) $this->is_featured,
            'is_new' => (bool) $this->is_new,
            'is_best_seller' => (bool) $this->is_best_seller,
            'is_flash_sale' => (bool) $this->is_flash_sale,
            'flash_sale_ends_at' => optional($this->flash_sale_ends_at)->toISOString(),
            'free_shipping' => (bool) $this->free_shipping,
            'rating_average' => (string) $this->rating_average,
            'review_count' => $this->review_count,
            'published_at' => optional($this->published_at)->toISOString(),
            'created_at' => optional($this->created_at)->toISOString(),
            'updated_at' => optional($this->updated_at)->toISOString(),
            'brand' => $brandsEnabled
                ? $this->whenLoaded('brand', fn () => $this->brand ? ['id' => $this->brand->id, 'name' => $this->brand->name] : null)
                : null,
            'category' => $this->whenLoaded('category', fn () => $this->category ? ['id' => $this->category->id, 'name' => $this->category->name] : null),
            'tags' => ProductOptionResource::collection($this->whenLoaded('tags')),
            'attribute_values' => ProductOptionResource::collection($this->whenLoaded('attributeValues')),
            'images' => $this->whenLoaded('images', fn () => $this->images->map(fn ($image) => [
                'id' => $image->id,
                'url' => $image->url,
                'alt_text' => $image->alt_text,
                'type' => $image->type,
                'sort_order' => $image->sort_order,
                'is_primary' => (bool) $image->is_primary,
            ])),
            'features' => $this->whenLoaded('features', fn () => $this->features->map(fn ($feature) => [
                'id' => $feature->id,
                'value' => $feature->value,
                'sort_order' => $feature->sort_order,
            ])),
            'specifications' => $this->whenLoaded('specifications', fn () => $this->specifications->map(fn ($specification) => [
                'id' => $specification->id,
                'group_name' => $specification->group_name,
                'name' => $specification->name,
                'value' => $specification->value,
                'sort_order' => $specification->sort_order,
            ])),
            'variants' => $this->whenLoaded('variants', fn () => $this->variants->map(fn ($variant) => [
                'id' => $variant->id,
                'sku' => $variant->sku,
                'combination_key' => $variant->combination_key,
                'price_cents' => $variant->price_cents,
                'compare_at_price_cents' => $variant->compare_at_price_cents,
                'cost_price_cents' => $variant->cost_price_cents,
                'stock_quantity' => $variant->stock_quantity,
                'track_inventory' => $variant->track_inventory,
                'status' => $variant->status,
                'is_primary' => (bool) $variant->is_primary,
                'attribute_values' => ProductOptionResource::collection($variant->relationLoaded('attributeValues') ? $variant->attributeValues : collect()),
            ])),
            'seo' => $this->whenLoaded('seo', fn () => $this->seo ? [
                'meta_title' => $this->seo->meta_title,
                'meta_description' => $this->seo->meta_description,
                'canonical_url' => $this->seo->canonical_url,
                'og_image_url' => $this->seo->og_image_url,
                'schema_json' => $this->seo->schema_json,
            ] : null),
        ];
    }
}
