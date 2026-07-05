<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('company_settings', function (Blueprint $table): void {
            if (! Schema::hasColumn('company_settings', 'currency_symbol')) {
                $table->string('currency_symbol', 20)->default('৳')->after('default_currency');
            }

            if (! Schema::hasColumn('company_settings', 'decimal_places')) {
                $table->unsignedTinyInteger('decimal_places')->default(2)->after('currency_position');
            }

            if (! Schema::hasColumn('company_settings', 'decimal_separator')) {
                $table->string('decimal_separator', 5)->default('.')->after('decimal_places');
            }

            if (! Schema::hasColumn('company_settings', 'thousands_separator')) {
                $table->string('thousands_separator', 5)->default(',')->after('decimal_separator');
            }
        });
    }

    public function down(): void
    {
        Schema::table('company_settings', function (Blueprint $table): void {
            foreach (['thousands_separator', 'decimal_separator', 'decimal_places', 'currency_symbol'] as $column) {
                if (Schema::hasColumn('company_settings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
