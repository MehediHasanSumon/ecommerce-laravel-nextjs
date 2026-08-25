<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\FooterSetting;
use App\Services\Admin\AdminNavigationService;
use App\Services\Admin\Settings\Concerns\ManagesSingletonSettings;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FooterSettingsService
{
    use ManagesSingletonSettings;

    public const PLATFORMS = [
        'facebook',
        'instagram',
        'youtube',
        'x',
        'tiktok',
        'linkedin',
        'pinterest',
        'whatsapp',
        'telegram',
        'threads',
    ];

    protected function modelClass(): string
    {
        return FooterSetting::class;
    }

    protected function cacheKey(): string
    {
        return 'settings.footer';
    }

    protected function defaults(): array
    {
        return SettingsDefaults::footer();
    }

    public function runtime(): array
    {
        $settings = $this->get();
        $socialLinks = is_array($settings->social_links) ? $settings->social_links : [];

        $activeSocial = collect($socialLinks)
            ->filter(fn ($item): bool => ! empty($item['status']) && ! empty($item['url']))
            ->values()
            ->map(fn ($item): array => [
                'platform' => $item['platform'] ?? 'facebook',
                'url' => $item['url'] ?? '',
                'icon' => $item['icon'] ?? ($item['platform'] ?? 'facebook'),
                'open_in_new_tab' => ! empty($item['open_in_new_tab']),
            ])
            ->all();

        return [
            'payment_banner_image' => $this->assetUrl($settings->payment_banner_image),
            'payment_banner_enabled' => (bool) $settings->payment_banner_enabled,
            'payment_banner_title' => $settings->payment_banner_title ?: 'We accept',
            'social_links' => $activeSocial,
        ];
    }

    public function update(array $data, ?int $userId = null): Model
    {
        $model = $this->get();
        $socialLinks = is_array($data['social_links'] ?? null) ? $data['social_links'] : [];

        $model->fill([
            'payment_banner_image' => $data['payment_banner_image'] ?? $model->payment_banner_image,
            'payment_banner_enabled' => array_key_exists('payment_banner_enabled', $data)
                ? (bool) $data['payment_banner_enabled']
                : (bool) $model->payment_banner_enabled,
            'payment_banner_title' => $data['payment_banner_title'] ?? $model->payment_banner_title,
            'social_links' => $socialLinks,
            'updated_by' => $userId,
        ])->save();

        $this->flushCaches();

        return $this->get();
    }

    public function uploadBanner(UploadedFile $file): string
    {
        $directory = 'settings/footer';
        $filename = 'payment_banner_'.Str::random(12).'.'.$file->getClientOriginalExtension();
        $path = $file->storeAs($directory, $filename, 'public');

        return Storage::disk('public')->url($path);
    }

    public function flushCaches(): void
    {
        Cache::forget($this->cacheKey());
        Cache::forget($this->cacheKey().'.id');
        Cache::forget('navigation.public.runtime');
        app(AdminNavigationService::class)->invalidate();
    }

    private function assetUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        if (str_starts_with($path, '/storage/') || str_starts_with($path, 'storage/')) {
            return url($path);
        }

        return url(Storage::disk('public')->url($path));
    }
}
