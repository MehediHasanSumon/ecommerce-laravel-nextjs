<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('security_settings', function (Blueprint $table): void {
            $table->unsignedSmallInteger('failed_cod_threshold')->default(3)->after('max_payment_failures');
            $table->boolean('auto_block_critical_ips')->default(false)->after('permanent_block_threshold');
            $table->boolean('enable_checkout_security')->default(true)->after('auto_block_critical_ips');
            $table->boolean('enable_cod_security')->default(true)->after('enable_checkout_security');
            $table->boolean('enable_payment_security')->default(true)->after('enable_cod_security');
        });
    }

    public function down(): void
    {
        Schema::table('security_settings', function (Blueprint $table): void {
            $table->dropColumn([
                'failed_cod_threshold',
                'auto_block_critical_ips',
                'enable_checkout_security',
                'enable_cod_security',
                'enable_payment_security',
            ]);
        });
    }
};
