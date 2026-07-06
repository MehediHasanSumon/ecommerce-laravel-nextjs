<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Settings\PaymentGatewaySetting;
use App\Services\Payments\Concerns\BuildsGatewayUrls;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class NagadService implements PaymentGatewayInterface
{
    use BuildsGatewayUrls;

    public function gateway(): string
    {
        return 'nagad';
    }

    public function assertConfigured(PaymentGatewaySetting $setting): void
    {
        abort_unless($setting->enabled, 422, 'Nagad is disabled.');
        abort_unless($setting->merchant_id && $setting->secret_key, 422, 'Nagad credentials are not configured.');
    }

    public function initiate(Order $order, PaymentTransaction $transaction, PaymentGatewaySetting $setting): PaymentResult
    {
        $base = $this->baseUrl($setting);
        $payload = [
            'merchantId' => $setting->merchant_id,
            'orderId' => $transaction->transaction_key,
            'amount' => number_format($order->total_cents / 100, 2, '.', ''),
            'currencyCode' => $order->currency,
            'challenge' => bin2hex(random_bytes(16)),
            'callbackUrl' => route('payments.callback', ['gateway' => 'nagad']),
        ];
        $payload['signature'] = hash_hmac('sha256', json_encode($payload), (string) $setting->secret_key);

        $response = Http::timeout(20)->post($base.'/initialize', $payload)->json();
        $transaction->update([
            'request_payload' => $payload,
            'response_payload' => $response,
            'gateway_payment_id' => $response['paymentReferenceId'] ?? null,
        ]);

        abort_unless(! empty($response['paymentUrl']) || ! empty($response['callBackUrl']), 502, 'Nagad checkout could not be initialized.');

        return new PaymentResult('redirect', $response['paymentUrl'] ?? $response['callBackUrl'], $response);
    }

    public function verify(PaymentTransaction $transaction, PaymentGatewaySetting $setting, array $payload = []): PaymentResult
    {
        $paymentRef = $payload['payment_ref_id'] ?? $payload['paymentReferenceId'] ?? $transaction->gateway_payment_id;
        abort_unless($paymentRef, 422, 'Nagad payment reference is missing.');

        $response = Http::timeout(20)->get($this->baseUrl($setting).'/verify/payment/'.$paymentRef)->json();
        $paid = in_array($response['status'] ?? null, ['Success', 'SUCCESS', 'Completed'], true)
            && abs(((float) ($response['amount'] ?? 0)) - ($transaction->amount_cents / 100)) < 0.01;

        $transaction->update([
            'status' => $paid ? 'paid' : 'failed',
            'gateway_transaction_id' => $response['issuerPaymentRefNo'] ?? $response['transactionId'] ?? null,
            'gateway_payment_id' => $paymentRef,
            'verification_payload' => $response,
            'paid_at' => $paid ? now() : null,
            'failed_at' => $paid ? null : now(),
            'failure_message' => $paid ? null : 'Nagad verification failed.',
        ]);

        return new PaymentResult($paid ? 'paid' : 'failed', null, $response);
    }

    public function handleCallback(Request $request, PaymentGatewaySetting $setting): PaymentResult
    {
        $key = $request->input('order_id') ?? $request->input('orderId');
        $transaction = PaymentTransaction::query()->where('transaction_key', $key)->orWhere('gateway_payment_id', $request->input('payment_ref_id'))->firstOrFail();

        return $this->verify($transaction, $setting, $request->all());
    }

    private function baseUrl(PaymentGatewaySetting $setting): string
    {
        return rtrim((string) $this->configValue($setting, 'base_url', $setting->sandbox_mode ? 'https://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs' : 'https://api.mynagad.com/api/dfs'), '/');
    }
}
