<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\CategoryDisplaySetting;
use App\Services\Admin\Settings\Concerns\ManagesSingletonSettings;
use App\Support\Admin\SettingsDefaults;

class CategoryDisplaySettingsService
{
    use ManagesSingletonSettings;

    public const MODE_LANDING_PAGE = 'landing_page';
    public const MODE_HOME_GRID_NAVBAR_DROPDOWN = 'home_grid_navbar_dropdown';
    public const MODE_NAVBAR_DROPDOWN_ONLY = 'navbar_dropdown_only';

    public const MODES = [
        self::MODE_LANDING_PAGE,
        self::MODE_HOME_GRID_NAVBAR_DROPDOWN,
        self::MODE_NAVBAR_DROPDOWN_ONLY,
    ];

    protected function modelClass(): string
    {
        return CategoryDisplaySetting::class;
    }

    protected function cacheKey(): string
    {
        return 'settings.category-display';
    }

    protected function defaults(): array
    {
        return SettingsDefaults::categoryDisplay();
    }

    public function update(array $data, ?int $userId = null): CategoryDisplaySetting
    {
        cache()->forget('categories.runtime.tree');

        /** @var CategoryDisplaySetting $setting */
        $setting = $this->updateSingleton($data, $userId);

        return $setting;
    }

    private function updateSingleton(array $data, ?int $userId = null): CategoryDisplaySetting
    {
        $model = $this->get();
        $model->fill([...$data, 'updated_by' => $userId])->save();
        cache()->forget($this->cacheKey());
        cache()->forget($this->cacheKey().'.id');
        cache()->forget('settings.navigation.runtime');

        return $this->get();
    }
}
