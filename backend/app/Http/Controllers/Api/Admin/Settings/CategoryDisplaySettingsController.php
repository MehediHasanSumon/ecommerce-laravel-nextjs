<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateCategoryDisplaySettingsRequest;
use App\Http\Resources\Admin\Settings\CategoryDisplaySettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\CategoryDisplaySettingsService;
use Illuminate\Http\JsonResponse;

class CategoryDisplaySettingsController extends Controller
{
    public function __construct(private readonly CategoryDisplaySettingsService $settings) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success(['settings' => CategoryDisplaySettingResource::make($this->settings->get())->resolve()]);
    }

    public function update(UpdateCategoryDisplaySettingsRequest $request): JsonResponse
    {
        return ApiResponse::success(
            ['settings' => CategoryDisplaySettingResource::make($this->settings->update($request->validated(), $request->user()?->id))->resolve()],
            'Category display settings saved.'
        );
    }
}
