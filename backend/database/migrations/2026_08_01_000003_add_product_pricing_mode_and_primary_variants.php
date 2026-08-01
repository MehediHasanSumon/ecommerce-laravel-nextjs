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
            $table->string('pricing_mode', 20)->default('global')->after('status')->index();
        });

        Schema::table('product_variants', function (Blueprint $table): void {
            $table->boolean('is_primary')->nullable()->after('status');
        });

        DB::table('products')
            ->whereExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('product_variants')
                    ->whereColumn('product_variants.product_id', 'products.id')
                    ->whereNull('product_variants.deleted_at')
                    ->whereNotNull('product_variants.price_cents');
            })
            ->whereNull('base_price_cents')
            ->update(['pricing_mode' => 'variant']);

        DB::table('products')
            ->select('id')
            ->whereExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('product_variants')
                    ->whereColumn('product_variants.product_id', 'products.id')
                    ->whereNull('product_variants.deleted_at');
            })
            ->orderBy('id')
            ->chunkById(200, function ($products): void {
                foreach ($products as $product) {
                    $primaryId = DB::table('product_variants')
                        ->where('product_id', $product->id)
                        ->whereNull('deleted_at')
                        ->orderByRaw("CASE WHEN status = 'active' THEN 0 ELSE 1 END")
                        ->orderBy('id')
                        ->value('id');

                    if ($primaryId) {
                        DB::table('product_variants')
                            ->where('id', $primaryId)
                            ->update(['is_primary' => true]);
                    }
                }
            });

        Schema::table('product_variants', function (Blueprint $table): void {
            $table->unique(['product_id', 'is_primary'], 'product_variants_one_primary_unique');
        });
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table): void {
            $table->dropUnique('product_variants_one_primary_unique');
            $table->dropColumn('is_primary');
        });

        Schema::table('products', function (Blueprint $table): void {
            $table->dropIndex(['pricing_mode']);
            $table->dropColumn('pricing_mode');
        });
    }
};
