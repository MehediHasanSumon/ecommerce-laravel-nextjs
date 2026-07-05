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
        Schema::create('inventories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('warehouse_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->integer('quantity_on_hand')->default(0);
            $table->integer('quantity_reserved')->default(0);
            $table->integer('quantity_available')->default(0);
            $table->integer('reorder_level')->default(0);
            $table->timestamps();

            $table->unique(['product_id', 'product_variant_id', 'warehouse_id'], 'inventory_product_variant_warehouse_unique');
            $table->index(['product_id', 'warehouse_id']);
            $table->index(['product_variant_id', 'warehouse_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventories');
    }
};
