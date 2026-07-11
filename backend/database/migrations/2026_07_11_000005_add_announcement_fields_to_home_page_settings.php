<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('home_page_settings', function (Blueprint $table): void {
            $table->boolean('announcement_enabled')->default(true)->after('enable_testimonial_section');
            $table->string('announcement_text')->nullable()->default('Free shipping on orders over ৳75.00! Limited time offer.')->after('announcement_enabled');
            $table->string('announcement_link_text')->nullable()->default('Shop Now')->after('announcement_text');
            $table->string('announcement_link_url')->nullable()->default('/shop')->after('announcement_link_text');
        });
    }

    public function down(): void
    {
        Schema::table('home_page_settings', function (Blueprint $table): void {
            $table->dropColumn([
                'announcement_enabled',
                'announcement_text',
                'announcement_link_text',
                'announcement_link_url',
            ]);
        });
    }
};
