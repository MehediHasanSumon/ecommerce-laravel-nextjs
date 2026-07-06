<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Settings\PaymentGatewaySetting;
use Illuminate\Http\Request;

interface PaymentGatewayInterface
{
    public function gateway(): string;

    public function assertConfigured(PaymentGatewaySetting $setting): void;

    public function initiate(Order $order, PaymentTransaction $transaction, PaymentGatewaySetting $setting): PaymentResult;

    public function verify(PaymentTransaction $transaction, PaymentGatewaySetting $setting, array $payload = []): PaymentResult;

    public function handleCallback(Request $request, PaymentGatewaySetting $setting): PaymentResult;
}
