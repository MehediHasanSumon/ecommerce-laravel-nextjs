<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateFooterSettingsRequest;
use App\Http\Resources\Admin\Settings\FooterSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\FooterSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class FooterSettingsController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_footer_setting|can_view_store_setting', only: ['show']),
            new Middleware('permission:can_edit_footer_setting|can_edit_store_setting', only: ['update', 'uploadBanner']),
        ];
    }

    public function __construct(private readonly FooterSettingsService $settings) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success(FooterSettingResource::make($this->settings->get())->resolve());
    }

    public function update(UpdateFooterSettingsRequest $request): JsonResponse
    {
        return ApiResponse::success(
            FooterSettingResource::make($this->settings->update($request->validated(), $request->user()?->id))->resolve(),
            'Footer settings saved.'
        );
    }

    public function uploadBanner(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp,svg', 'max:5120'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp,svg', 'max:5120'],
        ]);

        $uploaded = $request->file('file') ?? $request->file('image');
        abort_unless($uploaded, 422, 'An image file is required.');

        $url = $this->settings->uploadBanner($uploaded);

        return ApiResponse::success(['url' => $url], 'Payment banner uploaded successfully.');
    }
}
