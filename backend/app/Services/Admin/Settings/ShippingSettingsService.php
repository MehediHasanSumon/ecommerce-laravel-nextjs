<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\ShippingClass;
use App\Models\Settings\ShippingMethod;
use App\Models\Settings\ShippingSetting;
use App\Models\Settings\ShippingZone;
use App\Services\Admin\Settings\Concerns\ManagesSingletonSettings;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Support\Facades\Cache;

class ShippingSettingsService
{
    use ManagesSingletonSettings;

    protected function modelClass(): string
    {
        return ShippingSetting::class;
    }

    protected function cacheKey(): string
    {
        return 'settings.shipping.general';
    }

    protected function defaults(): array
    {
        return SettingsDefaults::shipping();
    }

    public function payload(): array
    {
        return [
            'settings' => $this->get(),
            'zones' => ShippingZone::query()->with('methods')->orderBy('display_order')->get(),
            'methods' => ShippingMethod::query()->orderBy('display_order')->get(),
            'classes' => ShippingClass::query()->orderBy('name')->get(),
        ];
    }

    public function replace(array $data, ?int $userId = null): array
    {
        $this->update($data['settings'] ?? [], $userId);
        $this->syncRows(ShippingZone::class, $data['zones'] ?? [], ['name']);
        $this->syncRows(ShippingMethod::class, $data['methods'] ?? [], ['code']);
        $this->syncRows(ShippingClass::class, $data['classes'] ?? [], ['slug']);
        Cache::forget($this->cacheKey());

        return $this->payload();
    }

    private function syncRows(string $class, array $rows, array $keys): void
    {
        foreach ($rows as $row) {
            $lookup = collect($keys)->mapWithKeys(fn ($key) => [$key => $row[$key]])->all();
            $class::query()->updateOrCreate($lookup, $row);
        }
    }
}
