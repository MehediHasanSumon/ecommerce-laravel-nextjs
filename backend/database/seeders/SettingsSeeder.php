<?php

namespace Database\Seeders;

use Database\Seeders\Settings\BlogSettingsSeeder;
use Database\Seeders\Settings\CategoryDisplaySettingsSeeder;
use Database\Seeders\Settings\CompanySettingsSeeder;
use Database\Seeders\Settings\HomeFeatureCardSettingsSeeder;
use Database\Seeders\Settings\PaymentSettingsSeeder;
use Database\Seeders\Settings\SeoSettingsSeeder;
use Database\Seeders\Settings\SocialMediaSettingsSeeder;
use Database\Seeders\Settings\StoreSettingsSeeder;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CompanySettingsSeeder::class,
            BlogSettingsSeeder::class,
            CategoryDisplaySettingsSeeder::class,
            HomeFeatureCardSettingsSeeder::class,
            StoreSettingsSeeder::class,
            PaymentSettingsSeeder::class,
            SeoSettingsSeeder::class,
            SocialMediaSettingsSeeder::class,
        ]);
    }
}
