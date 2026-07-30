<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\AdminSearchAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\Rule;

class SearchAnalyticsController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_search_analytics', only: ['index']),
        ];
    }

    public function __construct(private readonly AdminSearchAnalyticsService $analytics) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'search' => ['nullable', 'string', 'max:120'],
            'type' => ['nullable', Rule::in(['all', 'zero_results', 'converting'])],
            'sort' => ['nullable', Rule::in(['display_keyword', 'search_count', 'zero_result_count', 'click_count', 'conversion_count', 'last_searched_at'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'limit' => ['nullable', 'integer', 'min:5', 'max:25'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:100'],
        ]);

        $report = $this->analytics->report($filters);
        $terms = $report['terms'];

        return ApiResponse::success([
            'analytics' => $report['overview'],
            'items' => $terms->getCollection()->map(fn ($term): array => [
                'id' => (string) $term->id,
                'keyword' => $term->display_keyword,
                'search_count' => (int) $term->search_count,
                'zero_result_count' => (int) $term->zero_result_count,
                'unique_user_count' => (int) $term->unique_user_count,
                'click_count' => (int) $term->click_count,
                'conversion_count' => (int) $term->conversion_count,
                'last_searched_at' => optional($term->last_searched_at)->toISOString(),
            ])->all(),
        ], 'Search analytics loaded successfully.', meta: [
            'pagination' => [
                'current_page' => $terms->currentPage(),
                'last_page' => $terms->lastPage(),
                'per_page' => $terms->perPage(),
                'total' => $terms->total(),
                'from' => $terms->firstItem(),
                'to' => $terms->lastItem(),
            ],
        ]);
    }
}
