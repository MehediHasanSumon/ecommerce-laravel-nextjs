<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sms_provider_settings', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 50)->unique();
            $table->text('api_key')->nullable();
            $table->text('api_secret')->nullable();
            $table->string('sender_id')->nullable();
            $table->string('base_url')->nullable();
            $table->boolean('is_default')->default(false)->index();
            $table->boolean('status')->default(false)->index();
            $table->timestamp('last_tested_at')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();

            $table->index(['provider', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_provider_settings');
    }
};
