<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\Search\SearchAnalyticsService;
use App\Services\Search\SearchSuggestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SearchController extends Controller
{
    public function __construct(
        private readonly SearchSuggestionService $suggestions,
        private readonly SearchAnalyticsService $analytics,
    ) {}

    public function suggestions(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:8'],
        ]);

        return ApiResponse::success([
            'suggestions' => $this->suggestions->suggestions(
                $request,
                trim((string) ($validated['q'] ?? '')),
                (int) ($validated['limit'] ?? 5),
            ),
        ], 'Search suggestions loaded successfully.');
    }

    public function trending(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'limit' => ['nullable', 'integer', 'min:1', 'max:20'],
        ]);

        return ApiResponse::success([
            'items' => $this->analytics->trending((int) ($validated['limit'] ?? 10)),
        ]);
    }

    public function recent(Request $request): JsonResponse
    {
        return ApiResponse::success([
            'items' => $this->analytics->recent($request->user()),
        ]);
    }

    public function clearRecent(Request $request): JsonResponse
    {
        abort_unless($request->user(), 401);
        $this->analytics->clearHistory($request->user());

        return ApiResponse::success(message: 'Search history cleared successfully.');
    }

    public function removeRecent(Request $request, int $history): JsonResponse
    {
        abort_unless($request->user(), 401);
        $this->analytics->removeHistory($request->user(), $history);

        return ApiResponse::success(message: 'Search history item removed successfully.');
    }

    public function click(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'event_id' => ['nullable', 'uuid'],
            'query' => ['required_without:event_id', 'nullable', 'string', 'max:120'],
            'target_type' => ['required', Rule::in(['product', 'category', 'brand', 'collection', 'tag', 'keyword'])],
            'target_id' => ['nullable', 'integer', 'min:1'],
            'target_slug' => ['nullable', 'string', 'max:255'],
            'position' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        $event = $this->analytics->recordClick($request, $validated);

        return ApiResponse::success([
            'event_id' => $event->public_id,
        ], 'Search click recorded successfully.', 201);
    }
}
