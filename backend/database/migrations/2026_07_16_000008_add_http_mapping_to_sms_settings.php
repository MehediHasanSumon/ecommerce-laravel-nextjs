<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sms_settings', function (Blueprint $table): void {
            $table->json('provider_configuration')->nullable()->after('provider');
        });
    }

    public function down(): void
    {
        Schema::table('sms_settings', function (Blueprint $table): void {
            $table->dropColumn('provider_configuration');
        });
    }
};
