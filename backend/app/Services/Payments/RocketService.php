<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Settings\PaymentGatewaySetting;
use Illuminate\Http\Request;

class RocketService implements PaymentGatewayInterface
{
    public function gateway(): string { return 'rocket'; }

    public function assertConfigured(PaymentGatewaySetting $setting): void
    {
        abort_unless($setting->enabled, 422, 'Rocket is disabled.');
        abort(422, 'Rocket does not have an enabled official merchant API adapter configured.');
    }

    public function initiate(Order $order, PaymentTransaction $transaction, PaymentGatewaySetting $setting): PaymentResult
    {
        abort(422, 'Rocket official merchant API adapter is not available yet.');
    }

    public function verify(PaymentTransaction $transaction, PaymentGatewaySetting $setting, array $payload = []): PaymentResult
    {
        return new PaymentResult('failed', null, ['message' => 'Rocket verification is not available.']);
    }

    public function handleCallback(Request $request, PaymentGatewaySetting $setting): PaymentResult
    {
        abort(404);
    }
}
