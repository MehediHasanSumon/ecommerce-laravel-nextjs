<?php

namespace App\Services\Courier;

use App\Contracts\Courier\CourierProvider;
use App\Exceptions\CourierApiException;
use App\Models\CourierShipment;
use App\Models\Settings\CourierProviderSetting;

abstract class AbstractCourierProvider implements CourierProvider
{
    public function __construct(protected readonly CourierHttpClient $http) {}

    public function label(): string
    {
        return (string) config("couriers.providers.{$this->key()}.label", ucfirst($this->key()));
    }

    public function cancelShipment(CourierProviderSetting $setting, CourierShipment $shipment): array
    {
        throw new CourierApiException("{$this->label()} does not expose shipment cancellation through its current merchant API.", 422);
    }

    public function calculateCharge(CourierProviderSetting $setting, array $payload): array
    {
        throw new CourierApiException("{$this->label()} does not expose delivery charge calculation through its current merchant API.", 422);
    }

    public function stores(CourierProviderSetting $setting): array
    {
        return [];
    }

    public function cities(CourierProviderSetting $setting): array
    {
        return [];
    }

    public function zones(CourierProviderSetting $setting, int $cityId): array
    {
        return [];
    }

    public function areas(CourierProviderSetting $setting, int $zoneId): array
    {
        return [];
    }

    protected function baseUrl(CourierProviderSetting $setting): string
    {
        $configured = trim((string) $setting->api_base_url);
        if ($configured !== '') {
            return rtrim($configured, '/');
        }

        $mode = $setting->sandbox_mode ? 'sandbox_base_url' : 'production_base_url';

        return rtrim((string) config("couriers.providers.{$this->key()}.{$mode}"), '/');
    }

    protected function moneyToCents(mixed $value): ?int
    {
        return is_numeric($value) ? (int) round(((float) $value) * 100) : null;
    }

    protected function safeHttpsUrl(mixed $value): ?string
    {
        if (! is_string($value) || ! filter_var($value, FILTER_VALIDATE_URL)) {
            return null;
        }

        return parse_url($value, PHP_URL_SCHEME) === 'https' ? $value : null;
    }
}
