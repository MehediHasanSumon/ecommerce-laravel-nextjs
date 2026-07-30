<?php

namespace App\Services\Courier;

use App\Jobs\CreateCourierShipment;
use App\Models\CourierShipment;
use App\Models\Order;
use App\Services\Admin\Settings\CourierSettingsService;
use App\Services\Admin\Settings\StoreSettingsService;

class CourierAutomationService
{
    public function __construct(
        private readonly StoreSettingsService $storeSettings,
        private readonly CourierSettingsService $courierSettings,
    ) {}

    public function dispatchIfEligible(Order $order): void
    {
        $store = $this->storeSettings->get();
        $trigger = (string) $store->automatic_shipment_creation;
        $provider = (string) $store->automatic_courier_provider;

        if ($trigger === 'disabled' || $provider === '' || ! $this->matches($order, $trigger)) {
            return;
        }
        if ($this->courierSettings->enabled($provider)->isEmpty()) {
            return;
        }
        if (CourierShipment::query()->where('order_id', $order->id)->whereNotIn('status', ['cancelled', 'returned', 'failed_delivery'])->exists()) {
            return;
        }

        CreateCourierShipment::dispatch($order->id, $provider, ['automatic' => true])->afterCommit();
    }

    private function matches(Order $order, string $trigger): bool
    {
        return match ($trigger) {
            'after_order_confirmation' => $order->status === 'confirmed',
            'after_payment' => $order->payment_status === 'paid',
            'after_packaging' => $order->status === 'packed',
            'after_processing' => $order->status === 'processing',
            default => false,
        };
    }
}
