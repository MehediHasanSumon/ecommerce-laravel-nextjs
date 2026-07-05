<?php

namespace Database\Seeders\Settings;

use App\Models\Settings\ShippingClass;
use App\Models\Settings\ShippingMethod;
use App\Models\Settings\ShippingSetting;
use App\Models\Settings\ShippingZone;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Support\Facades\Cache;

class ShippingSettingsSeeder extends SettingsModuleSeeder
{
    public function run(): void
    {
        $this->firstOrCreateSingleton(ShippingSetting::class, SettingsDefaults::shipping());

        foreach (SettingsDefaults::shippingZones() as $zone) {
            $lookup = ['name' => $zone['name']];
            unset($zone['name']);

            $this->firstOrCreateKeyed(ShippingZone::class, $lookup, $zone);
        }

        foreach (SettingsDefaults::shippingMethods() as $method) {
            $zoneName = $method['zone'];
            unset($method['zone']);

            $zone = ShippingZone::query()->where('name', $zoneName)->first();
            $lookup = ['code' => $method['code']];
            unset($method['code']);

            $this->firstOrCreateKeyed(ShippingMethod::class, $lookup, [
                ...$method,
                'shipping_zone_id' => $zone?->id,
            ]);
        }

        foreach (SettingsDefaults::shippingClasses() as $class) {
            $lookup = ['slug' => $class['slug']];
            unset($class['slug']);

            $this->firstOrCreateKeyed(ShippingClass::class, $lookup, $class);
        }

        Cache::forget('settings.shipping.general');
    }
}
