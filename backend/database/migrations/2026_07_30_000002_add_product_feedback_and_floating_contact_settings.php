<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_reviews', function (Blueprint $table): void {
            $table->string('guest_name', 120)->nullable()->after('user_id');
            $table->string('guest_email')->nullable()->after('guest_name');
            $table->char('dedupe_key', 64)->nullable()->after('guest_email');
            $table->char('submission_hash', 64)->nullable()->after('dedupe_key');
            $table->timestamp('approved_at')->nullable()->after('status');
            $table->foreignId('approved_by')->nullable()->after('approved_at')->constrained('users')->nullOnDelete();
            $table->timestamp('edited_at')->nullable()->after('approved_by');

            $table->unique(['product_id', 'dedupe_key'], 'product_reviews_product_dedupe_unique');
            $table->unique(['product_id', 'submission_hash'], 'product_reviews_product_submission_unique');
            $table->index(['user_id', 'created_at'], 'product_reviews_user_created_index');
            $table->index(['guest_email', 'created_at'], 'product_reviews_guest_email_created_index');
        });

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

        Schema::table('product_reviews', function (Blueprint $table): void {
            $table->dropUnique('product_reviews_product_dedupe_unique');
            $table->dropUnique('product_reviews_product_submission_unique');
            $table->dropIndex('product_reviews_user_created_index');
            $table->dropIndex('product_reviews_guest_email_created_index');
            $table->dropConstrainedForeignId('approved_by');
            $table->dropColumn([
                'guest_name',
                'guest_email',
                'dedupe_key',
                'submission_hash',
                'approved_at',
                'edited_at',
            ]);
        });
    }
};
