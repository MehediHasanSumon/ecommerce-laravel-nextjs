<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PaymentTransaction;
use App\Models\Product;
use App\Models\Settings\CompanySetting;
use App\Models\Settings\ShippingMethod;
use App\Models\User;
use App\Services\Pdf\ReportPdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ReportsController extends Controller
{
    private const TYPES = [
        'sales',
        'revenue',
        'product-performance',
        'customer-analytics',
        'payment',
        'shipping',
        'inventory',
    ];

    public function __construct(private readonly ReportPdfService $pdf) {}

    public function show(string $type, Request $request): JsonResponse
    {
        abort_unless(in_array($type, self::TYPES, true), 404);

        $filters = $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'limit' => ['nullable', 'integer', 'min:5', 'max:50'],
            'status' => ['nullable', 'string', 'max:60'],
            'payment_status' => ['nullable', 'string', 'max:60'],
        ]);

        $from = isset($filters['date_from']) ? now()->parse($filters['date_from'])->startOfDay() : now()->subDays(29)->startOfDay();
        $to = isset($filters['date_to']) ? now()->parse($filters['date_to'])->endOfDay() : now()->endOfDay();
        $limit = (int) ($filters['limit'] ?? 10);

        $orders = Order::query()
            ->whereBetween('placed_at', [$from, $to])
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['payment_status'] ?? null, fn ($query, string $status) => $query->where('payment_status', $status));

        $paidOrders = (clone $orders)->where('payment_status', 'paid');

        $data = match ($type) {
            'sales' => $this->sales($orders, $paidOrders, $limit),
            'revenue' => $this->revenue($orders, $paidOrders),
            'product-performance' => $this->productPerformance($orders, $limit),
            'customer-analytics' => $this->customerAnalytics($orders, $from, $to, $limit),
            'payment' => $this->payment($orders, $from, $to, $limit),
            'shipping' => $this->shipping($orders, $limit),
            'inventory' => $this->inventory($limit),
        };

        return ApiResponse::success([
            'report' => [
                'type' => $type,
                'title' => $this->title($type),
                'currency' => $this->currency(),
                'filters' => [
                    'date_from' => $from->toDateString(),
                    'date_to' => $to->toDateString(),
                    'limit' => $limit,
                ],
                ...$data,
            ],
        ], 'Report generated successfully.');
    }

    public function pdf(string $type, Request $request): Response
    {
        return $this->pdf->download($type, $request);
    }

    private function sales($orders, $paidOrders, int $limit): array
    {
        return [
            'summary' => [
                ['label' => 'Orders', 'value' => (clone $orders)->count(), 'format' => 'number'],
                ['label' => 'Paid Orders', 'value' => (clone $paidOrders)->count(), 'format' => 'number'],
                ['label' => 'Gross Sales', 'value' => $this->money((clone $orders)->sum('total_cents')), 'format' => 'money'],
                ['label' => 'Net Sales', 'value' => $this->money((clone $paidOrders)->sum('total_cents')), 'format' => 'money'],
            ],
            'series' => $this->dailySeries($orders, 'total_cents'),
            'rows' => (clone $orders)
                ->select('order_number as label', 'status', 'payment_status', 'total_cents as amount', 'placed_at')
                ->latest('placed_at')
                ->limit($limit)
                ->get()
                ->map(fn ($order) => [
                    'label' => $order->label,
                    'status' => $order->status,
                    'secondary' => $order->payment_status,
                    'amount' => $this->money($order->amount),
                    'date' => optional($order->placed_at)->toDateString(),
                ]),
        ];
    }

    private function revenue($orders, $paidOrders): array
    {
        $subtotal = (clone $paidOrders)->sum('subtotal_cents');
        $discount = (clone $paidOrders)->sum('item_discount_cents') + (clone $paidOrders)->sum('coupon_discount_cents');
        $shipping = (clone $paidOrders)->sum('shipping_cents');
        $tax = (clone $paidOrders)->sum('tax_cents');
        $total = (clone $paidOrders)->sum('total_cents');

        return [
            'summary' => [
                ['label' => 'Subtotal', 'value' => $this->money($subtotal), 'format' => 'money'],
                ['label' => 'Discounts', 'value' => $this->money($discount), 'format' => 'money'],
                ['label' => 'Shipping Revenue', 'value' => $this->money($shipping), 'format' => 'money'],
                ['label' => 'Tax', 'value' => $this->money($tax), 'format' => 'money'],
                ['label' => 'Total Revenue', 'value' => $this->money($total), 'format' => 'money'],
            ],
            'series' => $this->dailySeries($paidOrders, 'total_cents'),
            'rows' => [
                ['label' => 'Subtotal', 'amount' => $this->money($subtotal)],
                ['label' => 'Discounts', 'amount' => $this->money($discount)],
                ['label' => 'Shipping', 'amount' => $this->money($shipping)],
                ['label' => 'Tax', 'amount' => $this->money($tax)],
                ['label' => 'Revenue', 'amount' => $this->money($total)],
            ],
        ];
    }

    private function productPerformance($orders, int $limit): array
    {
        $orderIds = (clone $orders)->pluck('id');
        $items = OrderItem::query()
            ->whereIn('order_id', $orderIds)
            ->select('product_id', 'product_name', DB::raw('SUM(quantity) as quantity'), DB::raw('SUM(line_subtotal_cents - line_discount_cents) as revenue'))
            ->groupBy('product_id', 'product_name')
            ->orderByDesc('revenue')
            ->limit($limit)
            ->get();

        return [
            'summary' => [
                ['label' => 'Products Sold', 'value' => (int) $items->sum('quantity'), 'format' => 'number'],
                ['label' => 'Revenue', 'value' => $this->money((int) $items->sum('revenue')), 'format' => 'money'],
                ['label' => 'Active Products', 'value' => Product::query()->where('status', 'active')->count(), 'format' => 'number'],
            ],
            'series' => $items->map(fn ($item) => ['label' => $item->product_name, 'value' => (int) $item->quantity, 'amount' => $this->money($item->revenue)]),
            'rows' => $items->map(fn ($item) => [
                'label' => $item->product_name,
                'secondary' => 'Sold '.$item->quantity,
                'amount' => $this->money($item->revenue),
            ]),
        ];
    }

    private function customerAnalytics($orders, $from, $to, int $limit): array
    {
        $customers = (clone $orders)
            ->whereNotNull('user_id')
            ->select('user_id', DB::raw('COUNT(*) as orders_count'), DB::raw('SUM(total_cents) as total_spent'))
            ->with('user:id,name,email')
            ->groupBy('user_id')
            ->orderByDesc('total_spent')
            ->limit($limit)
            ->get();

        return [
            'summary' => [
                ['label' => 'New Customers', 'value' => User::query()->whereBetween('created_at', [$from, $to])->count(), 'format' => 'number'],
                ['label' => 'Ordering Customers', 'value' => (clone $orders)->whereNotNull('user_id')->distinct('user_id')->count('user_id'), 'format' => 'number'],
                ['label' => 'Guest Orders', 'value' => (clone $orders)->whereNull('user_id')->count(), 'format' => 'number'],
            ],
            'series' => $customers->map(fn ($row) => ['label' => $row->user?->name ?? 'Customer #'.$row->user_id, 'value' => (int) $row->orders_count, 'amount' => $this->money($row->total_spent)]),
            'rows' => $customers->map(fn ($row) => [
                'label' => $row->user?->name ?? 'Customer #'.$row->user_id,
                'secondary' => $row->user?->email ?? 'No email',
                'status' => $row->orders_count.' orders',
                'amount' => $this->money($row->total_spent),
            ]),
        ];
    }

    private function payment($orders, $from, $to, int $limit): array
    {
        $orderIds = (clone $orders)->pluck('id');
        $transactions = PaymentTransaction::query()->whereIn('order_id', $orderIds)->whereBetween('created_at', [$from, $to]);
        $byGateway = (clone $transactions)
            ->select('gateway', 'status', DB::raw('COUNT(*) as count'), DB::raw('SUM(amount_cents) as amount'))
            ->groupBy('gateway', 'status')
            ->orderByDesc('amount')
            ->limit($limit)
            ->get();

        return [
            'summary' => [
                ['label' => 'Transactions', 'value' => (clone $transactions)->count(), 'format' => 'number'],
                ['label' => 'Paid Amount', 'value' => $this->money((clone $transactions)->where('status', 'paid')->sum('amount_cents')), 'format' => 'money'],
                ['label' => 'Failed', 'value' => (clone $transactions)->where('status', 'failed')->count(), 'format' => 'number'],
                ['label' => 'Pending', 'value' => (clone $transactions)->whereIn('status', ['initiated', 'pending'])->count(), 'format' => 'number'],
            ],
            'series' => $byGateway->map(fn ($row) => ['label' => $row->gateway.' / '.$row->status, 'value' => (int) $row->count, 'amount' => $this->money($row->amount)]),
            'rows' => $byGateway->map(fn ($row) => [
                'label' => $row->gateway,
                'status' => $row->status,
                'secondary' => $row->count.' transactions',
                'amount' => $this->money($row->amount),
            ]),
        ];
    }

    private function shipping($orders, int $limit): array
    {
        $methods = (clone $orders)
            ->select('shipping_method_name', 'shipping_status', DB::raw('COUNT(*) as count'), DB::raw('SUM(shipping_cents) as shipping_total'))
            ->groupBy('shipping_method_name', 'shipping_status')
            ->orderByDesc('count')
            ->limit($limit)
            ->get();

        return [
            'summary' => [
                ['label' => 'Shipped Orders', 'value' => (clone $orders)->whereIn('shipping_status', ['shipped', 'delivered'])->count(), 'format' => 'number'],
                ['label' => 'Pending Shipping', 'value' => (clone $orders)->where('shipping_status', 'pending')->count(), 'format' => 'number'],
                ['label' => 'Shipping Collected', 'value' => $this->money((clone $orders)->sum('shipping_cents')), 'format' => 'money'],
                ['label' => 'Active Methods', 'value' => ShippingMethod::query()->where('status', true)->count(), 'format' => 'number'],
            ],
            'series' => $methods->map(fn ($row) => ['label' => $row->shipping_method_name ?: 'Unknown', 'value' => (int) $row->count, 'amount' => $this->money($row->shipping_total)]),
            'rows' => $methods->map(fn ($row) => [
                'label' => $row->shipping_method_name ?: 'Unknown',
                'status' => $row->shipping_status,
                'secondary' => $row->count.' orders',
                'amount' => $this->money($row->shipping_total),
            ]),
        ];
    }

    private function inventory(int $limit): array
    {
        $products = Product::query()
            ->where('track_inventory', true)
            ->select('name', 'sku', 'stock_quantity', 'low_stock_threshold', 'status')
            ->orderByRaw('COALESCE(stock_quantity, 0) asc')
            ->limit($limit)
            ->get();
        $lowStock = Product::query()
            ->where('track_inventory', true)
            ->whereRaw('COALESCE(stock_quantity, 0) <= COALESCE(low_stock_threshold, 0)')
            ->count();

        return [
            'summary' => [
                ['label' => 'Tracked Products', 'value' => Product::query()->where('track_inventory', true)->count(), 'format' => 'number'],
                ['label' => 'Low Stock', 'value' => $lowStock, 'format' => 'number'],
                ['label' => 'Out of Stock', 'value' => Product::query()->where('track_inventory', true)->whereRaw('COALESCE(stock_quantity, 0) <= 0')->count(), 'format' => 'number'],
                ['label' => 'Active Products', 'value' => Product::query()->where('status', 'active')->count(), 'format' => 'number'],
            ],
            'series' => $products->map(fn ($product) => ['label' => $product->name, 'value' => (int) ($product->stock_quantity ?? 0)]),
            'rows' => $products->map(fn ($product) => [
                'label' => $product->name,
                'secondary' => $product->sku ?: 'No SKU',
                'status' => $product->status,
                'amount' => (string) ($product->stock_quantity ?? 0).' in stock',
            ]),
        ];
    }

    private function dailySeries($orders, string $amountColumn): array
    {
        return (clone $orders)
            ->select(DB::raw('DATE(placed_at) as label'), DB::raw('COUNT(*) as value'), DB::raw("SUM({$amountColumn}) as amount"))
            ->groupBy(DB::raw('DATE(placed_at)'))
            ->orderBy('label')
            ->get()
            ->map(fn ($row) => ['label' => $row->label, 'value' => (int) $row->value, 'amount' => $this->money($row->amount)])
            ->all();
    }

    private function title(string $type): string
    {
        return str($type)->replace('-', ' ')->title()->toString();
    }

    private function money(int|string|null $cents): float
    {
        return round(((int) $cents) / 100, 2);
    }

    private function currency(): string
    {
        return CompanySetting::query()->with('currency')->first()?->currency?->currency ?: 'BDT';
    }
}
