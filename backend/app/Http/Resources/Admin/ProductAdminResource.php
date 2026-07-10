<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductAdminResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'brand_id' => $this->brand_id,
            'category_id' => $this->category_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'short_description' => $this->short_description,
            'description' => $this->description,
            'product_type' => $this->product_type,
            'status' => $this->status,
            'sku' => $this->sku,
            'base_price_cents' => $this->base_price_cents,
            'compare_at_price_cents' => $this->compare_at_price_cents,
            'cost_price_cents' => $this->cost_price_cents,
            'currency' => $this->currency,
            'track_inventory' => (bool) $this->track_inventory,
            'stock_quantity' => $this->stock_quantity,
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
            'brand' => $this->whenLoaded('brand', fn () => $this->brand ? ['id' => $this->brand->id, 'name' => $this->brand->name] : null),
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
                'barcode' => $variant->barcode,
                'price_cents' => $variant->price_cents,
                'compare_at_price_cents' => $variant->compare_at_price_cents,
                'cost_price_cents' => $variant->cost_price_cents,
                'stock_quantity' => $variant->stock_quantity,
                'track_inventory' => $variant->track_inventory,
                'low_stock_threshold' => $variant->low_stock_threshold,
                'weight_grams' => $variant->weight_grams,
                'length_cm' => $variant->length_cm,
                'width_cm' => $variant->width_cm,
                'height_cm' => $variant->height_cm,
                'status' => $variant->status,
                'attribute_values' => ProductOptionResource::collection($variant->relationLoaded('attributeValues') ? $variant->attributeValues : collect()),
            ])),
            'seo' => $this->whenLoaded('seo', fn () => $this->seo ? [
                'meta_title' => $this->seo->meta_title,
                'meta_description' => $this->seo->meta_description,
                'meta_keywords' => $this->seo->meta_keywords,
                'canonical_url' => $this->seo->canonical_url,
                'og_image_url' => $this->seo->og_image_url,
                'schema_json' => $this->seo->schema_json,
            ] : null),
        ];
    }

}
