<?php

namespace App\Services\Fraud;

use App\Models\FraudCheck;
use App\Models\FraudProviderResult;
use Illuminate\Support\Facades\DB;

class FraudAnalyticsService
{
    public function dashboard(int $days = 30): array
    {
        $from = now()->subDays($days - 1)->startOfDay();
        $checks = FraudCheck::query()->where('checked_at', '>=', $from);
        $total = (clone $checks)->count();

        return [
            'summary' => [
                'today_checks' => FraudCheck::query()->whereDate('checked_at', today())->count(),
                'weekly_checks' => FraudCheck::query()->where('checked_at', '>=', now()->subDays(6)->startOfDay())->count(),
                'high_risk_orders' => FraudCheck::query()->whereNotNull('order_id')->where('risk_level', 'high')->where('checked_at', '>=', $from)->count(),
                'critical_orders' => FraudCheck::query()->whereNotNull('order_id')->where('risk_level', 'critical')->where('checked_at', '>=', $from)->count(),
                'blocked_orders' => DB::table('orders')->where('fraud_cod_blocked', true)->count(),
                'held_orders' => DB::table('orders')->where('fraud_hold', true)->count(),
                'average_response_time_ms' => (int) round((float) ((clone $checks)->avg('response_time_ms') ?? 0)),
                'flag_rate' => $total > 0 ? round(((clone $checks)->where('is_flagged', true)->count() / $total) * 100, 2) : 0,
            ],
            'risk_distribution' => FraudCheck::query()
                ->where('checked_at', '>=', $from)
                ->select('risk_level', DB::raw('COUNT(*) as total'))
                ->groupBy('risk_level')
                ->pluck('total', 'risk_level'),
            'trend' => FraudCheck::query()
                ->where('checked_at', '>=', $from)
                ->selectRaw('DATE(checked_at) as date, COUNT(*) as total')
                ->selectRaw("SUM(CASE WHEN risk_level IN ('high', 'critical') THEN 1 ELSE 0 END) as risky")
                ->groupByRaw('DATE(checked_at)')
                ->orderBy('date')
                ->get(),
            'providers' => FraudProviderResult::query()
                ->where('created_at', '>=', $from)
                ->select('provider')
                ->selectRaw('COUNT(*) as total')
                ->selectRaw("SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful")
                ->selectRaw('AVG(response_time_ms) as average_response_time_ms')
                ->groupBy('provider')
                ->get()
                ->map(fn ($row): array => [
                    'provider' => $row->provider,
                    'total' => (int) $row->total,
                    'success_rate' => $row->total > 0 ? round(($row->successful / $row->total) * 100, 2) : 0,
                    'average_response_time_ms' => (int) round((float) $row->average_response_time_ms),
                ]),
            'top_reasons' => $this->topReasons($from),
        ];
    }

    private function topReasons($from): array
    {
        return FraudCheck::query()
            ->where('checked_at', '>=', $from)
            ->whereNotNull('risk_reasons')
            ->pluck('risk_reasons')
            ->flatten()
            ->filter()
            ->countBy()
            ->sortDesc()
            ->take(10)
            ->map(fn ($count, $reason): array => ['reason' => $reason, 'count' => $count])
            ->values()
            ->all();
    }
}
