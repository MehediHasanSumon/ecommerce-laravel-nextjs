<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateBrandSettingsRequest;
use App\Http\Resources\Admin\Settings\BrandSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\BrandSettingsService;
use Illuminate\Http\JsonResponse;

class BrandSettingsController extends Controller
{
    public function __construct(private readonly BrandSettingsService $settings) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success([
            'settings' => BrandSettingResource::make($this->settings->get())->resolve(),
        ]);
    }

    public function update(UpdateBrandSettingsRequest $request): JsonResponse
    {
        $settings = $this->settings->update($request->validated(), $request->user()?->id);

        return ApiResponse::success([
            'settings' => BrandSettingResource::make($settings)->resolve(),
        ], 'Brand settings saved successfully.');
    }
}
