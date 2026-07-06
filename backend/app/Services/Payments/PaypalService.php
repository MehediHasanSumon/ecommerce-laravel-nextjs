<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Settings\PaymentGatewaySetting;
use App\Services\Payments\Concerns\BuildsGatewayUrls;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class PaypalService implements PaymentGatewayInterface
{
    use BuildsGatewayUrls;

    public function gateway(): string { return 'paypal'; }

    public function assertConfigured(PaymentGatewaySetting $setting): void
    {
        abort_unless($setting->enabled, 422, 'PayPal is disabled.');
        abort_unless($setting->public_key && $setting->secret_key, 422, 'PayPal client credentials are not configured.');
    }

    public function initiate(Order $order, PaymentTransaction $transaction, PaymentGatewaySetting $setting): PaymentResult
    {
        $response = Http::withToken($this->token($setting))->timeout(20)->post($this->baseUrl($setting).'/v2/checkout/orders', [
            'intent' => 'CAPTURE',
            'purchase_units' => [[
                'reference_id' => $transaction->transaction_key,
                'amount' => ['currency_code' => strtoupper($order->currency), 'value' => number_format($order->total_cents / 100, 2, '.', '')],
            ]],
            'application_context' => [
                'return_url' => route('payments.callback', ['gateway' => 'paypal']),
                'cancel_url' => route('payments.callback', ['gateway' => 'paypal', 'result' => 'cancel']).'?transaction='.$transaction->transaction_key,
            ],
        ])->json();
        $approve = collect($response['links'] ?? [])->firstWhere('rel', 'approve')['href'] ?? null;
        $transaction->update(['gateway_payment_id' => $response['id'] ?? null, 'response_payload' => $response]);
        abort_unless($approve, 502, 'PayPal order could not be initialized.');
        return new PaymentResult('redirect', $approve, $response);
    }

    public function verify(PaymentTransaction $transaction, PaymentGatewaySetting $setting, array $payload = []): PaymentResult
    {
        $orderId = $payload['token'] ?? $transaction->gateway_payment_id;
        abort_unless($orderId, 422, 'PayPal order id is missing.');
        $response = Http::withToken($this->token($setting))->timeout(20)->post($this->baseUrl($setting).'/v2/checkout/orders/'.$orderId.'/capture')->json();
        $paid = ($response['status'] ?? null) === 'COMPLETED';
        $transaction->update([
            'status' => $paid ? 'paid' : 'failed',
            'gateway_transaction_id' => $response['purchase_units'][0]['payments']['captures'][0]['id'] ?? null,
            'gateway_payment_id' => $orderId,
            'verification_payload' => $response,
            'paid_at' => $paid ? now() : null,
            'failed_at' => $paid ? null : now(),
            'failure_message' => $paid ? null : 'PayPal capture failed.',
        ]);
        return new PaymentResult($paid ? 'paid' : 'failed', null, $response);
    }

    public function handleCallback(Request $request, PaymentGatewaySetting $setting): PaymentResult
    {
        if ($request->route('result') === 'cancel') {
            $transaction = PaymentTransaction::query()->where('transaction_key', $request->input('transaction'))->firstOrFail();
            $transaction->update(['status' => 'failed', 'failed_at' => now(), 'failure_message' => 'PayPal payment cancelled.']);
            return new PaymentResult('failed', null, $request->all());
        }
        $transaction = PaymentTransaction::query()->where('gateway_payment_id', $request->input('token'))->firstOrFail();
        return $this->verify($transaction, $setting, $request->all());
    }

    private function token(PaymentGatewaySetting $setting): string
    {
        $response = Http::asForm()->withBasicAuth((string) $setting->public_key, (string) $setting->secret_key)->post($this->baseUrl($setting).'/v1/oauth2/token', ['grant_type' => 'client_credentials'])->json();
        abort_unless(! empty($response['access_token']), 502, 'PayPal token generation failed.');
        return $response['access_token'];
    }

    private function baseUrl(PaymentGatewaySetting $setting): string
    {
        return rtrim((string) $this->configValue($setting, 'base_url', $setting->sandbox_mode ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'), '/');
    }
}
