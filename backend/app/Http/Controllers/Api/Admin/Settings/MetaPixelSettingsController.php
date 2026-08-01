<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateMetaPixelSettingsRequest;
use App\Http\Resources\Admin\Settings\MetaPixelSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\MarketingSettingsService;
use App\Services\Marketing\MarketingConnectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class MetaPixelSettingsController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_meta_pixel_setting', only: ['show', 'status']),
            new Middleware('permission:can_edit_meta_pixel_setting', only: ['update', 'test']),
        ];
    }

    public function __construct(
        private readonly MarketingSettingsService $settings,
        private readonly MarketingConnectionService $connections,
    ) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success(['settings' => MetaPixelSettingResource::make($this->settings->meta())->resolve()]);
    }

    public function update(UpdateMetaPixelSettingsRequest $request): JsonResponse
    {
        return ApiResponse::success([
            'settings' => MetaPixelSettingResource::make(
                $this->settings->updateMeta($request->validated(), $request->user()?->id)
            )->resolve(),
        ], 'Meta Pixel settings saved.');
    }

    public function test(): JsonResponse
    {
        return ApiResponse::success(['result' => $this->connections->test('meta')], 'Meta tracking connection verified.');
    }

    public function status(): JsonResponse
    {
        return $this->show();
    }
}
