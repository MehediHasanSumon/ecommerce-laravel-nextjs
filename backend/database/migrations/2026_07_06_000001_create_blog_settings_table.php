<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_settings', function (Blueprint $table): void {
            $table->id();
            $table->boolean('enabled')->default(false)->index();
            $table->string('layout', 20)->default('grid');
            $table->boolean('list_enable_thumbnail')->default(true);
            $table->boolean('list_show_excerpt')->default(true);
            $table->boolean('list_show_author')->default(true);
            $table->boolean('list_show_published_date')->default(true);
            $table->boolean('list_show_reading_time')->default(true);
            $table->boolean('show_on_home')->default(false);
            $table->unsignedSmallInteger('home_limit')->default(3);
            $table->boolean('allow_comments')->default(true);
            $table->boolean('enable_related')->default(true);
            $table->boolean('enable_search')->default(true);
            $table->string('default_meta_title')->nullable();
            $table->text('default_meta_description')->nullable();
            $table->string('open_graph_image')->nullable();
            $table->string('canonical_url')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_settings');
    }
};
