<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\GoogleAnalyticsSetting;
use App\Models\Settings\MetaPixelSetting;
use App\Services\Admin\AdminNavigationService;
use Illuminate\Support\Facades\Cache;

class MarketingSettingsService
{
    public function meta(): MetaPixelSetting
    {
        return MetaPixelSetting::query()->firstOrCreate([], [
            'automatic_event_tracking' => true,
            'advanced_matching' => true,
            'server_side_tracking' => true,
            'browser_side_tracking' => true,
        ]);
    }

    public function google(): GoogleAnalyticsSetting
    {
        return GoogleAnalyticsSetting::query()->firstOrCreate([], [
            'enhanced_ecommerce' => true,
            'server_side_events' => true,
            'client_side_events' => true,
            'anonymize_ip' => true,
            'respect_consent_mode' => true,
        ]);
    }

    public function updateMeta(array $data, ?int $userId): MetaPixelSetting
    {
        $setting = $this->meta();
        $data = $this->preserveMasked($data, $setting, ['access_token', 'test_event_code']);
        $setting->fill([...$data, 'updated_by' => $userId, 'connection_status' => 'not_tested'])->save();
        $this->invalidate();

        return $setting->fresh();
    }

    public function updateGoogle(array $data, ?int $userId): GoogleAnalyticsSetting
    {
        $setting = $this->google();
        $data = $this->preserveMasked($data, $setting, ['api_secret']);
        $setting->fill([...$data, 'updated_by' => $userId, 'connection_status' => 'not_tested'])->save();
        $this->invalidate();

        return $setting->fresh();
    }

    public function runtime(): array
    {
        $meta = $this->meta();
        $google = $this->google();

        return [
            'meta' => [
                'enabled' => (bool) $meta->enabled,
                'pixel_id' => $meta->enabled && $meta->browser_side_tracking ? $meta->pixel_id : null,
                'browser_side_tracking' => (bool) $meta->browser_side_tracking,
                'server_side_tracking' => (bool) ($meta->server_side_tracking && $meta->conversions_api_enabled),
                'automatic_event_tracking' => (bool) $meta->automatic_event_tracking,
                'advanced_matching' => (bool) $meta->advanced_matching,
                'debug_mode' => (bool) $meta->debug_mode,
            ],
            'google' => [
                'enabled' => (bool) $google->enabled,
                'measurement_id' => $google->enabled && $google->client_side_events ? $google->measurement_id : null,
                'client_side_events' => (bool) $google->client_side_events,
                'server_side_events' => (bool) $google->server_side_events,
                'enhanced_ecommerce' => (bool) $google->enhanced_ecommerce,
                'debug_mode' => (bool) $google->debug_mode,
                'anonymize_ip' => (bool) $google->anonymize_ip,
                'respect_consent_mode' => (bool) $google->respect_consent_mode,
            ],
        ];
    }

    private function preserveMasked(array $data, object $setting, array $fields): array
    {
        foreach ($fields as $field) {
            $value = $data[$field] ?? null;
            if (! array_key_exists($field, $data) || $value === '********' || (blank($value) && filled($setting->{$field}))) {
                unset($data[$field]);
            }
        }

        return $data;
    }

    private function invalidate(): void
    {
        Cache::forget('navigation.public.runtime');
        app(AdminNavigationService::class)->invalidate();
    }
}
