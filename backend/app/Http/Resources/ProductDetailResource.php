<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Models\ProductAttributeValue;
use App\Models\ProductComment;
use App\Models\ProductReview;
use App\Models\ProductVariant;
use App\Services\Admin\Settings\BrandSettingsService;
use App\Services\Admin\Settings\StoreSettingsService;
use App\Services\ProductFeedbackService;
use App\Support\Media\PublicStorageImage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $brandsEnabled = app(BrandSettingsService::class)->enabled();
        $settings = app(StoreSettingsService::class)->get();
        $feedback = app(ProductFeedbackService::class);
        $imageObjects = $this->images
            ? $this->images
                ->sortBy([['sort_order', 'asc'], ['id', 'asc']])
                ->map(fn ($image): array => PublicStorageImage::object($image))
                ->filter(fn (array $image): bool => filled($image['url']))
                ->values()
            : collect();
        $imageUrls = $imageObjects->pluck('url')->filter()->values();
        $primaryImage = $imageUrls->first() ?: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop';
        $attributes = $this->attributeValues ? $this->attributeGroups($this->attributeValues) : [];
        $variants = $this->variants
            ? $this->variants
                ->where('status', 'active')
                ->values()
                ->map(fn (ProductVariant $variant): array => $this->variantPayload($variant))
                ->all()
            : [];
        $variantCollection = collect($variants);
        $hasVariants = $variantCollection->isNotEmpty();
        $primaryVariant = $variantCollection->firstWhere('isPrimary', true)
            ?? $variantCollection->first();
        $lowestVariant = $variantCollection->sortBy('price')->first();
        $highestVariant = $variantCollection->sortByDesc('price')->first();
        $priceCents = $hasVariants
            ? (int) round(((float) ($primaryVariant['price'] ?? 0)) * 100)
            : $this->base_price_cents;
        $compareAtPriceCents = $hasVariants
            ? (isset($primaryVariant['originalPrice']) ? (int) round(((float) $primaryVariant['originalPrice']) * 100) : null)
            : $this->compare_at_price_cents;
        $stock = $hasVariants
            ? (int) ($primaryVariant['stock'] ?? 0)
            : ($this->track_inventory
                ? (int) ($this->stock_quantity ?? 0)
                : max(1, (int) ($this->stock_quantity ?? 0)));

        return [
            'product' => [
                'id' => (string) $this->id,
                'slug' => $this->slug,
                'name' => $this->name,
                'description' => $this->short_description ?: '',
                'longDescription' => $this->description,
                'price' => $this->money($priceCents),
                'originalPrice' => $compareAtPriceCents ? $this->money($compareAtPriceCents) : null,
                'priceRange' => $hasVariants ? [
                    'min' => (float) ($lowestVariant['price'] ?? 0),
                    'max' => (float) ($highestVariant['price'] ?? 0),
                ] : null,
                'discount' => $this->discountPercent($priceCents, $compareAtPriceCents),
                'category' => $this->category?->name ?: '',
                'categorySlug' => $this->category?->slug ?: '',
                'categories' => $this->categoryBreadcrumb(),
                'brand' => $brandsEnabled ? ($this->brand?->name ?: '') : '',
                'brandSlug' => $brandsEnabled ? ($this->brand?->slug ?: '') : '',
                'images' => $imageObjects->isNotEmpty() ? $imageObjects->all() : [[
                    'id' => null,
                    'path' => null,
                    'url' => $primaryImage,
                    'alt_text' => $this->name,
                    'type' => 'featured',
                    'sort_order' => 0,
                    'is_primary' => true,
                ]],
                'thumbnail' => $primaryImage,
                'rating' => (float) ($this->rating_average ?? 0),
                'reviewCount' => (int) ($this->review_count ?? 0),
                'stock' => $stock,
                'stockStatus' => $this->stockStatus($stock),
                'trackInventory' => $hasVariants
                    ? (bool) ($primaryVariant['trackInventory'] ?? true)
                    : (bool) $this->track_inventory,
                'sku' => $hasVariants ? (string) ($primaryVariant['sku'] ?? '') : ($this->sku ?: ''),
                'tags' => $this->tags ? $this->tags->pluck('name')->values()->all() : [],
                'badge' => $this->badge(),
                'features' => $this->features
                    ? $this->features
                        ->sortBy('sort_order')
                        ->pluck('value')
                        ->filter(fn ($v) => filled($v))
                        ->values()
                        ->all()
                    : [],
                'specifications' => $this->specifications
                    ? $this->specifications
                        ->sortBy('sort_order')
                        ->filter(fn ($item) => filled($item->name))
                        ->mapWithKeys(fn ($item) => [(string) $item->name => (string) $item->value])
                        ->all()
                    : [],
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
                'requiresVariantSelection' => $hasVariants,
                'primaryVariantId' => $hasVariants ? (int) ($primaryVariant['id'] ?? 0) : null,
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
                ? $this->reviews
                    ->sortByDesc('created_at')
                    ->values()
                    ->map(fn (ProductReview $review): array => [
                        'id' => (string) $review->id,
                        'productId' => (string) $review->product_id,
                        'userId' => (string) ($review->user_id ?? ''),
                        'user' => [
                            'id' => (string) ($review->user_id ?? ''),
                            'name' => $review->user?->name ?: $review->guest_name ?: 'Guest',
                            'avatar' => $this->assetUrl($review->user?->avatar),
                        ],
                        'rating' => (int) $review->rating,
                        'comment' => (string) ($review->comment ?? ''),
                        'verified' => (bool) $settings->verified_purchase_badge_enabled
                            && (bool) $review->is_verified_purchase,
                        'createdAt' => optional($review->created_at)->toISOString(),
                        'replies' => $review->admin_reply ? [[
                            'id' => 'admin-'.$review->id,
                            'author' => 'Store',
                            'comment' => $review->admin_reply,
                            'createdAt' => optional($review->admin_replied_at ?: $review->updated_at)->toISOString(),
                        ]] : [],
                    ])
                    ->all()
                : [],
            'comments' => $this->comments
                ? $this->comments
                    ->sortByDesc('created_at')
                    ->values()
                    ->map(fn (ProductComment $comment): array => [
                        'id' => (string) $comment->id,
                        'productId' => (string) $comment->product_id,
                        'userId' => (string) ($comment->user_id ?? ''),
                        'user' => [
                            'id' => (string) ($comment->user_id ?? ''),
                            'name' => $comment->user?->name ?: $comment->guest_name ?: 'Guest',
                            'avatar' => $this->assetUrl($comment->user?->avatar),
                        ],
                        'content' => (string) ($comment->content ?? ''),
                        'createdAt' => optional($comment->created_at)->toISOString(),
                        'editedAt' => optional($comment->edited_at)->toISOString(),
                        'canEdit' => $request->user()
                            && (int) $comment->user_id === (int) $request->user()->id
                            && $feedback->canEditComment($comment),
                    ])
                    ->all()
                : [],
            'relatedProducts' => ProductCardResource::collection($this->relationProducts('related') ?: collect())->resolve(),
            'similarProducts' => ProductCardResource::collection(($this->relationLoaded('similarProducts') && $this->similarProducts ? $this->similarProducts : $this->similarProducts()) ?: collect())->resolve(),
            'frequentlyBoughtTogether' => ProductCardResource::collection($this->relationProducts('cross_sell') ?: collect())->resolve(),
            'recentlyViewedProducts' => [],
        ];
    }

    private function relationProducts(string $type)
    {
        if (! $this->relatedProducts) {
            return collect();
        }

        return $this->relatedProducts
            ->filter(fn (Product $product): bool => $product->pivot?->type === $type)
            ->sortBy(fn (Product $product): int => (int) ($product->pivot?->sort_order ?? 0))
            ->values();
    }

    private function similarProducts()
    {
        $relatedIds = $this->relatedProducts ? $this->relatedProducts->pluck('id')->push($this->id)->all() : [$this->id];
        $brandsEnabled = app(BrandSettingsService::class)->enabled();

        return Product::query()
            ->where('status', 'active')
            ->where('id', '!=', $this->id)
            ->whereNotIn('id', $relatedIds)
            ->when($this->category_id || ($brandsEnabled && $this->brand_id), function ($query) use ($brandsEnabled): void {
                $query->where(function ($query) use ($brandsEnabled): void {
                    if ($this->category_id) {
                        $query->where('category_id', $this->category_id);
                    }

                    if ($brandsEnabled && $this->brand_id) {
                        if ($this->category_id) {
                            $query->orWhere('brand_id', $this->brand_id);
                        } else {
                            $query->where('brand_id', $this->brand_id);
                        }
                    }
                });
            })
            ->withSellableVariantMetrics()
            ->with(['brand:id,name,slug', 'category:id,name,slug', 'images:id,product_id,url,is_primary,sort_order', 'tags:id,name'])
            ->orderByDesc('is_featured')
            ->latest('published_at')
            ->limit(4)
            ->get();
    }

    private function variantPayload(ProductVariant $variant): array
    {
        $options = $variant->attributeValues
            ? $variant->attributeValues
                ->mapWithKeys(fn (ProductAttributeValue $value) => [
                    $value->attribute?->name ?: 'Option' => [
                        'id' => $value->id,
                        'name' => $value->value,
                        'value' => $value->slug,
                        'display_value' => $value->display_value,
                        'hex' => $value->hex_color,
                    ],
                ])
                ->all()
            : [];

        return [
            'id' => (string) $variant->id,
            'sku' => $variant->sku,
            'price' => $this->money($this->effectivePriceCents($variant)),
            'originalPrice' => $this->effectiveCompareAtPriceCents($variant) !== null
                ? $this->money($this->effectiveCompareAtPriceCents($variant))
                : null,
            'stock' => $variant->track_inventory ? (int) ($variant->stock_quantity ?? 0) : max(1, (int) ($variant->stock_quantity ?? 0)),
            'stockStatus' => ! $variant->track_inventory || (int) ($variant->stock_quantity ?? 0) > 0 ? 'in_stock' : 'out_of_stock',
            'trackInventory' => (bool) $variant->track_inventory,
            'isPrimary' => (bool) $variant->is_primary,
            'options' => $options,
            'images' => [],
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

        return PublicStorageImage::url($path);
    }
}
