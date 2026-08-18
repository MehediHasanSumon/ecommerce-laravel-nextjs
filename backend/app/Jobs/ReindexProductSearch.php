<?php

namespace App\Jobs;

use App\Services\Search\ProductSearchIndexer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ReindexProductSearch implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 60;

    /**
     * @param  array<int>  $productIds
     */
    public function __construct(
        public array $productIds,
    ) {
        $this->onQueue('search');
    }

    public function handle(ProductSearchIndexer $indexer): void
    {
        $indexer->indexMany($this->productIds);
    }
}
