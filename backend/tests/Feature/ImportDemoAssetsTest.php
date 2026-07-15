<?php

use App\Models\Category;
use App\Models\Product;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

it('imports product folders placed directly inside the source folder', function (): void {
    Storage::fake('public');

    $source = storage_path('framework/testing/demo-assets-'.Str::uuid());
    $productDirectory = $source.DIRECTORY_SEPARATOR.'Apple_iPhone_15_Pro';

    File::ensureDirectoryExists($productDirectory);
    File::put(
        $productDirectory.DIRECTORY_SEPARATOR.'Apple_iPhone_15_Pro_01.png',
        base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
    );

    try {
        $this->artisan('demo:import-assets', [
            'source' => $source,
            '--disk' => 'public',
        ])
            ->expectsOutputToContain('Flat product folder structure detected.')
            ->assertSuccessful();

        $category = Category::query()->where('slug', 'imported-products')->firstOrFail();
        $product = Product::query()->where('slug', 'apple-iphone-15-pro')->firstOrFail();

        expect($product->category_id)->toBe($category->id)
            ->and($product->brand?->slug)->toBe('apple')
            ->and($product->images)->toHaveCount(1);

        Storage::disk('public')->assertExists($product->images->first()->url);
    } finally {
        File::deleteDirectory($source);
    }
});
