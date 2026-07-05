<?php

namespace Database\Seeders\Settings;

use App\Models\Settings\SmsProviderSetting;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Support\Facades\Cache;

class SmsProviderSettingsSeeder extends SettingsModuleSeeder
{
    public function run(): void
    {
        foreach (SettingsDefaults::smsProviders() as $provider) {
            $lookup = ['provider' => $provider['provider']];
            unset($provider['provider']);

            $this->firstOrCreateKeyed(SmsProviderSetting::class, $lookup, $provider);
        }

        Cache::forget('settings.sms');
    }
}
