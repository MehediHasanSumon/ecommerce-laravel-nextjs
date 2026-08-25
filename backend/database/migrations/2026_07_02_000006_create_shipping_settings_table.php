<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipping_zones', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->json('countries')->nullable();
            $table->json('states')->nullable();
            $table->json('postal_codes')->nullable();
            $table->text('description')->nullable();
            $table->boolean('status')->default(true)->index();
            $table->unsignedInteger('display_order')->default(0)->index();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('shipping_methods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipping_zone_id')->nullable()->constrained('shipping_zones')->nullOnDelete()->cascadeOnUpdate();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('slug')->nullable()->unique();
            $table->text('description')->nullable();
            $table->string('delivery_type')->nullable();
            $table->string('estimated_delivery_time')->nullable();
            $table->string('type')->default('flat_rate')->index();
            $table->unsignedBigInteger('rate_cents')->default(0);
            $table->unsignedBigInteger('minimum_order_amount_cents')->default(0);
            $table->unsignedInteger('estimated_days_min')->nullable();
            $table->unsignedInteger('estimated_days_max')->nullable();
            $table->boolean('status')->default(true)->index();
            $table->unsignedInteger('display_order')->default(0)->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipping_methods');
        Schema::dropIfExists('shipping_zones');
    }
};
