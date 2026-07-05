<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateLocalizationSettingsRequest;
use App\Http\Resources\Admin\Settings\LocalizationSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\LocalizationSettingsService;
use Illuminate\Http\JsonResponse;

class LocalizationSettingsController extends Controller
{
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
