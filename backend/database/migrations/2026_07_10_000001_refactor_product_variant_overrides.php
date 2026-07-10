<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table): void {
            $table->integer('stock_quantity')->nullable()->default(null)->change();
            $table->boolean('track_inventory')->nullable()->after('stock_quantity');
            $table->unsignedInteger('length_cm')->nullable()->after('weight_grams');
            $table->unsignedInteger('width_cm')->nullable()->after('length_cm');
            $table->unsignedInteger('height_cm')->nullable()->after('width_cm');
        });
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table): void {
            $table->integer('stock_quantity')->nullable(false)->default(0)->change();
            $table->dropColumn(['track_inventory', 'length_cm', 'width_cm', 'height_cm']);
        });
    }
};
