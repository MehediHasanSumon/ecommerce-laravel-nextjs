<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('company_settings', function (Blueprint $table): void {
            foreach (['currency_symbol', 'default_currency'] as $column) {
                if (Schema::hasColumn('company_settings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('company_settings', function (Blueprint $table): void {
            if (! Schema::hasColumn('company_settings', 'default_currency')) {
                $table->char('default_currency', 3)->default('BDT')->index()->after('trade_license');
            }

            if (! Schema::hasColumn('company_settings', 'currency_symbol')) {
                $table->string('currency_symbol', 20)->default('৳')->after('default_currency');
            }
        });
    }
};
