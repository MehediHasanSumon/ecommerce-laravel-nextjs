<?php

namespace App\Services\Admin;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductCollection;
use App\Models\ProductVariant;
use App\Models\Settings\CompanySetting;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;

class DashboardAnalyticsService
{
    public function overview(array $filters): array
    {
        [$from, $to, $preset] = $this->range($filters);
        $cacheKey = 'admin.dashboard.overview.'.md5(json_encode([
            'from' => $from->toDateTimeString(),
            'to' => $to->toDateTimeString(),
            'preset' => $preset,
        ]));

        return Cache::remember($cacheKey, now()->addMinutes(2), function () use ($from, $to, $preset): array {
            $previous = $this->previousRange($from, $to);
            $cards = $this->cards($from, $to, $previous);

            return [
                'filters' => [
                    'preset' => $preset,
                    'date_from' => $from->toDateString(),
                    'date_to' => $to->toDateString(),
                ],
                'currency' => $this->currency(),
                'cards' => $cards,
                'tables' => [
                    'recent_orders' => $this->recentOrders(),
                ],
            ];
        });
    }

    private function cards(CarbonImmutable $from, CarbonImmutable $to, array $previous): array
    {
        $orders = $this->ordersBetween($from, $to);
        $paidOrders = (clone $orders)->where('payment_status', 'paid');
        $previousOrders = $this->ordersBetween($previous['from'], $previous['to']);
        $previousPaidOrders = (clone $previousOrders)->where('payment_status', 'paid');

        $activeCollections = ProductCollection::query()->where('status', 'active')->count();
        $scheduledCollections = ProductCollection::query()->whereNotNull('starts_at')->where('starts_at', '>', now())->count();
        $expiredCollections = ProductCollection::query()->whereNotNull('ends_at')->where('ends_at', '<', now())->count();

        return [
            $this->card('revenue', 'Total Revenue', $this->money((clone $paidOrders)->sum('total_cents')), $this->money((clone $previousPaidOrders)->sum('total_cents')), 'money', [
                ['label' => "Today's Revenue", 'value' => $this->money($this->paidOrdersFor(now()->startOfDay(), now()->endOfDay())->sum('total_cents')), 'format' => 'money'],
                ['label' => 'Monthly Revenue', 'value' => $this->money($this->paidOrdersFor(now()->startOfMonth(), now()->endOfMonth())->sum('total_cents')), 'format' => 'money'],
                ['label' => 'Yearly Revenue', 'value' => $this->money($this->paidOrdersFor(now()->startOfYear(), now()->endOfYear())->sum('total_cents')), 'format' => 'money'],
            ]),
            $this->card('orders', 'Total Orders', (clone $orders)->count(), (clone $previousOrders)->count(), 'number', [
                ['label' => 'Pending', 'value' => (clone $orders)->where('status', 'pending')->count(), 'format' => 'number'],
                ['label' => 'Processing', 'value' => (clone $orders)->whereIn('status', ['confirmed', 'processing', 'packed'])->count(), 'format' => 'number'],
                ['label' => 'Completed', 'value' => (clone $orders)->whereIn('status', ['delivered', 'completed'])->count(), 'format' => 'number'],
                ['label' => 'Cancelled', 'value' => (clone $orders)->where('status', 'cancelled')->count(), 'format' => 'number'],
            ]),
            $this->card('customers', 'Total Customers', User::query()->count(), User::query()->whereBetween('created_at', [$previous['from'], $previous['to']])->count(), 'number', [
                ['label' => 'New Today', 'value' => User::query()->whereBetween('created_at', [now()->startOfDay(), now()->endOfDay()])->count(), 'format' => 'number'],
                ['label' => 'New In Range', 'value' => User::query()->whereBetween('created_at', [$from, $to])->count(), 'format' => 'number'],
                ['label' => 'Active Customers', 'value' => User::query()->where('status', 'active')->count(), 'format' => 'number'],
            ]),
            $this->card('products', 'Total Products', Product::query()->count(), 0, 'number', [
                ['label' => 'Active', 'value' => Product::query()->where('status', 'active')->count(), 'format' => 'number'],
                ['label' => 'Draft', 'value' => Product::query()->where('status', 'draft')->count(), 'format' => 'number'],
                ['label' => 'Out of Stock', 'value' => $this->outOfStockCount(), 'format' => 'number'],
            ]),
            $this->card('collections', 'Total Collections', ProductCollection::query()->count(), 0, 'number', [
                ['label' => 'Active', 'value' => $activeCollections, 'format' => 'number'],
                ['label' => 'Scheduled', 'value' => $scheduledCollections, 'format' => 'number'],
                ['label' => 'Expired', 'value' => $expiredCollections, 'format' => 'number'],
            ]),
            $this->card('categories', 'Total Categories', Category::query()->count(), 0, 'number'),
        ];
    }

    private function card(string $key, string $title, int|float $value, int|float $previous, string $format, array $details = []): array
    {
        $change = $this->percentageChange($value, $previous);

        return [
            'key' => $key,
            'title' => $title,
            'value' => $value,
            'format' => $format,
            'previous_value' => $previous,
            'change_percent' => $change,
            'trend' => $change > 0 ? 'up' : ($change < 0 ? 'down' : 'flat'),
            'details' => $details,
        ];
    }

    private function recentOrders(): array
    {
        return Order::query()
            ->with('user:id,name,email')
            ->latest('placed_at')
            ->limit(8)
            ->get()
            ->map(fn (Order $order) => [
                'id' => (string) $order->id,
                'order_number' => $order->order_number,
                'customer' => $order->user?->name ?: ($order->billing_address['name'] ?? 'Guest'),
                'payment_method' => $this->label((string) $order->payment_method),
                'payment_status' => $order->payment_status,
                'order_status' => $order->status,
                'total' => $this->money($order->total_cents),
                'date' => optional($order->placed_at ?: $order->created_at)->toISOString(),
            ])
            ->all();
    }

    private function range(array $filters): array
    {
        $preset = (string) ($filters['preset'] ?? 'last_30_days');
        $today = CarbonImmutable::now();

        if ($preset === 'custom' && ! empty($filters['date_from']) && ! empty($filters['date_to'])) {
            return [CarbonImmutable::parse($filters['date_from'])->startOfDay(), CarbonImmutable::parse($filters['date_to'])->endOfDay(), $preset];
        }

        return match ($preset) {
            'today' => [$today->startOfDay(), $today->endOfDay(), $preset],
            'yesterday' => [$today->subDay()->startOfDay(), $today->subDay()->endOfDay(), $preset],
            'last_7_days' => [$today->subDays(6)->startOfDay(), $today->endOfDay(), $preset],
            'last_90_days' => [$today->subDays(89)->startOfDay(), $today->endOfDay(), $preset],
            'this_month' => [$today->startOfMonth(), $today->endOfMonth(), $preset],
            'this_year' => [$today->startOfYear(), $today->endOfYear(), $preset],
            'last_12_months' => [$today->subMonths(11)->startOfMonth(), $today->endOfMonth(), $preset],
            default => [$today->subDays(29)->startOfDay(), $today->endOfDay(), 'last_30_days'],
        };
    }

    private function previousRange(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $days = $from->diffInDays($to) + 1;

        return [
            'from' => $from->subDays($days),
            'to' => $from->subSecond(),
        ];
    }

    private function ordersBetween($from, $to)
    {
        return Order::query()->whereBetween('placed_at', [$from, $to]);
    }

    private function paidOrdersFor($from, $to)
    {
        return $this->ordersBetween($from, $to)->where('payment_status', 'paid');
    }

    private function percentageChange(int|float $value, int|float $previous): float
    {
        if ((float) $previous === 0.0) {
            return (float) $value > 0 ? 100.0 : 0.0;
        }

        return round((($value - $previous) / $previous) * 100, 2);
    }

    private function outOfStockCount(): int
    {
        $simpleOutOfStock = Product::query()
            ->where('track_inventory', true)
            ->whereDoesntHave('variants')
            ->whereRaw('COALESCE(stock_quantity, 0) <= 0')
            ->count();

        $variantOutOfStock = ProductVariant::query()
            ->where('track_inventory', true)
            ->where('status', 'active')
            ->whereHas('product', fn ($query) => $query->whereNull('deleted_at'))
            ->whereRaw('COALESCE(stock_quantity, 0) <= 0')
            ->count();

        return $simpleOutOfStock + $variantOutOfStock;
    }

    private function money(int|string|null $cents): float
    {
        return round(((int) $cents) / 100, 2);
    }

    private function currency(): string
    {
        return CompanySetting::query()->with('currency')->first()?->currency?->currency ?: 'BDT';
    }

    private function label(string $value): string
    {
        return str($value)->replace(['_', '-'], ' ')->title()->toString();
    }
}
