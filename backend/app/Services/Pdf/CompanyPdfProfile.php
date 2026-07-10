<?php

namespace App\Services\Pdf;

use App\Models\Settings\CompanySetting;
use Illuminate\Support\Facades\Storage;

class CompanyPdfProfile
{
    public function __construct(private readonly CompanySetting $setting) {}

    public static function load(): self
    {
        return new self(CompanySetting::query()->with('currency')->firstOrNew());
    }

    public function name(): string
    {
        return (string) ($this->setting->company_name ?: $this->setting->legal_company_name ?: config('app.name'));
    }

    public function address(): ?string
    {
        return $this->clean($this->setting->full_address);
    }

    public function phone(): ?string
    {
        return $this->clean($this->setting->company_phone ?: $this->setting->support_phone);
    }

    public function email(): ?string
    {
        return $this->clean($this->setting->company_email ?: $this->setting->support_email);
    }

    public function website(): ?string
    {
        return $this->clean(config('app.url'));
    }

    public function invoiceFooter(): ?string
    {
        return $this->clean($this->setting->invoice_footer);
    }

    public function invoicePrefix(): string
    {
        return (string) ($this->setting->invoice_prefix ?: 'INV');
    }

    public function logoPath(): ?string
    {
        $logo = $this->clean($this->setting->invoice_logo ?: $this->setting->logo);

        if (! $logo) {
            return null;
        }

        if (str_starts_with($logo, 'http://') || str_starts_with($logo, 'https://')) {
            return null;
        }

        $path = str($logo)->replaceStart('/storage/', '')->replaceStart('storage/', '')->toString();

        if (Storage::disk('public')->exists($path)) {
            return Storage::disk('public')->path($path);
        }

        $publicPath = public_path(ltrim($logo, '/'));

        return file_exists($publicPath) ? $publicPath : null;
    }

    public function currencyCode(?string $fallback = null): string
    {
        return (string) ($this->setting->currency?->currency ?: $this->setting->default_currency ?: $fallback ?: 'BDT');
    }

    public function money(int|float|string|null $cents, ?string $currency = null): string
    {
        $amount = ((int) $cents) / 100;
        $precision = (int) ($this->setting->decimal_places ?? 2);
        $decimal = (string) ($this->setting->decimal_separator ?? '.');
        $thousands = (string) ($this->setting->thousands_separator ?? ',');
        $symbol = (string) ($this->setting->currency_symbol ?: $this->setting->currency?->symbol ?: $currency ?: $this->currencyCode());
        $formatted = number_format($amount, $precision, $decimal, $thousands);

        return ($this->setting->currency_position ?? 'left') === 'right'
            ? $formatted.' '.$symbol
            : $symbol.' '.$formatted;
    }

    private function clean(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }
}
