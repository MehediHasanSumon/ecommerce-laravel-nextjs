<?php

namespace App\Services\Admin;

use App\Models\SearchClick;
use App\Models\SearchConversion;
use App\Models\SearchEvent;
use App\Models\SearchTerm;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AdminSearchAnalyticsService
{
    /**
     * @return array{overview: array, terms: LengthAwarePaginator}
     */
    public function report(array $filters): array
    {
        $from = isset($filters['date_from'])
            ? CarbonImmutable::parse($filters['date_from'])->startOfDay()
            : CarbonImmutable::now()->subDays(29)->startOfDay();
        $to = isset($filters['date_to'])
            ? CarbonImmutable::parse($filters['date_to'])->endOfDay()
            : CarbonImmutable::now()->endOfDay();
        $limit = (int) ($filters['limit'] ?? 10);

        $overview = Cache::remember(
            'admin.search.analytics.'.sha1($from->toDateTimeString().'|'.$to->toDateTimeString().'|'.$limit),
            now()->addMinutes(2),
            fn (): array => $this->overview($from, $to, $limit),
        );

        $terms = SearchTerm::query()
            ->join('search_events', 'search_events.search_term_id', '=', 'search_terms.id')
            ->select([
                'search_terms.id',
                'search_terms.display_keyword',
            ])
            ->selectRaw('COUNT(search_events.id) as search_count')
            ->selectRaw('SUM(CASE WHEN search_events.result_count = 0 THEN 1 ELSE 0 END) as zero_result_count')
            ->selectRaw('COUNT(DISTINCT search_events.visitor_hash) as unique_user_count')
            ->selectSub(
                SearchClick::query()
                    ->selectRaw('COUNT(*)')
                    ->whereColumn('search_clicks.search_term_id', 'search_terms.id')
                    ->whereBetween('search_clicks.clicked_at', [$from, $to]),
                'click_count',
            )
            ->selectSub(
                SearchConversion::query()
                    ->selectRaw('COUNT(*)')
                    ->whereColumn('search_conversions.search_term_id', 'search_terms.id')
                    ->whereBetween('search_conversions.converted_at', [$from, $to]),
                'conversion_count',
            )
            ->selectRaw('MAX(search_events.searched_at) as last_searched_at')
            ->whereBetween('search_events.searched_at', [$from, $to])
            ->when($filters['search'] ?? null, fn ($query, string $search) => $query
                ->where('search_terms.display_keyword', 'like', '%'.addcslashes(trim($search), '\\%_').'%'))
            ->groupBy('search_terms.id', 'search_terms.display_keyword')
            ->when(($filters['type'] ?? null) === 'zero_results', fn ($query) => $query->having('zero_result_count', '>', 0))
            ->when(($filters['type'] ?? null) === 'converting', fn ($query) => $query->having('conversion_count', '>', 0))
            ->orderBy($filters['sort'] ?? 'search_count', $filters['direction'] ?? 'desc')
            ->paginate((int) ($filters['per_page'] ?? 20));

        return ['overview' => $overview, 'terms' => $terms];
    }

    private function overview(CarbonImmutable $from, CarbonImmutable $to, int $limit): array
    {
        $events = SearchEvent::query()->whereBetween('searched_at', [$from, $to]);
        $clicks = SearchClick::query()->whereBetween('clicked_at', [$from, $to]);
        $conversions = SearchConversion::query()->whereBetween('converted_at', [$from, $to]);
        $searches = (clone $events)->count();
        $conversionCount = (clone $conversions)->count();

        return [
            'filters' => [
                'date_from' => $from->toDateString(),
                'date_to' => $to->toDateString(),
            ],
            'summary' => [
                ['key' => 'searches', 'label' => 'Total Searches', 'value' => $searches, 'format' => 'number'],
                ['key' => 'daily_average', 'label' => 'Average Daily Searches', 'value' => round($searches / max(1, $from->diffInDays($to) + 1), 2), 'format' => 'number'],
                ['key' => 'zero_results', 'label' => 'Zero Result Searches', 'value' => (clone $events)->where('result_count', 0)->count(), 'format' => 'number'],
                ['key' => 'unique_visitors', 'label' => 'Unique Search Visitors', 'value' => (clone $events)->distinct()->count('visitor_hash'), 'format' => 'number'],
                ['key' => 'clicks', 'label' => 'Search Clicks', 'value' => (clone $clicks)->count(), 'format' => 'number'],
                ['key' => 'conversions', 'label' => 'Search Conversions', 'value' => $conversionCount, 'format' => 'number'],
                ['key' => 'conversion_rate', 'label' => 'Search Conversion Rate', 'value' => $searches > 0 ? round(($conversionCount / $searches) * 100, 2) : 0, 'format' => 'percent'],
            ],
            'series' => $this->dailySeries($from, $to),
            'most_searched' => $this->rankedSearchEvents($from, $to, $limit),
            'zero_results' => $this->rankedSearchEvents($from, $to, $limit, true),
            'top_converting' => $this->rankedConversions($from, $to, $limit),
            'trending' => $this->rankedSearchEvents($from, $to, $limit, recentFirst: true),
            'recent' => SearchEvent::query()
                ->with('term:id,display_keyword')
                ->whereBetween('searched_at', [$from, $to])
                ->latest('searched_at')
                ->limit($limit)
                ->get()
                ->map(fn (SearchEvent $event): array => [
                    'keyword' => $event->term?->display_keyword ?: '',
                    'results' => (int) $event->result_count,
                    'searched_at' => optional($event->searched_at)->toISOString(),
                ])
                ->all(),
            'top_categories' => $this->topTargets('category', $from, $to, $limit),
            'top_brands' => $this->topTargets('brand', $from, $to, $limit),
            'top_collections' => $this->topTargets('collection', $from, $to, $limit),
        ];
    }

    private function dailySeries(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $rows = SearchEvent::query()
            ->whereBetween('searched_at', [$from, $to])
            ->select(DB::raw('DATE(searched_at) as day'), DB::raw('COUNT(*) as total'))
            ->groupBy(DB::raw('DATE(searched_at)'))
            ->pluck('total', 'day');

        $series = [];
        for ($day = $from; $day->lessThanOrEqualTo($to); $day = $day->addDay()) {
            $date = $day->toDateString();
            $series[] = ['label' => $date, 'value' => (int) ($rows[$date] ?? 0)];
        }

        return $series;
    }

    private function rankedSearchEvents(
        CarbonImmutable $from,
        CarbonImmutable $to,
        int $limit,
        bool $zeroResults = false,
        bool $recentFirst = false,
    ): array {
        return SearchEvent::query()
            ->join('search_terms', 'search_terms.id', '=', 'search_events.search_term_id')
            ->whereBetween('search_events.searched_at', [$from, $to])
            ->when($zeroResults, fn ($query) => $query->where('search_events.result_count', 0))
            ->select(
                'search_terms.display_keyword',
                DB::raw('COUNT(*) as aggregate_count'),
                DB::raw('MAX(search_events.searched_at) as latest_search'),
            )
            ->groupBy('search_terms.id', 'search_terms.display_keyword')
            ->when(
                $recentFirst,
                fn ($query) => $query->orderByDesc('latest_search')->orderByDesc('aggregate_count'),
                fn ($query) => $query->orderByDesc('aggregate_count')->orderByDesc('latest_search'),
            )
            ->limit($limit)
            ->get()
            ->map(fn ($term): array => [
                'keyword' => $term->display_keyword,
                'search_count' => $zeroResults ? 0 : (int) $term->aggregate_count,
                'zero_result_count' => $zeroResults ? (int) $term->aggregate_count : 0,
                'click_count' => 0,
                'conversion_count' => 0,
                'last_searched_at' => $term->latest_search,
            ])
            ->all();
    }

    private function rankedConversions(CarbonImmutable $from, CarbonImmutable $to, int $limit): array
    {
        return SearchConversion::query()
            ->join('search_terms', 'search_terms.id', '=', 'search_conversions.search_term_id')
            ->whereBetween('search_conversions.converted_at', [$from, $to])
            ->select(
                'search_terms.display_keyword',
                DB::raw('COUNT(*) as aggregate_count'),
                DB::raw('MAX(search_conversions.converted_at) as latest_conversion'),
            )
            ->groupBy('search_terms.id', 'search_terms.display_keyword')
            ->orderByDesc('aggregate_count')
            ->limit($limit)
            ->get()
            ->map(fn ($term): array => [
                'keyword' => $term->display_keyword,
                'search_count' => 0,
                'zero_result_count' => 0,
                'click_count' => 0,
                'conversion_count' => (int) $term->aggregate_count,
                'last_searched_at' => $term->latest_conversion,
            ])
            ->all();
    }

    private function topTargets(string $type, CarbonImmutable $from, CarbonImmutable $to, int $limit): array
    {
        return SearchClick::query()
            ->where('target_type', $type)
            ->whereBetween('clicked_at', [$from, $to])
            ->whereNotNull('target_slug')
            ->select('target_slug', DB::raw('COUNT(*) as total'))
            ->groupBy('target_slug')
            ->orderByDesc('total')
            ->limit($limit)
            ->get()
            ->map(fn ($row): array => ['label' => $row->target_slug, 'value' => (int) $row->total])
            ->all();
    }
}
