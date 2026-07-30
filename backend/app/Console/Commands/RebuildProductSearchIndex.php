<?php

namespace App\Console\Commands;

use App\Services\Search\ProductSearchIndexer;
use Illuminate\Console\Command;

class RebuildProductSearchIndex extends Command
{
    protected $signature = 'search:reindex-products
        {--stale : Reindex only missing or stale product documents}
        {--limit=1000 : Maximum products to process in stale mode}';

    protected $description = 'Rebuild the portable product search document and token index';

    public function handle(ProductSearchIndexer $indexer): int
    {
        $staleOnly = (bool) $this->option('stale');
        $this->components->info($staleOnly
            ? 'Refreshing missing and stale product search documents...'
            : 'Rebuilding the product search index...');

        $bar = $this->output->createProgressBar();
        $bar->start();
        $progress = function () use ($bar): void {
            $bar->advance();
        };
        $count = $staleOnly
            ? $indexer->rebuildStale(max(1, (int) $this->option('limit')), $progress)
            : $indexer->rebuild($progress);
        $bar->finish();
        $this->newLine(2);
        $this->components->info("Indexed {$count} products.");

        return self::SUCCESS;
    }
}
