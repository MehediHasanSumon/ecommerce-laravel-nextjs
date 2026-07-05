<?php

namespace App\Services\Admin\Settings;

use App\Models\Currency;
use App\Models\Settings\CompanySetting;
use App\Services\Admin\Settings\Concerns\HandlesSettingAssets;
use App\Services\Admin\Settings\Concerns\ManagesSingletonSettings;
use App\Support\Admin\SettingsDefaults;

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

    public function upload(\Illuminate\Http\UploadedFile $file): string
    {
        return $this->storeAsset($file, 'settings/company');
    }

    public function get(): \Illuminate\Database\Eloquent\Model
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

    public function update(array $data, ?int $userId = null): \Illuminate\Database\Eloquent\Model
    {
        return $this->baseUpdate($data, $userId)->load('currency');
    }
}
