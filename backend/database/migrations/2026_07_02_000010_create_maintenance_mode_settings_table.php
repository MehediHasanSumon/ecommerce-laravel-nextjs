<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maintenance_mode_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('enabled')->default(false)->index();
            $table->string('title')->default('Maintenance in progress');
            $table->text('message')->nullable();
            $table->timestamp('estimated_return_time')->nullable()->index();
            $table->boolean('allow_admin_access')->default(true);
            $table->json('allowed_ip_addresses')->nullable();
            $table->unsignedInteger('retry_after')->default(3600);
            $table->string('maintenance_image')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_mode_settings');
    }
};
