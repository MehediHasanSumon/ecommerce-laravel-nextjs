<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_gateway_settings', function (Blueprint $table) {
            $table->id();
            $table->string('gateway', 60)->unique();
            $table->boolean('enabled')->default(false)->index();
            $table->boolean('sandbox_mode')->default(true)->index();
            $table->text('public_key')->nullable();
            $table->text('secret_key')->nullable();
            $table->text('api_key')->nullable();
            $table->string('merchant_id')->nullable();
            $table->text('webhook_secret')->nullable();
            $table->json('additional_configuration')->nullable();
            $table->unsignedInteger('display_order')->default(0)->index();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();

            $table->index(['enabled', 'display_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_gateway_settings');
    }
};
