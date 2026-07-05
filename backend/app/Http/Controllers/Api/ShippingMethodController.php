<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ShippingMethodResource;
use App\Http\Responses\ApiResponse;
use App\Models\Settings\ShippingMethod;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class ShippingMethodController extends Controller
{
    public function index(): JsonResponse
    {
        $items = Cache::remember(
            'storefront.shipping-methods.active',
            now()->addMinutes(10),
            fn () => ShippingMethodResource::collection(
                ShippingMethod::query()
                    ->where('status', true)
                    ->orderBy('display_order')
                    ->orderBy('name')
                    ->get()
            )->resolve()
        );

        return ApiResponse::success([
            'items' => $items,
        ]);
    }
}
