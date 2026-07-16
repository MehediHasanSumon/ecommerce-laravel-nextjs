<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\SeoSetting;
use App\Services\Admin\Settings\Concerns\HandlesSettingAssets;
use App\Services\Admin\Settings\Concerns\ManagesSingletonSettings;
use App\Services\Seo\SeoMetadataService;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;

class SeoSettingsService
{
    use HandlesSettingAssets;
    use ManagesSingletonSettings;

    protected function modelClass(): string
    {
        return SeoSetting::class;
    }

    protected function cacheKey(): string
    {
        return 'settings.seo';
    }

    protected function defaults(): array
    {
        return SettingsDefaults::seo();
    }

    public function upload(UploadedFile $file): string
    {
        $url = $this->storeAsset($file, 'settings/seo');
        $this->clearMetadataCaches();

        return $url;
    }

    public function update(array $data, ?int $userId = null): Model
    {
        $settings = $this->get();
        $settings->fill([...$data, 'updated_by' => $userId])->save();
        cache()->forget($this->cacheKey());
        cache()->forget($this->cacheKey().'.id');
        cache()->forget('settings.navigation.runtime');
        $this->clearMetadataCaches();

        return $this->get();
    }

    private function clearMetadataCaches(): void
    {
        SeoMetadataService::invalidateCache();
    }
}
