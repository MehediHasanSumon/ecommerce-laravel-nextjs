<?php

namespace App\Services\Collections;

use App\Models\Product;
use App\Models\ProductCollection;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CollectionProductResolver
{
    private ?Collection $activeDiscountCollections = null;

    public function activeCollectionQuery(): Builder
    {
        return ProductCollection::query()
            ->where('status', 'active')
            ->where(fn (Builder $query) => $query
                ->whereNull('starts_at')
                ->orWhere('starts_at', '<=', now()))
            ->where(fn (Builder $query) => $query
                ->whereNull('ends_at')
                ->orWhere('ends_at', '>', now()));
    }

    public function activeCollectionBySlugOrAlias(string $slugOrPath): ?ProductCollection
    {
        $normalizedPath = str_starts_with($slugOrPath, '/') ? $slugOrPath : "/{$slugOrPath}";

        return $this->activeCollectionQuery()
            ->where(function (Builder $query) use ($slugOrPath, $normalizedPath): void {
                $query
                    ->where('slug', $slugOrPath)
                    ->orWhereJsonContains('route_aliases', $normalizedPath);
            })
            ->first();
    }

    public function homeCollections(): Collection
    {
        return $this->activeCollectionQuery()
            ->where('show_on_home', true)
            ->orderBy('display_position_anchor')
            ->orderBy('display_position_placement')
            ->orderBy('home_sort_order')
            ->orderByDesc('priority')
            ->orderBy('name')
            ->get();
    }

    public function products(ProductCollection $collection, ?int $limit = null): Collection
    {
        $products = $this->productQuery($collection)
            ->limit($limit ?: (int) ($collection->product_limit ?: 24))
            ->get();

        return $this->applyCollectionPricing($products, $collection);
    }

    public function paginatedProducts(ProductCollection $collection, int $perPage = 12): LengthAwarePaginator
    {
        $query = $this->productQuery($collection);
        $products = $query->paginate($perPage)->withQueryString();

        $products->setCollection($this->applyCollectionPricing($products->getCollection(), $collection));

        return $products;
    }

    public function resolvedProductCount(ProductCollection $collection): int
    {
        return $this->productQuery($collection)->count();
    }

    public function activeCollectionForProduct(Product $product): ?ProductCollection
    {
        return $this->pricingCollectionsByProduct(collect([$product]))->get($product->id);
    }

    public function applyCollectionPricing(Collection $products, ProductCollection $collection): Collection
    {
        $pricingCollections = $this->pricingCollectionsByProduct($products);

        return $products->map(function (Product $product) use ($collection, $pricingCollections): Product {
            $pricingCollection = $pricingCollections->get($product->id) ?: $collection;

            if (! $pricingCollection->discount_enabled || ! $pricingCollection->discount_type || ! $pricingCollection->discount_value) {
                return $product;
            }

            $basePrice = (int) ($product->active_variants_count > 0
                ? $product->cheapestActiveVariant?->price_cents
                : $product->base_price_cents);
            $discounted = match ($pricingCollection->discount_type) {
                'percentage' => (int) round($basePrice * max(0, 100 - (int) $pricingCollection->discount_value) / 100),
                'fixed' => max(0, $basePrice - (int) $pricingCollection->discount_value),
                default => $basePrice,
            };

            if ($discounted >= $basePrice) {
                return $product;
            }

            $product->setAttribute('catalog_price_cents', $discounted);
            $product->setAttribute('catalog_compare_at_price_cents', $basePrice);
            $product->is_flash_sale = $pricingCollection->rule_key === 'flash_sale' || $pricingCollection->priority >= 90;
            $product->flash_sale_ends_at = $pricingCollection->ends_at;

            return $product;
        });
    }

    private function pricingCollectionsByProduct(Collection $products): Collection
    {
        $productIds = $products->pluck('id')->map(fn ($id): int => (int) $id)->filter()->values();
        if ($productIds->isEmpty()) {
            return collect();
        }

        $matches = collect();
        foreach ($this->activeDiscountCollections() as $collection) {
            $matchingIds = $this->matchingProductIds($collection, $productIds);
            foreach ($matchingIds as $productId) {
                $matches->put((int) $productId, $collection);
            }
        }

        return $matches;
    }

    private function activeDiscountCollections(): Collection
    {
        return $this->activeDiscountCollections ??= $this->activeCollectionQuery()
            ->whereNotNull('discount_type')
            ->where('discount_enabled', true)
            ->where('discount_value', '>', 0)
            ->orderBy('priority')
            ->get();
    }

    private function matchingProductIds(ProductCollection $collection, Collection $productIds): Collection
    {
        $assignedIds = DB::table('product_collection_product')
            ->where('product_collection_id', $collection->id)
            ->whereIn('product_id', $productIds)
            ->pluck('product_id');

        if ($collection->collection_type === 'manual' || $collection->type === 'manual') {
            return $assignedIds;
        }

        $smartQuery = Product::query()
            ->whereIn('products.id', $productIds)
            ->where('status', 'active')
            ->whereNotNull('published_at');
        $this->applySmartRule($smartQuery, $collection);

        return $smartQuery->reorder()
            ->pluck('products.id')
            ->merge($assignedIds)
            ->unique()
            ->values();
    }

    private function baseProductQuery(): Builder
    {
        return Product::query()
            ->where('status', 'active')
            ->whereNotNull('published_at')
            ->withSellableVariantMetrics()
            ->whereSellableAvailable()
            ->with([
                'brand:id,name,slug',
                'category:id,name,slug',
                'images:id,product_id,url,is_primary,sort_order',
                'tags:id,name',
            ]);
    }

    private function productQuery(ProductCollection $collection): Builder|BelongsToMany
    {
        if ($collection->collection_type === 'manual' || $collection->type === 'manual') {
            return $collection->products()
                ->where('products.status', 'active')
                ->whereNotNull('products.published_at')
                ->withSellableVariantMetrics()
                ->whereSellableAvailable()
                ->with([
                    'brand:id,name,slug',
                    'category:id,name,slug',
                    'images:id,product_id,url,is_primary,sort_order',
                    'tags:id,name',
                ])
                ->orderBy('product_collection_product.sort_order')
                ->orderByDesc('products.published_at')
                ->orderByDesc('products.created_at');
        }

        $smartIds = Product::query()
            ->select('products.id')
            ->where('products.status', 'active')
            ->whereNotNull('products.published_at');
        $this->applySmartRule($smartIds, $collection);
        $smartIds->reorder();
        $assignedIds = DB::table('product_collection_product')
            ->select('product_id')
            ->where('product_collection_id', $collection->id);

        return $this->baseProductQuery()
            ->where(fn (Builder $query) => $query
                ->whereIn('products.id', $smartIds)
                ->orWhereIn('products.id', $assignedIds))
            ->orderByDesc('products.published_at')
            ->orderByDesc('products.created_at');
    }

    private function applySmartRule(Builder $query, ProductCollection $collection): void
    {
        match ($collection->rule_key) {
            'flash_sale' => $query
                ->where('is_flash_sale', true)
                ->whereNotNull('flash_sale_ends_at')
                ->where('flash_sale_ends_at', '>', now())
                ->orderBy('flash_sale_ends_at')
                ->orderByDesc('review_count'),
            'trending' => $query
                ->orderByDesc('review_count')
                ->orderByDesc('rating_average')
                ->orderByDesc('is_featured')
                ->latest('published_at'),
            'best_sellers' => $query
                ->orderByDesc('is_best_seller')
                ->orderByDesc('review_count')
                ->orderByDesc('rating_average')
                ->latest('published_at'),
            'new_arrivals', 'recently_added' => $query
                ->latest('published_at')
                ->latest('created_at'),
            'featured' => $query
                ->where('is_featured', true)
                ->latest('published_at'),
            default => $this->applyConfiguredRules($query, (array) $collection->rules),
        };
    }

    private function applyConfiguredRules(Builder $query, array $rules): void
    {
        foreach ($rules as $rule) {
            $field = $rule['field'] ?? null;
            $operator = $rule['operator'] ?? 'equals';
            $value = $rule['value'] ?? null;

            match ($field) {
                'category_id' => $query->when($value, fn (Builder $query) => $query->where('category_id', $value)),
                'brand_id' => $query->when($value, fn (Builder $query) => $query->where('brand_id', $value)),
                'price' => $query->when(is_numeric($value), fn (Builder $query) => $query->where('base_price_cents', $operator === 'less_than' ? '<=' : '>=', (int) round(((float) $value) * 100))),
                'stock_available' => $query->where(fn (Builder $query) => $query->where('track_inventory', false)->orWhere('stock_quantity', '>', 0)),
                'featured' => $query->where('is_featured', (bool) $value),
                'new' => $query->where('is_new', (bool) $value),
                'rating' => $query->when(is_numeric($value), fn (Builder $query) => $query->where('rating_average', '>=', (float) $value)),
                'discounted' => $query->whereNotNull('compare_at_price_cents')->whereColumn('compare_at_price_cents', '>', 'base_price_cents'),
                default => null,
            };
        }

        $query->latest('published_at')->latest('created_at');
    }
}
