<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateMaintenanceModeSettingsRequest;
use App\Http\Requests\Admin\Settings\UploadSettingsImageRequest;
use App\Http\Resources\Admin\Settings\MaintenanceModeSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\MaintenanceModeSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class MaintenanceModeSettingsController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_maintenance_setting', only: ['show']),
            new Middleware('permission:can_edit_maintenance_setting', only: ['update', 'upload']),
        ];
    }

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
