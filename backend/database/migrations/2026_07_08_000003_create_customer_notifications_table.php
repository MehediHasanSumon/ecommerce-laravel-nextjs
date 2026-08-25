<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_notifications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('notifiable_type')->nullable();
            $table->unsignedBigInteger('notifiable_id')->nullable();
            $table->string('type', 40)->default('account')->index();
            $table->string('icon', 60)->nullable();
            $table->string('title');
            $table->text('message');
            $table->string('action_url')->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('read_at')->nullable()->index();
            $table->timestamps();

            $table->index(['user_id', 'read_at']);
            $table->index(['user_id', 'read_at', 'created_at'], 'customer_notifications_user_read_created_index');
            $table->index(['notifiable_type', 'notifiable_id'], 'customer_notifications_notifiable_index');
            $table->index(['user_id', 'type', 'created_at'], 'customer_notifications_user_type_created_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_notifications');
    }
};
