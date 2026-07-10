<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('product_images', 'product_variant_id')) {
            return;
        }

        DB::table('product_images')
            ->whereNotNull('product_variant_id')
            ->orWhere('type', 'variant')
            ->delete();

        Schema::table('product_images', function (Blueprint $table): void {
            $table->dropForeign(['product_variant_id']);
            $table->dropColumn('product_variant_id');
        });
    }

    public function down(): void
    {
        Schema::table('product_images', function (Blueprint $table): void {
            $table->foreignId('product_variant_id')
                ->nullable()
                ->after('product_id')
                ->constrained('product_variants')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
        });
    }
};
