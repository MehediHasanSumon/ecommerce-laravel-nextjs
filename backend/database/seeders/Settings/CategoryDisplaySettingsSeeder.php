<?php

namespace Database\Seeders\Settings;

use App\Models\Settings\CategoryDisplaySetting;
use App\Support\Admin\SettingsDefaults;

class CategoryDisplaySettingsSeeder extends SettingsModuleSeeder
{
    public function run(): void
    {
        $this->firstOrCreateSingleton(CategoryDisplaySetting::class, SettingsDefaults::categoryDisplay());
    }
}
