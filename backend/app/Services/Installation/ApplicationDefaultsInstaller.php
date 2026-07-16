<?php

namespace App\Services\Installation;

use App\Models\HomeFeatureCard;
use App\Models\Settings\BlogSetting;
use App\Models\Settings\CategoryDisplaySetting;
use App\Models\Settings\HomeFeatureCardSetting;
use App\Models\Settings\PaymentGatewaySetting;
use App\Models\Settings\SeoSetting;
use App\Models\Settings\SocialMediaSetting;
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

        foreach (SettingsDefaults::homeFeatureCardItems() as $item) {
            HomeFeatureCard::query()->updateOrCreate(['title' => $item['title']], $item);
        }

        foreach (SettingsDefaults::paymentGateways() as $gateway) {
            $name = $gateway['gateway'];
            unset($gateway['gateway']);
            $this->keyed(PaymentGatewaySetting::class, ['gateway' => $name], $gateway);
        }

        foreach (SettingsDefaults::socialMedia() as $item) {
            $platform = $item['platform'];
            unset($item['platform']);
            $this->keyed(SocialMediaSetting::class, ['platform' => $platform], $item);
        }

        foreach ([
            'settings.blog',
            'settings.category-display',
            'settings.home-feature-cards',
            'settings.payment',
            'settings.seo',
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

        return $this->fillMissing($model, $defaults);
    }

    /**
     * @param  class-string<Model>  $modelClass
     * @param  array<string, mixed>  $lookup
     * @param  array<string, mixed>  $defaults
     */
    private function keyed(string $modelClass, array $lookup, array $defaults): Model
    {
        $model = $modelClass::query()->where($lookup)->first() ?? new $modelClass($lookup);

        return $this->fillMissing($model, $defaults);
    }

    /**
     * @param  array<string, mixed>  $defaults
     */
    private function fillMissing(Model $model, array $defaults): Model
    {
        foreach ($defaults as $key => $value) {
            if (! $model->exists || $model->getAttribute($key) === null) {
                $model->setAttribute($key, $value);
            }
        }

        $model->save();

        return $model;
    }
}
