<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateStoreSettingsRequest;
use App\Http\Resources\Admin\Settings\StoreSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\StoreSettingsService;
use Illuminate\Http\JsonResponse;

class StoreSettingsController extends Controller
{
    public function __construct(private readonly StoreSettingsService $settings) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success(['settings' => StoreSettingResource::make($this->settings->get())->resolve()]);
    }

    public function update(UpdateStoreSettingsRequest $request): JsonResponse
    {
        return ApiResponse::success(['settings' => StoreSettingResource::make($this->settings->update($request->validated(), $request->user()?->id))->resolve()], 'Store settings saved.');
    }
}
