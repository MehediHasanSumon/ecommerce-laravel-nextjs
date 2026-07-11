<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateBlogSettingsRequest;
use App\Http\Resources\Admin\Settings\BlogSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\BlogSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class BlogSettingsController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_blog_setting', only: ['show']),
            new Middleware('permission:can_edit_blog_setting', only: ['update']),
        ];
    }

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
