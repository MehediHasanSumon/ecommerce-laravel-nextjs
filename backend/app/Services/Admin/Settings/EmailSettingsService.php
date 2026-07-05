<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\EmailSetting;
use App\Services\Admin\Settings\Concerns\ManagesSingletonSettings;
use App\Support\Admin\SettingsDefaults;

class EmailSettingsService
{
    use ManagesSingletonSettings;

    protected function modelClass(): string
    {
        return EmailSetting::class;
    }

    protected function cacheKey(): string
    {
        return 'settings.email';
    }

    protected function defaults(): array
    {
        return SettingsDefaults::email();
    }

    public function markTested(): EmailSetting
    {
        return $this->update(['last_tested_at' => now()]);
    }
}
