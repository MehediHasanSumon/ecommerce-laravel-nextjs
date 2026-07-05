<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('category_display_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('enable_home_category_section')->default(true)->index();
            $table->string('category_display_mode', 40)->default('landing_page')->index();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('category_display_settings');
    }
};
