<?php

namespace App\Services\Admin;

use App\Models\Blog;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Product;
use App\Models\ProductCollection;
use App\Models\ProductReview;
use App\Models\ProductVariant;
use App\Models\Settings\CompanySetting;
use App\Models\Settings\PaymentGatewaySetting;
use App\Models\User;
use App\Models\WishlistItem;
use App\Services\Admin\Settings\BrandSettingsService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

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
            $orders = $this->ordersBetween($from, $to);
            $paidOrders = (clone $orders)->where('payment_status', 'paid');
            $orderIds = (clone $orders)->pluck('id');
            $security = app(IpBlockManagementService::class)->analytics();
            $cards = $this->cards($from, $to, $previous);
            $cards[] = $this->card('ip_blocks', 'Currently Blocked', $security['currently_blocked'], 0, 'number', [
                ['label' => 'Blocked Today', 'value' => $security['blocked_today'], 'format' => 'number'],
                ['label' => 'This Week', 'value' => $security['blocked_this_week'], 'format' => 'number'],
                ['label' => 'This Month', 'value' => $security['blocked_this_month'], 'format' => 'number'],
            ]);
            $cards[] = $this->card('automatic_ip_blocks', 'Automatic Blocks', $security['automatic_blocks'], 0, 'number', [
                ['label' => 'Manual Blocks', 'value' => $security['manual_blocks'], 'format' => 'number'],
            ]);

            return [
                'filters' => [
                    'preset' => $preset,
                    'date_from' => $from->toDateString(),
                    'date_to' => $to->toDateString(),
                ],
                'currency' => $this->currency(),
                'brand_enabled' => app(BrandSettingsService::class)->enabled(),
                'cards' => $cards,
                'security' => $security,
                'sales' => [
                    'series' => $this->dailyOrderSeries($from, $to),
                    'summary' => [
                        'revenue' => $this->money((clone $paidOrders)->sum('total_cents')),
                        'orders' => (clone $orders)->count(),
                        'average_order_value' => $this->money($this->averageOrderValue($paidOrders)),
                    ],
                ],
                'charts' => [
                    'revenue' => $this->dailyRevenueSeries($from, $to),
                    'orders' => $this->dailyOrderSeries($from, $to),
                    'payment_methods' => $this->paymentMethods($from, $to),
                    'collections' => $this->revenueByCollection($orderIds),
                ],
                'tables' => [
                    'best_selling_products' => $this->bestSellingProducts($orderIds),
                    'top_categories' => $this->topCategories($orderIds),
                    'top_brands' => app(BrandSettingsService::class)->enabled() ? $this->topBrands($orderIds) : [],
                    'recent_orders' => $this->recentOrders(),
                    'low_stock_products' => $this->lowStockProducts(false),
                    'out_of_stock_products' => $this->lowStockProducts(true),
                    'latest_customers' => $this->latestCustomers(),
                    'recent_reviews' => $this->recentReviews(),
                    'activity' => $this->activityTimeline(),
                ],
                'notifications' => $this->notifications(),
                'reports' => $this->reports($paidOrders),
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

        $cards = [
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
            $this->card('blogs', 'Total Blogs', Blog::query()->count(), 0, 'number'),
            $this->card('wishlist', 'Wishlist Count', WishlistItem::query()->count(), 0, 'number'),
            $this->card('reviews', 'Reviews', ProductReview::query()->count(), 0, 'number', [
                ['label' => 'Pending', 'value' => ProductReview::query()->where('status', 'pending')->count(), 'format' => 'number'],
                ['label' => 'Average Rating', 'value' => round((float) ProductReview::query()->avg('rating'), 2), 'format' => 'number'],
            ]),
        ];

        if (app(BrandSettingsService::class)->enabled()) {
            $cards[] = $this->card('brands', 'Total Brands', Brand::query()->count(), 0, 'number');
        }

        return $cards;
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

    private function dailyRevenueSeries(CarbonImmutable $from, CarbonImmutable $to): array
    {
        return $this->dailySeries($from, $to, 'SUM(total_cents)', fn ($row) => $this->money($row->amount));
    }

    private function dailyOrderSeries(CarbonImmutable $from, CarbonImmutable $to): array
    {
        return $this->dailySeries($from, $to, 'COUNT(*)', fn ($row) => (int) $row->amount, includeCancelled: true);
    }

    private function dailySeries(CarbonImmutable $from, CarbonImmutable $to, string $aggregate, callable $value, bool $includeCancelled = false): array
    {
        $rows = Order::query()
            ->whereBetween('placed_at', [$from, $to])
            ->when(! $includeCancelled, fn ($query) => $query->where('payment_status', 'paid'))
            ->select(DB::raw('DATE(placed_at) as day'), DB::raw("{$aggregate} as amount"))
            ->groupBy(DB::raw('DATE(placed_at)'))
            ->pluck('amount', 'day');

        $series = [];
        for ($day = $from; $day->lessThanOrEqualTo($to); $day = $day->addDay()) {
            $date = $day->toDateString();
            $series[] = ['label' => $date, 'value' => $value((object) ['amount' => $rows[$date] ?? 0])];
        }

        return $series;
    }

    private function paymentMethods(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $enabled = PaymentGatewaySetting::query()->where('enabled', true)->pluck('gateway')->all();

        return PaymentTransaction::query()
            ->where('status', 'paid')
            ->whereIn('gateway', $enabled)
            ->whereBetween('created_at', [$from, $to])
            ->select('gateway', DB::raw('SUM(amount_cents) as amount'), DB::raw('COUNT(*) as count'))
            ->groupBy('gateway')
            ->orderByDesc('amount')
            ->get()
            ->map(fn ($row) => ['label' => $this->label((string) $row->gateway), 'value' => $this->money($row->amount), 'count' => (int) $row->count])
            ->all();
    }

    private function revenueByCollection($orderIds): array
    {
        if ($orderIds->isEmpty()) {
            return [];
        }

        return DB::table('order_items')
            ->join('product_collection_product', 'order_items.product_id', '=', 'product_collection_product.product_id')
            ->join('collections', 'collections.id', '=', 'product_collection_product.product_collection_id')
            ->whereIn('order_items.order_id', $orderIds)
            ->select('collections.name', DB::raw('SUM(order_items.line_subtotal_cents - order_items.line_discount_cents) as revenue'), DB::raw('SUM(order_items.quantity) as quantity'))
            ->groupBy('collections.id', 'collections.name')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get()
            ->map(fn ($row) => ['label' => $row->name, 'value' => $this->money($row->revenue), 'quantity' => (int) $row->quantity])
            ->all();
    }

    private function bestSellingProducts($orderIds): array
    {
        return $this->itemsBase($orderIds)
            ->leftJoin('products', 'products.id', '=', 'order_items.product_id')
            ->leftJoin('product_images', fn ($join) => $join->on('product_images.product_id', '=', 'products.id')->where('product_images.is_primary', true))
            ->select('order_items.product_id', 'order_items.product_name', 'order_items.sku', 'product_images.url as image', DB::raw('SUM(order_items.quantity) as sold_quantity'), DB::raw('SUM(order_items.line_subtotal_cents - order_items.line_discount_cents) as revenue'))
            ->groupBy('order_items.product_id', 'order_items.product_name', 'order_items.sku', 'product_images.url')
            ->orderByDesc('sold_quantity')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'id' => $row->product_id,
                'name' => $row->product_name,
                'sku' => $row->sku,
                'image' => $this->assetUrl($row->image),
                'sold_quantity' => (int) $row->sold_quantity,
                'revenue' => $this->money($row->revenue),
            ])
            ->all();
    }

    private function topCategories($orderIds): array
    {
        return $this->itemsBase($orderIds)
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->select('categories.name', DB::raw('SUM(order_items.quantity) as sold_quantity'), DB::raw('SUM(order_items.line_subtotal_cents - order_items.line_discount_cents) as revenue'))
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get()
            ->map(fn ($row) => ['name' => $row->name, 'sold_quantity' => (int) $row->sold_quantity, 'revenue' => $this->money($row->revenue)])
            ->all();
    }

    private function topBrands($orderIds): array
    {
        return $this->itemsBase($orderIds)
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->join('brands', 'brands.id', '=', 'products.brand_id')
            ->select('brands.name', DB::raw('SUM(order_items.quantity) as sales'), DB::raw('SUM(order_items.line_subtotal_cents - order_items.line_discount_cents) as revenue'))
            ->groupBy('brands.id', 'brands.name')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get()
            ->map(fn ($row) => ['name' => $row->name, 'sales' => (int) $row->sales, 'revenue' => $this->money($row->revenue)])
            ->all();
    }

    private function itemsBase($orderIds)
    {
        return DB::table('order_items')
            ->when($orderIds->isNotEmpty(), fn ($query) => $query->whereIn('order_items.order_id', $orderIds))
            ->when($orderIds->isEmpty(), fn ($query) => $query->whereRaw('1 = 0'));
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

    private function lowStockProducts(bool $outOnly): array
    {
        $simpleProducts = Product::query()
            ->where('track_inventory', true)
            ->whereDoesntHave('variants')
            ->when($outOnly, fn ($query) => $query->whereRaw('COALESCE(stock_quantity, 0) <= 0'), fn ($query) => $query->whereRaw('COALESCE(stock_quantity, 0) <= COALESCE(low_stock_threshold, 0)')->whereRaw('COALESCE(stock_quantity, 0) > 0'))
            ->orderByRaw('COALESCE(stock_quantity, 0) asc')
            ->limit(8)
            ->get(['id', 'name', 'sku', 'stock_quantity', 'low_stock_threshold', 'status'])
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'current_stock' => (int) ($product->stock_quantity ?? 0),
                'minimum_stock' => (int) ($product->low_stock_threshold ?? 0),
                'status' => $product->status,
            ]);

        $variantProducts = ProductVariant::query()
            ->where('track_inventory', true)
            ->where('status', 'active')
            ->whereHas('product', fn ($query) => $query->whereNull('deleted_at'))
            ->with(['product:id,name,status'])
            ->when($outOnly, fn ($query) => $query->whereRaw('COALESCE(stock_quantity, 0) <= 0'), fn ($query) => $query->whereRaw('COALESCE(stock_quantity, 0) <= 5')->whereRaw('COALESCE(stock_quantity, 0) > 0'))
            ->orderByRaw('COALESCE(stock_quantity, 0) asc')
            ->limit(8)
            ->get(['id', 'product_id', 'sku', 'stock_quantity', 'status'])
            ->map(fn (ProductVariant $variant) => [
                'id' => $variant->product_id,
                'name' => ($variant->product?->name ?? 'Product').' ('.$variant->sku.')',
                'sku' => $variant->sku,
                'current_stock' => (int) ($variant->stock_quantity ?? 0),
                'minimum_stock' => 5,
                'status' => $variant->product?->status ?? 'active',
            ]);

        return $simpleProducts->concat($variantProducts)
            ->sortBy('current_stock')
            ->take(8)
            ->values()
            ->all();
    }

    private function latestCustomers(): array
    {
        return User::query()
            ->latest()
            ->limit(8)
            ->get(['id', 'name', 'email', 'avatar', 'created_at'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $this->assetUrl($user->avatar) ?: 'https://ui-avatars.com/api/?name='.urlencode($user->name).'&background=111827&color=fff',
                'registered_at' => optional($user->created_at)->toISOString(),
            ])
            ->all();
    }

    private function recentReviews(): array
    {
        return ProductReview::query()
            ->with(['product:id,name', 'user:id,name,email'])
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn (ProductReview $review) => [
                'id' => $review->id,
                'product' => $review->product?->name ?: 'Deleted product',
                'customer' => $review->user?->name ?: 'Guest',
                'rating' => (int) $review->rating,
                'review' => $review->comment,
                'status' => $review->status,
                'date' => optional($review->created_at)->toISOString(),
            ])
            ->all();
    }

    private function activityTimeline(): array
    {
        $orders = Order::query()->latest()->limit(6)->get(['order_number', 'status', 'payment_status', 'created_at'])
            ->map(fn (Order $order) => ['type' => 'order', 'title' => 'New Order', 'description' => "{$order->order_number} is {$order->status}", 'date' => optional($order->created_at)->toISOString()]);
        $products = Product::query()->latest()->limit(4)->get(['name', 'status', 'created_at'])
            ->map(fn (Product $product) => ['type' => 'product', 'title' => 'Product Created', 'description' => "{$product->name} is {$product->status}", 'date' => optional($product->created_at)->toISOString()]);
        $reviews = ProductReview::query()->latest()->limit(4)->get(['rating', 'status', 'created_at'])
            ->map(fn (ProductReview $review) => ['type' => 'review', 'title' => 'Review Submitted', 'description' => "{$review->rating} star review is {$review->status}", 'date' => optional($review->created_at)->toISOString()]);

        return $orders->concat($products)->concat($reviews)
            ->sortByDesc('date')
            ->take(12)
            ->values()
            ->all();
    }

    private function notifications(): array
    {
        $lowStockSimple = Product::query()
            ->where('track_inventory', true)
            ->whereDoesntHave('variants')
            ->whereRaw('COALESCE(stock_quantity, 0) <= COALESCE(low_stock_threshold, 0)')
            ->count();

        $lowStockVariants = ProductVariant::query()
            ->where('track_inventory', true)
            ->where('status', 'active')
            ->whereHas('product', fn ($query) => $query->whereNull('deleted_at'))
            ->whereRaw('COALESCE(stock_quantity, 0) <= 5')
            ->count();

        return [
            ['key' => 'pending_orders', 'label' => 'Pending Orders', 'value' => Order::query()->where('status', 'pending')->count()],
            ['key' => 'pending_reviews', 'label' => 'Pending Reviews', 'value' => ProductReview::query()->where('status', 'pending')->count()],
            ['key' => 'low_stock', 'label' => 'Low Stock Alerts', 'value' => $lowStockSimple + $lowStockVariants],
            ['key' => 'failed_payments', 'label' => 'Failed Payments', 'value' => PaymentTransaction::query()->where('status', 'failed')->count()],
            ['key' => 'expired_collections', 'label' => 'Expired Collections', 'value' => ProductCollection::query()->whereNotNull('ends_at')->where('ends_at', '<', now())->count()],
        ];
    }

    private function reports($paidOrders): array
    {
        $discount = (clone $paidOrders)->sum('item_discount_cents') + (clone $paidOrders)->sum('coupon_discount_cents');

        return [
            ['label' => 'Gross Revenue', 'value' => $this->money((clone $paidOrders)->sum('subtotal_cents')), 'format' => 'money'],
            ['label' => 'Net Revenue', 'value' => $this->money((clone $paidOrders)->sum('total_cents')), 'format' => 'money'],
            ['label' => 'Discounts', 'value' => $this->money($discount), 'format' => 'money'],
            ['label' => 'Coupons Used', 'value' => (clone $paidOrders)->whereNotNull('coupon_code')->count(), 'format' => 'number'],
            ['label' => 'Taxes Collected', 'value' => $this->money((clone $paidOrders)->sum('tax_cents')), 'format' => 'money'],
            ['label' => 'Shipping Revenue', 'value' => $this->money((clone $paidOrders)->sum('shipping_cents')), 'format' => 'money'],
            ['label' => 'Refund Amount', 'value' => $this->money((clone $paidOrders)->whereIn('payment_status', ['refunded', 'partially_refunded'])->sum('total_cents')), 'format' => 'money'],
        ];
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

    private function averageOrderValue($query): int
    {
        $count = (clone $query)->count();
        if ($count === 0) {
            return 0;
        }

        return (int) round((clone $query)->sum('total_cents') / $count);
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

    private function assetUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        if (str_starts_with($path, '/storage/') || str_starts_with($path, 'storage/')) {
            return url($path);
        }

        return url(Storage::disk('public')->url($path));
    }
}
