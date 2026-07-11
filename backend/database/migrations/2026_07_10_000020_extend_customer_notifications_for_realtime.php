<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customer_notifications', function (Blueprint $table): void {
            if (! Schema::hasColumn('customer_notifications', 'action_url')) {
                $table->string('action_url')->nullable()->after('message');
            }
            if (! Schema::hasColumn('customer_notifications', 'icon')) {
                $table->string('icon', 60)->nullable()->after('type');
            }
            if (! Schema::hasColumn('customer_notifications', 'notifiable_type')) {
                $table->string('notifiable_type')->nullable()->after('user_id');
            }
            if (! Schema::hasColumn('customer_notifications', 'notifiable_id')) {
                $table->unsignedBigInteger('notifiable_id')->nullable()->after('notifiable_type');
            }

            $table->index(['notifiable_type', 'notifiable_id'], 'customer_notifications_notifiable_index');
            $table->index(['user_id', 'type', 'created_at'], 'customer_notifications_user_type_created_index');
        });
    }

    public function down(): void
    {
        Schema::table('customer_notifications', function (Blueprint $table): void {
            $table->dropIndex('customer_notifications_notifiable_index');
            $table->dropIndex('customer_notifications_user_type_created_index');

            foreach (['action_url', 'icon', 'notifiable_type', 'notifiable_id'] as $column) {
                if (Schema::hasColumn('customer_notifications', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
