<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\SeoSetting;
use App\Services\Admin\Settings\Concerns\HandlesSettingAssets;
use App\Services\Admin\Settings\Concerns\ManagesSingletonSettings;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Http\UploadedFile;

class SeoSettingsService
{
    use HandlesSettingAssets;
    use ManagesSingletonSettings;

    protected function modelClass(): string { return SeoSetting::class; }
    protected function cacheKey(): string { return 'settings.seo'; }
    protected function defaults(): array
    {
        return SettingsDefaults::seo();
    }

    public function upload(UploadedFile $file): string
    {
        return $this->storeAsset($file, 'settings/seo');
    }
}
