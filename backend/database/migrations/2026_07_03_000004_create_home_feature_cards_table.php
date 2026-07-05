<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('home_feature_cards', function (Blueprint $table) {
            $table->id();
            $table->string('icon', 80);
            $table->string('title', 120);
            $table->string('description', 255);
            $table->unsignedInteger('sort_order')->default(0)->index();
            $table->boolean('status')->default(true)->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'sort_order'], 'home_feature_cards_status_sort_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('home_feature_cards');
    }
};
