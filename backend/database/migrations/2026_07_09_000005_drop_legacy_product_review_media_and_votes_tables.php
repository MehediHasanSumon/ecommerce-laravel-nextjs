<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('product_review_votes');
        Schema::dropIfExists('product_review_images');
    }

    public function down(): void
    {
        // Legacy review images and helpful votes were permanently removed.
    }
};
