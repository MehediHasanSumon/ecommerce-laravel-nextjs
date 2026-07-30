<?php

namespace App\Services\Search;

use App\Models\Order;
use App\Models\SearchClick;
use App\Models\SearchEvent;
use App\Models\SearchTerm;
use App\Models\User;
use App\Models\UserSearchHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SearchAnalyticsService
{
    public function __construct(private readonly SearchNormalizer $normalizer) {}

    public function recordSearch(Request $request, string $query, int $resultCount, array $filters = [], string $source = 'results'): ?SearchEvent
    {
        $normalized = $this->normalizer->normalize($query);
        if ($normalized === '') {
            return null;
        }

        return DB::transaction(function () use ($request, $query, $normalized, $resultCount, $filters, $source): SearchEvent {
            $now = now();
            $normalized = Str::limit($normalized, 191, '');
            DB::table('search_terms')->upsert([[
                'normalized_keyword' => $normalized,
                'display_keyword' => Str::limit(trim($query), 191, ''),
                'last_searched_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]], ['normalized_keyword'], ['display_keyword', 'last_searched_at', 'updated_at']);

            $term = SearchTerm::query()->where('normalized_keyword', $normalized)->lockForUpdate()->firstOrFail();
            $term->increment('search_count');
            if ($resultCount === 0) {
                $term->increment('zero_result_count');
            }

            $visitorHash = $this->visitorHash($request);
            $inserted = DB::table('search_term_visitors')->insertOrIgnore([
                'search_term_id' => $term->id,
                'visitor_hash' => $visitorHash,
                'first_searched_at' => $now,
                'last_searched_at' => $now,
            ]);
            if ($inserted === 1) {
                $term->increment('unique_user_count');
            } else {
                DB::table('search_term_visitors')
                    ->where('search_term_id', $term->id)
                    ->where('visitor_hash', $visitorHash)
                    ->update(['last_searched_at' => $now]);
            }

            if ($request->user()) {
                $this->recordHistory($request->user(), $normalized, trim($query));
            }

            Cache::forget('search.trending.v1');

            return SearchEvent::query()->create([
                'public_id' => (string) Str::uuid(),
                'search_term_id' => $term->id,
                'user_id' => $request->user()?->id,
                'visitor_hash' => $visitorHash,
                'session_hash' => $this->sessionHash($request),
                'result_count' => $resultCount,
                'filters' => $filters ?: null,
                'source' => $source,
                'searched_at' => $now,
            ]);
        }, 3);
    }

    public function recordClick(Request $request, array $data): SearchEvent
    {
        return DB::transaction(function () use ($request, $data): SearchEvent {
            $event = ! empty($data['event_id'])
                ? SearchEvent::query()->where('public_id', $data['event_id'])->first()
                : null;

            if (! $event) {
                $event = $this->recordSearch($request, (string) $data['query'], 1, source: 'suggestion');
            }

            abort_unless($event, 422, 'A valid search context is required.');

            SearchClick::query()->create([
                'search_event_id' => $event->id,
                'search_term_id' => $event->search_term_id,
                'user_id' => $request->user()?->id,
                'visitor_hash' => $this->visitorHash($request),
                'target_type' => $data['target_type'],
                'target_id' => $data['target_id'] ?? null,
                'target_slug' => $data['target_slug'] ?? null,
                'position' => $data['position'] ?? null,
                'clicked_at' => now(),
            ]);

            SearchTerm::query()->whereKey($event->search_term_id)->increment('click_count');
            Cache::forget('search.trending.v1');

            return $event;
        }, 3);
    }

    public function recordConversion(Order $order, ?string $eventPublicId): void
    {
        if (! $eventPublicId) {
            return;
        }

        $event = SearchEvent::query()->where('public_id', $eventPublicId)->first();
        if (! $event) {
            return;
        }

        DB::transaction(function () use ($order, $event): void {
            $inserted = DB::table('search_conversions')->insertOrIgnore([
                'search_event_id' => $event->id,
                'search_term_id' => $event->search_term_id,
                'order_id' => $order->id,
                'revenue_cents' => $order->total_cents,
                'converted_at' => now(),
            ]);

            if ($inserted === 1) {
                SearchTerm::query()->whereKey($event->search_term_id)->increment('conversion_count');
                Cache::forget('search.trending.v1');
            }
        }, 3);
    }

    public function trending(int $limit = 10): array
    {
        return Cache::remember('search.trending.v1', now()->addSeconds((int) config('search.trending_cache_seconds', 300)), fn (): array => SearchTerm::query()
            ->where('search_count', '>', 0)
            ->orderByDesc('last_searched_at')
            ->orderByDesc('search_count')
            ->limit(30)
            ->get(['id', 'display_keyword', 'search_count', 'click_count', 'conversion_count', 'last_searched_at'])
            ->sortByDesc(fn (SearchTerm $term): float => (float) $term->search_count
                + ((float) $term->click_count * 2)
                + ((float) $term->conversion_count * 10)
                + max(0, 7 - (float) optional($term->last_searched_at)->diffInDays(now())))
            ->take($limit)
            ->values()
            ->map(fn (SearchTerm $term): array => [
                'id' => (string) $term->id,
                'keyword' => $term->display_keyword,
                'search_count' => (int) $term->search_count,
            ])
            ->all());
    }

    public function recent(?User $user, ?int $limit = null): array
    {
        if (! $user) {
            return [];
        }

        $limit ??= (int) config('search.history_limit', 12);

        return UserSearchHistory::query()
            ->where('user_id', $user->id)
            ->latest('last_searched_at')
            ->limit($limit)
            ->get(['id', 'display_keyword', 'last_searched_at'])
            ->map(fn (UserSearchHistory $history): array => [
                'id' => (string) $history->id,
                'keyword' => $history->display_keyword,
                'searched_at' => optional($history->last_searched_at)->toISOString(),
            ])
            ->all();
    }

    public function clearHistory(User $user): void
    {
        UserSearchHistory::query()->where('user_id', $user->id)->delete();
    }

    public function removeHistory(User $user, int $historyId): void
    {
        UserSearchHistory::query()->where('user_id', $user->id)->whereKey($historyId)->delete();
    }

    private function recordHistory(User $user, string $normalized, string $display): void
    {
        $now = now();
        DB::table('user_search_histories')->upsert([[
            'user_id' => $user->id,
            'normalized_keyword' => Str::limit($normalized, 191, ''),
            'display_keyword' => Str::limit($display, 191, ''),
            'search_count' => 0,
            'last_searched_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]], ['user_id', 'normalized_keyword'], ['display_keyword', 'last_searched_at', 'updated_at']);
        DB::table('user_search_histories')
            ->where('user_id', $user->id)
            ->where('normalized_keyword', Str::limit($normalized, 191, ''))
            ->increment('search_count');

        $keepIds = UserSearchHistory::query()
            ->where('user_id', $user->id)
            ->latest('last_searched_at')
            ->limit((int) config('search.history_limit', 12))
            ->pluck('id');

        UserSearchHistory::query()
            ->where('user_id', $user->id)
            ->when($keepIds->isNotEmpty(), fn ($query) => $query->whereNotIn('id', $keepIds))
            ->delete();
    }

    private function visitorHash(Request $request): string
    {
        return hash('sha256', $request->user()
            ? 'user:'.$request->user()->getAuthIdentifier()
            : implode('|', ['guest', $request->ip(), Str::limit((string) $request->userAgent(), 500, '')]));
    }

    private function sessionHash(Request $request): string
    {
        $session = (string) $request->header('X-Search-Session');
        if ($session === '') {
            $session = $request->user()?->getAuthIdentifier().'|'.$request->ip().'|'.now()->format('Y-m-d-H');
        }

        return hash('sha256', $session);
    }
}
