<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CollectionResource;
use App\Http\Resources\ProductCardResource;
use App\Http\Responses\ApiResponse;
use App\Services\Collections\CollectionProductResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CollectionCatalogController extends Controller
{
    public function show(string $slug, Request $request, CollectionProductResolver $resolver): JsonResponse
    {
        $collection = $resolver->activeCollectionBySlugOrAlias($slug);

        if (! $collection) {
            abort(404);
        }

        $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'in:12'],
        ]);

        $products = $resolver->paginatedProducts($collection, 12);

        return ApiResponse::success([
            'collection' => CollectionResource::make($collection)->resolve(),
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
