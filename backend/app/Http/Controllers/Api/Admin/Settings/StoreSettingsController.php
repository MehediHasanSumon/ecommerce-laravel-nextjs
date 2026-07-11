<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateStoreSettingsRequest;
use App\Http\Resources\Admin\Settings\StoreSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\StoreSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class StoreSettingsController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_store_setting', only: ['show']),
            new Middleware('permission:can_edit_store_setting', only: ['update']),
        ];
    }

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
