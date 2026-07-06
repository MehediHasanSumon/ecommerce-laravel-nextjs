<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\PaymentGatewaySetting;
use Illuminate\Support\Facades\Cache;

class PaymentSettingsService
{
    public const GATEWAYS = ['stripe', 'sslcommerz', 'bkash', 'nagad', 'rocket', 'paypal', 'razorpay', 'cash_on_delivery', 'bank_transfer'];

    public function all()
    {
        return PaymentGatewaySetting::query()->orderBy('display_order')->get();
    }

    public function replace(array $gateways, ?int $userId = null)
    {
        foreach ($gateways as $index => $gateway) {
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
