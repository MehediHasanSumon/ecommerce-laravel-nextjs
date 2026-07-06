<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Settings\PaymentGatewaySetting;
use Illuminate\Http\Request;
use Razorpay\Api\Api;

class RazorpayService implements PaymentGatewayInterface
{
    public function gateway(): string { return 'razorpay'; }

    public function assertConfigured(PaymentGatewaySetting $setting): void
    {
        abort_unless($setting->enabled, 422, 'Razorpay is disabled.');
        abort_unless($setting->public_key && $setting->secret_key, 422, 'Razorpay key id/secret are not configured.');
    }

    public function initiate(Order $order, PaymentTransaction $transaction, PaymentGatewaySetting $setting): PaymentResult
    {
        $api = new Api((string) $setting->public_key, (string) $setting->secret_key);
        $rzpOrder = $api->order->create([
            'receipt' => $transaction->transaction_key,
            'amount' => $order->total_cents,
            'currency' => strtoupper($order->currency),
            'payment_capture' => 1,
        ]);

        $paymentLink = $api->paymentLink->create([
            'amount' => $order->total_cents,
            'currency' => strtoupper($order->currency),
            'accept_partial' => false,
            'reference_id' => $transaction->transaction_key,
            'description' => 'Order '.$order->order_number,
            'callback_url' => route('payments.callback', ['gateway' => 'razorpay']).'?transaction='.$transaction->transaction_key,
            'callback_method' => 'get',
        ]);

        $transaction->update(['gateway_payment_id' => $rzpOrder['id'], 'response_payload' => ['order' => $rzpOrder->toArray(), 'payment_link' => $paymentLink->toArray()]]);

        return new PaymentResult('redirect', $paymentLink['short_url'], ['order' => $rzpOrder->toArray(), 'payment_link' => $paymentLink->toArray()]);
    }

    public function verify(PaymentTransaction $transaction, PaymentGatewaySetting $setting, array $payload = []): PaymentResult
    {
        abort_unless(isset($payload['razorpay_payment_id'], $payload['razorpay_order_id'], $payload['razorpay_signature']), 422, 'Razorpay callback payload is incomplete.');
        $api = new Api((string) $setting->public_key, (string) $setting->secret_key);
        try {
            $api->utility->verifyPaymentSignature([
                'razorpay_order_id' => $payload['razorpay_order_id'],
                'razorpay_payment_id' => $payload['razorpay_payment_id'],
                'razorpay_signature' => $payload['razorpay_signature'],
            ]);
            $payment = $api->payment->fetch($payload['razorpay_payment_id']);
            $paid = ($payment['status'] ?? null) === 'captured' && (int) ($payment['amount'] ?? 0) === (int) $transaction->amount_cents && strtoupper((string) ($payment['currency'] ?? '')) === strtoupper($transaction->currency);
        } catch (\Throwable $error) {
            $payment = ['error' => $error->getMessage()];
            $paid = false;
        }

        $transaction->update([
            'status' => $paid ? 'paid' : 'failed',
            'gateway_transaction_id' => $payload['razorpay_payment_id'],
            'verification_payload' => is_array($payment) ? $payment : $payment->toArray(),
            'paid_at' => $paid ? now() : null,
            'failed_at' => $paid ? null : now(),
            'failure_message' => $paid ? null : 'Razorpay verification failed.',
        ]);

        return new PaymentResult($paid ? 'paid' : 'failed', null, is_array($payment) ? $payment : $payment->toArray());
    }

    public function handleCallback(Request $request, PaymentGatewaySetting $setting): PaymentResult
    {
        $transaction = PaymentTransaction::query()
            ->where('transaction_key', $request->input('transaction'))
            ->orWhere('gateway_payment_id', $request->input('razorpay_order_id'))
            ->firstOrFail();

        return $this->verify($transaction, $setting, $request->all());
    }
}
