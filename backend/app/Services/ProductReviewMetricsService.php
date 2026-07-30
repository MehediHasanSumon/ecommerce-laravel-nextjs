<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductReview;
use App\Support\HomePageCache;

class ProductReviewMetricsService
{
    public function recalculate(int $productId): void
    {
        $metrics = ProductReview::query()
            ->where('product_id', $productId)
            ->where('status', 'approved')
            ->selectRaw('COUNT(*) as review_count, AVG(rating) as rating_average')
            ->first();

        Product::query()
            ->whereKey($productId)
            ->update([
                'review_count' => (int) ($metrics?->review_count ?? 0),
                'rating_average' => round((float) ($metrics?->rating_average ?? 0), 2),
            ]);

        HomePageCache::invalidate();
    }

    public function recalculateMany(iterable $productIds): void
    {
        collect($productIds)
            ->map(fn (mixed $id): int => (int) $id)
            ->filter()
            ->unique()
            ->each(fn (int $productId) => $this->recalculate($productId));
    }
}
