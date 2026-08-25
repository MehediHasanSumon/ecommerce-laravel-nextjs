<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete()->cascadeOnUpdate();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->text('image_url')->nullable();
            $table->string('icon')->nullable();
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();
            $table->text('meta_keywords')->nullable();
            $table->string('canonical_url')->nullable();
            $table->string('og_title')->nullable();
            $table->text('og_description')->nullable();
            $table->text('og_image_url')->nullable();
            $table->boolean('is_featured')->default(false)->index();
            $table->boolean('show_on_home')->default(true)->index();
            $table->boolean('show_in_navbar')->default(true)->index();
            $table->unsignedInteger('home_display_order')->default(0)->index();
            $table->unsignedInteger('navbar_display_order')->default(0)->index();
            $table->unsignedInteger('sort_order')->default(0)->index();
            $table->string('status')->default('active')->index();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['parent_id', 'sort_order']);
            $table->index(['show_on_home', 'home_display_order'], 'categories_home_display_idx');
            $table->index(['show_in_navbar', 'navbar_display_order'], 'categories_navbar_display_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
