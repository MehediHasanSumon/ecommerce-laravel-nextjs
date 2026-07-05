<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('discounts', function (Blueprint $table): void {
            if (! Schema::hasColumn('discounts', 'minimum_order_amount')) {
                $table->unsignedBigInteger('minimum_order_amount')->nullable()->after('value');
            }
            if (! Schema::hasColumn('discounts', 'maximum_discount')) {
                $table->unsignedBigInteger('maximum_discount')->nullable()->after('minimum_order_amount');
            }
            if (! Schema::hasColumn('discounts', 'usage_per_customer')) {
                $table->unsignedInteger('usage_per_customer')->nullable()->after('usage_limit');
            }
            if (! Schema::hasColumn('discounts', 'total_used')) {
                $table->unsignedInteger('total_used')->default(0)->after('usage_per_customer');
            }
            if (! Schema::hasColumn('discounts', 'first_order_only')) {
                $table->boolean('first_order_only')->default(false)->after('status');
            }
            if (! Schema::hasColumn('discounts', 'free_shipping')) {
                $table->boolean('free_shipping')->default(false)->after('first_order_only');
            }
            if (! Schema::hasColumn('discounts', 'stackable')) {
                $table->boolean('stackable')->default(false)->after('free_shipping');
            }
            if (! Schema::hasColumn('discounts', 'applicable_scope')) {
                $table->string('applicable_scope', 50)->default('all')->after('stackable')->index();
            }
        });

        if (! Schema::hasTable('discount_brand')) {
            Schema::create('discount_brand', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('discount_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
                $table->foreignId('brand_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
                $table->timestamps();

                $table->unique(['discount_id', 'brand_id']);
            });
        }

        if (! Schema::hasTable('discount_excluded_product')) {
            Schema::create('discount_excluded_product', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('discount_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
                $table->foreignId('product_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
                $table->timestamps();

                $table->unique(['discount_id', 'product_id']);
            });
        }

        if (! Schema::hasTable('discount_excluded_category')) {
            Schema::create('discount_excluded_category', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('discount_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
                $table->foreignId('category_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
                $table->timestamps();

                $table->unique(['discount_id', 'category_id']);
            });
        }

        if (! Schema::hasTable('discount_user_usages')) {
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
    }

    public function down(): void
    {
        Schema::dropIfExists('discount_user_usages');
        Schema::dropIfExists('discount_excluded_category');
        Schema::dropIfExists('discount_excluded_product');
        Schema::dropIfExists('discount_brand');

        Schema::table('discounts', function (Blueprint $table): void {
            foreach ([
                'minimum_order_amount',
                'maximum_discount',
                'usage_per_customer',
                'total_used',
                'first_order_only',
                'free_shipping',
                'stackable',
                'applicable_scope',
            ] as $column) {
                if (Schema::hasColumn('discounts', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
