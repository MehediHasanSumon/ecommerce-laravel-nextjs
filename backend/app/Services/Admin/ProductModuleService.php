<?php

namespace App\Services\Admin;

use App\Models\Brand;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Currency;
use App\Models\Discount;
use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\ProductAttributeValue;
use App\Models\ProductCollection;
use App\Models\ProductComment;
use App\Models\ProductReview;
use App\Models\ProductVariant;
use App\Models\Settings\CompanySetting;
use App\Models\Tag;
use App\Models\User;
use App\Models\WishlistItem;
use App\Services\Admin\Concerns\BuildsManagementQueries;
use App\Services\Admin\Settings\BrandSettingsService;
use App\Services\Admin\Settings\SeoSettingsService;
use App\Services\Concerns\StoresPublicUploads;
use App\Services\ProductReviewMetricsService;
use App\Services\Search\ProductSearchIndexer;
use App\Services\Seo\SeoMetadataService;
use App\Support\HomePageCache;
use App\Support\Identifiers\SkuGenerator;
use App\Support\Identifiers\SlugGenerator;
use App\Support\Media\PublicStorageImage;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProductModuleService
{
    use BuildsManagementQueries;
    use StoresPublicUploads;

    public function __construct(
        private readonly ProductVariantEngine $variantEngine,
        private readonly BrandSettingsService $brandSettings,
        private readonly ProductReviewMetricsService $reviewMetrics,
        private readonly ProductSearchIndexer $searchIndexer,
    ) {}

    public function paginate(string $module, array $filters): LengthAwarePaginator
    {
        $this->guardBrandModule($module);

        $query = $this->modelClass($module)::query();
        $this->applyRelationships($query, $module);
        $this->applySearch($query, $module, $filters['search'] ?? null);
        $this->applyModuleFilters($query, $module, $filters);
        $this->applyDateFilters($query, $filters);
        $sortColumn = $this->sortColumn($module, $filters['sort'] ?? 'created_at');
        $direction = $filters['direction'] ?? 'desc';

        $this->applySort($query, $module, $sortColumn, $direction);

        return $query->paginate($filters['per_page'] ?? 10);
    }

    public function create(string $module, array $data): Model
    {
        $this->guardBrandModule($module);

        return DB::transaction(fn () => $this->persist($module, new ($this->modelClass($module)), $data));
    }

    public function update(string $module, int $id, array $data): Model
    {
        $this->guardBrandModule($module);

        return DB::transaction(function () use ($module, $id, $data): Model {
            $model = $this->modelClass($module)::query()->findOrFail($id);

            return $this->persist($module, $model, $data);
        });
    }

    public function find(string $module, int $id): Model
    {
        $this->guardBrandModule($module);

        $query = $this->modelClass($module)::query();
        $this->applyRelationships($query, $module, detailed: true);

        return $query->findOrFail($id);
    }

    public function delete(string $module, int $id): void
    {
        $this->guardBrandModule($module);

        $affectedProductIds = $this->searchIndexer->affectedProductIds($module, [$id]);

        DB::transaction(function () use ($module, $id): void {
            $record = $this->modelClass($module)::query()->findOrFail($id);

            if ($module === 'products') {
                ProductVariant::query()->where('product_id', $id)->delete();
                CartItem::query()->where('product_id', $id)->delete();
                WishlistItem::query()->where('product_id', $id)->delete();
            }

            $record->delete();
        }, 3);

        if (count($affectedProductIds) > 5) {
            \App\Jobs\ReindexProductSearch::dispatch($affectedProductIds);
        } else {
            $this->searchIndexer->indexMany($affectedProductIds);
        }

        if ($module === 'categories') {
            $this->clearCategoryCaches();
        }
        if ($this->affectsHomePage($module)) {
            $this->clearHomePageCache();
        }
        $this->clearSeoCaches($module);
    }

    public function bulkDelete(string $module, array $ids): int
    {
        $this->guardBrandModule($module);

        $affectedProductIds = $this->searchIndexer->affectedProductIds($module, $ids);
        $deleted = DB::transaction(function () use ($module, $ids): int {
            $productIds = $module === 'reviews'
                ? ProductReview::query()->whereIn('id', $ids)->pluck('product_id')
                : collect();

            if ($module === 'products') {
                ProductVariant::query()->whereIn('product_id', $ids)->delete();
                CartItem::query()->whereIn('product_id', $ids)->delete();
                WishlistItem::query()->whereIn('product_id', $ids)->delete();
            }

            $deleted = $this->modelClass($module)::query()->whereIn('id', $ids)->delete();

            if ($module === 'reviews') {
                $this->reviewMetrics->recalculateMany($productIds);
            }

            return $deleted;
        }, 3);

        if ($module === 'categories') {
            $this->clearCategoryCaches();
        }
        if ($this->affectsHomePage($module)) {
            $this->clearHomePageCache();
        }
        $this->clearSeoCaches($module);

        if (count($affectedProductIds) > 5) {
            \App\Jobs\ReindexProductSearch::dispatch($affectedProductIds);
        } else {
            $this->searchIndexer->indexMany($affectedProductIds);
        }

        return $deleted;
    }

    public function bulkStatus(string $module, array $ids, string $status): int
    {
        abort_unless(in_array($module, ['reviews', 'comments'], true), 404);

        return DB::transaction(function () use ($module, $ids, $status): int {
            $query = $this->modelClass($module)::query()->whereIn('id', $ids);
            $productIds = $module === 'reviews' ? (clone $query)->pluck('product_id') : collect();
            $updated = $query->update([
                'status' => $status,
                'approved_at' => $status === 'approved' ? now() : null,
                'approved_by' => $status === 'approved' ? auth()->id() : null,
                'updated_at' => now(),
            ]);

            if ($module === 'reviews') {
                $this->reviewMetrics->recalculateMany($productIds);
            }

            return $updated;
        }, 3);
    }

    public function reorder(string $module, array $items): int
    {
        $this->guardBrandModule($module);

        $column = $this->reorderColumn($module);
        $class = $this->modelClass($module);
        $ids = collect($items)->pluck('id')->map(fn ($id) => (int) $id)->values();
        $orders = collect($items)
            ->mapWithKeys(fn ($item): array => [(int) $item['id'] => (int) $item['sort_order']])
            ->all();

        return DB::transaction(function () use ($module, $class, $column, $ids, $orders): int {
            $records = $class::query()
                ->whereIn('id', $ids)
                ->lockForUpdate()
                ->get(['id', $column]);

            abort_if($records->count() !== $ids->count(), 422, 'One or more records are invalid.');

            $updated = 0;
            foreach ($records as $record) {
                $next = $orders[(int) $record->id];
                if ((int) $record->{$column} === $next) {
                    continue;
                }

                $payload = [$column => $next];
                if ($module === 'categories') {
                    $payload['home_display_order'] = $next;
                    $payload['navbar_display_order'] = $next;
                }

                $record->forceFill($payload)->save();
                $updated++;
            }

            $updated += $this->normalizeOrder($class, $column, $module);

            Log::info('Admin records reordered.', [
                'module' => $module,
                'column' => $column,
                'updated' => $updated,
                'user_id' => auth()->id(),
            ]);

            if ($module === 'categories') {
                $this->clearCategoryCaches();
            }
            if ($this->affectsHomePage($module)) {
                $this->clearHomePageCache();
            }

            return $updated;
        });
    }

    public function options(array $filters = []): array
    {
        $attributeSearch = trim((string) ($filters['attribute_search'] ?? ''));

        return [
            'brands' => $this->brandSettings->enabled()
                ? Brand::query()->orderBy('sort_order')->orderBy('name')->get(['id', 'name'])
                : collect(),
            'categories' => Category::query()->orderBy('name')->get(['id', 'name', 'parent_id']),
            'attributes' => ProductAttribute::query()->orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'type', 'is_variant_defining']),
            'attribute_values' => ProductAttributeValue::query()
                ->with('attribute:id,name,type')
                ->when($attributeSearch !== '', function ($query) use ($attributeSearch): void {
                    $query->where(function ($query) use ($attributeSearch): void {
                        $query->where('value', 'like', "%{$attributeSearch}%")
                            ->orWhere('display_value', 'like', "%{$attributeSearch}%")
                            ->orWhereHas('attribute', fn ($attributeQuery) => $attributeQuery->where('name', 'like', "%{$attributeSearch}%"));
                    });
                })
                ->orderBy('sort_order')
                ->orderBy('value')
                ->limit($attributeSearch !== '' ? 50 : 100)
                ->get(['id', 'attribute_id', 'value', 'display_value', 'slug']),
            'tags' => Tag::query()->orderBy('name')->get(['id', 'name']),
            'products' => Product::query()
                ->with(['brand:id,name', 'category:id,name'])
                ->orderBy('name')
                ->get(['id', 'name', 'brand_id', 'category_id']),
            'collections' => ProductCollection::query()->orderBy('name')->get(['id', 'name']),
            'customers' => User::query()
                ->whereHas('roles', fn ($query) => $query->where('name', 'user'))
                ->orderBy('name')
                ->limit(500)
                ->get(['id', 'name']),
        ];
    }

    private function persist(string $module, Model $model, array $data): Model
    {
        $this->storeUploadedImages($module, $model, $data);

        if ($module === 'products') {
            return $this->persistProduct($model, $data);
        }

        if ($module === 'collections') {
            $products = $data['products'] ?? [];
            $affectedProductIds = $model->exists ? $model->products()->pluck('products.id') : collect();
            unset($data['products']);
            $this->applySlug($module, $model, $data);
            $data['type'] = ($data['collection_type'] ?? $data['type'] ?? 'manual') === 'smart' ? 'automatic' : 'manual';
            $data['collection_type'] = $data['collection_type'] ?? ($data['type'] === 'automatic' ? 'smart' : 'manual');
            if (! (bool) ($data['discount_enabled'] ?? false)) {
                $data['discount_type'] = null;
                $data['discount_value'] = null;
            }
            $this->assignSortOrderOnCreate($module, $model, $data);
            $model->fill($data)->save();

            $syncData = collect($products)->mapWithKeys(function ($item, $index) {
                if (is_array($item)) {
                    $id = $item['id'] ?? null;
                    $sortOrder = $item['sort_order'] ?? $index;
                } elseif (is_object($item)) {
                    $id = $item->id ?? null;
                    $sortOrder = $item->sort_order ?? $index;
                } else {
                    $id = (int) $item;
                    $sortOrder = $index;
                }

                return $id ? [$id => ['sort_order' => $sortOrder]] : [];
            })->all();

            $model->products()->sync($syncData);
            $affectedProductIds = $affectedProductIds->merge(array_keys($syncData))->unique();
            DB::afterCommit(fn () => $this->searchIndexer->indexMany($affectedProductIds));
            $this->clearHomePageCache();
            $this->clearSeoCaches($module);

            return $this->find($module, $model->id);
        }

        if ($module === 'discounts') {
            $products = $data['products'] ?? [];
            $categories = $data['categories'] ?? [];
            $brands = $data['brands'] ?? [];
            $collections = $data['collections'] ?? [];
            $excludedProducts = $data['excluded_products'] ?? [];
            $excludedCategories = $data['excluded_categories'] ?? [];
            unset($data['products'], $data['categories'], $data['brands'], $data['collections'], $data['excluded_products'], $data['excluded_categories']);
            $data['value'] = ($data['type'] ?? 'fixed') === 'fixed'
                ? (int) round(((float) ($data['value'] ?? 0)) * 100)
                : (int) round((float) ($data['value'] ?? 0));
            $data['minimum_order_amount'] = isset($data['minimum_order_amount']) && $data['minimum_order_amount'] !== ''
                ? (int) round(((float) $data['minimum_order_amount']) * 100)
                : null;
            $data['maximum_discount'] = isset($data['maximum_discount']) && $data['maximum_discount'] !== ''
                ? (int) round(((float) $data['maximum_discount']) * 100)
                : null;
            $model->fill($data)->save();
            $model->products()->sync($products);
            $model->categories()->sync($categories);
            $model->brands()->sync($brands);
            $model->collections()->sync($collections);
            $model->excludedProducts()->sync($excludedProducts);
            $model->excludedCategories()->sync($excludedCategories);

            return $this->find($module, $model->id);
        }

        if (in_array($module, ['reviews', 'comments'], true)) {
            $data['approved_at'] = ($data['status'] ?? null) === 'approved' ? now() : null;
            $data['approved_by'] = ($data['status'] ?? null) === 'approved' ? auth()->id() : null;

            if ($module === 'comments' && ! $model->exists) {
                $data['submission_hash'] = hash('sha256', implode('|', [
                    'admin',
                    (string) auth()->id(),
                    (string) ($data['product_id'] ?? ''),
                    (string) ($data['user_id'] ?? $data['guest_email'] ?? ''),
                    (string) ($data['content'] ?? ''),
                    (string) microtime(true),
                ]));
            }
        }

        if ($module === 'reviews') {
            $reply = trim((string) ($data['admin_reply'] ?? ''));
            $data['admin_reply'] = $reply !== '' ? $reply : null;
            if ($data['admin_reply'] && ! $model->admin_replied_at) {
                $data['admin_replied_at'] = now();
            }
            if (! $data['admin_reply']) {
                $data['admin_replied_at'] = null;
            }
        }

        $this->applySlug($module, $model, $data);
        $this->assignSortOrderOnCreate($module, $model, $data);
        $model->fill($data)->save();

        if ($module === 'reviews' && ! empty($data['admin_reply'])) {
            $latestReply = $model->replies()->latest()->first();
            if (! $latestReply || $latestReply->comment !== $data['admin_reply']) {
                $model->replies()->create([
                    'user_id' => auth()->id(),
                    'comment' => $data['admin_reply'],
                    'status' => 'published',
                ]);
            }
        }

        if ($module === 'categories') {
            $this->clearCategoryCaches();
        }
        if ($module === 'brands') {
            $this->clearHomePageCache();
        }
        if ($this->affectsHomePage($module) && $module !== 'brands') {
            $this->clearHomePageCache();
        }
        $this->clearSeoCaches($module);
        if (in_array($module, ['brands', 'categories', 'tags', 'attributes', 'attribute-values'], true)) {
            $affectedProductIds = $this->searchIndexer->affectedProductIds($module, [$model->id]);
            DB::afterCommit(fn () => $this->searchIndexer->indexMany($affectedProductIds));
        }

        return $this->find($module, $model->id);
    }

    private function storeUploadedImages(string $module, Model $model, array &$data): void
    {
        $fields = match ($module) {
            'brands' => [
                'logo_file' => ['column' => 'logo_url', 'directory' => 'brands/logos'],
                'cover_image_file' => ['column' => 'cover_image_url', 'directory' => 'brands/covers'],
            ],
            'categories' => [
                'image_file' => ['column' => 'image_url', 'directory' => 'categories'],
                'icon_file' => ['column' => 'icon', 'directory' => 'categories/icons'],
            ],
            'collections' => [
                'banner_image_file' => ['column' => 'banner_image_url', 'directory' => 'collections/banners'],
                'mobile_banner_image_file' => ['column' => 'mobile_banner_image_url', 'directory' => 'collections/mobile-banners'],
                'logo_file' => ['column' => 'logo_url', 'directory' => 'collections/logos'],
            ],
            default => [],
        };

        foreach ($fields as $input => $config) {
            $file = $data[$input] ?? null;
            if (! $file instanceof UploadedFile || ! $file->isValid()) {
                unset($data[$input]);

                continue;
            }

            $oldUrl = $model->exists ? (string) $model->{$config['column']} : '';
            $data[$config['column']] = $this->storePublicUpload($file, $config['directory'], $oldUrl);
            unset($data[$input]);
        }
    }

    private function persistProduct(Model $model, array $data): Model
    {
        if (! $this->brandSettings->enabled()) {
            unset($data['brand_id']);
        }

        $tags = $data['tags'] ?? [];
        $attributeValues = $data['attribute_values'] ?? [];
        $images = $data['images'] ?? [];
        $featuredImageFile = $data['featured_image_file'] ?? null;
        $galleryImageFiles = $data['gallery_image_files'] ?? [];
        $features = $data['features'] ?? null;
        $specifications = $data['specifications'] ?? null;
        $variants = $data['variants'] ?? [];
        unset(
            $data['tags'],
            $data['attribute_values'],
            $data['images'],
            $data['featured_image_file'],
            $data['gallery_image_files'],
            $data['features'],
            $data['specifications'],
            $data['seo'],
            $data['variants'],
        );

        $hasVariants = $variants !== [];
        $pricingMode = $hasVariants
            ? ($data['pricing_mode'] ?? Product::PRICING_MODE_VARIANT)
            : Product::PRICING_MODE_GLOBAL;
        $data['pricing_mode'] = $pricingMode;

        if ($hasVariants) {
            $data['sku'] = null;
            $data['track_inventory'] = false;
            $data['stock_quantity'] = null;
            $data['low_stock_threshold'] = null;

            if ($pricingMode === Product::PRICING_MODE_VARIANT) {
                $data['base_price_cents'] = null;
                $data['compare_at_price_cents'] = null;
                $data['cost_price_cents'] = null;
            }
        }

        $oldImagePaths = $model->exists
            ? $model->images()->pluck('url')->map(fn (?string $path): ?string => PublicStorageImage::path($path))->filter()->values()->all()
            : [];

        $this->applySlug('products', $model, $data);
        $this->applyProductSku($model, $data, $hasVariants);
        $model->fill($data)->save();
        $model->tags()->sync($this->resolveProductTags($tags));
        $this->syncProductAttributeValues($model, $attributeValues);
        $images = $this->productImagesFromUploads($images, $featuredImageFile, $galleryImageFiles);
        $newImagePaths = collect($images)->pluck('url')->map(fn (?string $path): ?string => PublicStorageImage::path($path))->filter()->values()->all();

        // Safe Diff-Based Image Synchronization
        $existingImageRecords = $model->images()->get()->keyBy('url');
        $keptImageIds = [];

        foreach ($images as $imgData) {
            $existing = $existingImageRecords->get($imgData['url']);
            if ($existing) {
                $existing->update([
                    'alt_text' => $imgData['alt_text'] ?? null,
                    'type' => $imgData['type'] ?? 'gallery',
                    'sort_order' => $imgData['sort_order'] ?? 0,
                    'is_primary' => (bool) ($imgData['is_primary'] ?? false),
                ]);
                $keptImageIds[] = $existing->id;
            } else {
                $created = $model->images()->create($imgData);
                $keptImageIds[] = $created->id;
            }
        }

        $model->images()->whereNotIn('id', $keptImageIds)->delete();

        collect($oldImagePaths)
            ->diff($newImagePaths)
            ->each(function (string $path): void {
                if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
                    return;
                }
                $stillUsed = ProductImage::query()->where('url', $path)->exists();
                if (! $stillUsed) {
                    $this->deletePublicUpload($path);
                }
            });

        if ($features !== null) {
            $model->features()->delete();
            $model->features()->createMany($features);
        }
        if ($specifications !== null) {
            $model->specifications()->delete();
            $model->specifications()->createMany($specifications);
        }

        $this->variantEngine->sync($model, $variants, $pricingMode);
        $this->syncProductSeo($model);
        DB::afterCommit(fn () => $this->searchIndexer->index((int) $model->id));
        $this->clearHomePageCache();
        $this->clearSeoCaches('products');

        return $this->find('products', $model->id);
    }

    private function syncProductSeo(Product $model): void
    {
        $model->loadMissing(['brand:id,name', 'category:id,name', 'tags:id,name', 'images:id,product_id,url,is_primary,sort_order']);

        $company = CompanySetting::query()->first();
        $seoSettings = app(SeoSettingsService::class)->get();
        $siteName = $seoSettings->site_title ?: ($company?->name ?: config('app.name', 'Store'));

        // Meta Title
        $metaTitle = "{$model->name} | {$siteName}";

        // Meta Description
        $plainDesc = trim(preg_replace('/\s+/u', ' ', strip_tags((string) $model->description)) ?? '');
        if ($plainDesc !== '') {
            $metaDescription = \Illuminate\Support\Str::limit($plainDesc, 155, '...');
        } else {
            $brandName = $model->brand?->name;
            $catName = $model->category?->name;
            $metaDescription = "Buy {$model->name}".($brandName ? " from {$brandName}" : '').($catName ? " in {$catName}" : '')." online at the best price from {$siteName}.";
        }

        // Meta Keywords
        $keywords = collect([
            $model->name,
            $model->brand?->name,
            $model->category?->name,
            ...$model->tags->pluck('name')->all(),
        ])
            ->filter()
            ->flatMap(fn ($part) => preg_split('/[,\s|]+/', \Illuminate\Support\Str::lower(strip_tags((string) $part))) ?: [])
            ->map(fn ($word) => trim((string) $word, " \t\n\r\0\x0B.-_"))
            ->filter(fn ($word) => \Illuminate\Support\Str::length($word) > 2)
            ->unique()
            ->take(12)
            ->values()
            ->implode(', ');

        // Primary OG image
        $primaryImage = $model->images->firstWhere('is_primary', true)?->url
            ?: $model->images->sortBy('sort_order')->first()?->url;

        $model->seo()->updateOrCreate(
            ['product_id' => $model->id],
            [
                'meta_title' => $metaTitle,
                'meta_description' => $metaDescription,
                'meta_keywords' => $keywords ?: null,
                'og_image_url' => $primaryImage ?: null,
                'canonical_url' => "/products/{$model->slug}",
            ]
        );
    }

    private function applySlug(string $module, Model $model, array &$data): void
    {
        $source = $this->slugSource($module, $data, $model);

        if (! $source || ! $this->hasSlug($module)) {
            unset($data['slug']);

            return;
        }

        if ($model->exists && filled($model->getAttribute('slug'))) {
            $data['slug'] = $model->getAttribute('slug');

            return;
        }

        $data['slug'] = SlugGenerator::generate(
            $source,
            $this->modelClass($module),
            $model->exists ? $model->getKey() : null,
            scope: $module === 'attribute-values' ? ['attribute_id' => $data['attribute_id'] ?? $model->getAttribute('attribute_id')] : []
        );
    }

    private function applyProductSku(Model $model, array &$data, bool $hasVariants): void
    {
        if ($hasVariants) {
            $data['sku'] = null;

            return;
        }

        if ($model->exists && filled($model->getAttribute('sku'))) {
            $data['sku'] = $model->getAttribute('sku');

            return;
        }

        $data['sku'] = SkuGenerator::generate(
            (string) ($data['name'] ?? $model->getAttribute('name')),
            [Product::class, ProductVariant::class]
        );
    }

    private function slugSource(string $module, array $data, Model $model): ?string
    {
        $value = match ($module) {
            'attribute-values' => $data['value'] ?? $model->getAttribute('value'),
            'products', 'brands', 'categories', 'attributes', 'tags', 'collections' => $data['name'] ?? $model->getAttribute('name'),
            default => null,
        };

        return filled($value) ? (string) $value : null;
    }

    private function hasSlug(string $module): bool
    {
        return in_array($module, ['products', 'brands', 'categories', 'attributes', 'attribute-values', 'tags', 'collections'], true);
    }

    private function resolveProductTags(array $tags): array
    {
        return collect($tags)
            ->flatMap(fn ($tag) => is_string($tag) && str_contains($tag, ',') ? explode(',', $tag) : [$tag])
            ->map(function ($tag) {
                if (is_array($tag)) {
                    if (isset($tag['id']) && is_numeric($tag['id'])) {
                        return (int) $tag['id'];
                    }

                    return isset($tag['name']) ? (string) $tag['name'] : null;
                }

                return is_string($tag) ? trim($tag) : $tag;
            })
            ->filter(fn ($tag) => filled($tag))
            ->map(function ($tag): ?int {
                if (is_int($tag)) {
                    $existing = Tag::query()->find($tag);
                    if ($existing) {
                        return (int) $existing->id;
                    }
                }

                $name = trim((string) $tag);
                if ($name === '') {
                    return null;
                }

                $existing = Tag::query()
                    ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
                    ->orWhere('slug', str($name)->slug()->toString())
                    ->first();

                if ($existing) {
                    return (int) $existing->id;
                }

                if (is_numeric($tag)) {
                    $byId = Tag::query()->find((int) $tag);
                    if ($byId) {
                        return (int) $byId->id;
                    }
                }

                return (int) Tag::query()->create([
                    'name' => $name,
                    'slug' => SlugGenerator::generate($name, Tag::class),
                ])->id;
            })
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function productImagesFromUploads(array $images, mixed $featuredImageFile, mixed $galleryImageFiles): array
    {
        $images = collect($images)
            ->filter(fn ($image): bool => is_array($image))
            ->map(function (array $image, int $index): ?array {
                $path = PublicStorageImage::path((string) ($image['path'] ?? $image['url'] ?? ''));

                if (! $path) {
                    return null;
                }

                return [
                    'url' => $path,
                    'alt_text' => $image['alt_text'] ?? null,
                    'type' => $image['type'] ?? 'gallery',
                    'sort_order' => $image['sort_order'] ?? $index,
                    'is_primary' => (bool) ($image['is_primary'] ?? false),
                ];
            })
            ->filter()
            ->values()
            ->all();

        if ($featuredImageFile instanceof UploadedFile && $featuredImageFile->isValid()) {
            $path = $this->storePublicUpload($featuredImageFile, 'products/featured');
            $images = array_values(array_filter($images, fn ($image) => ! ($image['is_primary'] ?? false)));
            array_unshift($images, [
                'url' => $path,
                'alt_text' => isset($images[0]) ? ($images[0]['alt_text'] ?? null) : null,
                'type' => 'featured',
                'sort_order' => 0,
                'is_primary' => true,
            ]);
        }

        foreach ((array) $galleryImageFiles as $index => $file) {
            if (! $file instanceof UploadedFile || ! $file->isValid()) {
                continue;
            }

            $path = $this->storePublicUpload($file, 'products/gallery');
            $images[] = [
                'url' => $path,
                'alt_text' => null,
                'type' => 'gallery',
                'sort_order' => count($images) + $index + 1,
                'is_primary' => false,
            ];
        }

        return array_values(array_map(fn ($image, $index) => [
            'url' => PublicStorageImage::path($image['url']),
            'alt_text' => $image['alt_text'] ?? null,
            'type' => $image['type'] ?? 'gallery',
            'sort_order' => $image['sort_order'] ?? $index,
            'is_primary' => (bool) ($image['is_primary'] ?? false),
        ], $images, array_keys($images)));
    }

    private function syncProductAttributeValues(Product $product, array $attributeValueIds): void
    {
        $values = ProductAttributeValue::query()->whereIn('id', $attributeValueIds)->get();
        $product->attributeValues()->sync($values->mapWithKeys(fn ($value) => [$value->id => ['attribute_id' => $value->attribute_id]])->all());
    }

    private function syncVariantAttributeValues($variant, array $attributeValueIds): void
    {
        $values = ProductAttributeValue::query()->whereIn('id', $attributeValueIds)->get();
        $variant->attributeValues()->sync($values->mapWithKeys(fn ($value) => [$value->id => ['attribute_id' => $value->attribute_id]])->all());
    }

    private function applyRelationships($query, string $module, bool $detailed = false): void
    {
        match ($module) {
            'brands', 'tags' => $query->withCount('products'),
            'categories' => $query->with('parent:id,name')->withCount('products'),
            'attributes' => $query->withCount('values'),
            'attribute-values' => $query->with('attribute:id,name,type'),
            'products' => $query
                ->with($detailed
                    ? ['brand:id,name', 'category:id,name', 'tags:id,name', 'attributeValues:id,value,attribute_id,slug', 'images', 'features', 'specifications', 'seo', 'variants.attributeValues:id,value,attribute_id,slug']
                    : ['brand:id,name', 'category:id,name', 'tags:id,name'])
                ->withAdminSellableSummary(),
            'collections' => $query->with('products:id,name')->withCount('products'),
            'discounts' => $query->with(['products:id,name', 'categories:id,name', 'brands:id,name', 'collections:id,name', 'excludedProducts:id,name', 'excludedCategories:id,name']),
            'reviews' => $query->with(['product:id,name', 'user:id,name', 'replies.user:id,name']),
            'comments' => $query->with(['product:id,name', 'user:id,name']),
            default => null,
        };
    }

    private function reorderColumn(string $module): string
    {
        return match ($module) {
            'brands', 'categories', 'attributes', 'attribute-values' => 'sort_order',
            'collections' => 'home_sort_order',
            default => abort(422, 'This module does not support drag sorting.'),
        };
    }

    private function assignSortOrderOnCreate(string $module, Model $model, array &$data): void
    {
        if ($model->exists) {
            return;
        }

        if (! in_array($module, ['brands', 'categories', 'attributes', 'attribute-values', 'collections'], true)) {
            return;
        }

        $column = $this->reorderColumn($module);
        if (array_key_exists($column, $data) && $data[$column] !== null && $data[$column] !== '') {
            return;
        }

        $data[$column] = ((int) $this->modelClass($module)::query()->max($column)) + 1;

        if ($module === 'categories') {
            $data['home_display_order'] = $data[$column];
            $data['navbar_display_order'] = $data[$column];
        }
    }

    private function normalizeOrder(string $class, string $column, string $module): int
    {
        $updated = 0;

        $class::query()
            ->orderBy($column)
            ->orderBy('id')
            ->get(['id', $column])
            ->values()
            ->each(function (Model $record, int $index) use ($column, $module, &$updated): void {
                if ((int) $record->{$column} === $index) {
                    return;
                }

                $payload = [$column => $index];
                if ($module === 'categories') {
                    $payload['home_display_order'] = $index;
                    $payload['navbar_display_order'] = $index;
                }

                $record->forceFill($payload)->save();
                $updated++;
            });

        return $updated;
    }

    private function applySearch($query, string $module, ?string $search): void
    {
        if (! $search) {
            return;
        }

        $columns = match ($module) {
            'products' => ['name', 'sku', 'short_description'],
            'currencies' => ['country', 'currency', 'symbol'],
            'attribute-values' => ['value', 'slug', 'display_value'],
            'reviews' => ['comment', 'guest_name', 'guest_email'],
            'comments' => ['content', 'guest_name', 'guest_email'],
            default => ['name', 'slug'],
        };

        $query->where(function ($query) use ($columns, $module, $search): void {
            collect($columns)->each(
                fn ($column, $index) => $index === 0
                    ? $query->where($column, 'like', "%{$search}%")
                    : $query->orWhere($column, 'like', "%{$search}%")
            );

            if ($module === 'products') {
                $query->orWhereHas('variants', fn ($variantQuery) => $variantQuery->where('sku', 'like', "%{$search}%"));
            }

            if (in_array($module, ['reviews', 'comments'], true)) {
                $query
                    ->orWhereHas('product', fn ($productQuery) => $productQuery->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('user', fn ($userQuery) => $userQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"));
            }
        });
    }

    private function applyModuleFilters($query, string $module, array $filters): void
    {
        $query
            ->when($filters['status'] ?? null, function ($query, string $status) {
                return $query->where('status', $status);
            })
            ->when($filters['type'] ?? null, fn ($query, string $type) => $query->where($module === 'collections' ? 'collection_type' : 'type', $type))
            ->when($filters['brand_id'] ?? null, fn ($query, int|string $id) => $query->where('brand_id', $id))
            ->when($filters['category_id'] ?? null, fn ($query, int|string $id) => $query->where('category_id', $id))
            ->when($filters['attribute_id'] ?? null, fn ($query, int|string $id) => $query->where('attribute_id', $id))
            ->when($filters['product_id'] ?? null, fn ($query, int|string $id) => $query->where('product_id', $id))
            ->when($filters['rating'] ?? null, fn ($query, int|string $rating) => $query->where('rating', $rating))
            ->when($filters['customer_id'] ?? null, fn ($query, int|string $id) => $query->where('user_id', $id))
            ->when(($filters['guest'] ?? null) === 'guest', fn ($query) => $query->whereNull('user_id'))
            ->when(($filters['guest'] ?? null) === 'registered', fn ($query) => $query->whereNotNull('user_id'))
            ->when(($filters['featured'] ?? null) === 'yes', fn ($query) => $query->where('is_featured', true))
            ->when(($filters['featured'] ?? null) === 'no', fn ($query) => $query->where('is_featured', false));
    }

    private function sortColumn(string $module, string $sort): string
    {
        return $sort;
    }

    private function applySort($query, string $module, string $sortColumn, string $direction): void
    {
        if ($module !== 'products') {
            $query->orderBy($sortColumn, $direction);

            return;
        }

        $expression = match ($sortColumn) {
            'sku' => "COALESCE(products.sku, (SELECT pv.sku FROM product_variants pv WHERE pv.product_id = products.id AND pv.status = 'active' AND pv.is_primary = 1 AND pv.deleted_at IS NULL LIMIT 1))",
            'base_price_cents' => Product::effectivePriceSql(),
            'stock_quantity' => "COALESCE(products.stock_quantity, (SELECT pv.stock_quantity FROM product_variants pv WHERE pv.product_id = products.id AND pv.status = 'active' AND pv.is_primary = 1 AND pv.deleted_at IS NULL LIMIT 1))",
            default => null,
        };

        if ($expression) {
            $query->orderByRaw("{$expression} {$direction}");

            return;
        }

        $query->orderBy($sortColumn, $direction);
    }

    private function modelClass(string $module): string
    {
        return match ($module) {
            'brands' => Brand::class,
            'categories' => Category::class,
            'attributes' => ProductAttribute::class,
            'attribute-values' => ProductAttributeValue::class,
            'tags' => Tag::class,
            'products' => Product::class,
            'collections' => ProductCollection::class,
            'currencies' => Currency::class,
            'discounts' => Discount::class,
            'reviews' => ProductReview::class,
            'comments' => ProductComment::class,
            default => abort(404, 'Product module not found.'),
        };
    }

    private function guardBrandModule(string $module): void
    {
        abort_if($module === 'brands' && ! $this->brandSettings->enabled(), 404, 'Brand module is disabled.');
    }

    private function clearCategoryCaches(): void
    {
        cache()->forget('navigation.public.runtime');
        cache()->forget('categories.runtime.tree');
    }

    private function clearHomePageCache(): void
    {
        HomePageCache::invalidate();
    }

    private function affectsHomePage(string $module): bool
    {
        return in_array($module, [
            'products',
            'brands',
            'categories',
            'tags',
            'collections',
            'currencies',
            'discounts',
        ], true);
    }

    private function clearSeoCaches(string $module): void
    {
        if (in_array($module, ['products', 'brands', 'categories', 'collections', 'tags'], true)) {
            SeoMetadataService::invalidateCache();
        }
    }
}
