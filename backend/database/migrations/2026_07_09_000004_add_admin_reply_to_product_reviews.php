<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_reviews', function (Blueprint $table): void {
            $table->text('admin_reply')->nullable()->after('comment');
            $table->timestamp('admin_replied_at')->nullable()->after('admin_reply');
        });
    }

    public function down(): void
    {
        Schema::table('product_reviews', function (Blueprint $table): void {
            $table->dropColumn(['admin_reply', 'admin_replied_at']);
        });
    }
};
