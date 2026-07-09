<?php

use App\Support\Identifiers\SkuGenerator;
use App\Support\Identifiers\SlugGenerator;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

beforeEach(function (): void {
    Schema::dropIfExists('identifier_variants');
    Schema::dropIfExists('identifier_records');

    Schema::create('identifier_records', function (Blueprint $table): void {
        $table->id();
        $table->string('slug')->nullable()->unique();
        $table->string('sku', 100)->nullable()->unique();
        $table->unsignedBigInteger('scope_id')->nullable();
    });

    Schema::create('identifier_variants', function (Blueprint $table): void {
        $table->id();
        $table->string('sku', 100)->nullable()->unique();
    });
});

it('generates clean slugs from source text', function (): void {
    expect(SlugGenerator::generate('Apple iPhone 16 Pro!!!', 'identifier_records'))
        ->toBe('apple-iphone-16-pro');
});

it('adds a numeric suffix when a slug already exists', function (): void {
    DB::table('identifier_records')->insert(['slug' => 'apple-iphone-16-pro']);

    $slug = SlugGenerator::generate('Apple iPhone 16 Pro', 'identifier_records');

    expect($slug)
        ->toStartWith('apple-iphone-16-pro-')
        ->and($slug)->toMatch('/^apple-iphone-16-pro-\d{4}$/');
});

it('checks slug uniqueness inside the provided scope', function (): void {
    DB::table('identifier_records')->insert(['slug' => 'large', 'scope_id' => 1]);

    expect(SlugGenerator::generate('Large', 'identifier_records', scope: ['scope_id' => 2]))
        ->toBe('large');
});

it('limits long generated slugs', function (): void {
    $slug = SlugGenerator::generate(str_repeat('Very Long Product Name ', 20), 'identifier_records', maxLength: 60);

    expect(strlen($slug))->toBeLessThanOrEqual(60);
});

it('rejects empty slug source values', function (): void {
    SlugGenerator::generate('    ', 'identifier_records');
})->throws(\InvalidArgumentException::class);

it('generates uppercase SKUs from source text', function (): void {
    expect(SkuGenerator::generate('Apple iPhone 16 Pro', 'identifier_records'))
        ->toBe('APPLE-IPHONE-16-PRO');
});

it('keeps SKUs unique across multiple datasets', function (): void {
    DB::table('identifier_records')->insert(['sku' => 'APPLE-IPHONE-16-PRO']);
    DB::table('identifier_variants')->insert(['sku' => 'APPLE-IPHONE-16-PRO-1234']);

    $sku = SkuGenerator::generate('Apple iPhone 16 Pro', ['identifier_records', 'identifier_variants']);

    expect($sku)
        ->toStartWith('APPLE-IPHONE-16-PRO-')
        ->and($sku)->toMatch('/^APPLE-IPHONE-16-PRO-\d{4}$/');
});

it('limits long generated SKUs', function (): void {
    $sku = SkuGenerator::generate(str_repeat('Premium Wireless Headphone ', 10), 'identifier_records', maxLength: 40);

    expect(strlen($sku))->toBeLessThanOrEqual(40);
});

it('rejects empty SKU source values', function (): void {
    SkuGenerator::generate('', 'identifier_records');
})->throws(\InvalidArgumentException::class);
