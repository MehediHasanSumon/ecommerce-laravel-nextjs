<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->foreignId('default_variant_id')
                ->nullable()
                ->after('sku')
                ->constrained('product_variants')
                ->nullOnDelete();
        });

        DB::table('products')
            ->select('id')
            ->orderBy('id')
            ->chunkById(200, function ($products): void {
                foreach ($products as $product) {
                    $defaultVariantId = DB::table('product_variants')
                        ->where('product_id', $product->id)
                        ->where('status', 'active')
                        ->whereNull('deleted_at')
                        ->orderByRaw('CASE WHEN stock_quantity IS NULL OR stock_quantity > 0 THEN 0 ELSE 1 END')
                        ->orderBy('id')
                        ->value('id');

                    if ($defaultVariantId) {
                        DB::table('products')
                            ->where('id', $product->id)
                            ->update(['default_variant_id' => $defaultVariantId]);
                    }
                }
            });

        DB::table('product_variants')
            ->whereNull('price_cents')
            ->orderBy('id')
            ->chunkById(200, function ($variants): void {
                foreach ($variants as $variant) {
                    $productPrice = DB::table('products')
                        ->where('id', $variant->product_id)
                        ->value('base_price_cents');

                    if ($productPrice !== null) {
                        DB::table('product_variants')
                            ->where('id', $variant->id)
                            ->update(['price_cents' => $productPrice]);
                    }
                }
            });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('default_variant_id');
        });
    }
};
