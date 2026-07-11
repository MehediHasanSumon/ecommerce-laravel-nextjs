<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateLocalizationSettingsRequest;
use App\Http\Resources\Admin\Settings\LocalizationSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\LocalizationSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class LocalizationSettingsController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_localization_setting', only: ['show']),
            new Middleware('permission:can_edit_localization_setting', only: ['update']),
        ];
    }

    public function __construct(private readonly LocalizationSettingsService $settings) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success(['settings' => LocalizationSettingResource::make($this->settings->get())->resolve()]);
    }

    public function update(UpdateLocalizationSettingsRequest $request): JsonResponse
    {
        return ApiResponse::success(['settings' => LocalizationSettingResource::make($this->settings->update($request->validated(), $request->user()?->id))->resolve()], 'Localization settings saved.');
    }
}
