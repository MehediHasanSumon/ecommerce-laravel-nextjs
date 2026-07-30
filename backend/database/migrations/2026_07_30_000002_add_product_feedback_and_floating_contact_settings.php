<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('store_settings', function (Blueprint $table): void {
            $table->boolean('enable_product_comments')->default(true)->after('enable_reviews');
            $table->string('review_access', 20)->default('registered')->after('enable_product_comments');
            $table->string('comment_access', 20)->default('registered')->after('review_access');
            $table->boolean('review_moderation_enabled')->default(true)->after('comment_access');
            $table->boolean('comment_moderation_enabled')->default(true)->after('review_moderation_enabled');
            $table->boolean('guest_name_required')->default(true)->after('comment_moderation_enabled');
            $table->boolean('guest_email_required')->default(true)->after('guest_name_required');
            $table->boolean('verified_purchase_badge_enabled')->default(true)->after('guest_email_required');
            $table->boolean('one_review_per_product')->default(true)->after('verified_purchase_badge_enabled');
            $table->boolean('review_editing_enabled')->default(true)->after('one_review_per_product');
            $table->unsignedInteger('review_edit_time_limit_minutes')->default(1440)->after('review_editing_enabled');
            $table->boolean('comment_editing_enabled')->default(true)->after('review_edit_time_limit_minutes');
            $table->unsignedInteger('comment_edit_time_limit_minutes')->default(1440)->after('comment_editing_enabled');
            $table->boolean('floating_contact_enabled')->default(false)->after('comment_edit_time_limit_minutes');
            $table->boolean('messenger_enabled')->default(false)->after('floating_contact_enabled');
            $table->string('messenger_url')->nullable()->after('messenger_enabled');
            $table->boolean('whatsapp_enabled')->default(false)->after('messenger_url');
            $table->string('whatsapp_number', 20)->nullable()->after('whatsapp_enabled');
            $table->string('whatsapp_message', 500)->nullable()->after('whatsapp_number');

            $table->index(['enable_reviews', 'enable_product_comments'], 'store_feedback_enabled_index');
        });

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

        Schema::table('store_settings', function (Blueprint $table): void {
            $table->dropIndex('store_feedback_enabled_index');
            $table->dropColumn([
                'enable_product_comments',
                'review_access',
                'comment_access',
                'review_moderation_enabled',
                'comment_moderation_enabled',
                'guest_name_required',
                'guest_email_required',
                'verified_purchase_badge_enabled',
                'one_review_per_product',
                'review_editing_enabled',
                'review_edit_time_limit_minutes',
                'comment_editing_enabled',
                'comment_edit_time_limit_minutes',
                'floating_contact_enabled',
                'messenger_enabled',
                'messenger_url',
                'whatsapp_enabled',
                'whatsapp_number',
                'whatsapp_message',
            ]);
        });
    }
};
