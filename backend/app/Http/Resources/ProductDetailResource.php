<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Models\ProductAttributeValue;
use App\Models\ProductReview;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ProductDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $images = $this->images
            ->sortBy([['sort_order', 'asc'], ['id', 'asc']])
            ->map(fn ($image): ?string => $this->assetUrl($image->url))
            ->filter()
            ->values();
        $primaryImage = $images->first() ?: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop';
        $attributes = $this->attributeGroups($this->attributeValues);
        $variants = $this->variants
            ->where('status', 'active')
            ->values()
            ->map(fn (ProductVariant $variant): array => $this->variantPayload($variant))
            ->all();

        return [
            'product' => [
                'id' => (string) $this->id,
                'slug' => $this->slug,
                'name' => $this->name,
                'description' => $this->short_description ?: '',
                'longDescription' => $this->description,
                'price' => $this->money($this->base_price_cents),
                'originalPrice' => $this->compare_at_price_cents ? $this->money($this->compare_at_price_cents) : null,
                'discount' => $this->discountPercent(),
                'category' => $this->category?->name ?: '',
                'categorySlug' => $this->category?->slug ?: '',
                'categories' => $this->categoryBreadcrumb(),
                'brand' => $this->brand?->name ?: '',
                'brandSlug' => $this->brand?->slug ?: '',
                'images' => $images->isNotEmpty() ? $images->all() : [$primaryImage],
                'thumbnail' => $primaryImage,
                'rating' => (float) ($this->rating_average ?? 0),
                'reviewCount' => (int) ($this->review_count ?? 0),
                'stock' => (int) ($this->stock_quantity ?? 0),
                'stockStatus' => $this->stockStatus((int) ($this->stock_quantity ?? 0)),
                'trackInventory' => (bool) $this->track_inventory,
                'sku' => $this->sku ?: '',
                'tags' => $this->tags->pluck('name')->values()->all(),
                'badge' => $this->badge(),
                'features' => $this->features
                    ->sortBy('sort_order')
                    ->pluck('value')
                    ->values()
                    ->all(),
                'specifications' => $this->specifications
                    ->sortBy('sort_order')
                    ->mapWithKeys(fn ($item) => [$item->name => (string) $item->value])
                    ->all(),
                'attributes' => $attributes,
                'variants' => $variants,
                'colors' => $this->colorOptions($attributes),
                'sizes' => $this->sizeOptions($attributes),
                'shippingInfo' => $this->free_shipping ? null : 'Standard delivery calculated at checkout',
                'returnPolicy' => '30-day free returns',
                'warrantyInfo' => '2-year warranty',
                'deliveryInfo' => 'Ships from the nearest available warehouse',
                'isFeatured' => (bool) $this->is_featured,
                'isNew' => (bool) $this->is_new,
                'isBestSeller' => (bool) $this->is_best_seller,
                'isFlashSale' => (bool) $this->is_flash_sale,
                'flashSaleEndsAt' => optional($this->flash_sale_ends_at)->toISOString(),
                'freeShipping' => (bool) $this->free_shipping,
                'createdAt' => optional($this->created_at)->toISOString(),
                'seo' => [
                    'title' => $this->seo?->meta_title ?: $this->name,
                    'description' => $this->seo?->meta_description ?: $this->short_description,
                    'canonicalUrl' => $this->seo?->canonical_url,
                    'ogImage' => $this->assetUrl($this->seo?->og_image_url) ?: $primaryImage,
                    'schema' => $this->seo?->schema_json,
                ],
            ],
            'reviews' => $this->reviews
                ->sortByDesc('created_at')
                ->values()
                ->map(fn (ProductReview $review): array => [
                    'id' => (string) $review->id,
                    'productId' => (string) $review->product_id,
                    'userId' => (string) ($review->user_id ?? ''),
                    'user' => [
                        'id' => (string) ($review->user_id ?? ''),
                        'name' => $review->user?->name ?: 'Customer',
                        'avatar' => 'https://ui-avatars.com/api/?name='.urlencode($review->user?->name ?: 'Customer').'&background=111827&color=fff',
                    ],
                    'rating' => (int) $review->rating,
                    'comment' => $review->comment,
                    'verified' => (bool) $review->is_verified_purchase,
                    'createdAt' => optional($review->created_at)->toISOString(),
                    'replies' => $review->admin_reply ? [[
                        'id' => 'admin-'.$review->id,
                        'author' => 'Store',
                        'comment' => $review->admin_reply,
                        'createdAt' => optional($review->admin_replied_at ?: $review->updated_at)->toISOString(),
                    ]] : [],
                ])
                ->all(),
            'relatedProducts' => ProductCardResource::collection($this->relationProducts('related'))->resolve(),
            'similarProducts' => ProductCardResource::collection($this->similarProducts())->resolve(),
            'frequentlyBoughtTogether' => ProductCardResource::collection($this->relationProducts('cross_sell'))->resolve(),
            'recentlyViewedProducts' => [],
        ];
    }

    private function relationProducts(string $type)
    {
        return $this->relatedProducts
            ->filter(fn (Product $product): bool => $product->pivot?->type === $type)
            ->sortBy(fn (Product $product): int => (int) ($product->pivot?->sort_order ?? 0))
            ->values();
    }

    private function similarProducts()
    {
        $relatedIds = $this->relatedProducts->pluck('id')->push($this->id)->all();

        return Product::query()
            ->where('status', 'active')
            ->where('id', '!=', $this->id)
            ->whereNotIn('id', $relatedIds)
            ->where(function ($query): void {
                $query
                    ->where('category_id', $this->category_id)
                    ->orWhere('brand_id', $this->brand_id);
            })
            ->with(['brand:id,name,slug', 'category:id,name,slug', 'images:id,product_id,url,is_primary,sort_order', 'tags:id,name'])
            ->orderByDesc('is_featured')
            ->latest('published_at')
            ->limit(4)
            ->get();
    }

    private function variantPayload(ProductVariant $variant): array
    {
        $options = $variant->attributeValues
            ->mapWithKeys(fn (ProductAttributeValue $value) => [
                $value->attribute?->name ?: 'Option' => [
                    'id' => $value->id,
                    'name' => $value->value,
                    'value' => $value->slug,
                    'display_value' => $value->display_value,
                    'hex' => $value->hex_color,
                ],
            ])
            ->all();

        return [
            'id' => (string) $variant->id,
            'sku' => $variant->sku,
            'price' => $variant->price_cents ? $this->money($variant->price_cents) : $this->money($this->base_price_cents),
            'originalPrice' => $variant->compare_at_price_cents ? $this->money($variant->compare_at_price_cents) : ($this->compare_at_price_cents ? $this->money($this->compare_at_price_cents) : null),
            'stock' => (int) $variant->stock_quantity,
            'stockStatus' => $this->stockStatus((int) $variant->stock_quantity),
            'options' => $options,
            'images' => $variant->images
                ->sortBy('sort_order')
                ->map(fn ($image): ?string => $this->assetUrl($image->url))
                ->filter()
                ->values()
                ->all(),
        ];
    }

    private function attributeGroups($values): array
    {
        return $values
            ->groupBy(fn (ProductAttributeValue $value) => $value->attribute?->name ?: 'Attribute')
            ->map(fn ($items, string $name): array => [
                'name' => $name,
                'slug' => $items->first()?->attribute?->slug ?: str($name)->slug()->toString(),
                'type' => $items->first()?->attribute?->type ?: 'select',
                'values' => $items
                    ->map(fn (ProductAttributeValue $value): array => [
                        'id' => $value->id,
                        'name' => $value->value,
                        'value' => $value->slug,
                        'display_value' => $value->display_value,
                        'hex' => $value->hex_color,
                    ])
                    ->unique('value')
                    ->values()
                    ->all(),
            ])
            ->values()
            ->all();
    }

    private function colorOptions(array $attributes): array
    {
        $color = collect($attributes)->first(fn ($attribute) => str($attribute['name'])->lower()->contains('color'));

        return collect($color['values'] ?? [])
            ->map(fn ($value): array => [
                'name' => $value['name'],
                'value' => $value['value'],
                'hex' => $value['hex'] ?: $this->fallbackColor($value['name']),
            ])
            ->values()
            ->all();
    }

    private function sizeOptions(array $attributes): array
    {
        $size = collect($attributes)->first(function ($attribute): bool {
            $name = str($attribute['name'])->lower()->toString();

            return in_array($name, ['size', 'shoe size', 'storage', 'ram', 'capacity', 'subscription length'], true);
        });

        return collect($size['values'] ?? [])
            ->pluck('name')
            ->values()
            ->all();
    }

    private function categoryBreadcrumb(): array
    {
        $category = $this->category;
        if (! $category) {
            return [];
        }

        $items = [];
        if ($category->parent) {
            $items[] = ['name' => $category->parent->name, 'slug' => $category->parent->slug];
        }
        $items[] = ['name' => $category->name, 'slug' => $category->slug];

        return $items;
    }

    private function money(?int $cents): float
    {
        return round(((int) $cents) / 100, 2);
    }

    private function stockStatus(int $stock): string
    {
        return $stock > 0 ? 'in_stock' : 'out_of_stock';
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

    private function fallbackColor(string $name): string
    {
        return match (str($name)->lower()->toString()) {
            'black' => '#111827',
            'white' => '#FFFFFF',
            'red' => '#DC2626',
            'blue', 'navy' => '#1D4ED8',
            'green' => '#16A34A',
            'gray', 'grey' => '#6B7280',
            'silver' => '#C0C0C0',
            'gold' => '#B8860B',
            default => '#64748B',
        };
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
