@extends('pdf.layouts.pdf', ['title' => 'Delivery Slip '.$order->order_number])

@section('content')
@php
    $shipping = (array) ($order->shipping_address ?? []);
    $billing = (array) ($order->billing_address ?? []);
    $addressLine = collect([
        $shipping['address_line'] ?? $billing['address_line'] ?? null,
        $shipping['area'] ?? $billing['area'] ?? null,
        $shipping['city'] ?? $billing['city'] ?? null,
        $shipping['state'] ?? $billing['state'] ?? null,
        $shipping['country'] ?? $billing['country'] ?? null,
        $shipping['postal_code'] ?? $billing['postal_code'] ?? null,
    ])->filter()->implode(', ');
@endphp

<div class="section">
    <h2>Delivery Slip</h2>
    <p><span class="muted">Order Number:</span> <span class="strong">{{ $order->order_number }}</span></p>
    <p><span class="muted">Shipping Method:</span> {{ $order->shipping_method_name ?: '-' }}</p>
    <p><span class="muted">Courier:</span> {{ $shippingLog?->courier ?: 'Not assigned' }}</p>
    <p><span class="muted">Tracking Number:</span> {{ $shippingLog?->tracking_number ?: 'Not assigned' }}</p>
</div>

<div class="section">
    <h2>Ship To</h2>
    <p class="strong">{{ $shipping['full_name'] ?? $billing['full_name'] ?? $order->user?->name ?? 'Customer' }}</p>
    <p class="muted">{{ $shipping['phone'] ?? $billing['phone'] ?? null }}</p>
    <p>{{ $addressLine ?: '-' }}</p>
</div>

<div class="section">
    <h2>Packing Items</h2>
    <table>
        <thead>
            <tr>
                <th>Product</th>
                <th>SKU</th>
                <th class="right">Quantity</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($order->items as $item)
                <tr>
                    <td>{{ $item->product_name }}</td>
                    <td>{{ $item->sku ?: '-' }}</td>
                    <td class="right strong">{{ $item->quantity }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</div>
@endsection
