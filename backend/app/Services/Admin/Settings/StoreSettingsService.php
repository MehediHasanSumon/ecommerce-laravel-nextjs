<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\StoreSetting;
use App\Services\Admin\Settings\Concerns\ManagesSingletonSettings;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class StoreSettingsService
{
    use ManagesSingletonSettings {
        get as protected getUncached;
    }

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

    public function get(): Model
    {
        return Cache::remember(
            $this->cacheKey(),
            now()->addMinutes(10),
            fn (): Model => $this->getUncached(),
        );
    }
}
