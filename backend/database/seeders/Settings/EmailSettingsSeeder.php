<?php

namespace Database\Seeders\Settings;

use App\Models\Settings\EmailSetting;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Support\Facades\Cache;

class EmailSettingsSeeder extends SettingsModuleSeeder
{
    public function run(): void
    {
        $this->firstOrCreateSingleton(EmailSetting::class, SettingsDefaults::email());

        Cache::forget('settings.email');
    }
}
