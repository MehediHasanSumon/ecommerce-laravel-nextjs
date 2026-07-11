<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateSmsProviderSettingsRequest;
use App\Http\Resources\Admin\Settings\SmsProviderSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\SmsProviderSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class SmsProviderSettingsController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_sms_setting', only: ['show']),
            new Middleware('permission:can_edit_sms_setting', only: ['update', 'test']),
        ];
    }

    public function __construct(private readonly SmsProviderSettingsService $settings) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success(['providers' => SmsProviderSettingResource::collection($this->settings->all())->resolve()]);
    }

    public function update(UpdateSmsProviderSettingsRequest $request): JsonResponse
    {
        $providers = collect($request->validated('providers'))->map(function (array $provider): array {
            foreach (['api_key', 'api_secret'] as $key) {
                if (($provider[$key] ?? '') === '********') unset($provider[$key]);
            }
            return $provider;
        })->all();

        return ApiResponse::success(['providers' => SmsProviderSettingResource::collection($this->settings->replace($providers, $request->user()?->id))->resolve()], 'SMS settings saved.');
    }

    public function test(string $provider): JsonResponse
    {
        $this->settings->markTested($provider);

        return ApiResponse::success(['status' => 'queued', 'provider' => $provider], 'Test SMS queued successfully.');
    }
}
