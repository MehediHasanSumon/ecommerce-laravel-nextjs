<?php

namespace Database\Seeders\Settings;

use App\Models\Settings\PaymentGatewaySetting;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Support\Facades\Cache;

class PaymentSettingsSeeder extends SettingsModuleSeeder
{
    public function run(): void
    {
        foreach (SettingsDefaults::paymentGateways() as $gateway) {
            $lookup = ['gateway' => $gateway['gateway']];
            unset($gateway['gateway']);

            $this->firstOrCreateKeyed(PaymentGatewaySetting::class, $lookup, $gateway);
        }

        Cache::forget('settings.payment');
    }
}
