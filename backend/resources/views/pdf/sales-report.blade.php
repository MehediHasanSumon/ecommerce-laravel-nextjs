@extends('pdf.layouts.pdf', ['title' => $title])

@section('content')
<div class="section">
    <h2>{{ $title }}</h2>
    <p class="muted">Period: {{ $filters['date_from'] }} to {{ $filters['date_to'] }}</p>
</div>

<table class="grid-2" style="margin-bottom: 14px;">
    @foreach (array_chunk($summary, 2) as $pair)
        <tr>
            @foreach ($pair as $item)
                <td><div class="section"><p class="muted">{{ $item['label'] }}</p><p class="strong" style="font-size: 16px;">{{ $item['value'] }}</p></div></td>
            @endforeach
            @if (count($pair) === 1)<td></td>@endif
        </tr>
    @endforeach
</table>

<div class="section">
    <h2>Sales Table</h2>
    <table>
        <thead>
            <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Status</th>
                <th>Payment</th>
                <th class="right">Subtotal</th>
                <th class="right">Discount</th>
                <th class="right">Total</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($rows as $row)
                <tr>
                    <td>{{ $row->order_number }}</td>
                    <td>{{ optional($row->placed_at)->format('M d, Y') }}</td>
                    <td>{{ str_replace('_', ' ', $row->status) }}</td>
                    <td>{{ str_replace('_', ' ', $row->payment_status) }}</td>
                    <td class="right">{{ $company->money($row->subtotal_cents) }}</td>
                    <td class="right">{{ $company->money($row->item_discount_cents + $row->coupon_discount_cents) }}</td>
                    <td class="right strong">{{ $company->money($row->total_cents) }}</td>
                </tr>
            @empty
                <tr><td colspan="7" class="center muted">No sales found for this filter.</td></tr>
            @endforelse
        </tbody>
    </table>
</div>

<div class="summary">
    <div class="summary-row"><span>Subtotal</span><span>{{ $company->money($totals['subtotal']) }}</span></div>
    <div class="summary-row"><span>Discounts</span><span>-{{ $company->money($totals['discount']) }}</span></div>
    <div class="summary-row"><span>Shipping</span><span>{{ $company->money($totals['shipping']) }}</span></div>
    <div class="summary-row"><span>Tax</span><span>{{ $company->money($totals['tax']) }}</span></div>
    <div class="summary-row total-row"><span>Total</span><span>{{ $company->money($totals['total']) }}</span></div>
</div>
@endsection
