<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ShippingMethodResource;
use App\Http\Responses\ApiResponse;
use App\Services\Shipping\ShippingZoneMatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShippingMethodController extends Controller
{
    public function index(Request $request, ShippingZoneMatcher $zones): JsonResponse
    {
        $country = trim((string) $request->query('country'));
        $subtotalCents = (int) round(((float) $request->query('subtotal', 0)) * 100);
        $methods = $zones->methodsForCountry($country ?: null)
            ->filter(fn ($method): bool => (int) ($method->minimum_order_amount_cents ?? 0) <= $subtotalCents);
        $items = ShippingMethodResource::collection($methods)->resolve();

        return ApiResponse::success([
            'items' => $items,
        ]);
    }
}
