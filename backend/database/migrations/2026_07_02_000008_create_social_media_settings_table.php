<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('social_media_settings', function (Blueprint $table) {
            $table->id();
            $table->string('platform', 60)->unique();
            $table->string('url');
            $table->string('icon')->nullable();
            $table->unsignedInteger('display_order')->default(0)->index();
            $table->boolean('open_in_new_tab')->default(true);
            $table->boolean('status')->default(true)->index();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'display_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_media_settings');
    }
};
