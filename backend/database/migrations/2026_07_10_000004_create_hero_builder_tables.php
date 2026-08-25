<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hero_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('enabled')->default(true)->index();
            $table->string('mode', 32)->default('simple')->index();
            $table->boolean('slider_autoplay')->default(true);
            $table->unsignedInteger('autoplay_delay')->default(6000);
            $table->boolean('infinite_loop')->default(true);
            $table->boolean('show_navigation')->default(true);
            $table->boolean('show_pagination')->default(true);
            $table->boolean('swipe_support')->default(true);
            $table->boolean('pause_on_hover')->default(true);
            $table->boolean('lazy_load_images')->default(true);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('hero_slides', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->string('background_image')->nullable();
            $table->string('mobile_image')->nullable();
            $table->string('title')->nullable();
            $table->string('subtitle')->nullable();
            $table->text('description')->nullable();
            $table->string('primary_button_text')->nullable();
            $table->string('primary_button_url')->nullable();
            $table->string('secondary_button_text')->nullable();
            $table->string('secondary_button_url')->nullable();
            $table->string('text_alignment', 24)->default('left');
            $table->boolean('overlay')->default(true);
            $table->unsignedTinyInteger('overlay_opacity')->default(80);
            $table->string('background_color', 32)->nullable();
            $table->string('background_gradient')->nullable();
            $table->boolean('background_overlay')->default(true);
            $table->unsignedTinyInteger('canvas_overlay_opacity')->default(40);
            $table->json('canvas_size')->nullable();
            $table->boolean('status')->default(true)->index();
            $table->unsignedInteger('sort_order')->default(0)->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('hero_slide_elements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hero_slide_id')->constrained('hero_slides')->cascadeOnDelete();
            $table->string('type', 32)->index();
            $table->string('name')->nullable();
            $table->json('content')->nullable();
            $table->json('style')->nullable();
            $table->json('responsive')->nullable();
            $table->unsignedInteger('z_index')->default(1)->index();
            $table->boolean('locked')->default(false);
            $table->boolean('hidden')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hero_slide_elements');
        Schema::dropIfExists('hero_slides');
        Schema::dropIfExists('hero_settings');
    }
};
