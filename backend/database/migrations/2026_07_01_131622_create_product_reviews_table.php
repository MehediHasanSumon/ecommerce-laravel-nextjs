<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('product_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->string('guest_name', 120)->nullable();
            $table->string('guest_email')->nullable();
            $table->char('dedupe_key', 64)->nullable();
            $table->char('submission_hash', 64)->nullable();
            $table->unsignedBigInteger('order_item_id')->nullable()->index();
            $table->unsignedTinyInteger('rating');
            $table->string('title')->nullable();
            $table->text('comment');
            $table->text('admin_reply')->nullable();
            $table->timestamp('admin_replied_at')->nullable();
            $table->unsignedInteger('helpful_count')->default(0);
            $table->boolean('is_verified_purchase')->default(false)->index();
            $table->string('status')->default('pending')->index();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('edited_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['product_id', 'status']);
            $table->index(['product_id', 'rating']);
            $table->unique(['product_id', 'dedupe_key'], 'product_reviews_product_dedupe_unique');
            $table->unique(['product_id', 'submission_hash'], 'product_reviews_product_submission_unique');
            $table->index(['user_id', 'created_at'], 'product_reviews_user_created_index');
            $table->index(['guest_email', 'created_at'], 'product_reviews_guest_email_created_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_reviews');
    }
};
