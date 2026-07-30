<?php

namespace App\Observers;

use App\Models\ProductReview;
use App\Services\ProductReviewMetricsService;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;

class ProductReviewObserver implements ShouldHandleEventsAfterCommit
{
    public function __construct(private readonly ProductReviewMetricsService $metrics) {}

    public function saved(ProductReview $review): void
    {
        $this->metrics->recalculate((int) $review->product_id);
    }

    public function deleted(ProductReview $review): void
    {
        $this->metrics->recalculate((int) $review->product_id);
    }

    public function restored(ProductReview $review): void
    {
        $this->metrics->recalculate((int) $review->product_id);
    }
}
