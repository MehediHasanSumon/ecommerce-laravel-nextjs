<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\HomePageSetting;
use App\Services\Admin\Settings\Concerns\ManagesSingletonSettings;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class HomePageSettingsService
{
    use ManagesSingletonSettings;

    protected function modelClass(): string
    {
        return HomePageSetting::class;
    }

    protected function cacheKey(): string
    {
        return 'settings.home-page';
    }

    protected function defaults(): array
    {
        return SettingsDefaults::homePage();
    }

    public function runtime(): array
    {
        $settings = $this->get();

        return [
            'product_section' => [
                'enabled' => (bool) $settings->enable_product_section,
                'limit' => (int) $settings->products_per_section,
            ],
            'testimonial_section' => [
                'enabled' => (bool) $settings->enable_testimonial_section,
            ],
            'version' => optional($settings->updated_at)->getTimestamp() ?? 0,
        ];
    }

    public function update(array $data, ?int $userId = null): Model
    {
        $model = $this->get();
        $model->fill([...$data, 'updated_by' => $userId])->save();
        $this->flushCaches();

        return $this->get();
    }

    public function flushCaches(): void
    {
        Cache::forget($this->cacheKey());
        Cache::forget($this->cacheKey().'.id');
        Cache::forget('settings.navigation.runtime');
        Cache::forget('home-page:product-brand-sections');
        Cache::forget('home-page:product-brand-sections:v2');
        Cache::forget('home-page:product-brand-sections:v4:0:0');
        Cache::forget('home-page:product-brand-sections:v4:0:1');
        Cache::forget('home-page:product-brand-sections:v4:1:0');
        Cache::forget('home-page:product-brand-sections:v4:1:1');
    }
}
