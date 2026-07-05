<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\HomeFeatureCardSetting;
use App\Services\Admin\Settings\Concerns\ManagesSingletonSettings;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Database\Eloquent\Model;

class HomeFeatureCardSettingsService
{
    use ManagesSingletonSettings;

    protected function modelClass(): string
    {
        return HomeFeatureCardSetting::class;
    }

    protected function cacheKey(): string
    {
        return 'settings.home-feature-cards';
    }

    protected function defaults(): array
    {
        return SettingsDefaults::homeFeatureCards();
    }

    public function update(array $data, ?int $userId = null): Model
    {
        $model = $this->get();
        $model->fill([...$data, 'updated_by' => $userId])->save();
        cache()->forget($this->cacheKey());
        cache()->forget($this->cacheKey().'.id');
        cache()->forget('settings.navigation.runtime');
        cache()->forget('home-feature-cards.runtime');

        return $this->get();
    }
}
