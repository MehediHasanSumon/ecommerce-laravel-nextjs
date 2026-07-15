<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discount_collection', function (Blueprint $table): void {
            $table->foreignId('discount_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_collection_id')->constrained('collections')->cascadeOnDelete()->cascadeOnUpdate();
            $table->timestamps();

            $table->primary(['discount_id', 'product_collection_id'], 'discount_collection_primary');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discount_collection');
    }
};
