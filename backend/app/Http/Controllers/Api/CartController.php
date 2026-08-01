<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cart\ApplyCouponRequest;
use App\Http\Requests\Cart\StoreCartItemRequest;
use App\Http\Requests\Cart\UpdateCartItemRequest;
use App\Http\Resources\CartResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\CompanySettingsService;
use App\Services\Commerce\CartService;
use App\Services\Marketing\MarketingEventService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function __construct(
        private readonly CartService $service,
        private readonly MarketingEventService $marketingEvents,
        private readonly CompanySettingsService $companySettings,
    ) {}

    public function show(Request $request): JsonResponse
    {
        return ApiResponse::success([
            'cart' => CartResource::make($this->service->get($request))->resolve(),
        ]);
    }

    public function store(StoreCartItemRequest $request): JsonResponse
    {
        $cart = $this->service->add($request, $request->validated());
        $cart->loadMissing(['items.product.brand', 'items.product.category']);
        $item = $cart->items->firstWhere('product_id', $request->integer('product_id'));
        $quantity = (int) $request->integer('quantity', 1);
        $priceCents = (int) ($item?->discounted_price_cents ?? $item?->unit_price_cents ?? 0);
        $this->marketingEvents->track(
            'add_to_cart',
            ['ecommerce' => [
                'currency' => $this->currency(),
                'value' => $item ? round(($priceCents * $quantity) / 100, 2) : null,
                'items' => $item ? [[
                    'item_id' => (string) (data_get($item->selection_snapshot, 'selected_sku') ?: $item->product?->sku ?: $item->product_id),
                    'item_name' => $item->product?->name ?: 'Product',
                    'item_brand' => $item->product?->brand?->name,
                    'item_category' => $item->product?->category?->name,
                    'item_variant' => data_get($item->selection_snapshot, 'selected_variant'),
                    'price' => round($priceCents / 100, 2),
                    'quantity' => $quantity,
                ]] : [],
            ]],
            $request,
            user: $request->user(),
            eventId: $request->header('X-Marketing-Event-Id'),
        );

        return ApiResponse::success([
            'cart' => CartResource::make($cart)->resolve(),
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
        $item = $this->service->get($request)->items->firstWhere('id', $itemId);
        $cart = $this->service->removeItem($request, $itemId);
        if ($item) {
            $priceCents = (int) ($item->discounted_price_cents ?? $item->unit_price_cents);
            $this->marketingEvents->track(
                'remove_from_cart',
                [
                    'content_name' => $item->product?->name,
                    'content_category' => $item->product?->category?->name,
                    'ecommerce' => [
                        'currency' => $this->currency(),
                        'value' => round(($priceCents * $item->quantity) / 100, 2),
                        'items' => [[
                            'item_id' => (string) (data_get($item->selection_snapshot, 'selected_sku') ?: $item->product?->sku ?: $item->product_id),
                            'item_name' => $item->product?->name ?: 'Product',
                            'item_brand' => $item->product?->brand?->name,
                            'item_category' => $item->product?->category?->name,
                            'item_variant' => data_get($item->selection_snapshot, 'selected_variant'),
                            'price' => round($priceCents / 100, 2),
                            'quantity' => (int) $item->quantity,
                        ]],
                    ],
                ],
                $request,
                user: $request->user(),
                eventId: $request->header('X-Marketing-Event-Id'),
            );
        }

        return ApiResponse::success([
            'cart' => CartResource::make($cart)->resolve(),
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
        $cart = $this->service->applyCoupon(
            $request,
            (string) $request->string('code'),
            $request->integer('shipping_method_id') ?: null
        );
        $this->marketingEvents->track(
            'apply_coupon',
            ['ecommerce' => ['coupon' => (string) $request->string('code')]],
            $request,
            user: $request->user(),
            eventId: $request->header('X-Marketing-Event-Id'),
        );

        return ApiResponse::success([
            'cart' => CartResource::make($cart)->resolve(),
        ], 'Coupon applied successfully.');
    }

    public function removeCoupon(Request $request): JsonResponse
    {
        return ApiResponse::success([
            'cart' => CartResource::make($this->service->removeCoupon($request))->resolve(),
        ], 'Coupon removed successfully.');
    }

    private function currency(): string
    {
        return $this->companySettings->get()->currency?->currency ?: 'BDT';
    }
}
