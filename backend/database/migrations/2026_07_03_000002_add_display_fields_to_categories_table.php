<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->boolean('show_on_home')->default(true)->index()->after('is_featured');
            $table->boolean('show_in_navbar')->default(true)->index()->after('show_on_home');
            $table->unsignedInteger('home_display_order')->default(0)->index()->after('show_in_navbar');
            $table->unsignedInteger('navbar_display_order')->default(0)->index()->after('home_display_order');

            $table->index(['show_on_home', 'home_display_order'], 'categories_home_display_idx');
            $table->index(['show_in_navbar', 'navbar_display_order'], 'categories_navbar_display_idx');
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropIndex('categories_home_display_idx');
            $table->dropIndex('categories_navbar_display_idx');
            $table->dropColumn(['show_on_home', 'show_in_navbar', 'home_display_order', 'navbar_display_order']);
        });
    }
};
