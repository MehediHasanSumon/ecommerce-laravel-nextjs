<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_settings', function (Blueprint $table) {
            $table->id();
            $table->string('store_name');
            $table->string('store_url')->nullable();
            $table->string('store_email')->nullable()->index();
            $table->string('store_phone')->nullable();
            $table->unsignedSmallInteger('products_per_page')->default(24);
            $table->string('default_product_sorting')->default('latest')->index();
            $table->string('default_product_view')->default('grid');
            $table->boolean('enable_reviews')->default(true)->index();
            $table->boolean('enable_wishlist')->default(true)->index();
            $table->boolean('enable_compare')->default(false);
            $table->boolean('enable_stock_management')->default(true);
            $table->boolean('enable_guest_checkout')->default(true);
            $table->boolean('require_login_before_checkout')->default(false);
            $table->unsignedBigInteger('minimum_order_amount_cents')->default(0);
            $table->unsignedBigInteger('maximum_order_amount_cents')->nullable();
            $table->unsignedInteger('low_stock_threshold')->default(5);
            $table->boolean('allow_backorders')->default(false);
            $table->boolean('hide_out_of_stock_products')->default(false)->index();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_settings');
    }
};
