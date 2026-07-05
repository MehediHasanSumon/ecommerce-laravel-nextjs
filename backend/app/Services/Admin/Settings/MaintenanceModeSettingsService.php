<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\MaintenanceModeSetting;
use App\Services\Admin\Settings\Concerns\HandlesSettingAssets;
use App\Services\Admin\Settings\Concerns\ManagesSingletonSettings;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Http\UploadedFile;

class MaintenanceModeSettingsService
{
    use HandlesSettingAssets;
    use ManagesSingletonSettings;

    protected function modelClass(): string { return MaintenanceModeSetting::class; }
    protected function cacheKey(): string { return 'settings.maintenance'; }
    protected function defaults(): array
    {
        return SettingsDefaults::maintenance();
    }

    public function upload(UploadedFile $file): string
    {
        return $this->storeAsset($file, 'settings/maintenance');
    }
}
