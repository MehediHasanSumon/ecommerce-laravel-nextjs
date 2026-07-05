<?php

namespace Database\Seeders\Settings;

use App\Models\Settings\StoreSetting;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Support\Facades\Cache;

class StoreSettingsSeeder extends SettingsModuleSeeder
{
    public function run(): void
    {
        $this->firstOrCreateSingleton(StoreSetting::class, SettingsDefaults::store());

        Cache::forget('settings.store');
    }
}
