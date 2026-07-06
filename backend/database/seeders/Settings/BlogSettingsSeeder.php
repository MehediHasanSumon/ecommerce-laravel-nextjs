<?php

namespace Database\Seeders\Settings;

use App\Models\Settings\BlogSetting;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Database\Seeder;

class BlogSettingsSeeder extends Seeder
{
    public function run(): void
    {
        BlogSetting::query()->firstOrCreate([], SettingsDefaults::blog());
    }
}
