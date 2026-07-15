<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('store_settings')) {
            return;
        }

        $columns = array_values(array_filter(
            ['store_name', 'store_email', 'store_phone'],
            fn (string $column): bool => Schema::hasColumn('store_settings', $column),
        ));

        if ($columns !== []) {
            Schema::table('store_settings', fn (Blueprint $table) => $table->dropColumn($columns));
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('store_settings')) {
            return;
        }

        Schema::table('store_settings', function (Blueprint $table): void {
            $table->string('store_name')->default('Store');
            $table->string('store_email')->nullable();
            $table->string('store_phone')->nullable();
        });
    }
};
