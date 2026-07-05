<?php

namespace Database\Seeders;

use Database\Seeders\Settings\CompanySettingsSeeder;
use Database\Seeders\Settings\CategoryDisplaySettingsSeeder;
use Database\Seeders\Settings\EmailSettingsSeeder;
use Database\Seeders\Settings\HomeFeatureCardSettingsSeeder;
use Database\Seeders\Settings\LocalizationSettingsSeeder;
use Database\Seeders\Settings\MaintenanceModeSettingsSeeder;
use Database\Seeders\Settings\PaymentSettingsSeeder;
use Database\Seeders\Settings\SeoSettingsSeeder;
use Database\Seeders\Settings\ShippingSettingsSeeder;
use Database\Seeders\Settings\SmsProviderSettingsSeeder;
use Database\Seeders\Settings\SocialMediaSettingsSeeder;
use Database\Seeders\Settings\StoreSettingsSeeder;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CompanySettingsSeeder::class,
            CategoryDisplaySettingsSeeder::class,
            HomeFeatureCardSettingsSeeder::class,
            StoreSettingsSeeder::class,
            EmailSettingsSeeder::class,
            SmsProviderSettingsSeeder::class,
            PaymentSettingsSeeder::class,
            ShippingSettingsSeeder::class,
            SeoSettingsSeeder::class,
            SocialMediaSettingsSeeder::class,
            LocalizationSettingsSeeder::class,
            MaintenanceModeSettingsSeeder::class,
        ]);
    }
}
