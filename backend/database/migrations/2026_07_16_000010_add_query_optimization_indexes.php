<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->index(['payment_status', 'placed_at'], 'orders_payment_status_placed_index');
            $table->index(['status', 'placed_at'], 'orders_status_placed_index');
            $table->index(['user_id', 'placed_at'], 'orders_user_placed_index');
            $table->index(['guest_customer_id', 'placed_at'], 'orders_guest_customer_placed_index');
        });

        Schema::table('payment_transactions', function (Blueprint $table): void {
            $table->index(['status', 'created_at'], 'payment_transactions_status_created_index');
            $table->index(['gateway', 'status', 'created_at'], 'payment_transactions_gateway_status_created_index');
        });

        Schema::table('products', function (Blueprint $table): void {
            $table->index(['status', 'is_featured', 'published_at'], 'products_status_featured_published_index');
        });

        Schema::table('product_reviews', function (Blueprint $table): void {
            $table->index(['status', 'created_at'], 'product_reviews_status_created_index');
        });

        Schema::table('customer_notifications', function (Blueprint $table): void {
            $table->index(['user_id', 'read_at', 'created_at'], 'customer_notifications_user_read_created_index');
        });

        Schema::table('collections', function (Blueprint $table): void {
            $table->index(['status', 'show_on_home', 'starts_at', 'ends_at'], 'collections_runtime_schedule_index');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropIndex('orders_payment_status_placed_index');
            $table->dropIndex('orders_status_placed_index');
            $table->dropIndex('orders_user_placed_index');
            $table->dropIndex('orders_guest_customer_placed_index');
        });
        Schema::table('payment_transactions', function (Blueprint $table): void {
            $table->dropIndex('payment_transactions_status_created_index');
            $table->dropIndex('payment_transactions_gateway_status_created_index');
        });
        Schema::table('products', fn (Blueprint $table) => $table->dropIndex('products_status_featured_published_index'));
        Schema::table('product_reviews', fn (Blueprint $table) => $table->dropIndex('product_reviews_status_created_index'));
        Schema::table('customer_notifications', fn (Blueprint $table) => $table->dropIndex('customer_notifications_user_read_created_index'));
        Schema::table('collections', fn (Blueprint $table) => $table->dropIndex('collections_runtime_schedule_index'));
    }
};
