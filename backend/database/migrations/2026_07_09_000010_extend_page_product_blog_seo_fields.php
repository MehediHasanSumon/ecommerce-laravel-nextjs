<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_seo', function (Blueprint $table): void {
            $table->text('meta_keywords')->nullable()->after('meta_description');
        });

        Schema::table('blogs', function (Blueprint $table): void {
            $table->text('meta_keywords')->nullable()->after('meta_description');
            $table->string('canonical_url')->nullable()->after('meta_keywords');
        });

        Schema::table('content_pages', function (Blueprint $table): void {
            $table->text('meta_keywords')->nullable()->after('meta_description');
            $table->string('canonical_url')->nullable()->after('meta_keywords');
            $table->string('og_title')->nullable()->after('canonical_url');
            $table->text('og_description')->nullable()->after('og_title');
            $table->text('og_image_url')->nullable()->after('og_description');
        });
    }

    public function down(): void
    {
        Schema::table('product_seo', function (Blueprint $table): void {
            $table->dropColumn('meta_keywords');
        });

        Schema::table('blogs', function (Blueprint $table): void {
            $table->dropColumn(['meta_keywords', 'canonical_url']);
        });

        Schema::table('content_pages', function (Blueprint $table): void {
            $table->dropColumn([
                'meta_keywords',
                'canonical_url',
                'og_title',
                'og_description',
                'og_image_url',
            ]);
        });
    }
};
