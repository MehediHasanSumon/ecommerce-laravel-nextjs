<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\SmsProviderSetting;
class SmsProviderSettingsService
{
    public const PROVIDERS = ['twilio', 'vonage', 'ssl_wireless', 'custom'];

    public function all()
    {
        return SmsProviderSetting::query()->orderByDesc('is_default')->orderBy('provider')->get();
    }

    public function replace(array $providers, ?int $userId = null)
    {
        foreach ($providers as $provider) {
            SmsProviderSetting::query()->updateOrCreate(
                ['provider' => $provider['provider']],
                [...$provider, 'updated_by' => $userId]
            );
        }

        if (collect($providers)->where('is_default', true)->isNotEmpty()) {
            $default = collect($providers)->firstWhere('is_default', true)['provider'];
            SmsProviderSetting::query()->where('provider', '!=', $default)->update(['is_default' => false]);
        }
        return $this->all();
    }

    public function markTested(string $provider): void
    {
        SmsProviderSetting::query()->where('provider', $provider)->update(['last_tested_at' => now()]);
    }
}
