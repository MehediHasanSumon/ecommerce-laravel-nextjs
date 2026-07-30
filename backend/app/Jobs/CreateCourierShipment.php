<?php

namespace App\Jobs;

use App\Models\CourierShipment;
use App\Models\Order;
use App\Services\Courier\CourierShipmentService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class CreateCourierShipment implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 60;

    public bool $failOnTimeout = true;

    public function __construct(
        public int $orderId,
        public string $provider,
        public array $options = [],
        public ?int $userId = null,
    ) {
        $this->onQueue('couriers');
    }

    public function handle(CourierShipmentService $shipments): void
    {
        $order = Order::query()->find($this->orderId);
        if (! $order) {
            return;
        }
        if (CourierShipment::query()
            ->where('order_id', $order->id)
            ->whereNotIn('status', ['cancelled', 'returned', 'failed_delivery'])
            ->exists()) {
            return;
        }

        $shipments->create($order, $this->provider, $this->options, $this->userId);
    }
}
