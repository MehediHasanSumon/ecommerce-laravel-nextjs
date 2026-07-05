<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdatePaymentSettingsRequest;
use App\Http\Resources\Admin\Settings\PaymentGatewaySettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\PaymentSettingsService;
use Illuminate\Http\JsonResponse;

class PaymentSettingsController extends Controller
{
    public function __construct(private readonly PaymentSettingsService $settings) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success(['gateways' => PaymentGatewaySettingResource::collection($this->settings->all())->resolve()]);
    }

    public function update(UpdatePaymentSettingsRequest $request): JsonResponse
    {
        $gateways = collect($request->validated('gateways'))->map(function (array $gateway): array {
            foreach (['secret_key', 'api_key', 'webhook_secret'] as $key) {
                if (($gateway[$key] ?? '') === '********') unset($gateway[$key]);
            }
            return $gateway;
        })->all();

        return ApiResponse::success(['gateways' => PaymentGatewaySettingResource::collection($this->settings->replace($gateways, $request->user()?->id))->resolve()], 'Payment settings saved.');
    }
}
