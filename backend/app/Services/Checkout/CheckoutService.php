<?php

namespace App\Services\Checkout;

use App\Models\Cart;
use App\Models\CheckoutSession;
use App\Models\CustomerAddress;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Settings\CompanySetting;
use App\Models\Settings\ShippingMethod;
use App\Models\Settings\StoreSetting;
use App\Services\Commerce\CartService;
use App\Services\Payments\PaymentGatewayManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    public function __construct(
        private readonly CartService $cartService,
        private readonly PaymentGatewayManager $payments,
    ) {}

    public function place(Request $request, array $payload): array
    {
        $store = StoreSetting::query()->first();
        if (($store?->require_login_before_checkout ?? false) && ! $request->user()) {
            abort(401, 'Please sign in before checkout.');
        }

        return DB::transaction(function () use ($request, $payload): array {
            $cart = $this->cartService->get($request);
            $cart->load(['items.product', 'items.variant', 'coupon']);

            if ($cart->items->isEmpty()) {
                throw ValidationException::withMessages(['cart' => ['Your cart is empty.']]);
            }

            $shippingMethod = ShippingMethod::query()->where('status', true)->findOrFail($payload['shipping_method_id']);
            $paymentSetting = $this->payments->setting($payload['payment_method']);
            $gateway = $this->payments->gateway($payload['payment_method']);
            $gateway->assertConfigured($paymentSetting);

            $billingAddress = $this->resolveAddress($request, $payload, 'billing');
            $shippingAddress = (bool) ($payload['same_as_billing'] ?? true)
                ? $billingAddress
                : $this->resolveAddress($request, $payload, 'shipping');
            $summary = $this->summary($cart, $shippingMethod);
            $currency = $this->currency();

            $order = Order::query()->create([
                'order_number' => $this->nextOrderNumber(),
                'user_id' => $request->user()?->id,
                'cart_id' => $cart->id,
                'guest_token' => $cart->guest_token,
                'status' => 'pending',
                'payment_status' => 'pending',
                'payment_method' => $paymentSetting->gateway,
                'shipping_method_id' => $shippingMethod->id,
                'shipping_method_name' => $shippingMethod->name,
                'currency' => $currency,
                'subtotal_cents' => $summary['subtotal_cents'],
                'item_discount_cents' => $summary['item_discount_cents'],
                'coupon_discount_cents' => $summary['coupon_discount_cents'],
                'shipping_cents' => $summary['shipping_cents'],
                'tax_cents' => $summary['tax_cents'],
                'total_cents' => $summary['total_cents'],
                'coupon_code' => $cart->coupon_code,
                'coupon_snapshot' => $cart->coupon_snapshot,
                'billing_address' => $billingAddress,
                'shipping_address' => $shippingAddress,
                'summary_snapshot' => $summary,
                'client_ip' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 2000),
                'placed_at' => now(),
            ]);

            foreach ($cart->items as $item) {
                $order->items()->create([
                    'product_id' => $item->product_id,
                    'product_variant_id' => $item->product_variant_id,
                    'product_name' => $item->selection_snapshot['product_name'] ?? $item->product?->name ?? 'Product',
                    'sku' => $item->selection_snapshot['selected_sku'] ?? $item->product?->sku,
                    'quantity' => $item->quantity,
                    'unit_price_cents' => $item->unit_price_cents,
                    'discounted_price_cents' => $item->discounted_price_cents,
                    'line_subtotal_cents' => $item->line_subtotal_cents,
                    'line_discount_cents' => $item->line_discount_cents,
                    'selection_snapshot' => $item->selection_snapshot,
                    'pricing_snapshot' => $item->pricing_snapshot,
                    'tax_snapshot' => $item->tax_snapshot,
                ]);
            }

            $session = CheckoutSession::query()->create([
                'session_key' => (string) Str::uuid(),
                'user_id' => $request->user()?->id,
                'cart_id' => $cart->id,
                'order_id' => $order->id,
                'payment_method' => $paymentSetting->gateway,
                'status' => 'initiated',
                'payload_snapshot' => $payload,
                'expires_at' => now()->addMinutes(30),
            ]);

            $transaction = PaymentTransaction::query()->create([
                'transaction_key' => (string) Str::uuid(),
                'order_id' => $order->id,
                'checkout_session_id' => $session->id,
                'gateway' => $paymentSetting->gateway,
                'status' => 'initiated',
                'amount_cents' => $order->total_cents,
                'currency' => $order->currency,
            ]);

            $result = $gateway->initiate($order, $transaction, $paymentSetting);
            $order->setAttribute('redirect_url', $result->redirectUrl);

            if ($result->status === 'pending') {
                $this->completeCart($cart);
            }

            return [$order->fresh('items'), $result];
        });
    }

    public function markPaid(PaymentTransaction $transaction): void
    {
        DB::transaction(function () use ($transaction): void {
            $order = $transaction->order()->lockForUpdate()->firstOrFail();
            if ($order->payment_status === 'paid') {
                return;
            }
            $order->update(['payment_status' => 'paid', 'status' => 'confirmed']);
            if ($order->cart) {
                $this->completeCart($order->cart);
            }
        });
    }

    private function resolveAddress(Request $request, array $payload, string $type): array
    {
        $id = $payload[$type.'_address_id'] ?? null;
        if ($id) {
            $address = CustomerAddress::query()->where('user_id', $request->user()?->id)->findOrFail($id);
            return AddressData::normalize($address->toArray());
        }

        $data = AddressData::normalize((array) ($payload[$type.'_address'] ?? []));
        foreach (['full_name', 'phone', 'country', 'state', 'district', 'city', 'address_line'] as $field) {
            if ($data[$field] === '') {
                throw ValidationException::withMessages([$type.'_address.'.$field => ['This field is required.']]);
            }
        }

        return $data;
    }

    private function summary(Cart $cart, ShippingMethod $shippingMethod): array
    {
        $subtotal = (int) $cart->items->sum('line_subtotal_cents');
        $itemDiscount = (int) $cart->items->sum('line_discount_cents');
        $couponDiscount = (int) $cart->coupon_discount_cents;
        $tax = (int) $cart->items->sum(fn ($item) => (int) (($item->tax_snapshot['estimated_tax_cents'] ?? 0)));
        $couponSnapshot = (array) ($cart->coupon_snapshot ?? []);
        $shipping = (bool) ($couponSnapshot['free_shipping'] ?? false) ? 0 : (int) $shippingMethod->rate_cents;
        $total = max(0, $subtotal - $itemDiscount - $couponDiscount + $shipping + $tax);

        return [
            'subtotal_cents' => $subtotal,
            'item_discount_cents' => $itemDiscount,
            'coupon_discount_cents' => $couponDiscount,
            'shipping_cents' => $shipping,
            'tax_cents' => $tax,
            'total_cents' => $total,
        ];
    }

    private function currency(): string
    {
        $company = CompanySetting::query()->with('currency')->first();

        return $company?->currency?->currency ?: 'BDT';
    }

    private function nextOrderNumber(): string
    {
        return 'ORD-'.now()->format('Ymd').'-'.strtoupper(Str::random(8));
    }

    private function completeCart(Cart $cart): void
    {
        $cart->items()->delete();
        $cart->update(['status' => 'completed']);
    }
}
