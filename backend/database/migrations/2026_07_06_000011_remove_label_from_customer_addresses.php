<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('customer_addresses') || ! Schema::hasColumn('customer_addresses', 'label')) {
            return;
        }

        Schema::table('customer_addresses', function (Blueprint $table): void {
            $table->dropColumn('label');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('customer_addresses') || Schema::hasColumn('customer_addresses', 'label')) {
            return;
        }

        Schema::table('customer_addresses', function (Blueprint $table): void {
            $table->string('label', 80)->default('Home')->after('user_id');
        });
    }
};
