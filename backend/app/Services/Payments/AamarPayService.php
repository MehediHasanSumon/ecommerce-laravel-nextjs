<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Settings\PaymentGatewaySetting;
use App\Services\Payments\Concerns\BuildsGatewayUrls;
use App\Services\Payments\Concerns\RedactsSensitivePaymentData;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AamarPayService implements PaymentGatewayInterface
{
    use BuildsGatewayUrls;
    use RedactsSensitivePaymentData;

    public function gateway(): string
    {
        return 'aamarpay';
    }

    public function assertConfigured(PaymentGatewaySetting $setting): void
    {
        abort_unless($setting->enabled, 422, 'aamarPay is disabled.');
        abort_unless($setting->merchant_id && $setting->secret_key, 422, 'aamarPay Store ID and Signature Key are not configured.');
    }

    public function initiate(Order $order, PaymentTransaction $transaction, PaymentGatewaySetting $setting): PaymentResult
    {
        $merchantTransactionId = str_replace('-', '', $transaction->transaction_key);
        $endpoint = $this->checkoutEndpoint($setting);
        $payload = [
            'store_id' => $setting->merchant_id,
            'signature_key' => $setting->secret_key,
            'tran_id' => $merchantTransactionId,
            'amount' => number_format($order->total_cents / 100, 2, '.', ''),
            'currency' => strtoupper($order->currency),
            'desc' => 'Order '.$order->order_number,
            'cus_name' => $order->billing_address['full_name'] ?? 'Customer',
            'cus_email' => $order->billing_address['email'] ?? 'customer@example.com',
            'cus_phone' => $order->billing_address['phone'] ?? '',
            'cus_add1' => $order->billing_address['address_line'] ?? '',
            'cus_city' => $order->billing_address['city'] ?? '',
            'cus_state' => $order->billing_address['state'] ?? '',
            'cus_country' => $order->billing_address['country'] ?? 'Bangladesh',
            'success_url' => route('payments.callback', ['gateway' => 'aamarpay', 'result' => 'success']),
            'fail_url' => route('payments.callback', ['gateway' => 'aamarpay', 'result' => 'fail']),
            'cancel_url' => route('payments.callback', ['gateway' => 'aamarpay', 'result' => 'cancel']),
            'type' => 'json',
            'opt_a' => $order->order_number,
        ];

        $response = $this->http()->post($endpoint, $payload);
        $body = $response->json() ?? [];
        $transaction->update([
            'gateway_payment_id' => $merchantTransactionId,
            'request_payload' => $this->redact($payload),
            'response_payload' => $body,
        ]);

        abort_unless($response->successful() && ($body['result'] ?? null) === 'true' && ! empty($body['payment_url']), 502, $body['message'] ?? 'aamarPay checkout could not be initialized.');

        return new PaymentResult('redirect', $body['payment_url'], $body);
    }

    public function verify(PaymentTransaction $transaction, PaymentGatewaySetting $setting, array $payload = []): PaymentResult
    {
        $requestId = $payload['mer_txnid']
            ?? $payload['merTxnid']
            ?? $payload['tran_id']
            ?? $payload['request_id']
            ?? $transaction->gateway_payment_id;

        abort_unless($requestId, 422, 'aamarPay merchant transaction id is missing.');

        $response = $this->http()->get($this->searchEndpoint($setting), [
            'request_id' => $requestId,
            'store_id' => $setting->merchant_id,
            'signature_key' => $setting->secret_key,
            'type' => 'json',
        ]);
        $body = $response->json() ?? [];
        $amountMatches = abs(((float) ($body['amount'] ?? 0)) - ($transaction->amount_cents / 100)) < 0.01;
        $currencyMatches = strtoupper((string) ($body['currency_merchant'] ?? $body['currency'] ?? '')) === strtoupper($transaction->currency);
        $storeMatches = (string) ($body['store_id'] ?? $setting->merchant_id) === (string) $setting->merchant_id;
        $transactionMatches = (string) ($body['mer_txnid'] ?? $requestId) === (string) $requestId;
        $paid = $response->successful()
            && (string) ($body['status_code'] ?? '') === '2'
            && strtolower((string) ($body['pay_status'] ?? '')) === 'successful'
            && $amountMatches
            && $currencyMatches
            && $storeMatches
            && $transactionMatches;

        $transaction->update([
            'status' => $paid ? 'paid' : 'failed',
            'gateway_transaction_id' => $body['pg_txnid'] ?? $payload['pg_txnid'] ?? null,
            'gateway_payment_id' => $requestId,
            'verification_payload' => $body,
            'paid_at' => $paid ? now() : null,
            'failed_at' => $paid ? null : now(),
            'failure_message' => $paid ? null : ($body['status_title'] ?? $body['reason'] ?? 'aamarPay verification failed.'),
        ]);

        return new PaymentResult($paid ? 'paid' : 'failed', null, $body);
    }

    public function handleCallback(Request $request, PaymentGatewaySetting $setting): PaymentResult
    {
        $transaction = $this->findTransaction($request);
        if ($transaction->status === 'paid') {
            return new PaymentResult('paid', null, $request->all());
        }

        if ($request->route('result') !== 'success') {
            $transaction->update(['status' => 'failed', 'failed_at' => now(), 'failure_message' => 'aamarPay '.$request->route('result')]);
            return new PaymentResult('failed', null, $request->all());
        }

        return $this->verify($transaction, $setting, $request->all());
    }

    private function findTransaction(Request $request): PaymentTransaction
    {
        $merchantTransactionId = $request->input('mer_txnid')
            ?? $request->input('merTxnid')
            ?? $request->input('tran_id')
            ?? $request->input('request_id');

        abort_unless($merchantTransactionId, 422, 'aamarPay merchant transaction id is missing.');

        return PaymentTransaction::query()
            ->where('gateway', 'aamarpay')
            ->where(function ($query) use ($merchantTransactionId): void {
                $query->where('gateway_payment_id', $merchantTransactionId)
                    ->orWhere('transaction_key', $merchantTransactionId);
            })
            ->firstOrFail();
    }

    private function checkoutEndpoint(PaymentGatewaySetting $setting): string
    {
        return (string) $this->configValue(
            $setting,
            'checkout_url',
            $setting->sandbox_mode ? 'https://sandbox.aamarpay.com/jsonpost.php' : 'https://secure.aamarpay.com/jsonpost.php',
        );
    }

    private function searchEndpoint(PaymentGatewaySetting $setting): string
    {
        return (string) $this->configValue(
            $setting,
            'search_url',
            $setting->sandbox_mode ? 'https://sandbox.aamarpay.com/api/v1/trxcheck/request.php' : 'https://secure.aamarpay.com/api/v1/trxcheck/request.php',
        );
    }

    private function http(): PendingRequest
    {
        $request = Http::timeout(20)->acceptJson();
        $caBundle = config('services.payments.ca_bundle');

        if (! $caBundle) {
            return $request;
        }

        $path = str_starts_with((string) $caBundle, DIRECTORY_SEPARATOR) || preg_match('/^[A-Za-z]:[\\\\\/]/', (string) $caBundle)
            ? (string) $caBundle
            : base_path((string) $caBundle);

        return file_exists($path) ? $request->withOptions(['verify' => $path]) : $request;
    }
}
