<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateSeoSettingsRequest;
use App\Http\Requests\Admin\Settings\UploadSettingsImageRequest;
use App\Http\Resources\Admin\Settings\SeoSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\SeoSettingsService;
use Illuminate\Http\JsonResponse;

class SeoSettingsController extends Controller
{
    public function __construct(private readonly SeoSettingsService $settings) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success(['settings' => SeoSettingResource::make($this->settings->get())->resolve()]);
    }

    public function update(UpdateSeoSettingsRequest $request): JsonResponse
    {
        return ApiResponse::success(['settings' => SeoSettingResource::make($this->settings->update($request->validated(), $request->user()?->id))->resolve()], 'SEO settings saved.');
    }

    public function upload(UploadSettingsImageRequest $request): JsonResponse
    {
        return ApiResponse::success(['url' => $this->settings->upload($request->file('file'))], 'Image uploaded.', 201);
    }
}
