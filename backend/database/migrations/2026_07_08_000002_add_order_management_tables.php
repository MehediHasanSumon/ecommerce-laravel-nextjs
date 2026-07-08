<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            if (! Schema::hasColumn('orders', 'shipping_status')) {
                $table->string('shipping_status', 40)->default('pending')->after('payment_status')->index();
            }
            if (! Schema::hasColumn('orders', 'customer_notes')) {
                $table->text('customer_notes')->nullable()->after('summary_snapshot');
            }
            if (! Schema::hasColumn('orders', 'admin_notes')) {
                $table->text('admin_notes')->nullable()->after('customer_notes');
            }
        });

        Schema::create('order_status_histories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->string('type', 40)->index();
            $table->string('from_status', 40)->nullable();
            $table->string('to_status', 40);
            $table->string('title');
            $table->text('note')->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_status_histories');

        Schema::table('orders', function (Blueprint $table): void {
            foreach (['shipping_status', 'customer_notes', 'admin_notes'] as $column) {
                if (Schema::hasColumn('orders', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
