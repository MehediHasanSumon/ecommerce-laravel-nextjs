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
        Schema::create('discounts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->nullable()->unique();
            $table->string('type')->index();
            $table->unsignedBigInteger('value');
            $table->unsignedBigInteger('minimum_order_amount')->nullable();
            $table->unsignedBigInteger('maximum_discount')->nullable();
            $table->timestamp('starts_at')->nullable()->index();
            $table->timestamp('ends_at')->nullable()->index();
            $table->string('status')->default('active')->index();
            $table->boolean('first_order_only')->default(false);
            $table->boolean('free_shipping')->default(false);
            $table->boolean('stackable')->default(false);
            $table->string('applicable_scope', 50)->default('all')->index();
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('usage_per_customer')->nullable();
            $table->unsignedInteger('total_used')->default(0);
            $table->timestamps();
        });

        Schema::create('discount_category', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('discount_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->timestamps();

            $table->unique(['discount_id', 'category_id']);
        });

        Schema::create('discount_brand', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('discount_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('brand_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->timestamps();

            $table->unique(['discount_id', 'brand_id']);
        });

        Schema::create('discount_collection', function (Blueprint $table): void {
            $table->foreignId('discount_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_collection_id')->constrained('collections')->cascadeOnDelete()->cascadeOnUpdate();
            $table->timestamps();

            $table->primary(['discount_id', 'product_collection_id'], 'discount_collection_primary');
        });

        Schema::create('discount_excluded_category', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('discount_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->timestamps();

            $table->unique(['discount_id', 'category_id']);
        });

        Schema::create('discount_user_usages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('discount_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->unsignedInteger('usage_count')->default(0);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->unique(['discount_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('discount_user_usages');
        Schema::dropIfExists('discount_excluded_category');
        Schema::dropIfExists('discount_collection');
        Schema::dropIfExists('discount_brand');
        Schema::dropIfExists('discount_category');
        Schema::dropIfExists('discounts');
    }
};
