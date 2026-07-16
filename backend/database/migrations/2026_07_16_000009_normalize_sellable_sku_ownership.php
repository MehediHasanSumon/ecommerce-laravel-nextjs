<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $attributeLessVariantIds = DB::table('product_variants')
            ->whereNull('deleted_at')
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('product_variant_attribute_value')
                    ->whereColumn('product_variant_attribute_value.product_variant_id', 'product_variants.id');
            })
            ->pluck('id');

        if ($attributeLessVariantIds->isNotEmpty()) {
            DB::table('product_variants')
                ->whereIn('id', $attributeLessVariantIds)
                ->update([
                    'status' => 'inactive',
                    'deleted_at' => now(),
                    'updated_at' => now(),
                ]);
        }

        DB::table('products')
            ->whereNull('deleted_at')
            ->whereExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('product_variants')
                    ->whereColumn('product_variants.product_id', 'products.id')
                    ->whereNull('product_variants.deleted_at')
                    ->whereExists(function ($pivotQuery): void {
                        $pivotQuery->selectRaw('1')
                            ->from('product_variant_attribute_value')
                            ->whereColumn('product_variant_attribute_value.product_variant_id', 'product_variants.id');
                    });
            })
            ->update([
                'sku' => null,
                'base_price_cents' => null,
                'compare_at_price_cents' => null,
                'cost_price_cents' => null,
                'track_inventory' => false,
                'stock_quantity' => null,
                'low_stock_threshold' => null,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Sellable SKU ownership cannot be reconstructed safely from historical product values.
    }
};
