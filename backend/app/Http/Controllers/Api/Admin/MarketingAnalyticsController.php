<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\MarketingTrackingEventResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\MarketingSettingsService;
use App\Services\Marketing\MarketingAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\Rule;

class MarketingAnalyticsController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:can_view_marketing_analytics')];
    }

    public function __construct(
        private readonly MarketingAnalyticsService $analytics,
        private readonly MarketingSettingsService $settings,
    ) {}

    public function dashboard(Request $request): JsonResponse
    {
        $data = $request->validate(['days' => ['nullable', 'integer', 'min:7', 'max:365']]);

        return ApiResponse::success(['analytics' => $this->analytics->dashboard((int) ($data['days'] ?? 30))]);
    }

    public function logs(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:191'],
            'platform' => ['nullable', Rule::in(['meta', 'google'])],
            'event' => ['nullable', 'string', 'max:80'],
            'status' => ['nullable', Rule::in(['queued', 'retrying', 'sent', 'failed', 'recorded', 'skipped'])],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'sort' => ['nullable', Rule::in(['platform', 'event_name', 'source', 'status', 'execution_time_ms', 'retry_count', 'occurred_at', 'sent_at'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $logs = $this->analytics->logs($filters);

        return ApiResponse::success(
            ['events' => MarketingTrackingEventResource::collection($logs)->resolve()],
            meta: ['pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
                'from' => $logs->firstItem(),
                'to' => $logs->lastItem(),
            ]],
        );
    }

    public function status(): JsonResponse
    {
        return ApiResponse::success(['tracking' => $this->settings->runtime()]);
    }
}
