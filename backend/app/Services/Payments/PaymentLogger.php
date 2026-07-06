<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\PaymentLog;
use App\Models\PaymentTransaction;

class PaymentLogger
{
    public function log(string $gateway, string $event, array $payload = [], ?PaymentTransaction $transaction = null, ?Order $order = null, string $level = 'info'): void
    {
        PaymentLog::query()->create([
            'payment_transaction_id' => $transaction?->id,
            'order_id' => $order?->id ?? $transaction?->order_id,
            'gateway' => $gateway,
            'event' => $event,
            'level' => $level,
            'payload' => $payload,
            'ip_address' => request()?->ip(),
        ]);
    }
}
