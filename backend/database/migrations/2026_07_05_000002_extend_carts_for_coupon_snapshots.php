<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('carts', function (Blueprint $table): void {
            if (! Schema::hasColumn('carts', 'coupon_discount_id')) {
                $table->foreignId('coupon_discount_id')->nullable()->after('coupon_code')->constrained('discounts')->nullOnDelete()->cascadeOnUpdate();
            }
            if (! Schema::hasColumn('carts', 'coupon_snapshot')) {
                $table->json('coupon_snapshot')->nullable()->after('coupon_discount_cents');
            }
        });
    }

    public function down(): void
    {
        Schema::table('carts', function (Blueprint $table): void {
            if (Schema::hasColumn('carts', 'coupon_discount_id')) {
                $table->dropConstrainedForeignId('coupon_discount_id');
            }
            if (Schema::hasColumn('carts', 'coupon_snapshot')) {
                $table->dropColumn('coupon_snapshot');
            }
        });
    }
};
