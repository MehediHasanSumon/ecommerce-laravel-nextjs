<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Wishlist\ToggleWishlistRequest;
use App\Http\Resources\WishlistResource;
use App\Http\Responses\ApiResponse;
use App\Services\Commerce\WishlistService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    public function __construct(private readonly WishlistService $service) {}

    public function show(Request $request): JsonResponse
    {
        return ApiResponse::success([
            'wishlist' => WishlistResource::make($this->service->get($request))->resolve(),
        ]);
    }

    public function toggle(ToggleWishlistRequest $request): JsonResponse
    {
        return ApiResponse::success([
            'wishlist' => WishlistResource::make($this->service->toggle($request, (int) $request->integer('product_id')))->resolve(),
        ]);
    }

    public function destroy(Request $request, int $itemId): JsonResponse
    {
        return ApiResponse::success([
            'wishlist' => WishlistResource::make($this->service->remove($request, $itemId))->resolve(),
        ]);
    }

    public function clear(Request $request): JsonResponse
    {
        return ApiResponse::success([
            'wishlist' => WishlistResource::make($this->service->clear($request))->resolve(),
        ]);
    }

    public function merge(Request $request): JsonResponse
    {
        return ApiResponse::success([
            'wishlist' => WishlistResource::make($this->service->merge($request, $request->user()))->resolve(),
        ]);
    }
}
