<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateHomeFeatureCardSettingsRequest;
use App\Http\Resources\Admin\Settings\HomeFeatureCardSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\HomeFeatureCardSettingsService;
use Illuminate\Http\JsonResponse;

class HomeFeatureCardSettingsController extends Controller
{
    public function __construct(private readonly HomeFeatureCardSettingsService $settings) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success(['settings' => HomeFeatureCardSettingResource::make($this->settings->get())->resolve()]);
    }

    public function update(UpdateHomeFeatureCardSettingsRequest $request): JsonResponse
    {
        return ApiResponse::success(
            ['settings' => HomeFeatureCardSettingResource::make($this->settings->update($request->validated(), $request->user()?->id))->resolve()],
            'Home page feature card settings saved.'
        );
    }
}
