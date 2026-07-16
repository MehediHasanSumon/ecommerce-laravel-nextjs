<?php

namespace App\Services\Admin\Settings;

use App\Models\Currency;
use App\Models\Settings\CompanySetting;
use App\Services\Admin\Settings\Concerns\HandlesSettingAssets;
use App\Services\Admin\Settings\Concerns\ManagesSingletonSettings;
use App\Services\Seo\SeoMetadataService;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;

class CompanySettingsService
{
    use HandlesSettingAssets;
    use ManagesSingletonSettings {
        get as private baseGet;
        update as private baseUpdate;
    }

    protected function modelClass(): string
    {
        return CompanySetting::class;
    }

    protected function cacheKey(): string
    {
        return 'settings.company';
    }

    protected function defaults(): array
    {
        return SettingsDefaults::company();
    }

    public function upload(UploadedFile $file): string
    {
        $url = $this->storeAsset($file, 'settings/company');
        $this->clearSeoCaches();

        return $url;
    }

    public function get(): Model
    {
        $settings = $this->baseGet()->load('currency');

        if (! $settings->currency_id) {
            $currency = Currency::query()->where('currency', 'BDT')->first() ?: Currency::query()->first();
            if ($currency) {
                $settings->forceFill(['currency_id' => $currency->id])->save();
                $settings->setRelation('currency', $currency);
            }
        }

        return $settings;
    }

    public function update(array $data, ?int $userId = null): Model
    {
        $settings = $this->baseUpdate($data, $userId)->load('currency');
        $this->clearSeoCaches();

        return $settings;
    }

    private function clearSeoCaches(): void
    {
        SeoMetadataService::invalidateCache();
    }
}
