<?php

namespace App\Console\Commands;

use App\Jobs\SyncCourierShipment;
use App\Models\CourierShipment;
use Illuminate\Console\Command;

class SyncCourierShipments extends Command
{
    protected $signature = 'couriers:sync-shipments {--limit=100 : Maximum shipments to queue}';

    protected $description = 'Queue remote status synchronization for active courier shipments';

    public function handle(): int
    {
        $cutoff = now()->subMinutes((int) config('couriers.sync_interval_minutes', 15));
        $ids = CourierShipment::query()
            ->whereNotIn('status', ['delivered', 'returned', 'cancelled'])
            ->where(fn ($query) => $query->whereNull('last_synced_at')->orWhere('last_synced_at', '<=', $cutoff))
            ->orderByRaw('CASE WHEN last_synced_at IS NULL THEN 0 ELSE 1 END')
            ->orderBy('last_synced_at')
            ->limit(max(1, min((int) $this->option('limit'), 1000)))
            ->pluck('id');

        $ids->each(fn ($id) => SyncCourierShipment::dispatch((int) $id));
        $this->components->info("Queued {$ids->count()} courier shipment sync jobs.");

        return self::SUCCESS;
    }
}
