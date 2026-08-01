<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMarketingEventRequest;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\MarketingSettingsService;
use App\Services\Marketing\MarketingEventService;
use Illuminate\Http\JsonResponse;

class MarketingTrackingController extends Controller
{
    public function __construct(
        private readonly MarketingSettingsService $settings,
        private readonly MarketingEventService $events,
    ) {}

    public function config(): JsonResponse
    {
        return ApiResponse::success(['tracking' => $this->settings->runtime()]);
    }

    public function store(StoreMarketingEventRequest $request): JsonResponse
    {
        $data = $request->validated();
        $events = $this->events->track(
            $data['event_name'],
            $data,
            $request,
            user: $request->user(),
            source: 'browser',
            eventId: $data['event_id'],
        );

        return ApiResponse::success([
            'event_id' => $data['event_id'],
            'accepted' => count($events),
        ], 'Tracking event accepted.', 202);
    }
}
