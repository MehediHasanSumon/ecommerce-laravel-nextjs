<?php

namespace App\Services\Pdf;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class ReportPdfService
{
    public function __construct(private readonly PdfRenderService $renderer) {}

    public function download(string $type, Request $request): Response
    {
        abort_unless(in_array($type, ['sales', 'inventory'], true), 404);

        $filters = $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'limit' => ['nullable', 'integer', 'min:5', 'max:100'],
            'status' => ['nullable', 'string', 'max:60'],
            'payment_status' => ['nullable', 'string', 'max:60'],
            'payment_method' => ['nullable', 'string', 'max:80'],
        ]);

        $from = isset($filters['date_from']) ? now()->parse($filters['date_from'])->startOfDay() : now()->subDays(29)->startOfDay();
        $to = isset($filters['date_to']) ? now()->parse($filters['date_to'])->endOfDay() : now()->endOfDay();
        $limit = (int) ($filters['limit'] ?? 25);
        $profile = CompanyPdfProfile::load();

        $payload = $type === 'sales'
            ? $this->sales($filters, $from, $to, $limit, $profile)
            : $this->inventory($limit, $profile);

        return $this->renderer->download('pdf.'.$type.'-report', [
            'company' => $profile,
            'filters' => [
                'date_from' => $from->toDateString(),
                'date_to' => $to->toDateString(),
                'limit' => $limit,
                'status' => $filters['status'] ?? null,
                'payment_status' => $filters['payment_status'] ?? null,
                'payment_method' => $filters['payment_method'] ?? null,
            ],
            'generatedAt' => now(),
            ...$payload,
        ], $type.'-report-'.$from->toDateString().'-'.$to->toDateString().'.pdf', 'a4');
    }

    private function sales(array $filters, $from, $to, int $limit, CompanyPdfProfile $profile): array
    {
        $orders = Order::query()
            ->whereBetween('placed_at', [$from, $to])
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['payment_status'] ?? null, fn (Builder $query, string $status) => $query->where('payment_status', $status))
            ->when($filters['payment_method'] ?? null, fn (Builder $query, string $method) => $query->where('payment_method', $method));

        $paidOrders = (clone $orders)->where('payment_status', 'paid');

        return [
            'title' => 'Sales Report',
            'summary' => [
                ['label' => 'Total Orders', 'value' => (clone $orders)->count()],
                ['label' => 'Paid Orders', 'value' => (clone $paidOrders)->count()],
                ['label' => 'Gross Revenue', 'value' => $profile->money((clone $orders)->sum('total_cents'))],
                ['label' => 'Net Revenue', 'value' => $profile->money((clone $paidOrders)->sum('total_cents'))],
                ['label' => 'Discounts', 'value' => $profile->money((clone $orders)->sum('item_discount_cents') + (clone $orders)->sum('coupon_discount_cents'))],
                ['label' => 'Shipping Revenue', 'value' => $profile->money((clone $orders)->sum('shipping_cents'))],
            ],
            'rows' => (clone $orders)
                ->select('order_number', 'status', 'payment_status', 'payment_method', 'subtotal_cents', 'shipping_cents', 'tax_cents', 'coupon_discount_cents', 'item_discount_cents', 'total_cents', 'placed_at')
                ->latest('placed_at')
                ->limit($limit)
                ->get(),
            'totals' => [
                'subtotal' => (clone $orders)->sum('subtotal_cents'),
                'discount' => (clone $orders)->sum('item_discount_cents') + (clone $orders)->sum('coupon_discount_cents'),
                'shipping' => (clone $orders)->sum('shipping_cents'),
                'tax' => (clone $orders)->sum('tax_cents'),
                'total' => (clone $orders)->sum('total_cents'),
            ],
        ];
    }

    private function inventory(int $limit, CompanyPdfProfile $profile): array
    {
        $products = Product::query()
            ->where('track_inventory', true)
            ->select('name', 'sku', 'stock_quantity', 'low_stock_threshold', 'status')
            ->orderByRaw('COALESCE(stock_quantity, 0) asc')
            ->limit($limit)
            ->get();

        return [
            'title' => 'Inventory Report',
            'summary' => [
                ['label' => 'Tracked Products', 'value' => Product::query()->where('track_inventory', true)->count()],
                ['label' => 'Low Stock', 'value' => Product::query()->where('track_inventory', true)->whereRaw('COALESCE(stock_quantity, 0) <= COALESCE(low_stock_threshold, 0)')->count()],
                ['label' => 'Out of Stock', 'value' => Product::query()->where('track_inventory', true)->whereRaw('COALESCE(stock_quantity, 0) <= 0')->count()],
                ['label' => 'Active Products', 'value' => Product::query()->where('status', 'active')->count()],
            ],
            'products' => $products,
            'totals' => [
                'stock' => (int) Product::query()->where('track_inventory', true)->sum(DB::raw('COALESCE(stock_quantity, 0)')),
                'minimum' => (int) Product::query()->where('track_inventory', true)->sum(DB::raw('COALESCE(low_stock_threshold, 0)')),
            ],
        ];
    }
}
