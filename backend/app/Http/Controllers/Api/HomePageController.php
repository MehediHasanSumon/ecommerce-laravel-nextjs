<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BlogCardResource;
use App\Http\Resources\BrandResource;
use App\Http\Resources\CollectionResource;
use App\Http\Resources\ProductCardResource;
use App\Http\Responses\ApiResponse;
use App\Models\Brand;
use App\Models\Product;
use App\Models\ProductReview;
use App\Services\Admin\HeroSectionService;
use App\Services\Admin\Settings\BrandSettingsService;
use App\Services\Admin\Settings\HomePageSettingsService;
use App\Services\BlogCatalogService;
use App\Services\Collections\CollectionProductResolver;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class HomePageController extends Controller
{
    public function show(CollectionProductResolver $collections, BrandSettingsService $brandSettings, HomePageSettingsService $homeSettings, BlogCatalogService $blogs, HeroSectionService $hero): JsonResponse
    {
        $brandRuntime = $brandSettings->runtime();
        $homeRuntime = $homeSettings->runtime();
        $productRuntime = $homeRuntime['product_section'];
        $testimonialRuntime = $homeRuntime['testimonial_section'];
        $brandVersion = strtotime((string) Brand::query()->max('updated_at')) ?: 0;
        $cacheKey = 'home-page:product-brand-sections:v5:'
            .((int) $brandRuntime['enabled']).':'
            .((int) $brandRuntime['show_on_home']).':'
            .((int) $productRuntime['enabled']).':'
            .$productRuntime['limit'].':'
            .((int) $testimonialRuntime['enabled']).':'
            .($homeRuntime['version'] ?? 0).':'
            .$brandVersion;

        $payload = Cache::remember($cacheKey, now()->addMinutes(5), function () use ($collections, $brandRuntime, $homeRuntime, $productRuntime, $testimonialRuntime): array {
            $showBrands = (bool) ($brandRuntime['enabled'] && $brandRuntime['show_on_home']);
            $homeCollections = $collections->homeCollections()
                ->map(fn ($collection): array => [
                    'collection' => CollectionResource::make($collection)->resolve(),
                    'items' => ProductCardResource::collection(
                        $collections->products($collection, (int) ($collection->product_limit ?: 4))
                    )->resolve(),
                ])
                ->values()
                ->all();

            return [
                'settings' => $this->settings($homeRuntime),
                'collections' => $homeCollections,
                'sections' => [
                    'topBrands' => [
                        'enabled' => $showBrands,
                        'items' => $showBrands ? $this->brands(6) : [],
                    ],
                    'products' => [
                        'enabled' => (bool) $productRuntime['enabled'],
                        'items' => $productRuntime['enabled'] ? $this->products(
                            fn (Builder $query) => $query
                                ->orderByDesc('is_featured')
                                ->latest('published_at')
                                ->latest('created_at'),
                            (int) $productRuntime['limit']
                        ) : [],
                    ],
                    'testimonials' => [
                        'enabled' => (bool) $testimonialRuntime['enabled'],
                    ],
                ],
            ];
        });
        $payload['hero'] = $hero->runtime();
        $payload['sections']['blogs'] = [
            'items' => BlogCardResource::collection($blogs->homeBlogs())->resolve(),
            'settings' => $blogs->settings(),
        ];
        $payload['sections']['reviews'] = [
            'enabled' => (bool) $testimonialRuntime['enabled'],
            'items' => $testimonialRuntime['enabled'] ? $this->reviews(3) : [],
        ];

        return ApiResponse::success($payload);
    }

    private function productBaseQuery(): Builder
    {
        return Product::query()
            ->where('status', 'active')
            ->whereNotNull('published_at')
            ->withCount(['variants as active_variants_count' => fn (Builder $query) => $query->where('status', 'active')])
            ->where(fn (Builder $query) => $query
                ->where('track_inventory', false)
                ->orWhere('stock_quantity', '>', 0))
            ->with([
                'brand:id,name,slug',
                'category:id,name,slug',
                'images:id,product_id,url,is_primary,sort_order',
                'tags:id,name',
            ]);
    }

    private function products(callable $scope, int $limit): array
    {
        $query = $this->productBaseQuery();
        $scope($query);

        return ProductCardResource::collection($query->limit($limit)->get())->resolve();
    }

    private function brands(int $limit): array
    {
        return BrandResource::collection(
            Brand::query()
                ->where('status', 'active')
                ->whereHas('products', fn (Builder $query) => $query->where('status', 'active'))
                ->withCount(['products' => fn (Builder $query) => $query->where('status', 'active')])
                ->orderBy('sort_order')
                ->orderBy('name')
                ->limit($limit)
                ->get()
        )->resolve();
    }

    private function reviews(int $limit): array
    {
        return ProductReview::query()
            ->where('status', 'approved')
            ->with([
                'user:id,name,email,avatar',
                'product.brand:id,name,slug',
                'product.category:id,parent_id,name,slug',
                'product.images:id,product_id,url,is_primary,sort_order',
                'product.tags:id,name',
            ])
            ->whereHas('product', fn ($query) => $query->where('status', 'active'))
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (ProductReview $review): array => [
                'id' => (string) $review->id,
                'rating' => (int) $review->rating,
                'comment' => $review->comment,
                'verified' => (bool) $review->is_verified_purchase,
                'createdAt' => optional($review->created_at)->toISOString(),
                'user' => [
                    'id' => (string) $review->user?->id,
                    'name' => $review->user?->name ?: 'Customer',
                    'avatar' => $this->assetUrl($review->user?->avatar),
                ],
                'product' => $review->product
                    ? ProductCardResource::make($review->product)->resolve()
                    : null,
            ])
            ->values()
            ->all();
    }

    private function settings(array $homeRuntime): array
    {
        return [
            'newArrivals' => ['enabled' => true, 'limit' => 4, 'displayOrder' => 50],
            'flashSale' => ['enabled' => true, 'limit' => 4, 'displayOrder' => 30],
            'trending' => ['enabled' => true, 'limit' => 8, 'displayOrder' => 60, 'algorithm' => 'rating_reviews_featured'],
            'bestSellers' => ['enabled' => true, 'limit' => 4, 'displayOrder' => 70],
            'topBrands' => ['enabled' => true, 'limit' => 6, 'displayOrder' => 80],
            'products' => ['enabled' => (bool) $homeRuntime['product_section']['enabled'], 'limit' => (int) $homeRuntime['product_section']['limit'], 'displayOrder' => 90],
            'testimonials' => ['enabled' => (bool) $homeRuntime['testimonial_section']['enabled'], 'displayOrder' => 100],
        ];
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
