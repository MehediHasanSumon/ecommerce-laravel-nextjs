<?php

namespace App\Services\Admin;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Currency;
use App\Models\Discount;
use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\ProductAttributeValue;
use App\Models\ProductCollection;
use App\Models\ProductReview;
use App\Models\ProductVariant;
use App\Models\Tag;
use App\Services\Admin\Concerns\BuildsManagementQueries;
use App\Services\Admin\Settings\BrandSettingsService;
use App\Services\Concerns\StoresPublicUploads;
use App\Services\Seo\SeoMetadataService;
use App\Support\Identifiers\SkuGenerator;
use App\Support\Identifiers\SlugGenerator;
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

        return $query
            ->orderBy($sortColumn, $filters['direction'] ?? 'desc')
            ->paginate($filters['per_page'] ?? 10);
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

        $this->modelClass($module)::query()->findOrFail($id)->delete();

        if ($module === 'categories') {
            $this->clearCategoryCaches();
        }
        if (in_array($module, ['brands', 'collections', 'currencies'], true)) {
            $this->clearCollectionCaches();
        }
        $this->clearSeoCaches($module);
    }

    public function bulkDelete(string $module, array $ids): int
    {
        $this->guardBrandModule($module);

        $deleted = $this->modelClass($module)::query()->whereIn('id', $ids)->delete();

        if ($module === 'categories') {
            $this->clearCategoryCaches();
        }
        if (in_array($module, ['brands', 'collections', 'currencies'], true)) {
            $this->clearCollectionCaches();
        }
        $this->clearSeoCaches($module);

        return $deleted;
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
            if (in_array($module, ['brands', 'collections', 'currencies'], true)) {
                $this->clearCollectionCaches();
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
            unset($data['products']);
            $this->applySlug($module, $model, $data);
            $data['type'] = ($data['collection_type'] ?? $data['type'] ?? 'manual') === 'smart' ? 'automatic' : 'manual';
            if (! (bool) ($data['discount_enabled'] ?? false)) {
                $data['discount_type'] = null;
                $data['discount_value'] = null;
            }
            $this->assignSortOrderOnCreate($module, $model, $data);
            $model->fill($data)->save();
            $model->products()->sync(collect($products)->mapWithKeys(fn ($item) => [$item['id'] => ['sort_order' => $item['sort_order'] ?? 0]])->all());
            $this->clearCollectionCaches();
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
            $this->clearCollectionCaches();
        }
        $this->clearSeoCaches($module);

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
            $path = $this->storePublicUpload($file, $config['directory'], $oldUrl);
            $data[$config['column']] = $this->publicUploadUrl($path);
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
        $seo = $data['seo'] ?? null;
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
        if ($hasVariants) {
            $data['sku'] = null;
            $data['base_price_cents'] = null;
            $data['compare_at_price_cents'] = null;
            $data['cost_price_cents'] = null;
            $data['track_inventory'] = false;
            $data['stock_quantity'] = null;
            $data['low_stock_threshold'] = null;
        }

        $this->applySlug('products', $model, $data);
        $this->applyProductSku($model, $data, $hasVariants);
        $model->fill($data)->save();
        $model->tags()->sync($this->resolveProductTags($tags));
        $this->syncProductAttributeValues($model, $attributeValues);
        $images = $this->productImagesFromUploads($images, $featuredImageFile, $galleryImageFiles);
        $model->images()->delete();
        $model->images()->createMany($images);
        if ($features !== null) {
            $model->features()->delete();
            $model->features()->createMany($features);
        }
        if ($specifications !== null) {
            $model->specifications()->delete();
            $model->specifications()->createMany($specifications);
        }

        if ($seo) {
            $model->seo()->updateOrCreate(['product_id' => $model->id], $seo);
        } else {
            $model->seo()->delete();
        }

        $this->variantEngine->sync($model, $variants);
        $this->clearSeoCaches('products');

        return $this->find('products', $model->id);
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
            ->flatMap(fn ($tag) => is_string($tag) ? explode(',', $tag) : [$tag])
            ->map(fn ($tag) => is_string($tag) ? trim($tag) : $tag)
            ->filter(fn ($tag) => filled($tag))
            ->map(function ($tag): ?int {
                if (is_numeric($tag)) {
                    $existing = Tag::query()->find((int) $tag);
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
        if ($featuredImageFile instanceof UploadedFile && $featuredImageFile->isValid()) {
            $path = $this->storePublicUpload($featuredImageFile, 'products/featured');
            $images = array_values(array_filter($images, fn ($image) => ! ($image['is_primary'] ?? false)));
            array_unshift($images, [
                'url' => $this->publicUploadUrl($path),
                'alt_text' => $images[0]['alt_text'] ?? null,
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
                'url' => $this->publicUploadUrl($path),
                'alt_text' => null,
                'type' => 'gallery',
                'sort_order' => count($images) + $index + 1,
                'is_primary' => false,
            ];
        }

        return array_values(array_map(fn ($image, $index) => [
            'url' => $image['url'],
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
            'products' => $query->with($detailed
                ? ['brand:id,name', 'category:id,name', 'tags:id,name', 'attributeValues:id,value,attribute_id,slug', 'images', 'features', 'specifications', 'seo', 'variants.attributeValues:id,value,attribute_id,slug']
                : ['brand:id,name', 'category:id,name', 'tags:id,name']),
            'collections' => $query->with('products:id,name')->withCount('products'),
            'discounts' => $query->with(['products:id,name', 'categories:id,name', 'brands:id,name', 'collections:id,name', 'excludedProducts:id,name', 'excludedCategories:id,name']),
            'reviews' => $query->with(['product:id,name', 'user:id,name', 'replies.user:id,name']),
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
            'reviews' => ['comment'],
            default => ['name', 'slug'],
        };

        $query->where(fn ($query) => collect($columns)->each(
            fn ($column, $index) => $index === 0
                ? $query->where($column, 'like', "%{$search}%")
                : $query->orWhere($column, 'like', "%{$search}%")
        ));
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
            ->when(($filters['featured'] ?? null) === 'yes', fn ($query) => $query->where('is_featured', true))
            ->when(($filters['featured'] ?? null) === 'no', fn ($query) => $query->where('is_featured', false));
    }

    private function sortColumn(string $module, string $sort): string
    {
        return $sort;
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
            default => abort(404, 'Product module not found.'),
        };
    }

    private function guardBrandModule(string $module): void
    {
        abort_if($module === 'brands' && ! $this->brandSettings->enabled(), 404, 'Brand module is disabled.');
    }

    private function clearCategoryCaches(): void
    {
        cache()->forget('settings.navigation.runtime');
        cache()->forget('categories.runtime.tree');
    }

    private function clearCollectionCaches(): void
    {
        cache()->forget('home-page:product-brand-sections');
        cache()->forget('home-page:product-brand-sections:v2');
    }

    private function clearSeoCaches(string $module): void
    {
        if (in_array($module, ['products', 'brands', 'categories', 'collections', 'tags'], true)) {
            SeoMetadataService::invalidateCache();
        }
    }
}
