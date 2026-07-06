<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PlaceOrderRequest;
use App\Http\Resources\OrderResource;
use App\Http\Resources\PaymentMethodResource;
use App\Http\Responses\ApiResponse;
use App\Services\Checkout\CheckoutService;
use App\Services\Payments\PaymentGatewayManager;
use Illuminate\Http\JsonResponse;

class CheckoutController extends Controller
{
    public function __construct(
        private readonly CheckoutService $checkout,
        private readonly PaymentGatewayManager $payments,
    ) {}

    public function paymentMethods(): JsonResponse
    {
        return ApiResponse::success([
            'items' => PaymentMethodResource::collection($this->payments->enabledSettings())->resolve(),
        ]);
    }

    public function place(PlaceOrderRequest $request): JsonResponse
    {
        [$order, $payment] = $this->checkout->place($request, $request->validated());
        $order->setAttribute('redirect_url', $payment->redirectUrl);

        return ApiResponse::success([
            'order' => OrderResource::make($order)->resolve(),
            'payment' => [
                'status' => $payment->status,
                'redirectUrl' => $payment->redirectUrl,
            ],
        ], 'Order placed successfully.', 201);
    }
}
