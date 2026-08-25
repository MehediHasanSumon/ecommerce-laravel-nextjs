<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('home_page_settings', function (Blueprint $table): void {
            $table->id();
            $table->boolean('enable_product_section')->default(true);
            $table->unsignedSmallInteger('products_per_section')->default(20);
            $table->boolean('enable_testimonial_section')->default(true);
            $table->boolean('announcement_enabled')->default(true);
            $table->string('announcement_text')->nullable()->default('Free shipping on orders over ৳75.00! Limited time offer.');
            $table->string('announcement_link_text')->nullable()->default('Shop Now');
            $table->string('announcement_link_url')->nullable()->default('/shop');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('home_page_settings');
    }
};
