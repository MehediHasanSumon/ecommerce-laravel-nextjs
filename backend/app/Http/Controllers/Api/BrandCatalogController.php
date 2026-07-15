<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BrandResource;
use App\Http\Resources\ProductCardResource;
use App\Http\Responses\ApiResponse;
use App\Models\Brand;
use App\Models\Product;
use App\Services\Admin\Settings\BrandSettingsService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BrandCatalogController extends Controller
{
    public function __construct(private readonly BrandSettingsService $brandSettings) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($this->brandSettings->enabled(), 404);

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:48'],
        ]);

        $query = Brand::query()
            ->where('status', 'active')
            ->whereHas('products', fn (Builder $query) => $query->where('status', 'active'))
            ->withCount(['products' => fn (Builder $query) => $query->where('status', 'active')])
            ->when($request->filled('search'), fn (Builder $query) => $query->where('name', 'like', '%'.trim((string) $request->query('search')).'%'))
            ->orderBy('sort_order')
            ->orderBy('name');

        $brands = $query->paginate((int) ($validated['per_page'] ?? 48))->withQueryString();

        return ApiResponse::success([
            'featured' => BrandResource::collection(
                Brand::query()
                    ->where('status', 'active')
                    ->where('is_featured', true)
                    ->whereHas('products', fn (Builder $query) => $query->where('status', 'active'))
                    ->withCount(['products' => fn (Builder $query) => $query->where('status', 'active')])
                    ->orderBy('sort_order')
                    ->orderBy('name')
                    ->limit(6)
                    ->get()
            )->resolve(),
            'items' => BrandResource::collection($brands->getCollection())->resolve(),
        ], meta: [
            'pagination' => [
                'current_page' => $brands->currentPage(),
                'last_page' => $brands->lastPage(),
                'per_page' => $brands->perPage(),
                'total' => $brands->total(),
                'from' => $brands->firstItem(),
                'to' => $brands->lastItem(),
            ],
        ]);
    }

    public function show(string $slug, Request $request): JsonResponse
    {
        abort_unless($this->brandSettings->enabled(), 404);

        $validated = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:48'],
        ]);

        $brand = Brand::query()
            ->where('slug', $slug)
            ->where('status', 'active')
            ->withCount(['products' => fn (Builder $query) => $query->where('status', 'active')])
            ->firstOrFail();

        $products = Product::query()
            ->where('status', 'active')
            ->where('brand_id', $brand->id)
            ->whereNotNull('published_at')
            ->withCount(['variants as active_variants_count' => fn (Builder $query) => $query->where('status', 'active')])
            ->withMin(['variants as default_variant_id' => fn (Builder $query) => $query
                ->where('status', 'active')
                ->where(fn (Builder $query) => $query->whereNull('stock_quantity')->orWhere('stock_quantity', '>', 0))], 'id')
            ->where(fn (Builder $query) => $query
                ->where('track_inventory', false)
                ->orWhere('stock_quantity', '>', 0))
            ->with([
                'brand:id,name,slug',
                'category:id,name,slug',
                'images:id,product_id,url,is_primary,sort_order',
                'tags:id,name',
            ])
            ->orderByDesc('is_featured')
            ->latest('published_at')
            ->paginate((int) ($validated['per_page'] ?? 12))
            ->withQueryString();

        return ApiResponse::success([
            'brand' => BrandResource::make($brand)->resolve(),
            'products' => ProductCardResource::collection($products->getCollection())->resolve(),
        ], meta: [
            'pagination' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
                'from' => $products->firstItem(),
                'to' => $products->lastItem(),
            ],
        ]);
    }
}
