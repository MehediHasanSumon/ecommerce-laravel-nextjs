<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TrackOrderRequest;
use App\Http\Responses\ApiResponse;
use App\Services\Orders\OrderTrackingService;
use Illuminate\Http\JsonResponse;

class OrderTrackingController extends Controller
{
    public function __construct(private readonly OrderTrackingService $tracking) {}

    public function show(TrackOrderRequest $request): JsonResponse
    {
        $order = $this->tracking->find(
            $request->validated('order_id'),
            $request->validated('mobile_number'),
        );

        if (! $order) {
            return ApiResponse::error(
                'No order was found with the provided Order ID and Mobile Number.',
                404,
            );
        }

        return ApiResponse::success(['order' => $order], 'Order tracking retrieved successfully.');
    }
}
