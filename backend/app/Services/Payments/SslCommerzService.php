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

class SslCommerzService implements PaymentGatewayInterface
{
    use BuildsGatewayUrls;
    use RedactsSensitivePaymentData;

    public function gateway(): string
    {
        return 'sslcommerz';
    }

    public function assertConfigured(PaymentGatewaySetting $setting): void
    {
        abort_unless($setting->enabled, 422, 'SSLCommerz is disabled.');
        abort_unless($setting->merchant_id && $setting->secret_key, 422, 'SSLCommerz credentials are not configured.');
    }

    public function initiate(Order $order, PaymentTransaction $transaction, PaymentGatewaySetting $setting): PaymentResult
    {
        $base = rtrim((string) $this->configValue($setting, 'base_url', $setting->sandbox_mode ? 'https://sandbox.sslcommerz.com' : 'https://securepay.sslcommerz.com'), '/');
        $successUrl = route('payments.callback', ['gateway' => 'sslcommerz', 'result' => 'success']);
        $failUrl = route('payments.callback', ['gateway' => 'sslcommerz', 'result' => 'fail']);
        $cancelUrl = route('payments.callback', ['gateway' => 'sslcommerz', 'result' => 'cancel']);
        $ipnUrl = route('payments.webhook', ['gateway' => 'sslcommerz']);
        $payload = [
            'store_id' => $setting->merchant_id,
            'store_passwd' => $setting->secret_key,
            'total_amount' => number_format($order->total_cents / 100, 2, '.', ''),
            'currency' => $order->currency,
            'tran_id' => $transaction->transaction_key,
            'success_url' => $successUrl,
            'fail_url' => $failUrl,
            'cancel_url' => $cancelUrl,
            'ipn_url' => $ipnUrl,
            'cus_name' => $order->billing_address['full_name'] ?? 'Customer',
            'cus_email' => $order->billing_address['email'] ?? 'customer@example.com',
            'cus_phone' => $order->billing_address['phone'] ?? '',
            'cus_add1' => $order->billing_address['address_line'] ?? '',
            'cus_city' => $order->billing_address['city'] ?? '',
            'cus_state' => $order->billing_address['state'] ?? '',
            'cus_postcode' => $order->billing_address['postal_code'] ?? '',
            'cus_country' => $order->billing_address['country'] ?? 'Bangladesh',
            'ship_name' => $order->shipping_address['full_name'] ?? $order->billing_address['full_name'] ?? 'Customer',
            'ship_add1' => $order->shipping_address['address_line'] ?? $order->billing_address['address_line'] ?? '',
            'ship_city' => $order->shipping_address['city'] ?? $order->billing_address['city'] ?? '',
            'ship_state' => $order->shipping_address['state'] ?? $order->billing_address['state'] ?? '',
            'ship_postcode' => $order->shipping_address['postal_code'] ?? $order->billing_address['postal_code'] ?? '',
            'ship_country' => $order->shipping_address['country'] ?? $order->billing_address['country'] ?? 'Bangladesh',
            'shipping_method' => 'YES',
            'num_of_item' => max(1, $order->items()->count()),
            'product_name' => 'Order '.$order->order_number,
            'product_category' => 'ecommerce',
            'product_profile' => 'general',
        ];

        $response = $this->http()->asForm()->post($base.'/gwprocess/v4/api.php', $payload)->json();
        $transaction->update(['request_payload' => $this->redact($payload), 'response_payload' => $response]);

        abort_unless(($response['status'] ?? null) === 'SUCCESS' && ! empty($response['GatewayPageURL']), 502, 'SSLCommerz checkout could not be initialized.');

        return new PaymentResult('redirect', $response['GatewayPageURL'], $response);
    }

    public function verify(PaymentTransaction $transaction, PaymentGatewaySetting $setting, array $payload = []): PaymentResult
    {
        $valId = $payload['val_id'] ?? null;
        abort_unless($valId, 422, 'SSLCommerz validation id is missing.');

        $base = rtrim((string) $this->configValue($setting, 'validation_base_url', $setting->sandbox_mode ? 'https://sandbox.sslcommerz.com' : 'https://securepay.sslcommerz.com'), '/');
        $response = $this->http()->get($base.'/validator/api/validationserverAPI.php', [
            'val_id' => $valId,
            'store_id' => $setting->merchant_id,
            'store_passwd' => $setting->secret_key,
            'v' => 1,
            'format' => 'json',
        ])->json();

        $amountMatches = abs(((float) ($response['amount'] ?? 0)) - ($transaction->amount_cents / 100)) < 0.01;
        $currencyMatches = strtoupper((string) ($response['currency'] ?? '')) === strtoupper($transaction->currency);
        $storeMatches = ($response['store_id'] ?? $setting->merchant_id) === $setting->merchant_id;
        $transactionMatches = ($response['tran_id'] ?? $payload['tran_id'] ?? null) === $transaction->transaction_key;
        $paid = in_array($response['status'] ?? null, ['VALID', 'VALIDATED'], true) && $amountMatches && $currencyMatches && $storeMatches && $transactionMatches;

        $transaction->update([
            'status' => $paid ? 'paid' : 'failed',
            'gateway_transaction_id' => $response['tran_id'] ?? $payload['tran_id'] ?? null,
            'gateway_payment_id' => $valId,
            'verification_payload' => $response,
            'paid_at' => $paid ? now() : null,
            'failed_at' => $paid ? null : now(),
            'failure_message' => $paid ? null : 'SSLCommerz verification failed.',
        ]);

        return new PaymentResult($paid ? 'paid' : 'failed', null, $response);
    }

    public function handleCallback(Request $request, PaymentGatewaySetting $setting): PaymentResult
    {
        $transaction = PaymentTransaction::query()->where('transaction_key', $request->input('tran_id'))->firstOrFail();
        if ($transaction->status === 'paid') {
            return new PaymentResult('paid', null, $request->all());
        }

        if ($request->route('result') !== 'success') {
            $transaction->update(['status' => 'failed', 'failed_at' => now(), 'failure_message' => 'SSLCommerz '.$request->route('result')]);
            return new PaymentResult('failed', null, $request->all());
        }

        return $this->verify($transaction, $setting, $request->all());
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
