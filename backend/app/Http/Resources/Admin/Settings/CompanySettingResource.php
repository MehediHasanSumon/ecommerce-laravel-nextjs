<?php

namespace App\Http\Resources\Admin\Settings;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CompanySettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'currency' => $this->currency?->currency ?: 'BDT',
            'currency_code' => $this->currency?->currency ?: 'BDT',
            'currency_symbol' => $this->currency?->symbol ?: '৳',
            'currency_record' => $this->currency ? [
                'id' => $this->currency->id,
                'country' => $this->currency->country,
                'currency' => $this->currency->currency,
                'symbol' => $this->currency->symbol,
                'status' => $this->currency->status,
            ] : null,
            'currency_precision' => (string) ($this->decimal_places ?? 2),
            'logo' => $this->assetUrl($this->logo),
            'dark_logo' => $this->assetUrl($this->dark_logo),
            'favicon' => $this->assetUrl($this->favicon),
            'invoice_logo' => $this->assetUrl($this->invoice_logo),
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

        if (str_starts_with($path, '/storage/')) {
            return url($path);
        }

        if (str_starts_with($path, 'storage/')) {
            return url($path);
        }

        return Storage::disk('public')->url($path);
    }
}
