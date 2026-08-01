<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\Fraud\FraudAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class FraudAnalyticsController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:can_view_fraud_analytics')];
    }

    public function __construct(private readonly FraudAnalyticsService $analytics) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['days' => ['nullable', 'integer', 'min:7', 'max:365']]);

        return ApiResponse::success([
            'analytics' => $this->analytics->dashboard((int) ($data['days'] ?? 30)),
        ]);
    }
}
