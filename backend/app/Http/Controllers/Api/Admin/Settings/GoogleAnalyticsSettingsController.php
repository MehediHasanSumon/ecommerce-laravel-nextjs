<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateGoogleAnalyticsSettingsRequest;
use App\Http\Resources\Admin\Settings\GoogleAnalyticsSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\MarketingSettingsService;
use App\Services\Marketing\MarketingConnectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class GoogleAnalyticsSettingsController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_google_analytics_setting', only: ['show', 'status']),
            new Middleware('permission:can_edit_google_analytics_setting', only: ['update', 'test']),
        ];
    }

    public function __construct(
        private readonly MarketingSettingsService $settings,
        private readonly MarketingConnectionService $connections,
    ) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success(['settings' => GoogleAnalyticsSettingResource::make($this->settings->google())->resolve()]);
    }

    public function update(UpdateGoogleAnalyticsSettingsRequest $request): JsonResponse
    {
        return ApiResponse::success([
            'settings' => GoogleAnalyticsSettingResource::make(
                $this->settings->updateGoogle($request->validated(), $request->user()?->id)
            )->resolve(),
        ], 'Google Analytics settings saved.');
    }

    public function test(): JsonResponse
    {
        return ApiResponse::success(['result' => $this->connections->test('google')], 'Google Analytics connection verified.');
    }

    public function status(): JsonResponse
    {
        return $this->show();
    }
}
