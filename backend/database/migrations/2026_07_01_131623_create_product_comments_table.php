<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_comments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->string('guest_name', 120)->nullable();
            $table->string('guest_email')->nullable();
            $table->text('content');
            $table->char('submission_hash', 64);
            $table->string('status', 20)->default('pending');
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('edited_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['product_id', 'submission_hash'], 'product_comments_product_submission_unique');
            $table->index(['product_id', 'status', 'created_at'], 'product_comments_product_status_created_index');
            $table->index(['user_id', 'created_at'], 'product_comments_user_created_index');
            $table->index(['guest_email', 'created_at'], 'product_comments_guest_email_created_index');
            $table->index(['status', 'created_at'], 'product_comments_status_created_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_comments');
    }
};
