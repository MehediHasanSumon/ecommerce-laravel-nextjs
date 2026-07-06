<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\PaymentGatewaySetting;
use Illuminate\Support\Facades\Cache;

class PaymentSettingsService
{
    public const GATEWAYS = ['stripe', 'sslcommerz', 'bkash', 'nagad', 'rocket', 'paypal', 'razorpay', 'cash_on_delivery', 'bank_transfer'];
    private const OFFLINE_GATEWAYS = ['cash_on_delivery', 'bank_transfer'];

    public function all()
    {
        return PaymentGatewaySetting::query()->orderBy('display_order')->get();
    }

    public function replace(array $gateways, ?int $userId = null)
    {
        foreach ($gateways as $index => $gateway) {
            $existing = PaymentGatewaySetting::query()->where('gateway', $gateway['gateway'])->first();
            foreach (['secret_key', 'api_key', 'webhook_secret'] as $secretField) {
                if (($gateway[$secretField] ?? null) === '********') {
                    $gateway[$secretField] = $existing?->{$secretField};
                }
            }

            if (in_array($gateway['gateway'], self::OFFLINE_GATEWAYS, true)) {
                $gateway = [
                    ...$gateway,
                    'sandbox_mode' => false,
                    'public_key' => null,
                    'secret_key' => null,
                    'api_key' => null,
                    'merchant_id' => null,
                    'webhook_secret' => null,
                ];
            }

            PaymentGatewaySetting::query()->updateOrCreate(
                ['gateway' => $gateway['gateway']],
                [...$gateway, 'display_order' => $gateway['display_order'] ?? $index, 'updated_by' => $userId]
            );
        }
        Cache::forget('settings.navigation.runtime');
        Cache::forget('checkout.payment-methods.enabled');
        return $this->all();
    }
}
