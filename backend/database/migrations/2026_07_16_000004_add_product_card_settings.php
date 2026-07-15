<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('store_settings', function (Blueprint $table): void {
            $table->string('product_card_style', 32)->default('hover_review');
            $table->string('product_layout', 16)->default('grid');
            $table->boolean('product_slider_loop')->default(true);
            $table->boolean('product_slider_autoplay')->default(false);
            $table->unsignedInteger('product_slider_autoplay_delay')->default(5000);
            $table->unsignedInteger('product_slider_transition_speed')->default(400);
            $table->boolean('product_slider_pause_on_hover')->default(true);
            $table->boolean('product_slider_mouse_drag')->default(true);
            $table->boolean('product_slider_touch_swipe')->default(true);
            $table->boolean('product_slider_navigation')->default(true);
            $table->boolean('product_slider_pagination')->default(false);
            $table->unsignedTinyInteger('product_slider_desktop_slides')->default(4);
            $table->unsignedTinyInteger('product_slider_tablet_slides')->default(3);
            $table->unsignedTinyInteger('product_slider_mobile_slides')->default(2);
            $table->unsignedSmallInteger('product_slider_space_between')->default(24);
            $table->boolean('product_slider_center_mode')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('store_settings', function (Blueprint $table): void {
            $table->dropColumn([
                'product_card_style',
                'product_layout',
                'product_slider_loop',
                'product_slider_autoplay',
                'product_slider_autoplay_delay',
                'product_slider_transition_speed',
                'product_slider_pause_on_hover',
                'product_slider_mouse_drag',
                'product_slider_touch_swipe',
                'product_slider_navigation',
                'product_slider_pagination',
                'product_slider_desktop_slides',
                'product_slider_tablet_slides',
                'product_slider_mobile_slides',
                'product_slider_space_between',
                'product_slider_center_mode',
            ]);
        });
    }
};
