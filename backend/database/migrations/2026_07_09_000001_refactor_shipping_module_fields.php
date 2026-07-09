<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('shipping_zones')) {
            Schema::table('shipping_zones', function (Blueprint $table): void {
                if (! Schema::hasColumn('shipping_zones', 'description')) {
                    $table->text('description')->nullable()->after('countries');
                }
            });
        }

        if (Schema::hasTable('shipping_methods')) {
            Schema::table('shipping_methods', function (Blueprint $table): void {
                if (! Schema::hasColumn('shipping_methods', 'minimum_order_amount_cents')) {
                    $table->unsignedBigInteger('minimum_order_amount_cents')->default(0)->after('rate_cents');
                }
            });
        }

        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table): void {
                if (! Schema::hasColumn('orders', 'shipping_zone_id')) {
                    $table->foreignId('shipping_zone_id')
                        ->nullable()
                        ->after('shipping_method_id')
                        ->constrained('shipping_zones')
                        ->nullOnDelete()
                        ->cascadeOnUpdate();
                }

                if (! Schema::hasColumn('orders', 'shipping_zone_name')) {
                    $table->string('shipping_zone_name')->nullable()->after('shipping_zone_id');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table): void {
                if (Schema::hasColumn('orders', 'shipping_zone_id')) {
                    $table->dropConstrainedForeignId('shipping_zone_id');
                }
                if (Schema::hasColumn('orders', 'shipping_zone_name')) {
                    $table->dropColumn('shipping_zone_name');
                }
            });
        }

        if (Schema::hasTable('shipping_methods') && Schema::hasColumn('shipping_methods', 'minimum_order_amount_cents')) {
            Schema::table('shipping_methods', fn (Blueprint $table) => $table->dropColumn('minimum_order_amount_cents'));
        }

        if (Schema::hasTable('shipping_zones') && Schema::hasColumn('shipping_zones', 'description')) {
            Schema::table('shipping_zones', fn (Blueprint $table) => $table->dropColumn('description'));
        }
    }
};
