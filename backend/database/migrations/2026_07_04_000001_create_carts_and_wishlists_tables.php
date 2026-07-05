<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('carts')) {
            Schema::create('carts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
                $table->string('guest_token', 120)->nullable()->index();
                $table->string('status', 30)->default('active')->index();
                $table->string('coupon_code', 100)->nullable();
                $table->unsignedBigInteger('coupon_discount_cents')->default(0);
                $table->timestamps();
                $table->softDeletes();

                $table->index(['user_id', 'status']);
                $table->index(['guest_token', 'status']);
            });
        }

        if (! Schema::hasTable('cart_items')) {
            Schema::create('cart_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('cart_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
                $table->foreignId('product_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
                $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->nullOnDelete()->cascadeOnUpdate();
                $table->string('item_key', 191)->index();
                $table->unsignedInteger('quantity')->default(1);
                $table->unsignedBigInteger('unit_price_cents')->default(0);
                $table->unsignedBigInteger('discounted_price_cents')->nullable();
                $table->unsignedBigInteger('line_subtotal_cents')->default(0);
                $table->unsignedBigInteger('line_discount_cents')->default(0);
                $table->json('selection_snapshot');
                $table->json('pricing_snapshot')->nullable();
                $table->json('tax_snapshot')->nullable();
                $table->timestamps();

                $table->unique(['cart_id', 'item_key']);
            });
        }

        if (! Schema::hasTable('wishlists')) {
            Schema::create('wishlists', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
                $table->string('guest_token', 120)->nullable()->index();
                $table->timestamps();
                $table->softDeletes();

                $table->index(['user_id']);
                $table->index(['guest_token']);
            });
        }

        if (! Schema::hasTable('wishlist_items')) {
            Schema::create('wishlist_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('wishlist_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
                $table->foreignId('product_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
                $table->timestamps();

                $table->unique(['wishlist_id', 'product_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('wishlist_items');
        Schema::dropIfExists('wishlists');
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('carts');
    }
};
