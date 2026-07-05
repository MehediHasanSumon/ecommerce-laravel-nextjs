<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImportProductImages extends Command
{
    protected $signature = 'products:import-images
        {source=C:\Users\sumon\Downloads\image\image : Directory containing source images}
        {--commit : Persist changes. Without this option the command runs as a dry run}
        {--limit= : Limit number of matched products to process}
        {--disk=public : Storage disk used for copied product images}
        {--strategy=match : Matching strategy: match, sequential, or repeat}';

    protected $description = 'Import matched product images into storage and sync only product image records.';

    private const SUPPORTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

    public function handle(): int
    {
        $source = (string) $this->argument('source');
        $disk = (string) $this->option('disk');
        $commit = (bool) $this->option('commit');
        $limit = $this->option('limit') ? max(1, (int) $this->option('limit')) : null;
        $strategy = (string) $this->option('strategy');

        if (! in_array($strategy, ['match', 'sequential', 'repeat'], true)) {
            $this->error('Invalid --strategy value. Supported values: match, sequential, repeat');

            return self::FAILURE;
        }

        if (! File::isDirectory($source)) {
            $this->error("Source directory does not exist: {$source}");

            return self::FAILURE;
        }

        $products = Product::query()
            ->with(['images' => fn($query) => $query->orderBy('sort_order')->orderBy('id')])
            ->orderBy('id')
            ->get();
        $images = $this->sourceImages($source);

        $matches = [];
        $skippedImages = [];

        if ($strategy === 'repeat') {
            if ($images->isEmpty()) {
                $this->error('No supported images found in source directory.');

                return self::FAILURE;
            }

            foreach ($products as $index => $product) {
                $image = $images->get($index % $images->count());

                $matches[$product->id] ??= ['product' => $product, 'images' => []];
                $matches[$product->id]['images'][] = $image;
            }
        } elseif ($strategy === 'sequential') {
            foreach ($images as $index => $image) {
                $product = $products->get($index);

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
                $matches[$product->id]['images'][] = $image;
            }
        }

        $matched = collect($matches)->values();
        if ($limit) {
            $matched = $matched->take($limit);
        }

        $summary = [
            'source' => $source,
            'commit' => $commit,
            'strategy' => $strategy,
            'source_images' => $images->count(),
            'matched_products' => $matched->count(),
            'matched_images' => $matched->sum(fn($item) => count($item['images'])),
            'skipped_images' => count($skippedImages),
        ];

        $this->info(($commit ? 'Importing' : 'Dry run for') . ' product images');
        $this->table(['Metric', 'Value'], collect($summary)->map(fn($value, $key) => [$key, is_bool($value) ? ($value ? 'yes' : 'no') : $value])->all());

        foreach ($skippedImages as $path) {
            $this->line("SKIP image without matching product: {$path}");
        }

        foreach ($matched as $item) {
            /** @var Product $product */
            $product = $item['product'];
            $this->line("MATCH {$product->sku} | {$product->slug} <= " . count($item['images']) . ' image(s)');
        }

        Log::info('Product image import scan completed.', $summary + [
            'skipped_images' => $skippedImages,
            'matched_products' => $matched->map(fn($item) => [
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
                $paths = $this->copyImages($product, collect($item['images']), $disk);

                ProductImage::query()->where('product_id', $product->id)->delete();

                foreach ($paths as $index => $path) {
                    ProductImage::query()->create([
                        'product_id' => $product->id,
                        'product_variant_id' => null,
                        'url' => $path,
                        'alt_text' => $product->name . ' image ' . ($index + 1),
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
            ->sortBy(fn($file) => Str::lower($file->getFilename()))
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
}
