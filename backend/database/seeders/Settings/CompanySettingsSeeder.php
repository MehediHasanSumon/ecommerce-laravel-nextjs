<?php

namespace Database\Seeders\Settings;

use App\Models\Currency;
use App\Models\Settings\CompanySetting;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Support\Facades\Cache;

class CompanySettingsSeeder extends SettingsModuleSeeder
{
    public function run(): void
    {
        $currency = Currency::query()->firstOrCreate(
            ['currency' => 'BDT'],
            ['country' => 'Bangladesh', 'symbol' => 'Tk', 'status' => 'active']
        );

        $defaults = SettingsDefaults::company();
        $defaults['currency_id'] = $currency->id;

        $this->firstOrCreateSingleton(CompanySetting::class, $defaults);

        Cache::forget('settings.company');
    }
}
