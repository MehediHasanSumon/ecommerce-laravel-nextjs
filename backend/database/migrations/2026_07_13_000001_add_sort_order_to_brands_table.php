<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('brands', function (Blueprint $table): void {
            $table->unsignedInteger('sort_order')->default(0)->index()->after('is_featured');
        });

        DB::table('brands')
            ->orderByDesc('is_featured')
            ->orderBy('name')
            ->get(['id'])
            ->values()
            ->each(fn ($brand, int $index) => DB::table('brands')->where('id', $brand->id)->update(['sort_order' => $index]));
    }

    public function down(): void
    {
        Schema::table('brands', function (Blueprint $table): void {
            $table->dropColumn('sort_order');
        });
    }
};
