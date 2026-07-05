<?php

namespace Database\Seeders\Settings;

use App\Models\Settings\LocalizationSetting;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Support\Facades\Cache;

class LocalizationSettingsSeeder extends SettingsModuleSeeder
{
    public function run(): void
    {
        $this->firstOrCreateSingleton(LocalizationSetting::class, SettingsDefaults::localization());

        Cache::forget('settings.localization');
    }
}
