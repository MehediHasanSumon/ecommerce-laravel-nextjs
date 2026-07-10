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
        {--limit= : Limit number of records to process}
        {--disk=public : Storage disk used for copied images}';

    protected $description = 'Import source images into product, category, or brand records.';

    private const SUPPORTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

    private const PRODUCT_IMAGE_LIMIT = 4;

    public function handle(): int
    {
        $source = (string) $this->argument('source');
        $disk = (string) $this->option('disk');
        $commit = (bool) $this->option('commit');
        $limit = $this->option('limit') ? max(1, (int) $this->option('limit')) : null;
        $target = $this->choice('Select image import target', [
            1 => 'product',
            2 => 'category',
            3 => 'brand',
        ], 1);

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
                imageColumn: 'image_url',
                storageDirectory: 'categories',
            ),
            'brand' => $this->importSingleImages(
                target: 'brand',
                records: Brand::query()->orderBy('id')->get(),
                source: $source,
                images: $images,
                disk: $disk,
                commit: $commit,
                limit: $limit,
                imageColumn: 'logo_url',
                storageDirectory: 'brands',
            ),
            default => $this->importProductImages($source, $images, $disk, $commit, $limit),
        };
    }

    private function importProductImages(string $source, Collection $images, string $disk, bool $commit, ?int $limit): int
    {
        $products = Product::query()
            ->with(['images' => fn ($query) => $query->orderBy('sort_order')->orderBy('id')])
            ->orderBy('id')
            ->get();

        $matched = $products
            ->map(fn (Product $product, int $index): array => [
                'product' => $product,
                'images' => $this->cycledImages($images, $index * self::PRODUCT_IMAGE_LIMIT, self::PRODUCT_IMAGE_LIMIT),
            ]);

        if ($limit) {
            $matched = $matched->take($limit);
        }

        $summary = [
            'source' => $source,
            'target' => 'product',
            'commit' => $commit,
            'images_per_product' => self::PRODUCT_IMAGE_LIMIT,
            'source_images' => $images->count(),
            'updated_products' => $matched->count(),
            'assigned_images' => $matched->sum(fn ($item) => count($item['images'])),
        ];

        $this->info(($commit ? 'Importing' : 'Dry run for').' product images');
        $this->table(['Metric', 'Value'], collect($summary)->map(fn ($value, $key) => [$key, is_bool($value) ? ($value ? 'yes' : 'no') : $value])->all());

        foreach ($matched as $item) {
            /** @var Product $product */
            $product = $item['product'];
            $assigned = collect($item['images'])->map->getFilename()->join(', ');
            $this->line("ASSIGN {$product->sku} | {$product->slug} <= {$assigned}");
        }

        Log::info('Product image import scan completed.', $summary + [
            'updated_products' => $matched->map(fn ($item) => [
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
        string $imageColumn,
        string $storageDirectory,
    ): int {
        $matched = $records
            ->values()
            ->map(fn (Model $record, int $index): array => [
                'record' => $record,
                'image' => $images->get($index % $images->count()),
            ]);

        if ($limit) {
            $matched = $matched->take($limit);
        }

        $summary = [
            'source' => $source,
            'target' => $target,
            'commit' => $commit,
            'source_images' => $images->count(),
            'updated_records' => $matched->count(),
            'updated_column' => $imageColumn,
        ];

        $this->info(($commit ? 'Importing' : 'Dry run for')." {$target} images");
        $this->table(['Metric', 'Value'], collect($summary)->map(fn ($value, $key) => [$key, is_bool($value) ? ($value ? 'yes' : 'no') : $value])->all());

        foreach ($matched as $item) {
            /** @var Model $record */
            $record = $item['record'];
            $this->line("ASSIGN {$record->getAttribute('slug')} | {$record->getAttribute('name')} <= {$item['image']->getFilename()}");
        }

        Log::info(ucfirst($target).' image import scan completed.', $summary + [
            'updated_records' => $matched->map(fn ($item) => [
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

    private function cycledImages(Collection $images, int $offset, int $count): array
    {
        $imageCount = $images->count();

        return collect(range(0, $count - 1))
            ->map(fn (int $index) => $images->get(($offset + $index) % $imageCount))
            ->all();
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
