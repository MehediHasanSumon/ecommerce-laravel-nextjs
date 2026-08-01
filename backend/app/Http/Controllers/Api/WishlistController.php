<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Wishlist\ToggleWishlistRequest;
use App\Http\Resources\WishlistResource;
use App\Http\Responses\ApiResponse;
use App\Services\Commerce\WishlistService;
use App\Services\Marketing\MarketingEventService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    public function __construct(
        private readonly WishlistService $service,
        private readonly MarketingEventService $marketingEvents,
    ) {}

    public function show(Request $request): JsonResponse
    {
        return ApiResponse::success([
            'wishlist' => WishlistResource::make($this->service->get($request))->resolve(),
        ]);
    }

    public function toggle(ToggleWishlistRequest $request): JsonResponse
    {
        $wishlist = $this->service->toggle($request, (int) $request->integer('product_id'));
        if ($wishlist->items()->where('product_id', $request->integer('product_id'))->exists()) {
            $this->marketingEvents->track(
                'add_to_wishlist',
                ['content_name' => 'Product '.$request->integer('product_id')],
                $request,
                user: $request->user(),
                eventId: $request->header('X-Marketing-Event-Id'),
            );
        }

        return ApiResponse::success([
            'wishlist' => WishlistResource::make($wishlist)->resolve(),
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
