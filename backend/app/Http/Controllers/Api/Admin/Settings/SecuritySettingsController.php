<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateSecuritySettingsRequest;
use App\Http\Responses\ApiResponse;
use App\Services\Security\SecuritySettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class SecuritySettingsController extends Controller implements HasMiddleware
{
    public function __construct(private readonly SecuritySettingsService $settings) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:can-view-ip-block', only: ['show']),
            new Middleware('permission:can-update-ip-block', only: ['update']),
        ];
    }

    public function show(): JsonResponse
    {
        return ApiResponse::success($this->settings->payload());
    }

    public function update(UpdateSecuritySettingsRequest $request): JsonResponse
    {
        return ApiResponse::success(
            $this->settings->update($request->validated(), $request->user()),
            'Security settings saved successfully.',
        );
    }
}
