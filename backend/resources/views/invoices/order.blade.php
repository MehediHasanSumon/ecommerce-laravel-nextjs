<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $order->order_number }}</title>
    <style>
        body { color: #111827; font-family: Arial, sans-serif; margin: 32px; }
        h1, h2, p { margin: 0; }
        .muted { color: #6b7280; }
        .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 32px; }
        .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 10px; text-align: left; }
        th { background: #f9fafb; font-size: 12px; text-transform: uppercase; }
        .right { text-align: right; }
        .summary { margin-left: auto; width: 320px; }
        .summary-row { display: flex; justify-content: space-between; padding: 6px 0; }
        .total { border-top: 1px solid #e5e7eb; font-weight: 700; margin-top: 8px; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>Invoice</h1>
            <p class="muted">{{ $order->order_number }}</p>
        </div>
        <div class="right">
            <p><strong>Date:</strong> {{ optional($order->placed_at ?? $order->created_at)->format('M d, Y') }}</p>
            <p><strong>Status:</strong> {{ ucwords(str_replace('_', ' ', $order->status)) }}</p>
            <p><strong>Payment:</strong> {{ ucwords(str_replace('_', ' ', $order->payment_status)) }}</p>
        </div>
    </div>

    <div class="card">
        <h2>Customer</h2>
        <p>{{ $order->user?->name ?? ($order->billing_address['full_name'] ?? 'Customer') }}</p>
        <p class="muted">{{ $order->user?->email ?? ($order->billing_address['email'] ?? '') }}</p>
        <p class="muted">{{ $order->billing_address['phone'] ?? '' }}</p>
    </div>

    <div class="card">
        <h2>Items</h2>
        <table>
            <thead>
                <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th class="right">Qty</th>
                    <th class="right">Unit</th>
                    <th class="right">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($order->items as $item)
                    <tr>
                        <td>{{ $item->product_name }}</td>
                        <td>{{ $item->sku }}</td>
                        <td class="right">{{ $item->quantity }}</td>
                        <td class="right">{{ number_format(($item->discounted_price_cents ?: $item->unit_price_cents) / 100, 2) }}</td>
                        <td class="right">{{ number_format(($item->line_subtotal_cents - $item->line_discount_cents) / 100, 2) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <div class="summary">
        <div class="summary-row"><span>Subtotal</span><span>{{ number_format($order->subtotal_cents / 100, 2) }}</span></div>
        <div class="summary-row"><span>Discount</span><span>-{{ number_format(($order->item_discount_cents + $order->coupon_discount_cents) / 100, 2) }}</span></div>
        <div class="summary-row"><span>Shipping</span><span>{{ number_format($order->shipping_cents / 100, 2) }}</span></div>
        <div class="summary-row"><span>Tax</span><span>{{ number_format($order->tax_cents / 100, 2) }}</span></div>
        <div class="summary-row total"><span>Grand Total</span><span>{{ $order->currency }} {{ number_format($order->total_cents / 100, 2) }}</span></div>
    </div>
</body>
</html>
