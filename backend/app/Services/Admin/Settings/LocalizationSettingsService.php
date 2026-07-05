<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\LocalizationSetting;
use App\Services\Admin\Settings\Concerns\ManagesSingletonSettings;
use App\Support\Admin\SettingsDefaults;

class LocalizationSettingsService
{
    use ManagesSingletonSettings;

    protected function modelClass(): string { return LocalizationSetting::class; }
    protected function cacheKey(): string { return 'settings.localization'; }
    protected function defaults(): array
    {
        return SettingsDefaults::localization();
    }
}
