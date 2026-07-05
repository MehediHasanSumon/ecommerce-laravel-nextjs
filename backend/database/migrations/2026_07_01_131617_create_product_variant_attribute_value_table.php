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
        Schema::create('product_variant_attribute_value', function (Blueprint $table) {
            $table->foreignId('product_variant_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('attribute_id')->constrained('attributes')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('attribute_value_id')->constrained('attribute_values')->cascadeOnDelete()->cascadeOnUpdate();
            $table->timestamps();

            $table->primary(['product_variant_id', 'attribute_id'], 'variant_attribute_value_primary');
            $table->index(['attribute_id', 'attribute_value_id'], 'variant_attr_value_lookup_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_variant_attribute_value');
    }
};
