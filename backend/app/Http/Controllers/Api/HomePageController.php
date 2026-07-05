<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BrandResource;
use App\Http\Resources\CollectionResource;
use App\Http\Resources\ProductCardResource;
use App\Http\Responses\ApiResponse;
use App\Models\Brand;
use App\Models\Product;
use App\Services\Collections\CollectionProductResolver;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class HomePageController extends Controller
{
    public function show(CollectionProductResolver $collections): JsonResponse
    {
        $payload = Cache::remember('home-page:product-brand-sections:v2', now()->addMinutes(5), function () use ($collections): array {
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
                'settings' => $this->settings(),
                'collections' => $homeCollections,
                'sections' => [
                    'topBrands' => [
                        'enabled' => true,
                        'items' => $this->brands(6),
                    ],
                    'products' => [
                        'enabled' => true,
                        'items' => $this->products(
                            fn (Builder $query) => $query
                                ->orderByDesc('is_featured')
                                ->latest('published_at')
                                ->latest('created_at'),
                            20
                        ),
                    ],
                ],
            ];
        });

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

    private function settings(): array
    {
        return [
            'newArrivals' => ['enabled' => true, 'limit' => 4, 'displayOrder' => 50],
            'flashSale' => ['enabled' => true, 'limit' => 4, 'displayOrder' => 30],
            'trending' => ['enabled' => true, 'limit' => 8, 'displayOrder' => 60, 'algorithm' => 'rating_reviews_featured'],
            'bestSellers' => ['enabled' => true, 'limit' => 4, 'displayOrder' => 70],
            'topBrands' => ['enabled' => true, 'limit' => 6, 'displayOrder' => 80],
            'products' => ['enabled' => true, 'limit' => 20, 'displayOrder' => 90],
        ];
    }
}
