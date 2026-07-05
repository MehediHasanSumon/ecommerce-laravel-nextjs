<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\StoreSetting;
use App\Services\Admin\Settings\Concerns\ManagesSingletonSettings;
use App\Support\Admin\SettingsDefaults;

class StoreSettingsService
{
    use ManagesSingletonSettings;

    protected function modelClass(): string
    {
        return StoreSetting::class;
    }

    protected function cacheKey(): string
    {
        return 'settings.store';
    }

    protected function defaults(): array
    {
        return SettingsDefaults::store();
    }
}
