<?php

namespace App\Contracts\Courier;

use App\Models\CourierShipment;
use App\Models\Order;
use App\Models\Settings\CourierProviderSetting;

interface CourierProvider
{
    public function key(): string;

    public function label(): string;

    /**
     * @return array<string, bool>
     */
    public function capabilities(): array;

    public function testConnection(CourierProviderSetting $setting): array;

    public function createShipment(
        CourierProviderSetting $setting,
        Order $order,
        array $options = [],
        ?CourierShipment $shipment = null,
    ): array;

    public function trackShipment(CourierProviderSetting $setting, CourierShipment $shipment): array;

    public function cancelShipment(CourierProviderSetting $setting, CourierShipment $shipment): array;

    public function calculateCharge(CourierProviderSetting $setting, array $payload): array;

    public function stores(CourierProviderSetting $setting): array;

    public function cities(CourierProviderSetting $setting): array;

    public function zones(CourierProviderSetting $setting, int $cityId): array;

    public function areas(CourierProviderSetting $setting, int $zoneId): array;
}
