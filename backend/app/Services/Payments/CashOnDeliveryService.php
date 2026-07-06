<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Settings\PaymentGatewaySetting;
use Illuminate\Http\Request;

class CashOnDeliveryService implements PaymentGatewayInterface
{
    public function gateway(): string
    {
        return 'cash_on_delivery';
    }

    public function assertConfigured(PaymentGatewaySetting $setting): void
    {
        abort_unless($setting->enabled, 422, 'Cash on Delivery is disabled.');
    }

    public function initiate(Order $order, PaymentTransaction $transaction, PaymentGatewaySetting $setting): PaymentResult
    {
        $transaction->update([
            'status' => 'pending',
            'response_payload' => ['message' => 'Payment will be collected on delivery.'],
        ]);

        $order->update(['payment_status' => 'pending', 'status' => 'pending']);

        return new PaymentResult('pending', null, ['order_number' => $order->order_number]);
    }

    public function verify(PaymentTransaction $transaction, PaymentGatewaySetting $setting, array $payload = []): PaymentResult
    {
        return new PaymentResult($transaction->status, null, $payload);
    }

    public function handleCallback(Request $request, PaymentGatewaySetting $setting): PaymentResult
    {
        abort(404);
    }
}
