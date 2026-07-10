@extends('pdf.layouts.pdf', ['title' => $title])

@section('content')
<div class="section">
    <h2>{{ $title }}</h2>
    <p class="muted">Generated from tracked product inventory.</p>
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
    <h2>Inventory Table</h2>
    <table>
        <thead>
            <tr>
                <th>Product</th>
                <th>SKU</th>
                <th class="right">Current Stock</th>
                <th class="right">Reserved Stock</th>
                <th class="right">Minimum Stock</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($products as $product)
                @php
                    $stock = (int) ($product->stock_quantity ?? 0);
                    $minimum = (int) ($product->low_stock_threshold ?? 0);
                    $stockStatus = $stock <= 0 ? 'Out of stock' : ($stock <= $minimum ? 'Low stock' : 'In stock');
                @endphp
                <tr>
                    <td>{{ $product->name }}</td>
                    <td>{{ $product->sku ?: '-' }}</td>
                    <td class="right strong">{{ $stock }}</td>
                    <td class="right">0</td>
                    <td class="right">{{ $minimum }}</td>
                    <td>{{ $stockStatus }} / {{ $product->status }}</td>
                </tr>
            @empty
                <tr><td colspan="6" class="center muted">No tracked products found.</td></tr>
            @endforelse
        </tbody>
    </table>
</div>

<div class="summary">
    <div class="summary-row"><span>Total Current Stock</span><span>{{ $totals['stock'] }}</span></div>
    <div class="summary-row total-row"><span>Total Minimum Stock</span><span>{{ $totals['minimum'] }}</span></div>
</div>
@endsection
