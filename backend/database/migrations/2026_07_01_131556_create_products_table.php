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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('brand_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('short_description')->nullable();
            $table->longText('description')->nullable();
            $table->string('product_type')->default('physical')->index();
            $table->string('status')->default('draft')->index();
            $table->string('sku', 100)->nullable()->unique();
            $table->unsignedBigInteger('base_price_cents');
            $table->unsignedBigInteger('compare_at_price_cents')->nullable();
            $table->unsignedBigInteger('cost_price_cents')->nullable();
            $table->char('currency', 3)->default('USD');
            $table->boolean('track_inventory')->default(true);
            $table->integer('stock_quantity')->nullable();
            $table->integer('low_stock_threshold')->nullable();
            $table->boolean('is_featured')->default(false)->index();
            $table->boolean('is_new')->default(false)->index();
            $table->boolean('is_best_seller')->default(false)->index();
            $table->boolean('is_flash_sale')->default(false)->index();
            $table->timestamp('flash_sale_ends_at')->nullable()->index();
            $table->boolean('free_shipping')->default(false);
            $table->decimal('rating_average', 3, 2)->default(0);
            $table->unsignedInteger('review_count')->default(0);
            $table->timestamp('published_at')->nullable()->index();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'published_at']);
            $table->index(['category_id', 'status']);
            $table->index(['brand_id', 'status']);
            $table->index('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
