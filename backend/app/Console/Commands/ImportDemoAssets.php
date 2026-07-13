<?php

namespace App\Console\Commands;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\ProductAttributeValue;
use App\Models\ProductVariant;
use App\Models\Tag;
use App\Support\Identifiers\SkuGenerator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use SplFileInfo;

class ImportDemoAssets extends Command
{
    protected $signature = 'demo:import-assets
        {source : Root asset folder containing categories, brands, and products}
        {--disk=public : Storage disk used for copied assets}
        {--limit-products= : Limit products imported for a quick test}
        {--no-rename : Keep folder names unchanged instead of renaming them to slugs}';

    protected $description = 'Import demo categories, brands, products, media, attributes, and variants from a folder structure.';

    private const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

    private const MEDIA_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'svg'];

    private const BRAND_ALIASES = [
        'airpods' => 'Apple',
        'apple' => 'Apple',
        'ipad' => 'Apple',
        'iphone' => 'Apple',
        'macbook' => 'Apple',
        'adidas' => 'Adidas',
        'anker' => 'Anker',
        'asics' => 'ASICS',
        'asus' => 'ASUS',
        'canon' => 'Canon',
        'converse' => 'Converse',
        'dell' => 'Dell',
        'dji' => 'DJI',
        'epson' => 'Epson',
        'galaxy buds' => 'Samsung',
        'google' => 'Google',
        'hp' => 'HP',
        'jbl' => 'JBL',
        'lenovo' => 'Lenovo',
        'lg' => 'LG',
        'logitech' => 'Logitech',
        'nike' => 'Nike',
        'nikon' => 'Nikon',
        'nothing' => 'Nothing',
        'oneplus' => 'OnePlus',
        'playstation' => 'Sony',
        'puma' => 'Puma',
        'reebok' => 'Reebok',
        'samsung' => 'Samsung',
        'skechers' => 'Skechers',
        'sony' => 'Sony',
        'tp-link' => 'TP-Link',
        'under armour' => 'Under Armour',
        'xbox' => 'Microsoft',
        'xiaomi' => 'Xiaomi',
    ];

    private array $brands = [];

    private array $categories = [];

    private int $createdProducts = 0;

    public function handle(): int
    {
        $source = File::isDirectory((string) $this->argument('source'))
            ? realpath((string) $this->argument('source'))
            : false;

        if (! $source) {
            $this->error('Source folder does not exist: '.$this->argument('source'));

            return self::FAILURE;
        }

        $this->info('Importing demo assets from: '.$source);

        DB::transaction(function () use ($source): void {
            $this->importBrands($source);
            $this->importCategories($source);
            $this->importProducts($source);
        });

        cache()->forget('settings.navigation.runtime');
        cache()->forget('categories.runtime.tree');
        cache()->forget('home-page:product-brand-sections');
        cache()->forget('home-page:product-brand-sections:v2');

        $this->table(['Imported', 'Count'], [
            ['Brands', count($this->brands)],
            ['Categories', count($this->categories)],
            ['Products', $this->createdProducts],
        ]);
        $this->info('Demo asset import completed.');

        return self::SUCCESS;
    }

    private function importBrands(string $source): void
    {
        $brandRoot = $source.DIRECTORY_SEPARATOR.'brands';

        if (! File::isDirectory($brandRoot)) {
            $this->warn('No brands folder found. Brands will be inferred from product names.');

            return;
        }

        foreach ($this->directories($brandRoot) as $index => $directory) {
            $directory = $this->normalizeDirectory($directory);
            $slug = $directory->getFilename();
            $name = $this->nameFromSlug($slug);

            $brand = $this->upsertBrandByName($name);
            $this->line('BRAND '.$brand->slug);
        }
    }

    private function importCategories(string $source): void
    {
        $categoryRoot = $source.DIRECTORY_SEPARATOR.'categories';

        if (! File::isDirectory($categoryRoot)) {
            $this->warn('No categories folder found. Categories will be inferred from products folder.');
            $this->importCategoriesFromProducts($source);

            return;
        }

        foreach ($this->directories($categoryRoot) as $parentIndex => $parentDirectory) {
            $parentDirectory = $this->normalizeDirectory($parentDirectory);
            $parent = $this->upsertCategory($parentDirectory, null, $parentIndex + 1, false);

            foreach ($this->directories($parentDirectory->getPathname()) as $childIndex => $childDirectory) {
                $childDirectory = $this->normalizeDirectory($childDirectory);
                $this->upsertCategory($childDirectory, $parent, $childIndex + 1, false);
            }
        }
    }

    private function importCategoriesFromProducts(string $source): void
    {
        $productRoot = $source.DIRECTORY_SEPARATOR.'products';

        if (! File::isDirectory($productRoot)) {
            return;
        }

        foreach ($this->directories($productRoot) as $parentIndex => $parentDirectory) {
            $parentDirectory = $this->normalizeDirectory($parentDirectory);
            $parent = $this->upsertCategory($parentDirectory, null, $parentIndex + 1, false);

            foreach ($this->directories($parentDirectory->getPathname()) as $childIndex => $childDirectory) {
                $childDirectory = $this->normalizeDirectory($childDirectory);
                $this->upsertCategory($childDirectory, $parent, $childIndex + 1, false);
            }
        }
    }

    private function upsertCategory(SplFileInfo $directory, ?Category $parent, int $order, bool $importMedia = true): Category
    {
        $slug = Str::slug($directory->getFilename());
        $name = $this->nameFromSlug($slug);
        $isParent = $parent === null;
        $images = $importMedia && $isParent ? $this->mediaFiles($directory->getPathname(), self::IMAGE_EXTENSIONS) : collect();
        $icon = $importMedia && $isParent ? $this->fileByName($directory->getPathname(), 'icon.svg') : null;

        /** @var Category $category */
        $category = Category::withTrashed()->firstOrNew(['slug' => $slug]);
        if ($category->exists && method_exists($category, 'trashed') && $category->trashed()) {
            $category->restore();
        }

        $category->fill([
            'parent_id' => $parent?->id,
            'name' => $name,
            'description' => $parent
                ? "Shop {$name} products under {$parent->name}."
                : "Discover {$name} products in the demo catalog.",
            'image_url' => $isParent && $images->get(0) ? $this->storeAsset($images->get(0), "demo-import/categories/{$slug}") : $category->image_url,
            'icon' => $isParent && $icon ? $this->storeAsset($icon, "demo-import/categories/icons/{$slug}") : $category->icon,
            'is_featured' => true,
            'show_on_home' => $parent === null,
            'show_in_navbar' => true,
            'home_display_order' => $order,
            'navbar_display_order' => $order,
            'sort_order' => $order,
            'status' => 'active',
            'meta_title' => "{$name} Online",
            'meta_description' => "Browse {$name} products with demo-ready product images, pricing, and variants.",
            'meta_keywords' => Str::lower($name).', ecommerce category, demo catalog',
            'canonical_url' => url("/categories/{$slug}"),
            'og_title' => "{$name} Collection",
            'og_description' => "Explore {$name} products in the storefront.",
        ])->save();

        $this->categories[$slug] = $category;
        $this->line('CATEGORY '.($parent ? "{$parent->slug}/" : '').$category->slug);

        return $category;
    }

    private function importProducts(string $source): void
    {
        $productRoot = $source.DIRECTORY_SEPARATOR.'products';

        if (! File::isDirectory($productRoot)) {
            $this->warn('No products folder found.');

            return;
        }

        $limit = $this->option('limit-products') ? max(1, (int) $this->option('limit-products')) : null;
        $brandList = array_values($this->brands);
        $productIndex = 0;

        foreach ($this->directories($productRoot) as $parentDirectory) {
            $parentDirectory = $this->normalizeDirectory($parentDirectory);
            $parentCategory = $this->categoryForSlug($parentDirectory->getFilename());

            foreach ($this->directories($parentDirectory->getPathname()) as $childDirectory) {
                $childDirectory = $this->normalizeDirectory($childDirectory);
                $category = $this->categoryForSlug($childDirectory->getFilename()) ?: $parentCategory;

                foreach ($this->productDirectories($childDirectory) as $item) {
                    if ($limit && $this->createdProducts >= $limit) {
                        return;
                    }

                    $brand = $item['brand'] ?: $this->upsertBrandByName($this->brandNameForProduct($item['product']->getFilename(), $category));
                    $this->upsertProduct($item['product'], $category, $brand, $productIndex);
                    $productIndex++;
                }
            }
        }
    }

    private function productDirectories(SplFileInfo $childDirectory): array
    {
        $items = [];

        foreach ($this->directories($childDirectory->getPathname()) as $directory) {
            $directory = $this->normalizeDirectory($directory);
            $slug = $directory->getFilename();

            if (isset($this->brands[$slug])) {
                foreach ($this->directories($directory->getPathname()) as $productDirectory) {
                    $items[] = [
                        'brand' => $this->brands[$slug],
                        'product' => $this->normalizeDirectory($productDirectory),
                    ];
                }

                continue;
            }

            $items[] = [
                'brand' => null,
                'product' => $directory,
            ];
        }

        return $items;
    }

    private function upsertProduct(SplFileInfo $directory, ?Category $category, ?Brand $brand, int $index): Product
    {
        $folderSlug = $directory->getFilename();
        $childName = $category?->name ?: $this->nameFromSlug($directory->getPathInfo()->getFilename());
        $name = $this->nameFromSlug($folderSlug);
        $slug = Str::slug($name);
        $price = 180000 + (($index % 9) * 35000);
        $compare = $price + 45000;
        $stock = 35 + (($index % 8) * 7);
        $images = $this->mediaFiles($directory->getPathname(), self::IMAGE_EXTENSIONS);
        $attributeValues = $this->attributeValuesForProduct($category, $index);

        /** @var Product $product */
        $product = Product::withTrashed()->firstOrNew(['slug' => $slug]);
        if ($product->exists && method_exists($product, 'trashed') && $product->trashed()) {
            $product->restore();
        }

        $product->fill([
            'brand_id' => $brand?->id,
            'category_id' => $category?->id,
            'name' => $name,
            'short_description' => "Demo-ready {$childName} product with imported media and generated variants.",
            'description' => "This {$childName} product was generated from the {$folderSlug} folder. It includes realistic pricing, inventory, SEO metadata, attribute values, variants, and product images for recording or testing the storefront.",
            'product_type' => 'physical',
            'status' => 'active',
            'sku' => $product->sku ?: SkuGenerator::generate($name, [Product::class, ProductVariant::class]),
            'base_price_cents' => $price,
            'compare_at_price_cents' => $compare,
            'cost_price_cents' => (int) round($price * 0.58),
            'currency' => 'BDT',
            'track_inventory' => true,
            'stock_quantity' => $stock,
            'low_stock_threshold' => 8,
            'is_featured' => $index % 4 === 0,
            'is_new' => true,
            'is_best_seller' => $index % 7 === 0,
            'is_flash_sale' => $index % 11 === 0,
            'flash_sale_ends_at' => $index % 11 === 0 ? now()->addDays(7) : $product->flash_sale_ends_at,
            'free_shipping' => $price >= 300000,
            'published_at' => now(),
        ])->save();

        $product->attributeValues()->sync($attributeValues->mapWithKeys(
            fn (ProductAttributeValue $value): array => [$value->id => ['attribute_id' => $value->attribute_id]]
        )->all());

        $product->tags()->sync($this->tagIds(['Demo Import', $category?->name, $brand?->name]));

        $product->images()->delete();
        foreach ($images->take(6)->values() as $imageIndex => $image) {
            $product->images()->create([
                'url' => $this->storeAsset($image, "demo-import/products/{$product->slug}"),
                'alt_text' => $product->name.' image '.($imageIndex + 1),
                'type' => $imageIndex === 0 ? 'featured' : 'gallery',
                'sort_order' => $imageIndex,
                'is_primary' => $imageIndex === 0,
            ]);
        }

        $product->specifications()->delete();
        $product->specifications()->createMany([
            ['group_name' => 'Import', 'name' => 'Source Folder', 'value' => $directory->getPathname(), 'sort_order' => 0],
            ['group_name' => 'Catalog', 'name' => 'Category', 'value' => $category?->name ?: 'Not assigned', 'sort_order' => 1],
            ['group_name' => 'Catalog', 'name' => 'Brand', 'value' => $brand?->name ?: 'Not assigned', 'sort_order' => 2],
            ['group_name' => 'Product', 'name' => 'Warranty', 'value' => $this->warrantyForCategory($category), 'sort_order' => 3],
            ['group_name' => 'Product', 'name' => 'Origin', 'value' => 'Bangladesh ready stock', 'sort_order' => 4],
        ]);

        $product->features()->delete();
        $product->features()->createMany([
            ['value' => "Authentic {$brand?->name} item prepared for the demo catalog.", 'sort_order' => 0],
            ['value' => "Organized under {$childName} with searchable attributes and variants.", 'sort_order' => 1],
            ['value' => 'Ready stock with clear pricing, inventory, and product media.', 'sort_order' => 2],
        ]);

        $product->seo()->updateOrCreate(['product_id' => $product->id], [
            'meta_title' => $product->name,
            'meta_description' => "Buy {$product->name} from the demo ecommerce catalog.",
            'meta_keywords' => Str::lower(implode(', ', array_filter([$product->name, $category?->name, $brand?->name]))),
            'canonical_url' => url("/products/{$product->slug}"),
            'og_image_url' => $product->images()->orderBy('sort_order')->value('url'),
            'schema_json' => [
                '@context' => 'https://schema.org',
                '@type' => 'Product',
                'name' => $product->name,
                'sku' => $product->sku,
                'brand' => $brand?->name,
                'category' => $category?->name,
                'offers' => [
                    '@type' => 'Offer',
                    'priceCurrency' => $product->currency,
                    'price' => number_format($product->base_price_cents / 100, 2, '.', ''),
                    'availability' => 'https://schema.org/InStock',
                ],
            ],
        ]);

        $this->syncVariants($product, $attributeValues, $stock);
        $this->createdProducts++;
        $this->line('PRODUCT '.$product->sku.' | '.$product->slug);

        return $product;
    }

    private function attributeValuesForProduct(?Category $category, int $index)
    {
        $group = $this->categoryGroup($category);
        $colors = [
            ['Navy', '#1f3a5f'],
            ['Olive', '#5f6f3a'],
            ['Black', '#111827'],
            ['Stone', '#d6d3c5'],
            ['Rose', '#be5c73'],
            ['Teal', '#0f766e'],
        ];
        $primaryColor = $colors[$index % count($colors)];
        $secondaryColor = $colors[($index + 2) % count($colors)];
        $values = collect([
            $this->attributeValue('Color', 'color', $primaryColor[0], $primaryColor[1], true, true, 1),
            $this->attributeValue('Color', 'color', $secondaryColor[0], $secondaryColor[1], true, true, 2),
        ]);

        [$attributeName, $type, $options] = match ($group) {
            'electronics' => ['Storage', 'select', ['128 GB', '256 GB']],
            'grocery', 'pet', 'beauty', 'health' => ['Pack Size', 'select', ['Single Pack', 'Family Pack']],
            'home', 'travel', 'automotive', 'books', 'jewelry' => ['Material', 'text', ['Standard', 'Premium']],
            default => ['Size', 'select', ['M', 'L']],
        };

        foreach ($options as $optionIndex => $option) {
            $values->push($this->attributeValue($attributeName, $type, $option, null, true, true, $optionIndex + 1));
        }

        return $values->unique('id')->values();
    }

    private function syncVariants(Product $product, $attributeValues, int $stock): void
    {
        $groups = $attributeValues->groupBy('attribute_id')->values();

        if ($groups->count() < 2) {
            return;
        }

        $variants = [];
        foreach ($groups[0] as $first) {
            foreach ($groups[1] as $second) {
                $variants[] = [$first, $second];
            }
        }

        $seen = [];
        foreach ($variants as $index => $values) {
            $key = collect($values)->pluck('id')->sort()->implode(':');
            $seen[] = $key;

            /** @var ProductVariant $variant */
            $variant = $product->variants()
                ->withTrashed()
                ->whereHas('attributeValues', fn ($query) => $query->whereIn('attribute_values.id', collect($values)->pluck('id')))
                ->get()
                ->first(fn (ProductVariant $item): bool => $item->attributeValues->pluck('id')->sort()->implode(':') === $key)
                ?: new ProductVariant(['product_id' => $product->id]);

            if ($variant->exists && method_exists($variant, 'trashed') && $variant->trashed()) {
                $variant->restore();
            }

            $variant->fill([
                'product_id' => $product->id,
                'sku' => $variant->sku ?: SkuGenerator::generate($product->name.' '.collect($values)->pluck('value')->implode(' '), [Product::class, ProductVariant::class]),
                'barcode' => $variant->barcode ?: $this->barcodeForVariant($product, $index),
                'price_cents' => $product->base_price_cents + ($index * 500),
                'compare_at_price_cents' => $product->compare_at_price_cents + ($index * 500),
                'cost_price_cents' => $product->cost_price_cents + ($index * 250),
                'stock_quantity' => max(1, (int) floor($stock / max(1, count($variants)))),
                'track_inventory' => true,
                'low_stock_threshold' => 3,
                'weight_grams' => $this->weightForProduct($product, $index),
                'length_cm' => 20 + ($index % 4),
                'width_cm' => 12 + ($index % 3),
                'height_cm' => 6 + ($index % 2),
                'status' => 'active',
            ])->save();

            $variant->attributeValues()->sync(
                collect($values)->mapWithKeys(fn (ProductAttributeValue $value): array => [$value->id => ['attribute_id' => $value->attribute_id]])->all()
            );
        }

        $product->variants()
            ->with('attributeValues:id')
            ->get()
            ->reject(fn (ProductVariant $variant): bool => in_array($variant->attributeValues->pluck('id')->sort()->implode(':'), $seen, true))
            ->each->delete();
    }

    private function attributeValue(string $name, string $type, string $value, ?string $hex, bool $filterable, bool $variant, int $sort): ProductAttributeValue
    {
        $attributeSlug = Str::slug($name);

        /** @var ProductAttribute $attribute */
        $attribute = ProductAttribute::query()->firstOrCreate(['slug' => $attributeSlug], [
            'name' => $name,
            'type' => $type,
            'is_filterable' => $filterable,
            'is_variant_defining' => $variant,
            'sort_order' => $sort,
        ]);

        $attribute->fill([
            'name' => $name,
            'type' => $type,
            'is_filterable' => $filterable,
            'is_variant_defining' => $variant,
            'sort_order' => $sort,
        ])->save();

        $valueSlug = Str::slug($value);

        return ProductAttributeValue::query()->updateOrCreate([
            'attribute_id' => $attribute->id,
            'slug' => $valueSlug,
        ], [
            'value' => $value,
            'display_value' => $value,
            'hex_color' => $hex,
            'sort_order' => $sort,
        ]);
    }

    private function upsertBrandByName(string $name): Brand
    {
        $name = trim($name) !== '' ? trim($name) : 'Generic';
        $slug = Str::slug($name);

        /** @var Brand $brand */
        $brand = Brand::withTrashed()->firstOrNew(['slug' => $slug]);
        if ($brand->exists && method_exists($brand, 'trashed') && $brand->trashed()) {
            $brand->restore();
        }

        $brand->fill([
            'name' => $name,
            'description' => "Explore {$name} products curated for the demo catalog.",
            'logo_url' => $brand->logo_url,
            'cover_image_url' => $brand->cover_image_url,
            'website_url' => 'https://'.Str::slug($name).'.example.com',
            'is_featured' => true,
            'status' => 'active',
            'meta_title' => "{$name} Products",
            'meta_description' => "Shop {$name} products in the demo ecommerce catalog.",
            'meta_keywords' => Str::lower($name).', ecommerce brand, demo products',
            'canonical_url' => url("/brands/{$slug}"),
            'og_title' => "{$name} at ".config('app.name', 'Ecommerce'),
            'og_description' => "Browse {$name} products and offers.",
            'og_image_url' => $brand->og_image_url,
        ])->save();

        $this->brands[$slug] = $brand;

        return $brand;
    }

    private function brandNameForProduct(string $productSlug, ?Category $category = null): string
    {
        $name = Str::lower($this->nameFromSlug($productSlug));

        foreach (self::BRAND_ALIASES as $needle => $brand) {
            if (Str::startsWith($name, $needle) || Str::contains($name, ' '.$needle.' ')) {
                return $brand;
            }
        }

        $rootSlug = $category?->parent?->slug ?: $category?->slug;

        return match ($rootSlug) {
            'electronics' => 'TechNova',
            'clothing' => 'Urban Thread',
            'shoes' => 'StepStreet',
            'saree' => 'Heritage Weaves',
            'beauty' => 'GlowCare',
            default => 'Generic',
        };
    }

    private function tagIds(array $names): array
    {
        return collect($names)
            ->filter()
            ->map(function (string $name): int {
                $slug = Str::slug($name);

                /** @var Tag $tag */
                $tag = Tag::query()->firstOrCreate(['slug' => $slug], ['name' => $name]);

                return (int) $tag->id;
            })
            ->unique()
            ->values()
            ->all();
    }

    private function categoryForSlug(string $slug): ?Category
    {
        $slug = Str::slug($slug);

        if (isset($this->categories[$slug])) {
            return $this->categories[$slug];
        }

        return Category::query()->where('slug', $slug)->first();
    }

    private function categoryGroup(?Category $category): string
    {
        $slug = Str::slug($category?->parent?->slug ?: $category?->slug ?: '');

        return match ($slug) {
            'electronics' => 'electronics',
            'grocery' => 'grocery',
            'pet-supplies' => 'pet',
            'beauty' => 'beauty',
            'health-wellness' => 'health',
            'home-living' => 'home',
            'travel' => 'travel',
            'automotive' => 'automotive',
            'books-stationery' => 'books',
            'jewelry' => 'jewelry',
            default => 'apparel',
        };
    }

    private function warrantyForCategory(?Category $category): string
    {
        return $this->categoryGroup($category) === 'electronics'
            ? 'Official service warranty included'
            : 'Quality checked before delivery';
    }

    private function weightForProduct(Product $product, int $index): int
    {
        return $this->categoryGroup($product->category) === 'electronics'
            ? 250 + ($index * 40)
            : 180 + ($index * 25);
    }

    private function barcodeForVariant(Product $product, int $index): string
    {
        return substr(preg_replace('/\D+/', '', sha1($product->slug.'-'.$index)), 0, 12);
    }

    private function storeAsset(SplFileInfo $file, string $directory): string
    {
        $disk = (string) $this->option('disk');
        $extension = Str::lower($file->getExtension());
        $hash = substr(sha1_file($file->getPathname()), 0, 16);
        $name = Str::slug(pathinfo($file->getFilename(), PATHINFO_FILENAME));
        $path = trim($directory, '/')."/{$name}-{$hash}.{$extension}";

        if (! Storage::disk($disk)->exists($path)) {
            Storage::disk($disk)->put($path, File::get($file->getPathname()));
        }

        return $path;
    }

    private function normalizeDirectory(SplFileInfo $directory): SplFileInfo
    {
        if ((bool) $this->option('no-rename')) {
            return $directory;
        }

        $current = $directory->getFilename();
        $slug = Str::slug($current);

        if ($slug === '' || $slug === $current) {
            return $directory;
        }

        $target = $directory->getPath().DIRECTORY_SEPARATOR.$slug;

        if (File::exists($target)) {
            $this->warn("Cannot rename {$directory->getPathname()} to {$target}; target already exists.");

            return $directory;
        }

        File::moveDirectory($directory->getPathname(), $target);

        return new SplFileInfo($target);
    }

    private function directories(string $path)
    {
        return collect(File::directories($path))
            ->map(fn (string $directory): SplFileInfo => new SplFileInfo($directory))
            ->sortBy(fn (SplFileInfo $directory): string => Str::lower($directory->getFilename()))
            ->values();
    }

    private function mediaFiles(string $path, array $extensions)
    {
        return collect(File::files($path))
            ->filter(fn (SplFileInfo $file): bool => in_array(Str::lower($file->getExtension()), $extensions, true) && $file->getFilename() !== 'icon.svg')
            ->sortBy(fn (SplFileInfo $file): string => Str::lower($file->getFilename()))
            ->values();
    }

    private function fileByName(string $path, string $name): ?SplFileInfo
    {
        $target = $path.DIRECTORY_SEPARATOR.$name;

        return File::isFile($target) ? new SplFileInfo($target) : null;
    }

    private function nameFromSlug(string $slug): string
    {
        return Str::headline(str_replace(['-', '_'], ' ', $slug));
    }

    private function productNumber(string $slug, int $index): string
    {
        if (preg_match('/(\d+)/', $slug, $matches)) {
            return 'Item '.str_pad($matches[1], 2, '0', STR_PAD_LEFT);
        }

        return 'Item '.str_pad((string) (($index % 99) + 1), 2, '0', STR_PAD_LEFT);
    }
}
