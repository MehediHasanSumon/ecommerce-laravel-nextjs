<?php

namespace App\Console\Commands;

use App\Models\IpBlock;
use App\Models\IpBlockEvent;
use App\Models\SecurityAttempt;
use App\Services\Security\IpBlockStateService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MaintainIpBlocking extends Command
{
    protected $signature = 'security:maintain-ip-blocking';

    protected $description = 'Expire timed IP blocks and prune retained security attempt telemetry.';

    public function handle(IpBlockStateService $state): int
    {
        $expired = 0;
        IpBlock::query()
            ->where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->orderBy('id')
            ->chunkById(max(100, (int) config('ip_blocking.maintenance_batch_size', 1000)), function ($blocks) use (&$expired, $state): void {
                DB::transaction(function () use ($blocks, &$expired, $state): void {
                    foreach ($blocks as $block) {
                        $block->forceFill(['status' => 'inactive', 'updated_at' => now()])->save();
                        IpBlockEvent::query()->create([
                            'ip_block_id' => $block->id,
                            'ip_address' => $block->ip_address,
                            'event_type' => 'expired',
                            'block_type' => $block->type,
                            'reason' => $block->reason,
                            'occurred_at' => now(),
                        ]);
                        DB::afterCommit(fn () => $state->forget($block->ip_address));
                        $expired++;
                    }
                });
            });

        $cutoff = now()->subDays(max(1, (int) config('ip_blocking.attempt_retention_days', 30)));
        $pruned = 0;
        do {
            $ids = SecurityAttempt::query()->where('occurred_at', '<', $cutoff)
                ->orderBy('id')
                ->limit(max(100, (int) config('ip_blocking.maintenance_batch_size', 1000)))
                ->pluck('id');
            $deleted = $ids->isEmpty() ? 0 : SecurityAttempt::query()->whereIn('id', $ids)->delete();
            $pruned += $deleted;
        } while ($deleted > 0);

        $this->info("Expired blocks: {$expired}; pruned attempts: {$pruned}");

        return self::SUCCESS;
    }
}
