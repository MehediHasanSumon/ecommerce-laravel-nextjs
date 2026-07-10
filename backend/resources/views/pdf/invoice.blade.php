@extends('pdf.layouts.pdf', ['title' => 'Invoice '.$order->order_number])

@section('content')
@php
    $billing = (array) ($order->billing_address ?? []);
    $shipping = (array) ($order->shipping_address ?? []);
    $invoiceNumber = $company->invoicePrefix().'-'.$order->order_number;
    $addressLine = fn (array $address) => collect([
        $address['address_line'] ?? null,
        $address['area'] ?? null,
        $address['city'] ?? null,
        $address['state'] ?? null,
        $address['country'] ?? null,
        $address['postal_code'] ?? null,
    ])->filter()->implode(', ');
    $variantLabel = function ($item) {
        $selection = (array) ($item->selection_snapshot ?? []);
        $attributes = collect($selection['attributes'] ?? $selection['options'] ?? [])->filter()->map(function ($value, $key) {
            return is_array($value) ? ($value['label'] ?? $value['value'] ?? null) : $value;
        })->filter()->implode(' / ');
        return $attributes ?: '-';
    };
@endphp

<table class="grid-2" style="margin-bottom: 14px;">
    <tr>
        <td>
            <div class="section">
                <h2>{{ $context === 'payment' ? 'Payment Invoice' : 'Invoice' }}</h2>
                <p><span class="muted">Invoice Number:</span> <span class="strong">{{ $invoiceNumber }}</span></p>
                <p><span class="muted">Order Number:</span> {{ $order->order_number }}</p>
                <p><span class="muted">Invoice Date:</span> {{ optional($order->placed_at ?? $order->created_at)->format('M d, Y') }}</p>
            </div>
        </td>
        <td>
            <div class="section">
                <h2>Payment</h2>
                <p><span class="muted">Status:</span> <span class="badge">{{ str_replace('_', ' ', $transaction?->status ?? $order->payment_status) }}</span></p>
                <p><span class="muted">Method:</span> {{ str_replace('_', ' ', $transaction?->gateway ?? $order->payment_method ?? '-') }}</p>
                <p><span class="muted">Transaction ID:</span> {{ $transaction?->gateway_transaction_id ?? $transaction?->gateway_payment_id ?? '-' }}</p>
            </div>
        </td>
    </tr>
</table>

<table class="grid-2" style="margin-bottom: 14px;">
    <tr>
        <td>
            <div class="section">
                <h2>Customer Information</h2>
                <p class="strong">{{ $order->user?->name ?? ($billing['full_name'] ?? 'Customer') }}</p>
                <p class="muted">{{ $order->user?->email ?? ($billing['email'] ?? null) }}</p>
                <p class="muted">{{ $billing['phone'] ?? null }}</p>
            </div>
        </td>
        <td>
            <div class="section">
                <h2>Billing Address</h2>
                <p class="strong">{{ $billing['full_name'] ?? ($order->user?->name ?? 'Customer') }}</p>
                <p class="muted">{{ $billing['phone'] ?? null }}</p>
                <p>{{ $addressLine($billing) ?: '-' }}</p>
            </div>
        </td>
    </tr>
</table>

<div class="section">
    <h2>Shipping Address</h2>
    <p class="strong">{{ $shipping['full_name'] ?? ($billing['full_name'] ?? 'Customer') }}</p>
    <p class="muted">{{ $shipping['phone'] ?? ($billing['phone'] ?? null) }}</p>
    <p>{{ $addressLine($shipping) ?: $addressLine($billing) ?: '-' }}</p>
</div>

<div class="section">
    <h2>Ordered Products</h2>
    <table>
        <thead>
            <tr>
                <th>Product</th>
                <th>Variant</th>
                <th>SKU</th>
                <th class="right">Qty</th>
                <th class="right">Unit Price</th>
                <th class="right">Discount</th>
                <th class="right">Line Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($order->items as $item)
                <tr>
                    <td>{{ $item->product_name }}</td>
                    <td>{{ $variantLabel($item) }}</td>
                    <td>{{ $item->sku ?: '-' }}</td>
                    <td class="right">{{ $item->quantity }}</td>
                    <td class="right">{{ $company->money($item->discounted_price_cents ?: $item->unit_price_cents, $order->currency) }}</td>
                    <td class="right">{{ $company->money($item->line_discount_cents, $order->currency) }}</td>
                    <td class="right strong">{{ $company->money($item->line_subtotal_cents - $item->line_discount_cents, $order->currency) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</div>

<div class="summary">
    <div class="summary-row"><span>Subtotal</span><span>{{ $company->money($order->subtotal_cents, $order->currency) }}</span></div>
    <div class="summary-row"><span>Shipping Charge</span><span>{{ $company->money($order->shipping_cents, $order->currency) }}</span></div>
    <div class="summary-row"><span>Tax</span><span>{{ $company->money($order->tax_cents, $order->currency) }}</span></div>
    <div class="summary-row"><span>Coupon Discount</span><span>-{{ $company->money($order->coupon_discount_cents, $order->currency) }}</span></div>
    <div class="summary-row"><span>Collection Discount</span><span>-{{ $company->money($order->item_discount_cents, $order->currency) }}</span></div>
    <div class="summary-row total-row"><span>Grand Total</span><span>{{ $company->money($order->total_cents, $order->currency) }}</span></div>
</div>
@endsection
