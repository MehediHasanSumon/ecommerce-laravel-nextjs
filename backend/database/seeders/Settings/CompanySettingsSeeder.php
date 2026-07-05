<?php

namespace Database\Seeders\Settings;

use App\Models\Settings\CompanySetting;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Support\Facades\Cache;

class CompanySettingsSeeder extends SettingsModuleSeeder
{
    public function run(): void
    {
        $this->firstOrCreateSingleton(CompanySetting::class, SettingsDefaults::company());

        Cache::forget('settings.company');
    }
}
