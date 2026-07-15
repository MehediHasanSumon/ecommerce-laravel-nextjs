<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cart\ApplyCouponRequest;
use App\Http\Requests\Cart\StoreCartItemRequest;
use App\Http\Requests\Cart\UpdateCartItemRequest;
use App\Http\Resources\CartResource;
use App\Http\Responses\ApiResponse;
use App\Services\Commerce\CartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function __construct(private readonly CartService $service) {}

    public function show(Request $request): JsonResponse
    {
        return ApiResponse::success([
            'cart' => CartResource::make($this->service->get($request))->resolve(),
        ]);
    }

    public function store(StoreCartItemRequest $request): JsonResponse
    {
        return ApiResponse::success([
            'cart' => CartResource::make($this->service->add($request, $request->validated()))->resolve(),
        ]);
    }

    public function update(UpdateCartItemRequest $request, int $itemId): JsonResponse
    {
        return ApiResponse::success([
            'cart' => CartResource::make($this->service->updateItem($request, $itemId, (int) $request->integer('quantity')))->resolve(),
        ]);
    }

    public function destroy(Request $request, int $itemId): JsonResponse
    {
        return ApiResponse::success([
            'cart' => CartResource::make($this->service->removeItem($request, $itemId))->resolve(),
        ]);
    }

    public function clear(Request $request): JsonResponse
    {
        return ApiResponse::success([
            'cart' => CartResource::make($this->service->clear($request))->resolve(),
        ]);
    }

    public function merge(Request $request): JsonResponse
    {
        abort_unless($request->user(), 401, 'Unauthenticated.');

        return ApiResponse::success([
            'cart' => CartResource::make($this->service->merge($request, $request->user()))->resolve(),
        ]);
    }

    public function applyCoupon(ApplyCouponRequest $request): JsonResponse
    {
        $this->authorizeIfAuthenticated($request, 'can_apply_coupon');

        return ApiResponse::success([
            'cart' => CartResource::make($this->service->applyCoupon(
                $request,
                (string) $request->string('code'),
                $request->integer('shipping_method_id') ?: null
            ))->resolve(),
        ], 'Coupon applied successfully.');
    }

    public function removeCoupon(Request $request): JsonResponse
    {
        $this->authorizeIfAuthenticated($request, 'can_apply_coupon');

        return ApiResponse::success([
            'cart' => CartResource::make($this->service->removeCoupon($request))->resolve(),
        ], 'Coupon removed successfully.');
    }

    private function authorizeIfAuthenticated(Request $request, string $permission): void
    {
        if ($request->user()) {
            abort_unless($request->user()->can($permission), 403);
        }
    }
}
