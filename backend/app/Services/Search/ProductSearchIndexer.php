<?php

namespace App\Services\Search;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductSearchDocument;
use App\Models\ProductSearchToken;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductSearchIndexer
{
    private const DEFAULT_SOURCE_WEIGHTS = [
        'name' => 100,
        'sku' => 95,
        'brand' => 70,
        'category' => 65,
        'collection' => 60,
        'tag' => 55,
        'keyword' => 50,
        'attribute' => 40,
        'description' => 15,
    ];

    public function __construct(private readonly SearchNormalizer $normalizer) {}

    public function index(Product|int $product): void
    {
        $product = $product instanceof Product
            ? $product->newQuery()->withTrashed()->find($product->getKey())
            : Product::query()->withTrashed()->find($product);

        if (! $product || $product->trashed()) {
            if ($product) {
                ProductSearchDocument::query()->whereKey($product->id)->delete();
            }

            return;
        }

        $product->load([
            'brand:id,name',
            'category:id,parent_id,name',
            'category.parent:id,name',
            'tags:id,name',
            'collections:id,name,status,starts_at,ends_at',
            'attributeValues:id,attribute_id,value,display_value',
            'attributeValues.attribute:id,name',
            'seo:id,product_id,meta_title,meta_description,meta_keywords',
            'variants:id,product_id,sku,status',
        ]);

        $sources = $this->sources($product);
        $salesCount = (int) DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('order_items.product_id', $product->id)
            ->whereNull('orders.deleted_at')
            ->whereNotIn('orders.status', ['cancelled', 'returned', 'refunded'])
            ->sum('order_items.quantity');
        $popularity = max(0, ($salesCount * 10)
            + ((int) $product->review_count * 3)
            + ((int) round((float) $product->rating_average * 10))
            + ($product->is_featured ? 50 : 0));

        DB::transaction(function () use ($product, $sources, $salesCount, $popularity): void {
            ProductSearchDocument::query()->updateOrCreate(
                ['product_id' => $product->id],
                [
                    'normalized_name' => Str::limit($sources['name'], 191, ''),
                    'normalized_sku' => $sources['sku'] !== '' ? Str::limit($sources['sku'], 120, '') : null,
                    'normalized_brand' => $sources['brand'] !== '' ? Str::limit($sources['brand'], 191, '') : null,
                    'normalized_category' => $sources['category'] !== '' ? Str::limit($sources['category'], 191, '') : null,
                    'normalized_collections' => $sources['collection'] ?: null,
                    'normalized_tags' => $sources['tag'] ?: null,
                    'normalized_attributes' => $sources['attribute'] ?: null,
                    'normalized_keywords' => $sources['keyword'] ?: null,
                    'normalized_description' => $sources['description'] ?: null,
                    'searchable_text' => collect($sources)->filter()->implode(' '),
                    'sales_count' => $salesCount,
                    'popularity_score' => $popularity,
                    'indexed_at' => now(),
                ],
            );

            ProductSearchToken::query()->where('product_id', $product->id)->delete();
            $tokens = collect($sources)
                ->flatMap(function (string $value, string $source) use ($product): array {
                    return collect($this->normalizer->tokens($value))
                        ->map(fn (string $token): array => [
                            'product_id' => $product->id,
                            'token' => Str::limit($token, 100, ''),
                            'source' => $source,
                            'weight' => (int) config("search.source_weights.{$source}", self::DEFAULT_SOURCE_WEIGHTS[$source]),
                        ])
                        ->all();
                })
                ->unique(fn (array $row): string => $row['token'].'|'.$row['source'])
                ->values()
                ->all();

            if ($tokens !== []) {
                ProductSearchToken::query()->insert($tokens);
            }
        }, 3);

        $this->invalidateSuggestions();
    }

    public function delete(int $productId): void
    {
        ProductSearchDocument::query()->whereKey($productId)->delete();
        $this->invalidateSuggestions();
    }

    public function indexMany(iterable $productIds): void
    {
        collect($productIds)
            ->map(fn ($id): int => (int) $id)
            ->filter()
            ->unique()
            ->each(fn (int $productId) => $this->index($productId));
    }

    public function affectedProductIds(string $module, iterable $recordIds): Collection
    {
        $ids = collect($recordIds)->map(fn ($id): int => (int) $id)->filter()->unique()->values();
        if ($ids->isEmpty()) {
            return collect();
        }

        return match ($module) {
            'products' => $ids,
            'brands' => Product::query()->withTrashed()->whereIn('brand_id', $ids)->pluck('id'),
            'categories' => Product::query()->withTrashed()
                ->whereIn('category_id', Category::query()
                    ->withTrashed()
                    ->whereIn('id', $ids)
                    ->orWhereIn('parent_id', $ids)
                    ->pluck('id'))
                ->pluck('id'),
            'tags' => DB::table('product_tag')->whereIn('tag_id', $ids)->pluck('product_id'),
            'collections' => DB::table('product_collection_product')->whereIn('product_collection_id', $ids)->pluck('product_id'),
            'attributes' => DB::table('product_attribute_value')->whereIn('attribute_id', $ids)->pluck('product_id'),
            'attribute-values' => DB::table('product_attribute_value')->whereIn('attribute_value_id', $ids)->pluck('product_id'),
            default => collect(),
        };
    }

    public function rebuild(?callable $progress = null): int
    {
        $count = 0;

        Product::query()
            ->withTrashed()
            ->select('id')
            ->orderBy('id')
            ->chunkById(200, function (Collection $products) use (&$count, $progress): void {
                foreach ($products as $product) {
                    $this->index((int) $product->id);
                    $count++;
                    if ($progress) {
                        $progress($count);
                    }
                }
            });

        return $count;
    }

    public function rebuildStale(int $limit = 1000, ?callable $progress = null): int
    {
        $ids = Product::query()
            ->where(function ($query): void {
                $query->whereDoesntHave('searchDocument')
                    ->orWhereHas('searchDocument', fn ($document) => $document
                        ->whereColumn('product_search_documents.indexed_at', '<', 'products.updated_at'));
            })
            ->orderBy('products.id')
            ->limit(max(1, $limit))
            ->pluck('products.id');

        $count = 0;
        foreach ($ids as $id) {
            $this->index((int) $id);
            $count++;
            if ($progress) {
                $progress($count);
            }
        }

        return $count;
    }

    /**
     * @return array<string, string>
     */
    private function sources(Product $product): array
    {
        $category = collect([$product->category?->parent?->name, $product->category?->name])->filter()->implode(' ');
        $attributes = $product->attributeValues
            ->map(fn ($value): string => trim(($value->attribute?->name ?? '').' '.($value->display_value ?: $value->value)))
            ->implode(' ');
        $skus = collect([$product->sku])
            ->merge($product->variants->where('status', 'active')->pluck('sku'))
            ->filter()
            ->implode(' ');

        return [
            'name' => $this->normalizer->normalize($product->name),
            'sku' => $this->normalizer->normalize($skus),
            'brand' => $this->normalizer->normalize($product->brand?->name),
            'category' => $this->normalizer->normalize($category),
            'collection' => $this->normalizer->normalize($product->collections->pluck('name')->implode(' ')),
            'tag' => $this->normalizer->normalize($product->tags->pluck('name')->implode(' ')),
            'keyword' => $this->normalizer->normalize(collect([
                $product->seo?->meta_title,
                $product->seo?->meta_keywords,
            ])->filter()->implode(' ')),
            'attribute' => $this->normalizer->normalize($attributes),
            'description' => $this->normalizer->normalize(collect([
                $product->short_description,
                $product->description,
                $product->seo?->meta_description,
            ])->filter()->implode(' ')),
        ];
    }

    private function invalidateSuggestions(): void
    {
        Cache::add('search.suggestions.version', 1);
        Cache::increment('search.suggestions.version');
    }
}
