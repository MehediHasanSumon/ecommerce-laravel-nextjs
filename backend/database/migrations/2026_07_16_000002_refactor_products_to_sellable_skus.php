<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('products', 'default_variant_id')) {
            Schema::table('products', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('default_variant_id');
            });
        }

        Schema::table('products', function (Blueprint $table): void {
            $table->unsignedBigInteger('base_price_cents')->nullable()->change();
        });

        if (! Schema::hasColumn('product_variants', 'combination_key')) {
            Schema::table('product_variants', function (Blueprint $table): void {
                $table->string('combination_key', 500)->nullable()->after('product_id');
            });
        }

        DB::table('product_variants')
            ->select(['id', 'product_id', 'track_inventory'])
            ->orderBy('id')
            ->chunkById(200, function ($variants): void {
                foreach ($variants as $variant) {
                    $valueIds = DB::table('product_variant_attribute_value')
                        ->where('product_variant_id', $variant->id)
                        ->pluck('attribute_value_id')
                        ->map(fn ($id): int => (int) $id)
                        ->unique()
                        ->sort()
                        ->values();

                    $combinationKey = $valueIds->isNotEmpty()
                        ? $valueIds->implode(':')
                        : 'legacy-'.$variant->id;

                    $updates = ['combination_key' => $combinationKey];
                    if ($variant->track_inventory === null) {
                        $updates['track_inventory'] = (bool) DB::table('products')
                            ->where('id', $variant->product_id)
                            ->value('track_inventory');
                    }

                    DB::table('product_variants')->where('id', $variant->id)->update($updates);
                }
            });

        $duplicateGroups = DB::table('product_variants')
            ->select(['product_id', 'combination_key'])
            ->whereNotNull('combination_key')
            ->groupBy(['product_id', 'combination_key'])
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($duplicateGroups as $group) {
            $variants = DB::table('product_variants')
                ->where('product_id', $group->product_id)
                ->where('combination_key', $group->combination_key)
                ->orderByRaw('CASE WHEN deleted_at IS NULL THEN 0 ELSE 1 END')
                ->orderBy('id')
                ->pluck('id');

            $duplicateIds = $variants->slice(1)->values();
            if ($duplicateIds->isEmpty()) {
                continue;
            }

            foreach ($duplicateIds as $duplicateId) {
                DB::table('product_variants')
                    ->where('id', $duplicateId)
                    ->update(['combination_key' => 'legacy-duplicate-'.$duplicateId]);
            }
        }

        Schema::table('product_variants', function (Blueprint $table): void {
            $table->unique(['product_id', 'combination_key'], 'product_variants_product_combination_unique');
        });
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table): void {
            $table->dropUnique('product_variants_product_combination_unique');
            $table->dropColumn('combination_key');
        });

        DB::table('products')->whereNull('base_price_cents')->update(['base_price_cents' => 0]);

        Schema::table('products', function (Blueprint $table): void {
            $table->unsignedBigInteger('base_price_cents')->nullable(false)->change();
            $table->foreignId('default_variant_id')
                ->nullable()
                ->after('sku')
                ->constrained('product_variants')
                ->nullOnDelete();
        });
    }
};
