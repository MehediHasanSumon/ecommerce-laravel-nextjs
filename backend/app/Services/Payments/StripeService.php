<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Settings\PaymentGatewaySetting;
use Illuminate\Http\Request;
use Stripe\StripeClient;
use Stripe\Webhook;

class StripeService implements PaymentGatewayInterface
{
    public function gateway(): string { return 'stripe'; }

    public function assertConfigured(PaymentGatewaySetting $setting): void
    {
        abort_unless($setting->enabled, 422, 'Stripe is disabled.');
        abort_unless($setting->secret_key, 422, 'Stripe secret key is not configured.');
    }

    public function initiate(Order $order, PaymentTransaction $transaction, PaymentGatewaySetting $setting): PaymentResult
    {
        $stripe = new StripeClient((string) $setting->secret_key);
        $session = $stripe->checkout->sessions->create([
            'mode' => 'payment',
            'client_reference_id' => $transaction->transaction_key,
            'success_url' => route('payments.callback', ['gateway' => 'stripe']).'?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => route('payments.callback', ['gateway' => 'stripe', 'result' => 'cancel']).'?transaction='.$transaction->transaction_key,
            'payment_intent_data' => ['metadata' => ['transaction_key' => $transaction->transaction_key, 'order_number' => $order->order_number]],
            'line_items' => [[
                'quantity' => 1,
                'price_data' => [
                    'currency' => strtolower($order->currency),
                    'unit_amount' => $order->total_cents,
                    'product_data' => ['name' => 'Order '.$order->order_number],
                ],
            ]],
        ]);

        $transaction->update(['gateway_payment_id' => $session->id, 'response_payload' => $session->toArray()]);

        return new PaymentResult('redirect', $session->url, $session->toArray());
    }

    public function verify(PaymentTransaction $transaction, PaymentGatewaySetting $setting, array $payload = []): PaymentResult
    {
        $sessionId = $payload['session_id'] ?? $transaction->gateway_payment_id;
        abort_unless($sessionId, 422, 'Stripe checkout session id is missing.');
        $session = (new StripeClient((string) $setting->secret_key))->checkout->sessions->retrieve((string) $sessionId, []);
        $paid = $session->payment_status === 'paid' && (int) $session->amount_total === (int) $transaction->amount_cents && strtoupper((string) $session->currency) === strtoupper($transaction->currency);
        $transaction->update([
            'status' => $paid ? 'paid' : 'failed',
            'gateway_transaction_id' => is_string($session->payment_intent) ? $session->payment_intent : null,
            'gateway_payment_id' => $session->id,
            'verification_payload' => $session->toArray(),
            'paid_at' => $paid ? now() : null,
            'failed_at' => $paid ? null : now(),
            'failure_message' => $paid ? null : 'Stripe verification failed.',
        ]);

        return new PaymentResult($paid ? 'paid' : 'failed', null, $session->toArray());
    }

    public function handleCallback(Request $request, PaymentGatewaySetting $setting): PaymentResult
    {
        if ($request->isMethod('post')) {
            abort_unless($setting->webhook_secret, 422, 'Stripe webhook secret is not configured.');
            $event = Webhook::constructEvent($request->getContent(), $request->header('Stripe-Signature', ''), (string) $setting->webhook_secret);
            $session = $event->data->object;
            $transaction = PaymentTransaction::query()->where('gateway_payment_id', $session->id)->firstOrFail();
            return $this->verify($transaction, $setting, ['session_id' => $session->id]);
        }

        $transaction = PaymentTransaction::query()->where('gateway_payment_id', $request->input('session_id'))->firstOrFail();
        return $this->verify($transaction, $setting, $request->all());
    }
}
