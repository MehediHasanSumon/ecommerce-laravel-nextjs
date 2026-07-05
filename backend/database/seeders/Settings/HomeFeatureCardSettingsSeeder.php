<?php

namespace Database\Seeders\Settings;

use App\Models\HomeFeatureCard;
use App\Models\Settings\HomeFeatureCardSetting;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Database\Seeder;

class HomeFeatureCardSettingsSeeder extends Seeder
{
    public function run(): void
    {
        HomeFeatureCardSetting::query()->firstOrCreate([], SettingsDefaults::homeFeatureCards());

        foreach (SettingsDefaults::homeFeatureCardItems() as $item) {
            HomeFeatureCard::query()->updateOrCreate(
                ['title' => $item['title']],
                $item
            );
        }
    }
}
