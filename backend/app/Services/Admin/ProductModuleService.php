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
use App\Models\Tag;
use App\Models\Warehouse;
use App\Services\Admin\Concerns\BuildsManagementQueries;
use App\Services\Concerns\StoresPublicUploads;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class ProductModuleService
{
    use BuildsManagementQueries;
    use StoresPublicUploads;

    public function paginate(string $module, array $filters): LengthAwarePaginator
    {
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
        return DB::transaction(fn () => $this->persist($module, new ($this->modelClass($module)), $data));
    }

    public function update(string $module, int $id, array $data): Model
    {
        return DB::transaction(function () use ($module, $id, $data): Model {
            $model = $this->modelClass($module)::query()->findOrFail($id);

            return $this->persist($module, $model, $data);
        });
    }

    public function find(string $module, int $id): Model
    {
        $query = $this->modelClass($module)::query();
        $this->applyRelationships($query, $module, detailed: true);

        return $query->findOrFail($id);
    }

    public function delete(string $module, int $id): void
    {
        $this->modelClass($module)::query()->findOrFail($id)->delete();

        if ($module === 'categories') {
            $this->clearCategoryCaches();
        }
        if (in_array($module, ['collections', 'currencies'], true)) {
            $this->clearCollectionCaches();
        }
    }

    public function bulkDelete(string $module, array $ids): int
    {
        $deleted = $this->modelClass($module)::query()->whereIn('id', $ids)->delete();

        if ($module === 'categories') {
            $this->clearCategoryCaches();
        }
        if (in_array($module, ['collections', 'currencies'], true)) {
            $this->clearCollectionCaches();
        }

        return $deleted;
    }

    public function options(): array
    {
        return [
            'brands' => Brand::query()->orderBy('name')->get(['id', 'name']),
            'categories' => Category::query()->orderBy('name')->get(['id', 'name', 'parent_id']),
            'attributes' => ProductAttribute::query()->orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'type']),
            'attribute_values' => ProductAttributeValue::query()->with('attribute:id,name,type')->orderBy('sort_order')->get(['id', 'attribute_id', 'value', 'slug']),
            'tags' => Tag::query()->orderBy('name')->get(['id', 'name']),
            'warehouses' => Warehouse::query()->orderBy('name')->get(['id', 'name']),
            'products' => Product::query()
                ->with(['brand:id,name', 'category:id,name'])
                ->orderBy('name')
                ->get(['id', 'name', 'brand_id', 'category_id']),
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
            $data['type'] = ($data['collection_type'] ?? $data['type'] ?? 'manual') === 'smart' ? 'automatic' : 'manual';
            if (! (bool) ($data['discount_enabled'] ?? false)) {
                $data['discount_type'] = null;
                $data['discount_value'] = null;
                $data['discount_apply_to'] = 'entire_collection';
            }
            $model->fill($data)->save();
            $model->products()->sync(collect($products)->mapWithKeys(fn ($item) => [$item['id'] => ['sort_order' => $item['sort_order'] ?? 0]])->all());
            $this->clearCollectionCaches();

            return $this->find($module, $model->id);
        }

        if ($module === 'discounts') {
            $products = $data['products'] ?? [];
            $categories = $data['categories'] ?? [];
            $brands = $data['brands'] ?? [];
            $excludedProducts = $data['excluded_products'] ?? [];
            $excludedCategories = $data['excluded_categories'] ?? [];
            unset($data['products'], $data['categories'], $data['brands'], $data['excluded_products'], $data['excluded_categories']);
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
        $tags = $data['tags'] ?? [];
        $attributeValues = $data['attribute_values'] ?? [];
        $images = $data['images'] ?? [];
        $featuredImageFile = $data['featured_image_file'] ?? null;
        $galleryImageFiles = $data['gallery_image_files'] ?? [];
        $features = $data['features'] ?? [];
        $specifications = $data['specifications'] ?? [];
        $seo = $data['seo'] ?? null;
        $variants = $data['variants'] ?? [];
        unset(
            $data['tags'],
            $data['attribute_values'],
            $data['images'],
            $data['featured_image_file'],
            $data['gallery_image_files'],
            $data['tax_class'],
            $data['stock_status'],
            $data['backorders'],
            $data['min_order_quantity'],
            $data['max_order_quantity'],
            $data['features'],
            $data['specifications'],
            $data['seo'],
            $data['variants']
        );

        $model->fill($data)->save();
        $model->tags()->sync($tags);
        $this->syncProductAttributeValues($model, $attributeValues);
        $images = $this->productImagesFromUploads($images, $featuredImageFile, $galleryImageFiles);
        $model->images()->delete();
        $model->images()->createMany($images);
        $model->features()->delete();
        $model->features()->createMany($features);
        $model->specifications()->delete();
        $model->specifications()->createMany($specifications);

        if ($seo) {
            $model->seo()->updateOrCreate(['product_id' => $model->id], $seo);
        } else {
            $model->seo()->delete();
        }

        $model->variants()->delete();
        foreach ($variants as $variantData) {
            $variantAttributeValues = $variantData['attribute_values'] ?? [];
            unset($variantData['attribute_values']);
            $variant = $model->variants()->create($variantData);
            $this->syncVariantAttributeValues($variant, $variantAttributeValues);
        }

        return $this->find('products', $model->id);
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
            'discounts' => $query->with(['products:id,name', 'categories:id,name', 'brands:id,name', 'excludedProducts:id,name', 'excludedCategories:id,name']),
            'reviews' => $query->with(['product:id,name', 'user:id,name', 'replies.user:id,name']),
            default => null,
        };
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
            'warehouses' => ['name', 'code', 'city', 'country'],
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
            ->when($filters['status'] ?? null, function ($query, string $status) use ($module) {
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
            'warehouses' => Warehouse::class,
            'products' => Product::class,
            'collections' => ProductCollection::class,
            'currencies' => Currency::class,
            'discounts' => Discount::class,
            'reviews' => ProductReview::class,
            default => abort(404, 'Product module not found.'),
        };
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
}
