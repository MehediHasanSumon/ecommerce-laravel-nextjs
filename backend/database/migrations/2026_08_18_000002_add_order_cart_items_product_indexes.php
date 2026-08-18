<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table): void {
            $table->index(['product_id', 'quantity'], 'order_items_product_qty_index');
            $table->index('product_variant_id', 'order_items_variant_index');
        });

        Schema::table('cart_items', function (Blueprint $table): void {
            $table->index('product_id', 'cart_items_product_index');
            $table->index('product_variant_id', 'cart_items_variant_index');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table): void {
            $table->dropIndex('order_items_product_qty_index');
            $table->dropIndex('order_items_variant_index');
        });

        Schema::table('cart_items', function (Blueprint $table): void {
            $table->dropIndex('cart_items_product_index');
            $table->dropIndex('cart_items_variant_index');
        });
    }
};
