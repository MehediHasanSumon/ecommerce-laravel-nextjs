<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentTransaction;
use App\Services\Checkout\CheckoutService;
use App\Services\Orders\OrderService;
use App\Services\Payments\PaymentGatewayManager;
use App\Services\Payments\PaymentLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PaymentCallbackController extends Controller
{
    public function __construct(
        private readonly PaymentGatewayManager $payments,
        private readonly CheckoutService $checkout,
        private readonly PaymentLogger $logger,
        private readonly OrderService $orders,
    ) {}

    public function callback(Request $request, string $gateway): RedirectResponse
    {
        $setting = $this->payments->setting($gateway, requireEnabled: false);
        $result = $this->payments->gateway($gateway)->handleCallback($request, $setting);
        $transaction = $this->findTransaction($gateway, $request);
        $this->logger->log($gateway, 'callback', $request->all(), $transaction, level: $result->status === 'paid' ? 'info' : 'warning');

        $finalStatus = $request->route('result') === 'cancel' ? 'cancelled' : $result->status;

        if ($result->status === 'paid' && $transaction) {
            $this->checkout->markPaid($transaction->fresh());
        } elseif ($transaction) {
            $finalStatus = $request->route('result') === 'cancel' ? 'cancelled' : 'failed';
            $transaction->fresh()->update(['status' => $finalStatus]);
            $this->orders->syncPayment($transaction->fresh()->order, $transaction->fresh(), $finalStatus, $transaction->fresh()->failure_message);
        }

        return redirect()->away($this->frontendUrl($finalStatus, $transaction));
    }

    public function webhook(Request $request, string $gateway)
    {
        $setting = $this->payments->setting($gateway, requireEnabled: false);
        $result = $this->payments->gateway($gateway)->handleCallback($request, $setting);
        $transaction = $this->findTransaction($gateway, $request);
        $this->logger->log($gateway, 'webhook', $request->all(), $transaction, level: $result->status === 'paid' ? 'info' : 'warning');

        if ($result->status === 'paid' && $transaction) {
            $this->checkout->markPaid($transaction->fresh());
        }

        return response()->json(['success' => true, 'status' => $result->status]);
    }

    private function findTransaction(string $gateway, Request $request): ?PaymentTransaction
    {
        return PaymentTransaction::query()
            ->where('gateway', $gateway)
            ->where(function ($query) use ($request): void {
                $query->when($request->input('tran_id'), fn ($q, $value) => $q->orWhere('transaction_key', $value)->orWhere('gateway_transaction_id', $value))
                    ->when($request->input('session_id'), fn ($q, $value) => $q->orWhere('gateway_payment_id', $value))
                    ->when($request->input('transaction'), fn ($q, $value) => $q->orWhere('transaction_key', $value))
                    ->when($request->input('paymentID'), fn ($q, $value) => $q->orWhere('gateway_payment_id', $value))
                    ->when($request->input('mer_txnid') ?? $request->input('merTxnid') ?? $request->input('request_id'), fn ($q, $value) => $q->orWhere('gateway_payment_id', $value)->orWhere('transaction_key', $value))
                    ->when($request->input('order_id') ?? $request->input('orderId'), fn ($q, $value) => $q->orWhere('transaction_key', $value))
                    ->when($request->input('payment_ref_id') ?? $request->input('paymentReferenceId'), fn ($q, $value) => $q->orWhere('gateway_payment_id', $value));
            })
            ->first();
    }

    private function frontendUrl(string $status, ?PaymentTransaction $transaction): string
    {
        $base = rtrim((string) env('FRONTEND_URL', config('app.url')), '/');
        $path = match ($status) {
            'paid' => '/payment/success',
            'cancelled' => '/payment/cancel',
            default => '/payment/failed',
        };
        $order = $transaction?->order?->order_number;

        return $base.$path.'?payment='.$status.($order ? '&order='.urlencode($order) : '');
    }
}
