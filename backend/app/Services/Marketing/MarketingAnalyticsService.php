<?php

namespace App\Services\Marketing;

use App\Models\MarketingTrackingEvent;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class MarketingAnalyticsService
{
    public function dashboard(int $days = 30): array
    {
        $from = now()->subDays($days - 1)->startOfDay();
        $base = MarketingTrackingEvent::query()->where('occurred_at', '>=', $from);
        $total = (clone $base)->count();
        $sent = (clone $base)->whereIn('status', ['sent', 'recorded'])->count();

        return [
            'summary' => [
                'events_sent_today' => MarketingTrackingEvent::query()->whereDate('occurred_at', today())->whereIn('status', ['sent', 'recorded'])->count(),
                'failed_events' => (clone $base)->where('status', 'failed')->count(),
                'purchase_events' => (clone $base)->where('event_name', 'purchase')->count(),
                'add_to_cart_events' => (clone $base)->where('event_name', 'add_to_cart')->count(),
                'checkout_events' => (clone $base)->where('event_name', 'begin_checkout')->count(),
                'success_rate' => $total > 0 ? round(($sent / $total) * 100, 2) : 0,
                'tracking_health' => $this->health($total, $sent),
            ],
            'top_events' => (clone $base)
                ->select('event_name', DB::raw('COUNT(*) as total'))
                ->groupBy('event_name')
                ->orderByDesc('total')
                ->limit(10)
                ->get(),
            'platforms' => (clone $base)
                ->select('platform')
                ->selectRaw('COUNT(*) as total')
                ->selectRaw("SUM(CASE WHEN status IN ('sent', 'recorded') THEN 1 ELSE 0 END) as successful")
                ->selectRaw("SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed")
                ->groupBy('platform')
                ->get(),
        ];
    }

    public function logs(array $filters): LengthAwarePaginator
    {
        $sort = in_array($filters['sort'] ?? null, ['platform', 'event_name', 'source', 'status', 'execution_time_ms', 'retry_count', 'occurred_at', 'sent_at'], true)
            ? $filters['sort']
            : 'occurred_at';
        $direction = ($filters['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';

        return MarketingTrackingEvent::query()
            ->with(['user:id,name,email', 'order:id,order_number', 'actor:id,name'])
            ->when($filters['search'] ?? null, function (Builder $query, string $value): void {
                $query->where(function (Builder $query) use ($value): void {
                    $query->where('event_id', 'like', "%{$value}%")
                        ->orWhere('event_name', 'like', "%{$value}%")
                        ->orWhereHas('order', fn (Builder $order) => $order->where('order_number', 'like', "%{$value}%"));
                });
            })
            ->when($filters['platform'] ?? null, fn (Builder $query, string $value) => $query->where('platform', $value))
            ->when($filters['event'] ?? null, fn (Builder $query, string $value) => $query->where('event_name', $value))
            ->when($filters['status'] ?? null, fn (Builder $query, string $value) => $query->where('status', $value))
            ->when($filters['date_from'] ?? null, fn (Builder $query, string $value) => $query->whereDate('occurred_at', '>=', $value))
            ->when($filters['date_to'] ?? null, fn (Builder $query, string $value) => $query->whereDate('occurred_at', '<=', $value))
            ->orderBy($sort, $direction)
            ->paginate(min(max((int) ($filters['per_page'] ?? 20), 1), 100));
    }

    private function health(int $total, int $sent): string
    {
        if ($total === 0) {
            return 'no_data';
        }
        $rate = ($sent / $total) * 100;

        return match (true) {
            $rate >= 98 => 'healthy',
            $rate >= 90 => 'degraded',
            default => 'unhealthy',
        };
    }
}
