<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BrandResource;
use App\Http\Resources\CollectionResource;
use App\Http\Resources\ProductCardResource;
use App\Http\Responses\ApiResponse;
use App\Models\Brand;
use App\Models\Product;
use App\Services\Admin\Settings\BrandSettingsService;
use App\Services\Admin\Settings\HomePageSettingsService;
use App\Services\Admin\HeroSectionService;
use App\Services\Collections\CollectionProductResolver;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class HomePageController extends Controller
{
    public function show(CollectionProductResolver $collections, BrandSettingsService $brandSettings, HomePageSettingsService $homeSettings, HeroSectionService $hero): JsonResponse
    {
        $brandRuntime = $brandSettings->runtime();
        $homeRuntime = $homeSettings->runtime();
        $productRuntime = $homeRuntime['product_section'];
        $testimonialRuntime = $homeRuntime['testimonial_section'];
        $cacheKey = 'home-page:product-brand-sections:v5:'
            .((int) $brandRuntime['enabled']).':'
            .((int) $brandRuntime['show_on_home']).':'
            .((int) $productRuntime['enabled']).':'
            .$productRuntime['limit'].':'
            .((int) $testimonialRuntime['enabled']).':'
            .($homeRuntime['version'] ?? 0);

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

        return ApiResponse::success($payload);
    }

    private function productBaseQuery(): Builder
    {
        return Product::query()
            ->where('status', 'active')
            ->whereNotNull('published_at')
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
                ->orderByDesc('is_featured')
                ->orderBy('name')
                ->limit($limit)
                ->get()
        )->resolve();
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
}
