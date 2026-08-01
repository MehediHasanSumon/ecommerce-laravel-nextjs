<?php

namespace App\Contracts\Marketing;

use App\Models\MarketingTrackingEvent;

interface MarketingTrackingProvider
{
    public function key(): string;

    public function send(MarketingTrackingEvent $event, bool $test = false): array;
}
