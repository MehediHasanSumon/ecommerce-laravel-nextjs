<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateHomePageSettingsRequest;
use App\Http\Resources\Admin\Settings\HomePageSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\HomePageSettingsService;
use Illuminate\Http\JsonResponse;

class HomePageSettingsController extends Controller
{
    public function __construct(private readonly HomePageSettingsService $settings) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success([
            'settings' => HomePageSettingResource::make($this->settings->get())->resolve(),
        ]);
    }

    public function update(UpdateHomePageSettingsRequest $request): JsonResponse
    {
        $settings = $this->settings->update($request->validated(), $request->user()?->id);

        return ApiResponse::success([
            'settings' => HomePageSettingResource::make($settings)->resolve(),
        ], 'Home page settings saved successfully.');
    }
}
