<?php

namespace App\Console\Commands;

use App\Models\ProductCollection;
use App\Support\HomePageCache;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncCollectionSchedules extends Command
{
    protected $signature = 'collections:sync-schedules';

    protected $description = 'Deactivate expired collections and clear storefront collection caches.';

    public function handle(): int
    {
        $expired = ProductCollection::query()
            ->where('status', 'active')
            ->whereNotNull('ends_at')
            ->where('ends_at', '<=', now())
            ->update(['status' => 'inactive', 'updated_at' => now()]);

        if ($expired > 0) {
            HomePageCache::invalidate();
            Log::info('Expired collections deactivated.', ['count' => $expired]);
        }

        $this->info("Expired collections deactivated: {$expired}");

        return self::SUCCESS;
    }
}
