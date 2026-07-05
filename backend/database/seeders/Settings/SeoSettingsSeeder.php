<?php

namespace Database\Seeders\Settings;

use App\Models\Settings\SeoSetting;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Support\Facades\Cache;

class SeoSettingsSeeder extends SettingsModuleSeeder
{
    public function run(): void
    {
        $this->firstOrCreateSingleton(SeoSetting::class, SettingsDefaults::seo());

        Cache::forget('settings.seo');
    }
}
