<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateBlogSettingsRequest;
use App\Http\Resources\Admin\Settings\BlogSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\BlogSettingsService;
use Illuminate\Http\JsonResponse;

class BlogSettingsController extends Controller
{
    public function __construct(private readonly BlogSettingsService $settings) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success([
            'settings' => BlogSettingResource::make($this->settings->get())->resolve(),
        ]);
    }

    public function update(UpdateBlogSettingsRequest $request): JsonResponse
    {
        $settings = $this->settings->update($request->validated(), $request->user()?->id);

        return ApiResponse::success([
            'settings' => BlogSettingResource::make($settings)->resolve(),
        ], 'Blog settings saved successfully.');
    }
}
