<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Settings\PaymentGatewaySetting;
use Illuminate\Http\Request;

class BankTransferService implements PaymentGatewayInterface
{
    public function gateway(): string
    {
        return 'bank_transfer';
    }

    public function assertConfigured(PaymentGatewaySetting $setting): void
    {
        abort_unless($setting->enabled, 422, 'Bank transfer is disabled.');
    }

    public function initiate(Order $order, PaymentTransaction $transaction, PaymentGatewaySetting $setting): PaymentResult
    {
        $config = (array) ($setting->additional_configuration ?? []);
        $transaction->update([
            'status' => 'pending',
            'response_payload' => [
                'instructions' => $config['instructions'] ?? null,
                'account_name' => $config['account_name'] ?? null,
                'account_number' => $config['account_number'] ?? null,
                'bank_name' => $config['bank_name'] ?? null,
            ],
        ]);
        $order->update(['payment_status' => 'pending', 'status' => 'pending']);

        return new PaymentResult('pending', null, $transaction->response_payload ?? []);
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
