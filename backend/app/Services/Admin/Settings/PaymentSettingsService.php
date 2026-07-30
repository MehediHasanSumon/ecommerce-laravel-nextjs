<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\PaymentGatewaySetting;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Support\Facades\Cache;

class PaymentSettingsService
{
    public const GATEWAYS = ['stripe', 'sslcommerz', 'bkash', 'nagad', 'paypal', 'aamarpay', 'cash_on_delivery'];

    private const OFFLINE_GATEWAYS = ['cash_on_delivery'];

    public function all()
    {
        $this->syncSupportedGateways();

        return PaymentGatewaySetting::query()
            ->whereIn('gateway', self::GATEWAYS)
            ->orderBy('display_order')
            ->get();
    }

    public function replace(array $gateways, ?int $userId = null)
    {
        $this->syncSupportedGateways();

        foreach (array_values($gateways) as $index => $gateway) {
            if (! in_array($gateway['gateway'], self::GATEWAYS, true)) {
                continue;
            }

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
        Cache::forget('navigation.public.runtime');
        Cache::forget('checkout.payment-methods.enabled');

        return $this->all();
    }

    private function syncSupportedGateways(): void
    {
        PaymentGatewaySetting::query()
            ->whereNotIn('gateway', self::GATEWAYS)
            ->delete();

        foreach (SettingsDefaults::paymentGateways() as $gateway) {
            PaymentGatewaySetting::query()->firstOrCreate(
                ['gateway' => $gateway['gateway']],
                $gateway,
            );
        }
    }
}
