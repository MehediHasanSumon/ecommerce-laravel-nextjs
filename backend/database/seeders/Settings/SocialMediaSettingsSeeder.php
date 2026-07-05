<?php

namespace Database\Seeders\Settings;

use App\Models\Settings\SocialMediaSetting;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Support\Facades\Cache;

class SocialMediaSettingsSeeder extends SettingsModuleSeeder
{
    public function run(): void
    {
        foreach (SettingsDefaults::socialMedia() as $item) {
            $lookup = ['platform' => $item['platform']];
            unset($item['platform']);

            $this->firstOrCreateKeyed(SocialMediaSetting::class, $lookup, $item);
        }

        Cache::forget('settings.social');
    }
}
