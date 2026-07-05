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
        Schema::create('product_collection_product', function (Blueprint $table) {
            $table->foreignId('product_collection_id')->constrained('collections')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->primary(['product_collection_id', 'product_id'], 'collection_product_primary');
            $table->index(['product_collection_id', 'sort_order'], 'collection_product_sort_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_collection_product');
    }
};
