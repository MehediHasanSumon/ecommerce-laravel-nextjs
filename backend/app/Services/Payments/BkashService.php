<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Settings\PaymentGatewaySetting;
use App\Services\Payments\Concerns\BuildsGatewayUrls;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class BkashService implements PaymentGatewayInterface
{
    use BuildsGatewayUrls;

    public function gateway(): string
    {
        return 'bkash';
    }

    public function assertConfigured(PaymentGatewaySetting $setting): void
    {
        abort_unless($setting->enabled, 422, 'bKash is disabled.');
        abort_unless($setting->public_key && $setting->secret_key && $setting->api_key && $setting->merchant_id, 422, 'bKash credentials are not configured.');
    }

    public function initiate(Order $order, PaymentTransaction $transaction, PaymentGatewaySetting $setting): PaymentResult
    {
        $base = $this->baseUrl($setting);
        $token = $this->token($setting);
        $payload = [
            'mode' => '0011',
            'payerReference' => (string) $order->user_id ?: $order->guest_token ?: 'guest',
            'callbackURL' => route('payments.callback', ['gateway' => 'bkash']),
            'amount' => number_format($order->total_cents / 100, 2, '.', ''),
            'currency' => $order->currency,
            'intent' => 'sale',
            'merchantInvoiceNumber' => $order->order_number,
        ];
        $response = Http::withToken($token)
            ->withHeaders(['X-APP-Key' => $setting->api_key])
            ->timeout(20)
            ->post($base.'/tokenized/checkout/create', $payload)
            ->json();

        $transaction->update([
            'request_payload' => $payload,
            'response_payload' => $response,
            'gateway_payment_id' => $response['paymentID'] ?? null,
        ]);

        abort_unless(! empty($response['bkashURL']) && ! empty($response['paymentID']), 502, 'bKash checkout could not be initialized.');

        return new PaymentResult('redirect', $response['bkashURL'], $response);
    }

    public function verify(PaymentTransaction $transaction, PaymentGatewaySetting $setting, array $payload = []): PaymentResult
    {
        $paymentId = $payload['paymentID'] ?? $transaction->gateway_payment_id;
        abort_unless($paymentId, 422, 'bKash payment id is missing.');

        $response = Http::withToken($this->token($setting))
            ->withHeaders(['X-APP-Key' => $setting->api_key])
            ->timeout(20)
            ->post($this->baseUrl($setting).'/tokenized/checkout/execute', ['paymentID' => $paymentId])
            ->json();

        $paid = ($response['transactionStatus'] ?? null) === 'Completed'
            && abs(((float) ($response['amount'] ?? 0)) - ($transaction->amount_cents / 100)) < 0.01
            && strtoupper((string) ($response['currency'] ?? '')) === strtoupper($transaction->currency);

        $transaction->update([
            'status' => $paid ? 'paid' : 'failed',
            'gateway_transaction_id' => $response['trxID'] ?? null,
            'gateway_payment_id' => $paymentId,
            'verification_payload' => $response,
            'paid_at' => $paid ? now() : null,
            'failed_at' => $paid ? null : now(),
            'failure_message' => $paid ? null : ($response['statusMessage'] ?? 'bKash verification failed.'),
        ]);

        return new PaymentResult($paid ? 'paid' : 'failed', null, $response);
    }

    public function handleCallback(Request $request, PaymentGatewaySetting $setting): PaymentResult
    {
        $transaction = PaymentTransaction::query()->where('gateway_payment_id', $request->input('paymentID'))->firstOrFail();
        if ($request->input('status') === 'cancel' || $request->input('status') === 'failure') {
            $transaction->update(['status' => 'failed', 'failed_at' => now(), 'failure_message' => 'bKash '.$request->input('status')]);

            return new PaymentResult('failed', null, $request->all());
        }

        return $this->verify($transaction, $setting, $request->all());
    }

    private function token(PaymentGatewaySetting $setting): string
    {
        $response = Http::withHeaders([
            'username' => $setting->public_key,
            'password' => $setting->secret_key,
        ])->timeout(20)->post($this->baseUrl($setting).'/tokenized/checkout/token/grant', [
            'app_key' => $setting->api_key,
            'app_secret' => $setting->merchant_id,
        ])->json();

        abort_unless(! empty($response['id_token']), 502, 'bKash token generation failed.');

        return $response['id_token'];
    }

    private function baseUrl(PaymentGatewaySetting $setting): string
    {
        return rtrim((string) $this->configValue($setting, 'base_url', $setting->sandbox_mode ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta' : 'https://tokenized.pay.bka.sh/v1.2.0-beta'), '/');
    }
}
