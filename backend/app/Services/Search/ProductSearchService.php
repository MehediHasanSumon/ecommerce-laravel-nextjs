<?php

namespace App\Services\Search;

use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class ProductSearchService
{
    public function __construct(
        private readonly SearchNormalizer $normalizer,
        private readonly ProductSearchIndexer $indexer,
    ) {}

    public function apply(Builder $query, string $value): string
    {
        $normalized = $this->normalizer->normalize($value);
        if ($normalized === '') {
            return '';
        }

        $this->warmSmallCatalog();

        $query->leftJoin('product_search_documents as search_documents', 'search_documents.product_id', '=', 'products.id');
        $candidateGroups = $this->candidateGroups($normalized);
        $allCandidates = collect($candidateGroups)->flatten()->unique()->values()->all();

        if ($allCandidates !== []) {
            $scores = DB::table('product_search_tokens')
                ->select('product_id')
                ->selectRaw('SUM(weight) as token_score')
                ->whereIn('token', $allCandidates)
                ->groupBy('product_id');

            $query->leftJoinSub($scores, 'search_token_scores', fn ($join) => $join
                ->on('search_token_scores.product_id', '=', 'products.id'));
        }

        $like = '%'.$this->escapeLike($normalized).'%';
        $prefix = $this->escapeLike($normalized).'%';

        $query->where(function (Builder $match) use ($candidateGroups, $like): void {
            $match->where(function (Builder $indexed) use ($candidateGroups, $like): void {
                $indexed->whereNotNull('search_documents.product_id')
                    ->where(function (Builder $criteria) use ($candidateGroups, $like): void {
                        if ($candidateGroups !== []) {
                            foreach ($candidateGroups as $index => $candidates) {
                                $alias = 'matching_search_token_'.$index;
                                $criteria->whereExists(function ($tokenQuery) use ($alias, $candidates): void {
                                    $tokenQuery
                                        ->selectRaw('1')
                                        ->from("product_search_tokens as {$alias}")
                                        ->whereColumn("{$alias}.product_id", 'products.id')
                                        ->whereIn("{$alias}.token", $candidates);
                                });
                            }

                            return;
                        }

                        $criteria
                            ->where('search_documents.normalized_name', 'like', $like)
                            ->orWhere('search_documents.normalized_sku', 'like', $like)
                            ->orWhere('search_documents.searchable_text', 'like', $like);
                    });
            })->orWhere(function (Builder $legacy) use ($like): void {
                $legacy->whereNull('search_documents.product_id')
                    ->where(function (Builder $fallback) use ($like): void {
                        $fallback
                            ->whereRaw('LOWER(products.name) LIKE ?', [$like])
                            ->orWhereRaw('LOWER(products.sku) LIKE ?', [$like])
                            ->orWhereRaw('LOWER(products.short_description) LIKE ?', [$like])
                            ->orWhereRaw('LOWER(products.description) LIKE ?', [$like])
                            ->orWhereHas('variants', fn (Builder $variants) => $variants->whereRaw('LOWER(sku) LIKE ?', [$like]))
                            ->orWhereHas('brand', fn (Builder $brand) => $brand->whereRaw('LOWER(name) LIKE ?', [$like]))
                            ->orWhereHas('category', fn (Builder $category) => $category->whereRaw('LOWER(name) LIKE ?', [$like]))
                            ->orWhereHas('tags', fn (Builder $tags) => $tags->whereRaw('LOWER(name) LIKE ?', [$like]))
                            ->orWhereHas('collections', fn (Builder $collections) => $collections->whereRaw('LOWER(name) LIKE ?', [$like]))
                            ->orWhereHas('attributeValues', fn (Builder $attributes) => $attributes
                                ->whereRaw('LOWER(value) LIKE ?', [$like])
                                ->orWhereRaw('LOWER(display_value) LIKE ?', [$like]));
                    });
            });
        });

        $tokenScore = $allCandidates !== [] ? 'COALESCE(search_token_scores.token_score, 0)' : '0';
        $weights = collect(config('search.ranking', []))
            ->map(fn ($weight): int => (int) $weight);
        $fulltextBindings = [];
        $fulltextScore = match (DB::getDriverName()) {
            'mysql' => tap(
                'COALESCE(MATCH(search_documents.normalized_name, search_documents.searchable_text) AGAINST (? IN NATURAL LANGUAGE MODE), 0) * '.max(0, $weights->get('fulltext_multiplier', 20)),
                function () use (&$fulltextBindings, $normalized): void {
                    $fulltextBindings[] = $normalized;
                },
            ),
            'pgsql' => tap(
                "COALESCE(ts_rank(to_tsvector('simple', search_documents.searchable_text), plainto_tsquery('simple', ?)), 0) * ".max(0, $weights->get('fulltext_multiplier', 20)),
                function () use (&$fulltextBindings, $normalized): void {
                    $fulltextBindings[] = $normalized;
                },
            ),
            default => '0',
        };
        $query->addSelect('products.*')->selectRaw(
            "(CASE
                WHEN search_documents.normalized_name = ? THEN {$weights->get('exact_name', 1200)}
                WHEN search_documents.normalized_name LIKE ? THEN {$weights->get('name_prefix', 900)}
                WHEN search_documents.normalized_sku = ? THEN {$weights->get('exact_sku', 850)}
                WHEN search_documents.normalized_sku LIKE ? THEN {$weights->get('sku_prefix', 700)}
                WHEN search_documents.normalized_name LIKE ? THEN {$weights->get('name_contains', 600)}
                WHEN search_documents.normalized_brand LIKE ? THEN {$weights->get('brand', 400)}
                WHEN search_documents.normalized_category LIKE ? THEN {$weights->get('category', 360)}
                WHEN search_documents.normalized_collections LIKE ? THEN {$weights->get('collection', 320)}
                WHEN search_documents.normalized_tags LIKE ? THEN {$weights->get('tag', 280)}
                WHEN search_documents.normalized_keywords LIKE ? THEN {$weights->get('keyword', 240)}
                WHEN search_documents.normalized_attributes LIKE ? THEN {$weights->get('attribute', 180)}
                WHEN search_documents.normalized_description LIKE ? THEN {$weights->get('description', 80)}
                ELSE 0
            END + {$tokenScore}
            + CASE WHEN search_documents.popularity_score > {$weights->get('popularity_cap', 500)} THEN {$weights->get('popularity_cap', 500)} ELSE COALESCE(search_documents.popularity_score, 0) END
            + {$fulltextScore}
            + COALESCE(products.rating_average, 0) * 10) as search_relevance",
            array_merge([
                $normalized,
                $prefix,
                $normalized,
                $prefix,
                $like,
                $like,
                $like,
                $like,
                $like,
                $like,
                $like,
                $like,
            ], $fulltextBindings),
        );

        return $normalized;
    }

    /**
     * @return list<list<string>>
     */
    private function candidateGroups(string $normalized): array
    {
        return collect($this->normalizer->tokens($normalized, 8))
            ->map(function (string $token): array {
                $forms = $this->normalizer->wordForms($token);
                $prefixLength = min(3, max(2, mb_strlen($token) - 1));
                $prefix = mb_substr($token, 0, $prefixLength);
                $minimumLength = max(2, mb_strlen($token) - 2);
                $maximumLength = mb_strlen($token) + 2;
                $threshold = mb_strlen($token) <= 4
                    ? (int) config('search.fuzzy.short_word_distance', 1)
                    : (int) config('search.fuzzy.long_word_distance', 2);

                $nearby = DB::table('product_search_tokens')
                    ->where('token', 'like', $this->escapeLike($prefix).'%')
                    ->whereRaw('LENGTH(token) BETWEEN ? AND ?', [$minimumLength, $maximumLength])
                    ->distinct()
                    ->limit((int) config('search.fuzzy.candidate_limit', 80))
                    ->pluck('token')
                    ->filter(fn (string $candidate): bool => levenshtein($token, $candidate) <= $threshold)
                    ->take((int) config('search.fuzzy.result_limit', 12));

                $prefixMatches = DB::table('product_search_tokens')
                    ->where('token', 'like', $this->escapeLike($token).'%')
                    ->distinct()
                    ->limit(12)
                    ->pluck('token');

                $containsMatches = mb_strlen($token) >= 3
                    ? DB::table('product_search_tokens')
                        ->where('token', 'like', '%'.$this->escapeLike($token).'%')
                        ->distinct()
                        ->limit(12)
                        ->pluck('token')
                    : collect();

                return collect($forms)
                    ->merge($prefixMatches)
                    ->merge($containsMatches)
                    ->merge($nearby)
                    ->unique()
                    ->take(20)
                    ->values()
                    ->all();
            })
            ->filter()
            ->values()
            ->all();
    }

    private function warmSmallCatalog(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }

        if (DB::table('product_search_documents')->exists()) {
            return;
        }

        $ids = Product::query()->where('status', 'active')->limit(500)->pluck('id');
        foreach ($ids as $id) {
            $this->indexer->index((int) $id);
        }
    }

    private function escapeLike(string $value): string
    {
        return addcslashes($value, '\\%_');
    }
}
