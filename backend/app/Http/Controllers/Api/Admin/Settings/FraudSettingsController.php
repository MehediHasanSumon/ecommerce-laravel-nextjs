<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateFraudSettingsRequest;
use App\Http\Resources\Admin\Settings\FraudProviderSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\FraudSettingsService;
use App\Services\Admin\Settings\StoreSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class FraudSettingsController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_fraud_setting', only: ['show', 'status']),
            new Middleware('permission:can_edit_fraud_setting', only: ['update', 'test']),
        ];
    }

    public function __construct(
        private readonly FraudSettingsService $settings,
        private readonly StoreSettingsService $store,
    ) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success($this->payload());
    }

    public function update(UpdateFraudSettingsRequest $request): JsonResponse
    {
        $this->store->update($request->validated('settings'), $request->user()?->id);
        $this->settings->replace($request->validated('providers'), $request->user()?->id);

        return ApiResponse::success($this->payload(), 'Fraud detection settings saved.');
    }

    public function test(string $provider): JsonResponse
    {
        abort_unless(in_array($provider, $this->settings->providerKeys(), true), 404);

        return ApiResponse::success(['result' => $this->settings->test($provider)], 'Fraud provider connection verified.');
    }

    public function status(): JsonResponse
    {
        return ApiResponse::success([
            'providers' => FraudProviderSettingResource::collection($this->settings->all())->resolve(),
            'metadata' => $this->settings->metadata(),
        ]);
    }

    private function payload(): array
    {
        $store = $this->store->get();
        $fields = [
            'fraud_detection_enabled',
            'fraud_auto_check_orders',
            'fraud_auto_check_customers',
            'fraud_check_during_checkout',
            'fraud_check_before_cod_confirmation',
            'fraud_check_before_shipment',
            'fraud_score_threshold',
            'fraud_critical_score_threshold',
            'fraud_auto_flag_suspicious_orders',
            'fraud_auto_hold_high_risk_orders',
            'fraud_auto_reject_critical_risk_orders',
            'fraud_block_cod_high_risk',
            'fraud_require_admin_approval',
            'fraud_provider_priority',
            'fraud_result_caching_enabled',
            'fraud_cache_duration_minutes',
        ];

        return [
            'settings' => collect($store->only($fields))
                ->put('fraud_provider_priority', $store->fraud_provider_priority ?: $this->settings->providerKeys())
                ->all(),
            'providers' => FraudProviderSettingResource::collection($this->settings->all())->resolve(),
            'metadata' => $this->settings->metadata(),
        ];
    }
}
