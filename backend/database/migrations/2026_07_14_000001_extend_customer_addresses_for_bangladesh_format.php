<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customer_addresses', function (Blueprint $table): void {
            if (! Schema::hasColumn('customer_addresses', 'alternative_phone')) {
                $table->string('alternative_phone', 40)->nullable()->after('phone');
            }

            if (! Schema::hasColumn('customer_addresses', 'landmark')) {
                $table->string('landmark', 255)->nullable()->after('address_line');
            }

            if (! Schema::hasColumn('customer_addresses', 'address_label')) {
                $table->string('address_label', 40)->nullable()->after('landmark');
            }

            if (! Schema::hasColumn('customer_addresses', 'duplicate_fingerprint')) {
                $table->string('duplicate_fingerprint', 64)->nullable()->after('address_label');
                $table->index(['user_id', 'duplicate_fingerprint']);
            }
        });
    }

    public function down(): void
    {
        Schema::table('customer_addresses', function (Blueprint $table): void {
            if (Schema::hasColumn('customer_addresses', 'duplicate_fingerprint')) {
                $table->dropIndex(['user_id', 'duplicate_fingerprint']);
                $table->dropColumn('duplicate_fingerprint');
            }

            foreach (['address_label', 'landmark', 'alternative_phone'] as $column) {
                if (Schema::hasColumn('customer_addresses', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
