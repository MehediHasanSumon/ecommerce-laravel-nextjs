<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('collections', function (Blueprint $table): void {
            $table->boolean('discount_enabled')->default(false)->index();
            $table->string('discount_apply_to')->default('entire_collection')->index();
            $table->string('display_position_anchor')->default('products')->index();
            $table->string('display_position_placement')->default('before')->index();
        });

        DB::table('collections')
            ->whereNotNull('discount_type')
            ->whereNotNull('discount_value')
            ->update(['discount_enabled' => true]);

        DB::table('collections')->where('slug', 'flash-sale')->update([
            'display_position_anchor' => 'promo_banners',
            'display_position_placement' => 'before',
        ]);
        DB::table('collections')->where('slug', 'trending-now')->update([
            'display_position_anchor' => 'top_brands',
            'display_position_placement' => 'before',
        ]);
        DB::table('collections')->where('slug', 'best-sellers')->update([
            'display_position_anchor' => 'top_brands',
            'display_position_placement' => 'before',
        ]);
        DB::table('collections')->where('slug', 'new-arrivals')->update([
            'display_position_anchor' => 'products',
            'display_position_placement' => 'before',
        ]);
    }

    public function down(): void
    {
        Schema::table('collections', function (Blueprint $table): void {
            $table->dropColumn([
                'discount_enabled',
                'discount_apply_to',
                'display_position_anchor',
                'display_position_placement',
            ]);
        });
    }
};
