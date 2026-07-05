<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateMaintenanceModeSettingsRequest;
use App\Http\Requests\Admin\Settings\UploadSettingsImageRequest;
use App\Http\Resources\Admin\Settings\MaintenanceModeSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\MaintenanceModeSettingsService;
use Illuminate\Http\JsonResponse;

class MaintenanceModeSettingsController extends Controller
{
    public function __construct(private readonly MaintenanceModeSettingsService $settings) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success(['settings' => MaintenanceModeSettingResource::make($this->settings->get())->resolve()]);
    }

    public function update(UpdateMaintenanceModeSettingsRequest $request): JsonResponse
    {
        return ApiResponse::success(['settings' => MaintenanceModeSettingResource::make($this->settings->update($request->validated(), $request->user()?->id))->resolve()], 'Maintenance settings saved.');
    }

    public function upload(UploadSettingsImageRequest $request): JsonResponse
    {
        return ApiResponse::success(['url' => $this->settings->upload($request->file('file'))], 'Image uploaded.', 201);
    }
}
