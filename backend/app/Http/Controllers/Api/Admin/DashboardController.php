<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\DashboardAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DashboardController extends Controller
{
    public function __construct(private readonly DashboardAnalyticsService $dashboard) {}

    public function show(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'preset' => ['nullable', Rule::in(['today', 'yesterday', 'last_7_days', 'last_30_days', 'last_90_days', 'this_month', 'this_year', 'last_12_months', 'custom'])],
            'date_from' => ['nullable', 'date', 'required_if:preset,custom'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from', 'required_if:preset,custom'],
        ]);

        return ApiResponse::success([
            'dashboard' => $this->dashboard->overview($filters),
        ], 'Dashboard analytics loaded successfully.');
    }
}
