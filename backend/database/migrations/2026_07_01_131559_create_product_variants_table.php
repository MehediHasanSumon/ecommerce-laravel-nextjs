<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('combination_key', 500)->nullable();
            $table->string('sku', 100)->unique();
            $table->string('barcode')->nullable()->index();
            $table->unsignedBigInteger('price_cents')->nullable();
            $table->unsignedBigInteger('compare_at_price_cents')->nullable();
            $table->unsignedBigInteger('cost_price_cents')->nullable();
            $table->integer('stock_quantity')->nullable()->default(null);
            $table->boolean('track_inventory')->nullable();
            $table->integer('low_stock_threshold')->nullable();
            $table->unsignedInteger('weight_grams')->nullable();
            $table->unsignedInteger('length_cm')->nullable();
            $table->unsignedInteger('width_cm')->nullable();
            $table->unsignedInteger('height_cm')->nullable();
            $table->string('status')->default('active')->index();
            $table->boolean('is_primary')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['product_id', 'status']);
            $table->unique(['product_id', 'combination_key'], 'product_variants_product_combination_unique');
            $table->unique(['product_id', 'is_primary'], 'product_variants_one_primary_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach ([
            'cart_items',
            'product_images',
            'stock_movements',
            'inventories',
            'product_variant_attribute_value',
        ] as $table) {
            Schema::dropIfExists($table);
        }

        Schema::dropIfExists('product_variants');
    }
};
