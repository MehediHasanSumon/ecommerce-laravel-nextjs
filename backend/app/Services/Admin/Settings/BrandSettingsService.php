<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\BrandSetting;
use App\Services\Admin\Settings\Concerns\ManagesSingletonSettings;
use App\Services\Seo\SeoMetadataService;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class BrandSettingsService
{
    use ManagesSingletonSettings;

    protected function modelClass(): string
    {
        return BrandSetting::class;
    }

    protected function cacheKey(): string
    {
        return 'settings.brand';
    }

    protected function defaults(): array
    {
        return SettingsDefaults::brand();
    }

    public function enabled(): bool
    {
        return (bool) $this->get()->enabled;
    }

    public function runtime(): array
    {
        $settings = $this->get();
        $enabled = (bool) $settings->enabled;

        return [
            'enabled' => $enabled,
            'show_on_home' => $enabled && (bool) $settings->show_on_home,
        ];
    }

    public function update(array $data, ?int $userId = null): Model
    {
        $model = $this->get();
        $enabled = (bool) ($data['enabled'] ?? false);
        $model->fill([
            'enabled' => $enabled,
            'show_on_home' => $enabled && (bool) ($data['show_on_home'] ?? false),
            'updated_by' => $userId,
        ])->save();
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
        SeoMetadataService::invalidateCache();
    }
}
