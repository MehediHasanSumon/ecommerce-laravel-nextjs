<?php

namespace App\Http\Resources\Admin\Settings;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class FooterSettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $socialLinks = is_array($this->social_links) ? $this->social_links : [];

        return [
            'id' => $this->id,
            'payment_banner_image' => $this->assetUrl($this->payment_banner_image),
            'payment_banner_enabled' => (bool) $this->payment_banner_enabled,
            'payment_banner_title' => $this->payment_banner_title ?: 'We accept',
            'social_links' => $socialLinks,
            'updated_at' => optional($this->updated_at)->toISOString(),
        ];
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
