<?php

namespace App\Observers;

use App\Models\Order;
use App\Services\Courier\CourierAutomationService;
use Illuminate\Support\Facades\DB;

class OrderCourierObserver
{
    public function created(Order $order): void
    {
        $this->dispatch($order);
    }

    public function updated(Order $order): void
    {
        if ($order->wasChanged(['status', 'payment_status'])) {
            $this->dispatch($order);
        }
    }

    private function dispatch(Order $order): void
    {
        DB::afterCommit(fn () => app(CourierAutomationService::class)->dispatchIfEligible($order->fresh()));
    }
}
