<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\Courier\CourierWebhookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourierWebhookController extends Controller
{
    public function __construct(private readonly CourierWebhookService $webhooks) {}

    public function pathao(Request $request): JsonResponse
    {
        return ApiResponse::success(
            $this->webhooks->handlePathao($request),
            'Webhook accepted.',
            202,
        );
    }
}
