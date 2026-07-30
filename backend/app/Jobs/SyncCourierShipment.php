<?php

namespace App\Jobs;

use App\Models\CourierShipment;
use App\Services\Courier\CourierShipmentService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SyncCourierShipment implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public array $backoff = [30, 120, 300];

    public int $timeout = 60;

    public bool $failOnTimeout = true;

    public function __construct(public int $shipmentId, public ?int $userId = null)
    {
        $this->onQueue('couriers');
    }

    public function handle(CourierShipmentService $shipments): void
    {
        $shipment = CourierShipment::query()->with('setting')->find($this->shipmentId);
        if (! $shipment) {
            return;
        }

        $shipments->sync($shipment, $this->userId);
    }
}
