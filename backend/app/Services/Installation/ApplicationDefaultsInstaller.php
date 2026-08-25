<?php

namespace App\Services\Installation;

use App\Models\HomeFeatureCard;
use App\Models\Settings\BlogSetting;
use App\Models\Settings\CategoryDisplaySetting;
use App\Models\Settings\FooterSetting;
use App\Models\Settings\HomeFeatureCardSetting;
use App\Models\Settings\PaymentGatewaySetting;
use App\Models\Settings\SeoSetting;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class ApplicationDefaultsInstaller
{
    public function install(): void
    {
        $this->singleton(BlogSetting::class, SettingsDefaults::blog());
        $this->singleton(CategoryDisplaySetting::class, SettingsDefaults::categoryDisplay());
        $this->singleton(HomeFeatureCardSetting::class, SettingsDefaults::homeFeatureCards());
        $this->singleton(SeoSetting::class, SettingsDefaults::seo());
        $this->singleton(FooterSetting::class, SettingsDefaults::footer());

        foreach (SettingsDefaults::homeFeatureCardItems() as $item) {
            HomeFeatureCard::query()->updateOrCreate(['title' => $item['title']], $item);
        }

        foreach (SettingsDefaults::paymentGateways() as $gateway) {
            $name = $gateway['gateway'];
            unset($gateway['gateway']);
            $this->keyed(PaymentGatewaySetting::class, ['gateway' => $name], $gateway);
        }

        foreach ([
            'settings.blog',
            'settings.category-display',
            'settings.home-feature-cards',
            'settings.payment',
            'settings.seo',
            'settings.footer',
            'settings.social',
        ] as $key) {
            Cache::forget($key);
            Cache::forget($key.'.id');
        }
    }

    /**
     * @param  class-string<Model>  $modelClass
     * @param  array<string, mixed>  $defaults
     */
    private function singleton(string $modelClass, array $defaults): Model
    {
        $model = $modelClass::query()->first() ?? new $modelClass;
        $missing = array_diff_key($defaults, array_filter($model->getAttributes()));

        if ($missing !== [] || ! $model->exists) {
            $model->forceFill($defaults)->save();
        }

        return $model;
    }

    /**
     * @param  class-string<Model>  $modelClass
     * @param  array<string, mixed>  $attributes
     * @param  array<string, mixed>  $values
     */
    private function keyed(string $modelClass, array $attributes, array $values): Model
    {
        $model = $modelClass::query()->where($attributes)->first() ?? new $modelClass;
        $missing = array_diff_key($values, array_filter($model->getAttributes()));

        if ($missing !== [] || ! $model->exists) {
            $model->forceFill($attributes + $values)->save();
        }

        return $model;
    }
}
