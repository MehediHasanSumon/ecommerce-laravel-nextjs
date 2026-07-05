<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateSocialMediaSettingsRequest;
use App\Http\Resources\Admin\Settings\SocialMediaSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\SocialMediaSettingsService;
use Illuminate\Http\JsonResponse;

class SocialMediaSettingsController extends Controller
{
    public function __construct(private readonly SocialMediaSettingsService $settings) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success(['items' => SocialMediaSettingResource::collection($this->settings->all())->resolve()]);
    }

    public function update(UpdateSocialMediaSettingsRequest $request): JsonResponse
    {
        return ApiResponse::success(['items' => SocialMediaSettingResource::collection($this->settings->replace($request->validated('items'), $request->user()?->id))->resolve()], 'Social media settings saved.');
    }
}
