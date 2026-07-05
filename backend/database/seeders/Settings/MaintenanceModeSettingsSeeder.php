<?php

namespace Database\Seeders\Settings;

use App\Models\Settings\MaintenanceModeSetting;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Support\Facades\Cache;

class MaintenanceModeSettingsSeeder extends SettingsModuleSeeder
{
    public function run(): void
    {
        $this->firstOrCreateSingleton(MaintenanceModeSetting::class, SettingsDefaults::maintenance());

        Cache::forget('settings.maintenance');
    }
}
