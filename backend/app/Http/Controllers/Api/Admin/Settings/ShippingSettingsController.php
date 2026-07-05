<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateShippingSettingsRequest;
use App\Http\Resources\Admin\Settings\ShippingSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\ShippingSettingsService;
use Illuminate\Http\JsonResponse;

class ShippingSettingsController extends Controller
{
    public function __construct(private readonly ShippingSettingsService $settings) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success($this->resourcePayload($this->settings->payload()));
    }

    public function update(UpdateShippingSettingsRequest $request): JsonResponse
    {
        return ApiResponse::success($this->resourcePayload($this->settings->replace($request->validated(), $request->user()?->id)), 'Shipping settings saved.');
    }

    private function resourcePayload(array $payload): array
    {
        return [
            'settings' => ShippingSettingResource::make($payload['settings'])->resolve(),
            'zones' => $payload['zones']->values(),
            'methods' => $payload['methods']->values(),
            'classes' => $payload['classes']->values(),
        ];
    }
}
