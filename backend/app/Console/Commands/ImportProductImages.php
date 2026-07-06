<?php

namespace App\Console\Commands;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImportProductImages extends Command
{
    protected $signature = 'products:import-images
        {source : Directory containing source images}
        {--commit : Persist changes. Without this option the command runs as a dry run}
        {--limit= : Limit number of matched records to process}
        {--disk=public : Storage disk used for copied images}
        {--strategy=match : Matching strategy: match, sequential, or repeat}';

    protected $description = 'Import matched product, category, or brand images into storage.';

    private const SUPPORTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

    private const PRODUCT_IMAGE_LIMIT = 4;

    public function handle(): int
    {
        $source = (string) $this->argument('source');
        $disk = (string) $this->option('disk');
        $commit = (bool) $this->option('commit');
        $limit = $this->option('limit') ? max(1, (int) $this->option('limit')) : null;
        $strategy = (string) $this->option('strategy');
        $target = $this->choice('Select image import target', [
            1 => 'product',
            2 => 'category',
            3 => 'brand',
        ], 1);

        if (! in_array($strategy, ['match', 'sequential', 'repeat'], true)) {
            $this->error('Invalid --strategy value. Supported values: match, sequential, repeat');

            return self::FAILURE;
        }

        if (! File::isDirectory($source)) {
            $this->error("Source directory does not exist: {$source}");

            return self::FAILURE;
        }

        $images = $this->sourceImages($source);

        if ($images->isEmpty()) {
            $this->error('No supported images found in source directory.');

            return self::FAILURE;
        }

        return match ($target) {
            'category' => $this->importSingleImages(
                target: 'category',
                records: Category::query()->orderBy('id')->get(),
                source: $source,
                images: $images,
                disk: $disk,
                commit: $commit,
                limit: $limit,
                strategy: $strategy,
                imageColumn: 'image_url',
                storageDirectory: 'categories',
                identifierFields: ['slug', 'name'],
            ),
            'brand' => $this->importSingleImages(
                target: 'brand',
                records: Brand::query()->orderBy('id')->get(),
                source: $source,
                images: $images,
                disk: $disk,
                commit: $commit,
                limit: $limit,
                strategy: $strategy,
                imageColumn: 'logo_url',
                storageDirectory: 'brands',
                identifierFields: ['slug', 'name'],
            ),
            default => $this->importProductImages($source, $images, $disk, $commit, $limit, $strategy),
        };
    }

    private function importProductImages(string $source, Collection $images, string $disk, bool $commit, ?int $limit, string $strategy): int
    {
        $products = Product::query()
            ->with(['images' => fn ($query) => $query->orderBy('sort_order')->orderBy('id')])
            ->orderBy('id')
            ->get();

        $matches = [];
        $skippedImages = [];

        if ($strategy === 'repeat') {
            $imageCount = $images->count();

            foreach ($products as $productIndex => $product) {
                for ($imageIndex = 0; $imageIndex < self::PRODUCT_IMAGE_LIMIT; $imageIndex++) {
                    $image = $images->get(($productIndex * self::PRODUCT_IMAGE_LIMIT + $imageIndex) % $imageCount);

                    $matches[$product->id] ??= ['product' => $product, 'images' => []];
                    $matches[$product->id]['images'][] = $image;
                }
            }
        } elseif ($strategy === 'sequential') {
            foreach ($images as $index => $image) {
                $product = $products->get(intdiv($index, self::PRODUCT_IMAGE_LIMIT));

                if (! $product) {
                    $skippedImages[] = $image->getPathname();

                    continue;
                }

                $matches[$product->id] ??= ['product' => $product, 'images' => []];
                $matches[$product->id]['images'][] = $image;
            }
        } else {
            $productIndex = $this->productIndex($products);

            foreach ($images as $image) {
                $key = $this->matchKey($image->getFilenameWithoutExtension());
                $product = $productIndex[$key] ?? null;

                if (! $product) {
                    $skippedImages[] = $image->getPathname();

                    continue;
                }

                $matches[$product->id] ??= ['product' => $product, 'images' => []];

                if (count($matches[$product->id]['images']) < self::PRODUCT_IMAGE_LIMIT) {
                    $matches[$product->id]['images'][] = $image;
                }
            }
        }

        $matched = collect($matches)->values();
        if ($limit) {
            $matched = $matched->take($limit);
        }

        $summary = [
            'source' => $source,
            'target' => 'product',
            'commit' => $commit,
            'strategy' => $strategy,
            'images_per_product' => self::PRODUCT_IMAGE_LIMIT,
            'source_images' => $images->count(),
            'matched_products' => $matched->count(),
            'matched_images' => $matched->sum(fn ($item) => count($item['images'])),
            'skipped_images' => count($skippedImages),
        ];

        $this->info(($commit ? 'Importing' : 'Dry run for').' product images');
        $this->table(['Metric', 'Value'], collect($summary)->map(fn ($value, $key) => [$key, is_bool($value) ? ($value ? 'yes' : 'no') : $value])->all());

        foreach ($skippedImages as $path) {
            $this->line("SKIP image without matching product: {$path}");
        }

        foreach ($matched as $item) {
            /** @var Product $product */
            $product = $item['product'];
            $this->line("MATCH {$product->sku} | {$product->slug} <= ".count($item['images']).' image(s, max '.self::PRODUCT_IMAGE_LIMIT.')');
        }

        Log::info('Product image import scan completed.', $summary + [
            'skipped_images' => $skippedImages,
            'matched_products' => $matched->map(fn ($item) => [
                'product_id' => $item['product']->id,
                'sku' => $item['product']->sku,
                'slug' => $item['product']->slug,
                'images' => collect($item['images'])->map->getPathname()->values()->all(),
            ])->values()->all(),
        ]);

        if (! $commit) {
            $this->warn('Dry run only. Re-run with --commit to copy files and update product_images.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($matched, $disk): void {
            foreach ($matched as $item) {
                /** @var Product $product */
                $product = $item['product'];
                $paths = $this->copyImages($product, collect($item['images'])->take(self::PRODUCT_IMAGE_LIMIT), $disk);

                ProductImage::query()->where('product_id', $product->id)->delete();

                foreach ($paths as $index => $path) {
                    ProductImage::query()->create([
                        'product_id' => $product->id,
                        'product_variant_id' => null,
                        'url' => $path,
                        'alt_text' => $product->name.' image '.($index + 1),
                        'type' => $index === 0 ? 'featured' : 'gallery',
                        'sort_order' => $index,
                        'is_primary' => $index === 0,
                    ]);
                }

                Log::info('Product images synchronized.', [
                    'product_id' => $product->id,
                    'sku' => $product->sku,
                    'slug' => $product->slug,
                    'image_paths' => $paths,
                ]);
            }
        });

        $this->info('Product image import completed.');

        return self::SUCCESS;
    }

    private function importSingleImages(
        string $target,
        EloquentCollection $records,
        string $source,
        Collection $images,
        string $disk,
        bool $commit,
        ?int $limit,
        string $strategy,
        string $imageColumn,
        string $storageDirectory,
        array $identifierFields,
    ): int {
        $matches = [];
        $skippedImages = [];

        if ($strategy === 'repeat') {
            foreach ($records as $index => $record) {
                $matches[$record->id] = [
                    'record' => $record,
                    'image' => $images->get($index % $images->count()),
                ];
            }
        } elseif ($strategy === 'sequential') {
            foreach ($images as $index => $image) {
                $record = $records->get($index);

                if (! $record) {
                    $skippedImages[] = $image->getPathname();

                    continue;
                }

                $matches[$record->id] = ['record' => $record, 'image' => $image];
            }
        } else {
            $recordIndex = $this->recordIndex($records, $identifierFields);

            foreach ($images as $image) {
                $key = $this->matchKey($image->getFilenameWithoutExtension());
                $record = $recordIndex[$key] ?? null;

                if (! $record) {
                    $skippedImages[] = $image->getPathname();

                    continue;
                }

                $matches[$record->id] = ['record' => $record, 'image' => $image];
            }
        }

        $matched = collect($matches)->values();
        if ($limit) {
            $matched = $matched->take($limit);
        }

        $summary = [
            'source' => $source,
            'target' => $target,
            'commit' => $commit,
            'strategy' => $strategy,
            'source_images' => $images->count(),
            'matched_records' => $matched->count(),
            'skipped_images' => count($skippedImages),
            'updated_column' => $imageColumn,
        ];

        $this->info(($commit ? 'Importing' : 'Dry run for')." {$target} images");
        $this->table(['Metric', 'Value'], collect($summary)->map(fn ($value, $key) => [$key, is_bool($value) ? ($value ? 'yes' : 'no') : $value])->all());

        foreach ($skippedImages as $path) {
            $this->line("SKIP image without matching {$target}: {$path}");
        }

        foreach ($matched as $item) {
            /** @var Model $record */
            $record = $item['record'];
            $this->line("MATCH {$record->getAttribute('slug')} | {$record->getAttribute('name')} <= {$item['image']->getFilename()}");
        }

        Log::info(ucfirst($target).' image import scan completed.', $summary + [
            'skipped_images' => $skippedImages,
            'matched_records' => $matched->map(fn ($item) => [
                'id' => $item['record']->id,
                'slug' => $item['record']->getAttribute('slug'),
                'name' => $item['record']->getAttribute('name'),
                'image' => $item['image']->getPathname(),
            ])->values()->all(),
        ]);

        if (! $commit) {
            $this->warn("Dry run only. Re-run with --commit to copy files and update {$target} {$imageColumn}.");

            return self::SUCCESS;
        }

        DB::transaction(function () use ($matched, $disk, $imageColumn, $storageDirectory, $target): void {
            foreach ($matched as $item) {
                /** @var Model $record */
                $record = $item['record'];
                $path = $this->copySingleImage($record, $item['image'], $disk, $storageDirectory);

                $record->forceFill([$imageColumn => $path])->save();

                Log::info(ucfirst($target).' image synchronized.', [
                    'id' => $record->id,
                    'slug' => $record->getAttribute('slug'),
                    'name' => $record->getAttribute('name'),
                    'image_path' => $path,
                ]);
            }
        });

        $this->info(ucfirst($target).' image import completed.');

        return self::SUCCESS;
    }

    private function sourceImages(string $source): Collection
    {
        return collect(File::files($source))
            ->filter(function ($file): bool {
                $extension = strtolower($file->getExtension());

                if (! in_array($extension, self::SUPPORTED_EXTENSIONS, true)) {
                    return false;
                }

                return @getimagesize($file->getPathname()) !== false;
            })
            ->sortBy(fn ($file) => Str::lower($file->getFilename()))
            ->values();
    }

    private function productIndex(Collection $products): array
    {
        $index = [];

        foreach ($products as $product) {
            foreach ([$product->slug, $product->sku, $product->name] as $identifier) {
                $key = $this->matchKey((string) $identifier);
                if ($key !== '') {
                    $index[$key] = $product;
                }
            }
        }

        return $index;
    }

    private function recordIndex(Collection $records, array $identifierFields): array
    {
        $index = [];

        foreach ($records as $record) {
            foreach ($identifierFields as $field) {
                $key = $this->matchKey((string) $record->getAttribute($field));
                if ($key !== '') {
                    $index[$key] = $record;
                }
            }
        }

        return $index;
    }

    private function matchKey(string $value): string
    {
        $key = Str::slug(pathinfo($value, PATHINFO_FILENAME));
        $key = preg_replace('/-(main|primary|featured|thumbnail|thumb|front|back|side|gallery|image|img|photo)(-\d+)?$/', '', $key) ?: $key;
        $key = preg_replace('/-\d+$/', '', $key) ?: $key;

        return trim($key, '-');
    }

    private function copyImages(Product $product, Collection $images, string $disk): array
    {
        return $images
            ->values()
            ->map(function ($image, int $index) use ($product, $disk): string {
                $extension = strtolower($image->getExtension());
                $hash = substr(sha1_file($image->getPathname()), 0, 16);
                $filename = sprintf('%02d-%s.%s', $index + 1, $hash, $extension);
                $path = "products/{$product->slug}/{$filename}";

                if (! Storage::disk($disk)->exists($path)) {
                    Storage::disk($disk)->put($path, File::get($image->getPathname()));
                }

                return $path;
            })
            ->all();
    }

    private function copySingleImage(Model $record, $image, string $disk, string $directory): string
    {
        $extension = strtolower($image->getExtension());
        $hash = substr(sha1_file($image->getPathname()), 0, 16);
        $filename = sprintf('%s.%s', $hash, $extension);
        $slug = $record->getAttribute('slug') ?: Str::slug((string) $record->getAttribute('name'));
        $path = "{$directory}/{$slug}/{$filename}";

        if (! Storage::disk($disk)->exists($path)) {
            Storage::disk($disk)->put($path, File::get($image->getPathname()));
        }

        return $path;
    }
}
