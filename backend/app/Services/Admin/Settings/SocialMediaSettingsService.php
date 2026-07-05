<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\SocialMediaSetting;
use Illuminate\Support\Facades\Cache;

class SocialMediaSettingsService
{
    public const PLATFORMS = ['facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok', 'pinterest'];

    public function all()
    {
        return SocialMediaSetting::query()->orderBy('display_order')->get();
    }

    public function replace(array $items, ?int $userId = null)
    {
        foreach ($items as $index => $item) {
            SocialMediaSetting::query()->updateOrCreate(
                ['platform' => $item['platform']],
                [...$item, 'display_order' => $item['display_order'] ?? $index, 'updated_by' => $userId]
            );
        }
        Cache::forget('settings.navigation.runtime');
        return $this->all();
    }
}
