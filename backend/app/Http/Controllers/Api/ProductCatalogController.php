<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductCommentRequest;
use App\Http\Requests\StoreProductReviewRequest;
use App\Http\Resources\ProductCardResource;
use App\Http\Resources\ProductDetailResource;
use App\Http\Responses\ApiResponse;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\ProductAttributeValue;
use App\Models\ProductComment;
use App\Models\ProductReview;
use App\Models\ProductVariant;
use App\Services\Admin\Settings\BrandSettingsService;
use App\Services\Admin\Settings\StoreSettingsService;
use App\Services\ProductFeedbackService;
use App\Services\Search\ProductSearchService;
use App\Services\Search\SearchAnalyticsService;
use App\Services\Search\SearchSuggestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProductCatalogController extends Controller
{
    public function __construct(
        private readonly BrandSettingsService $brandSettings,
        private readonly StoreSettingsService $storeSettings,
        private readonly ProductFeedbackService $feedback,
        private readonly ProductSearchService $productSearch,
        private readonly SearchAnalyticsService $searchAnalytics,
        private readonly SearchSuggestionService $searchSuggestions,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $brandsEnabled = $this->brandSettings->enabled();
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'string', 'max:255'],
            'collection' => ['nullable', 'string', 'max:255'],
            'brand' => ['nullable'],
            'attributes' => ['nullable'],
            'price_min' => ['nullable', 'numeric', 'min:0'],
            'price_max' => ['nullable', 'numeric', 'min:0'],
            'availability' => ['nullable', Rule::in(['in_stock', 'out_of_stock'])],
            'on_sale' => ['nullable', 'boolean'],
            'rating' => ['nullable', 'numeric', 'min:0', 'max:5'],
            'sort' => ['nullable', Rule::in(['default', 'newest', 'oldest', 'price_asc', 'price_desc', 'discount_desc', 'name_asc', 'name_desc', 'best_selling', 'highest_rated', 'most_popular', 'featured'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:48'],
        ]);

        if (
            isset($validated['price_min'], $validated['price_max'])
            && (float) $validated['price_min'] > (float) $validated['price_max']
        ) {
            throw ValidationException::withMessages([
                'price_min' => ['Minimum price must be less than or equal to maximum price.'],
            ]);
        }

        $brandSlugs = $brandsEnabled ? $this->csvValues($request->query('brand')) : [];
        $attributeFilters = $this->attributeFilters($request);

        $query = Product::query()
            ->where('status', 'active')
            ->withSellableVariantMetrics()
            ->with([
                'brand:id,name,slug',
                'category:id,parent_id,name,slug',
                'images:id,product_id,url,is_primary,sort_order',
                'tags:id,name',
            ])
            ->when($request->string('category')->isNotEmpty(), function ($query) use ($request): void {
                $category = Category::query()
                    ->where('slug', $request->string('category')->toString())
                    ->first();

                if (! $category) {
                    $query->whereRaw('1 = 0');

                    return;
                }

                $categoryIds = [$category->id];
                if (! $category->parent_id) {
                    $categoryIds = array_merge(
                        $categoryIds,
                        Category::query()->where('parent_id', $category->id)->pluck('id')->all()
                    );
                }

                $query->whereIn('category_id', $categoryIds);
            })
            ->when($brandSlugs !== [], fn ($query) => $query->whereHas('brand', fn ($brandQuery) => $brandQuery->whereIn('slug', $brandSlugs)))
            ->when($request->string('collection')->isNotEmpty(), fn ($query) => $query->whereHas('collections', fn ($collectionQuery) => $collectionQuery
                ->where('collections.slug', $request->string('collection')->toString())
                ->where('collections.status', 'active')
                ->where(fn ($schedule) => $schedule->whereNull('collections.starts_at')->orWhere('collections.starts_at', '<=', now()))
                ->where(fn ($schedule) => $schedule->whereNull('collections.ends_at')->orWhere('collections.ends_at', '>=', now()))))
            ->when($request->filled('price_min'), fn ($query) => $this->whereEffectivePrice($query, '>=', (int) round(((float) $request->query('price_min')) * 100)))
            ->when($request->filled('price_max'), fn ($query) => $this->whereEffectivePrice($query, '<=', (int) round(((float) $request->query('price_max')) * 100)))
            ->when($request->query('availability') === 'in_stock', fn ($query) => $query->whereSellableAvailable())
            ->when($request->query('availability') === 'out_of_stock', fn ($query) => $query->whereNot(fn ($query) => $query->whereSellableAvailable()))
            ->when($request->boolean('on_sale'), fn ($query) => $query->whereEffectivelyOnSale())
            ->when($request->filled('rating'), fn ($query) => $query->where('rating_average', '>=', (float) $request->query('rating')));

        $search = trim((string) ($validated['search'] ?? ''));
        if ($search !== '') {
            $this->productSearch->apply($query, $search);
        }

        foreach ($attributeFilters as $slug => $values) {
            $query->whereHas('attributeValues', function ($attributeQuery) use ($slug, $values): void {
                $attributeQuery
                    ->whereHas('attribute', fn ($query) => $query->where('slug', $slug))
                    ->whereIn('attribute_values.slug', $values);
            });
        }

        $this->applySort($query, (string) ($validated['sort'] ?? 'default'), $search !== '');

        $products = $query->paginate((int) ($validated['per_page'] ?? 24))->withQueryString();
        $searchEvent = null;
        if ($search !== '' && $products->currentPage() === 1) {
            $searchEvent = $this->searchAnalytics->recordSearch(
                $request,
                $search,
                $products->total(),
                collect($validated)->except(['search', 'page', 'per_page'])->filter(fn ($value) => $value !== null && $value !== '')->all(),
            );
        }
        $searchContext = $search !== '' ? [
            'query' => $search,
            'event_id' => $searchEvent?->public_id,
            'no_results' => $products->total() === 0
                ? $this->searchSuggestions->noResults($request, $search)
                : null,
        ] : null;

        return ApiResponse::success([
            'items' => ProductCardResource::collection($products->getCollection())->resolve(),
            'search' => $searchContext,
            'filters' => Cache::remember(
                'catalog.filters.v1.'.($brandsEnabled ? 'brands' : 'no-brands'),
                now()->addMinutes(10),
                fn (): array => $this->filters($brandsEnabled),
            ),
        ], meta: [
            'pagination' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
                'from' => $products->firstItem(),
                'to' => $products->lastItem(),
            ],
            'search' => $searchContext ? [
                'event_id' => $searchContext['event_id'],
                'query' => $searchContext['query'],
            ] : null,
        ]);
    }

    public function show(Request $request, string $slug): JsonResponse
    {
        $settings = $this->storeSettings->get();
        $brandsEnabled = $this->brandSettings->enabled();
        $product = Product::query()
            ->where('slug', $slug)
            ->where('status', 'active')
            ->with([
                'brand:id,name,slug',
                'category:id,parent_id,name,slug',
                'category.parent:id,name,slug',
                'images:id,product_id,url,alt_text,type,is_primary,sort_order',
                'tags:id,name',
                'features:id,product_id,value,sort_order',
                'specifications:id,product_id,group_name,name,value,sort_order',
                'seo:id,product_id,meta_title,meta_description,meta_keywords,canonical_url,og_image_url,schema_json',
                'attributeValues.attribute:id,name,slug,type',
                'variants' => fn ($query) => $query->where('status', 'active')->orderByDesc('is_primary')->orderBy('id'),
                'variants.attributeValues.attribute:id,name,slug,type',
                'reviews' => fn ($query) => $query
                    ->when(! (bool) $settings->enable_reviews, fn ($query) => $query->whereRaw('1 = 0'))
                    ->where('status', 'approved')
                    ->latest()
                    ->limit(20),
                'reviews.user:id,name,email,avatar',
                'comments' => fn ($query) => $query
                    ->when(! (bool) $settings->enable_product_comments, fn ($query) => $query->whereRaw('1 = 0'))
                    ->where('status', 'approved')
                    ->latest()
                    ->limit(50),
                'comments.user:id,name,email,avatar',
                'relatedProducts' => fn ($query) => $query
                    ->where('products.status', 'active')
                    ->withSellableVariantMetrics()
                    ->with(['brand:id,name,slug', 'category:id,name,slug', 'images:id,product_id,url,is_primary,sort_order', 'tags:id,name'])
                    ->orderBy('product_relations.sort_order')
                    ->limit(16),
            ])
            ->firstOrFail();

        $similarProducts = \Illuminate\Support\Facades\Cache::remember(
            "product.{$product->id}.similar",
            now()->addMinutes(10),
            function () use ($product, $brandsEnabled) {
                $relatedIds = $product->relatedProducts ? $product->relatedProducts->pluck('id')->push($product->id)->all() : [$product->id];

                return Product::query()
                    ->where('status', 'active')
                    ->where('id', '!=', $product->id)
                    ->whereNotIn('id', $relatedIds)
                    ->when($product->category_id || ($brandsEnabled && $product->brand_id), function ($query) use ($product, $brandsEnabled): void {
                        $query->where(function ($query) use ($product, $brandsEnabled): void {
                            if ($product->category_id) {
                                $query->where('category_id', $product->category_id);
                            }

                            if ($brandsEnabled && $product->brand_id) {
                                if ($product->category_id) {
                                    $query->orWhere('brand_id', $product->brand_id);
                                } else {
                                    $query->where('brand_id', $product->brand_id);
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
        );
        $product->setRelation('similarProducts', $similarProducts ?: collect());

        return ApiResponse::success(ProductDetailResource::make($product)->resolve());
    }

    public function reviews(Request $request): JsonResponse
    {
        $settings = $this->storeSettings->get();

        if (! (bool) $settings->enable_reviews) {
            return ApiResponse::success(['items' => []], meta: [
                'pagination' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => 12,
                    'total' => 0,
                    'from' => null,
                    'to' => null,
                ],
            ]);
        }

        $validated = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:24'],
        ]);

        $reviews = ProductReview::query()
            ->where('status', 'approved')
            ->with([
                'user:id,name,email,avatar',
                'product' => fn ($query) => $query
                    ->withSellableVariantMetrics()
                    ->with([
                        'brand:id,name,slug',
                        'category:id,parent_id,name,slug',
                        'images:id,product_id,url,is_primary,sort_order',
                        'tags:id,name',
                    ]),
            ])
            ->whereHas('product', fn ($query) => $query->where('status', 'active'))
            ->latest()
            ->paginate((int) ($validated['per_page'] ?? 12))
            ->withQueryString();

        return ApiResponse::success([
            'items' => $reviews->getCollection()
                ->map(fn (ProductReview $review): array => [
                    'id' => (string) $review->id,
                    'rating' => (int) $review->rating,
                    'comment' => $review->comment,
                    'verified' => (bool) $settings->verified_purchase_badge_enabled
                        && (bool) $review->is_verified_purchase,
                    'createdAt' => optional($review->created_at)->toISOString(),
                    'user' => [
                        'id' => (string) $review->user?->id,
                        'name' => $review->user?->name ?: $review->guest_name ?: 'Guest',
                        'avatar' => $this->assetUrl($review->user?->avatar),
                    ],
                    'product' => $review->product
                        ? ProductCardResource::make($review->product)->resolve()
                        : null,
                ])
                ->values()
                ->all(),
        ], meta: [
            'pagination' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
                'from' => $reviews->firstItem(),
                'to' => $reviews->lastItem(),
            ],
        ]);
    }

    public function storeReview(StoreProductReviewRequest $request, Product $product): JsonResponse
    {
        abort_unless($product->status === 'active', 404);

        $review = $this->feedback->createReview($product, $request, $request->validated());
        $message = $review->status === 'approved'
            ? 'Review submitted successfully.'
            : 'Review submitted successfully. It will appear after approval.';

        return ApiResponse::success([
            'review' => [
                'id' => (string) $review->id,
                'status' => $review->status,
            ],
        ], $message, 201);
    }

    public function storeComment(StoreProductCommentRequest $request, Product $product): JsonResponse
    {
        abort_unless($product->status === 'active', 404);

        $comment = $this->feedback->createComment($product, $request, $request->validated());
        $message = $comment->status === 'approved'
            ? 'Comment submitted successfully.'
            : 'Comment submitted successfully. It will appear after approval.';

        return ApiResponse::success([
            'comment' => [
                'id' => (string) $comment->id,
                'status' => $comment->status,
            ],
        ], $message, 201);
    }

    public function updateComment(
        StoreProductCommentRequest $request,
        Product $product,
        ProductComment $comment
    ): JsonResponse {
        abort_unless($product->status === 'active', 404);

        $comment = $this->feedback->updateComment($product, $comment, $request, $request->validated());
        $message = $comment->status === 'approved'
            ? 'Comment updated successfully.'
            : 'Comment updated successfully. It will appear after approval.';

        return ApiResponse::success([
            'comment' => [
                'id' => (string) $comment->id,
                'status' => $comment->status,
            ],
        ], $message);
    }

    private function applySort($query, string $sort, bool $hasSearch = false): void
    {
        match ($sort) {
            'newest' => $query->latest('published_at')->latest('created_at'),
            'oldest' => $query->oldest('published_at')->oldest('created_at'),
            'price_asc' => $query->orderByRaw($this->effectivePriceSql().' asc')->orderBy('name'),
            'price_desc' => $query->orderByRaw($this->effectivePriceSql().' desc')->orderBy('name'),
            'discount_desc' => $query
                ->orderByRaw('('.Product::effectiveCompareAtPriceSql().' - '.Product::effectivePriceSql().') desc')
                ->orderByDesc('published_at'),
            'name_asc' => $query->orderBy('name'),
            'name_desc' => $query->orderByDesc('name'),
            'best_selling', 'most_popular' => $query->orderByDesc('review_count')->orderByDesc('rating_average'),
            'highest_rated' => $query->orderByDesc('rating_average')->orderByDesc('review_count'),
            'featured' => $query->orderByDesc('is_featured')->latest('published_at'),
            default => $hasSearch
                ? $query->orderByDesc('search_relevance')->latest('published_at')->latest('created_at')
                : $query->orderByDesc('is_featured')->latest('published_at')->latest('created_at'),
        };
    }

    private function filters(bool $brandsEnabled): array
    {
        $priceRange = Product::query()
            ->where('status', 'active')
            ->selectRaw('min('.Product::effectivePriceSql().') as min_price, max('.Product::effectivePriceSql().') as max_price')
            ->first();

        return [
            'brands' => $brandsEnabled ? Brand::query()
                ->where('status', 'active')
                ->whereHas('products', fn ($query) => $query->where('status', 'active'))
                ->withCount(['products' => fn ($query) => $query->where('status', 'active')])
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'slug'])
                ->map(fn (Brand $brand): array => [
                    'id' => $brand->id,
                    'name' => $brand->name,
                    'slug' => $brand->slug,
                    'count' => (int) $brand->products_count,
                ])
                ->all() : [],
            'attributes' => ProductAttribute::query()
                ->whereHas('values.products', fn ($query) => $query->where('products.status', 'active'))
                ->with(['values' => fn ($query) => $query
                    ->whereHas('products', fn ($productQuery) => $productQuery->where('products.status', 'active'))
                    ->withCount(['products' => fn ($productQuery) => $productQuery->where('products.status', 'active')])
                    ->orderBy('sort_order')
                    ->orderBy('value')])
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'slug', 'type'])
                ->map(fn (ProductAttribute $attribute): array => [
                    'id' => $attribute->id,
                    'name' => $attribute->name,
                    'slug' => $attribute->slug,
                    'type' => $attribute->type,
                    'values' => $attribute->values
                        ->map(fn (ProductAttributeValue $value): array => [
                            'id' => $value->id,
                            'value' => $value->value,
                            'slug' => $value->slug,
                            'display_value' => $value->display_value,
                            'hex_color' => $value->hex_color,
                            'count' => (int) $value->products_count,
                        ])
                        ->all(),
                ])
                ->all(),
            'price' => [
                'min' => round(((int) ($priceRange?->min_price ?? 0)) / 100, 2),
                'max' => round(((int) ($priceRange?->max_price ?? 0)) / 100, 2),
            ],
            'availability' => [
                ['label' => 'In Stock', 'value' => 'in_stock'],
                ['label' => 'Out of Stock', 'value' => 'out_of_stock'],
            ],
            'sort' => [
                ['label' => 'Default', 'value' => 'default'],
                ['label' => 'Newest', 'value' => 'newest'],
                ['label' => 'Oldest', 'value' => 'oldest'],
                ['label' => 'Price: Low to High', 'value' => 'price_asc'],
                ['label' => 'Price: High to Low', 'value' => 'price_desc'],
                ['label' => 'Biggest Discount', 'value' => 'discount_desc'],
                ['label' => 'Name: A to Z', 'value' => 'name_asc'],
                ['label' => 'Name: Z to A', 'value' => 'name_desc'],
                ['label' => 'Best Selling', 'value' => 'best_selling'],
                ['label' => 'Highest Rated', 'value' => 'highest_rated'],
                ['label' => 'Most Popular', 'value' => 'most_popular'],
                ['label' => 'Featured', 'value' => 'featured'],
            ],
        ];
    }

    private function attributeFilters(Request $request): array
    {
        $raw = $request->query('attributes', []);
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : [];
        }
        if (! is_array($raw)) {
            return [];
        }

        $filters = [];
        foreach ($raw as $slug => $values) {
            if (! is_string($slug) || ! preg_match('/^[a-z0-9-]+$/', $slug)) {
                continue;
            }
            $normalized = $this->csvValues($values);
            if ($normalized !== []) {
                $filters[$slug] = $normalized;
            }
        }

        return $filters;
    }

    private function csvValues(mixed $value): array
    {
        if (is_array($value)) {
            $items = $value;
        } else {
            $items = explode(',', (string) $value);
        }

        return collect($items)
            ->map(fn ($item) => trim((string) $item))
            ->filter(fn ($item) => $item !== '' && preg_match('/^[a-zA-Z0-9-_]+$/', $item))
            ->unique()
            ->values()
            ->all();
    }

    private function whereEffectivePrice($query, string $operator, int $price)
    {
        return $query->whereEffectivePrice($operator, $price);
    }

    private function effectivePriceSql(): string
    {
        return Product::effectivePriceSql();
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

        return url(Storage::disk('public')->url($path));
    }
}
