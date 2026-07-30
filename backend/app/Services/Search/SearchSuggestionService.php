<?php

namespace App\Services\Search;

use App\Http\Resources\ProductCardResource;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductCollection;
use App\Models\SearchTerm;
use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SearchSuggestionService
{
    public function __construct(
        private readonly ProductSearchService $products,
        private readonly SearchAnalyticsService $analytics,
        private readonly SearchNormalizer $normalizer,
    ) {}

    public function suggestions(Request $request, string $query, int $limit = 5): array
    {
        $normalized = $this->normalizer->normalize($query);
        $version = (int) Cache::get('search.suggestions.version', 1);
        $shared = $normalized === ''
            ? Cache::remember(
                'search.suggestions.discovery.v2.'.$version.'.'.$limit,
                now()->addSeconds((int) config('search.suggestion_cache_seconds', 120)),
                fn (): array => $this->discovery($limit),
            )
            : Cache::remember(
                'search.suggestions.v2.'.$version.'.'.sha1($normalized.'|'.$limit),
                now()->addSeconds((int) config('search.suggestion_cache_seconds', 120)),
                fn (): array => $this->matching($request, $query, $normalized, $limit),
            );

        return [
            ...$shared,
            'recent' => $this->analytics->recent($request->user(), $limit),
        ];
    }

    public function noResults(Request $request, string $query): array
    {
        $suggestions = $this->suggestions($request, $query, 4);

        return [
            'recommended_products' => $this->popularProducts(8),
            'suggested_categories' => $suggestions['categories'],
            'suggested_brands' => $suggestions['brands'],
            'suggested_collections' => $suggestions['collections'],
        ];
    }

    private function matching(Request $request, string $query, string $normalized, int $limit): array
    {
        $productQuery = Product::query()
            ->where('products.status', 'active')
            ->withSellableVariantMetrics()
            ->with([
                'brand:id,name,slug',
                'category:id,parent_id,name,slug',
                'images:id,product_id,url,is_primary,sort_order',
                'tags:id,name',
            ]);
        $this->products->apply($productQuery, $query);

        return [
            'products' => ProductCardResource::collection(
                $productQuery->orderByDesc('search_relevance')->limit($limit)->get(),
            )->resolve($request),
            'categories' => $this->entities(Category::query()->where('status', 'active'), $normalized, $limit, 'category'),
            'brands' => $this->entities(Brand::query()->where('status', 'active'), $normalized, $limit, 'brand'),
            'collections' => $this->entities(
                ProductCollection::query()
                    ->where('status', 'active')
                    ->where(fn ($builder) => $builder->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
                    ->where(fn ($builder) => $builder->whereNull('ends_at')->orWhere('ends_at', '>=', now())),
                $normalized,
                $limit,
                'collection',
            ),
            'tags' => $this->entities(Tag::query()->whereHas('products', fn ($product) => $product->where('status', 'active')), $normalized, $limit, 'tag'),
            'popular' => SearchTerm::query()
                ->where('normalized_keyword', 'like', '%'.$this->escapeLike($normalized).'%')
                ->orderByDesc('search_count')
                ->limit($limit)
                ->get(['id', 'display_keyword', 'search_count'])
                ->map(fn ($term): array => [
                    'id' => (string) $term->id,
                    'keyword' => $term->display_keyword,
                    'search_count' => (int) $term->search_count,
                ])
                ->all(),
            'trending' => $this->analytics->trending($limit),
        ];
    }

    private function discovery(int $limit): array
    {
        return [
            'products' => $this->popularProducts($limit),
            'categories' => [],
            'brands' => [],
            'collections' => [],
            'tags' => [],
            'popular' => SearchTerm::query()
                ->orderByDesc('search_count')
                ->limit($limit)
                ->get(['id', 'display_keyword', 'search_count'])
                ->map(fn ($term): array => [
                    'id' => (string) $term->id,
                    'keyword' => $term->display_keyword,
                    'search_count' => (int) $term->search_count,
                ])
                ->all(),
            'trending' => $this->analytics->trending($limit),
        ];
    }

    private function popularProducts(int $limit): array
    {
        $products = Product::query()
            ->where('products.status', 'active')
            ->withSellableVariantMetrics()
            ->with([
                'brand:id,name,slug',
                'category:id,parent_id,name,slug',
                'images:id,product_id,url,is_primary,sort_order',
                'tags:id,name',
            ])
            ->leftJoin('product_search_documents as search_documents', 'search_documents.product_id', '=', 'products.id')
            ->select('products.*')
            ->orderByDesc('search_documents.popularity_score')
            ->orderByDesc('products.review_count')
            ->limit($limit)
            ->get();

        return ProductCardResource::collection($products)->resolve();
    }

    private function entities($query, string $normalized, int $limit, string $type): array
    {
        $like = '%'.$this->escapeLike($normalized).'%';

        return $query
            ->whereRaw('LOWER(name) LIKE ?', [$like])
            ->withCount(['products' => fn ($products) => $products->where('products.status', 'active')])
            ->orderByDesc('products_count')
            ->orderBy('name')
            ->limit($limit)
            ->get(['id', 'name', 'slug'])
            ->map(fn ($entity): array => [
                'id' => (string) $entity->id,
                'name' => $entity->name,
                'slug' => $entity->slug,
                'type' => $type,
                'product_count' => (int) $entity->products_count,
            ])
            ->all();
    }

    private function escapeLike(string $value): string
    {
        return addcslashes($value, '\\%_');
    }
}
