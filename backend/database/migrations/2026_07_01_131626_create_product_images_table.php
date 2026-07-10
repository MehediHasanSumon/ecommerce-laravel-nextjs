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
        Schema::create('product_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->text('url');
            $table->string('alt_text')->nullable();
            $table->string('type')->default('gallery')->index();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_primary')->default(false)->index();
            $table->timestamps();

            $table->index(['product_id', 'sort_order']);
            $table->index(['product_id', 'is_primary']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_images');
    }
};
