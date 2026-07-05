<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $endsAt = DB::table('products')
            ->where('status', 'active')
            ->where('is_flash_sale', true)
            ->whereNotNull('flash_sale_ends_at')
            ->where('flash_sale_ends_at', '>', now())
            ->orderBy('flash_sale_ends_at')
            ->value('flash_sale_ends_at') ?: now()->addDays(7);

        $collection = DB::table('collections')->where('slug', 'flash-sale')->first();

        if (! $collection) {
            return;
        }

        DB::table('collections')->where('slug', 'flash-sale')->update([
            'starts_at' => $collection->starts_at ?: now(),
            'ends_at' => $collection->ends_at ?: $endsAt,
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('collections')->where('slug', 'flash-sale')->update([
            'starts_at' => null,
            'ends_at' => null,
            'updated_at' => now(),
        ]);
    }
};
