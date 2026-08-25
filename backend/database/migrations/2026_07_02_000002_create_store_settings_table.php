<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_settings', function (Blueprint $table) {
            $table->id();
            $table->string('store_url')->nullable();
            $table->unsignedSmallInteger('products_per_page')->default(24);
            $table->string('default_product_sorting')->default('latest')->index();
            $table->string('default_product_view')->default('grid');
            $table->boolean('enable_reviews')->default(true)->index();
            $table->boolean('enable_product_comments')->default(true);
            $table->string('review_access', 20)->default('registered');
            $table->string('comment_access', 20)->default('registered');
            $table->boolean('review_moderation_enabled')->default(true);
            $table->boolean('comment_moderation_enabled')->default(true);
            $table->boolean('guest_name_required')->default(true);
            $table->boolean('guest_email_required')->default(true);
            $table->boolean('verified_purchase_badge_enabled')->default(true);
            $table->boolean('one_review_per_product')->default(true);
            $table->boolean('review_editing_enabled')->default(true);
            $table->unsignedInteger('review_edit_time_limit_minutes')->default(1440);
            $table->boolean('comment_editing_enabled')->default(true);
            $table->unsignedInteger('comment_edit_time_limit_minutes')->default(1440);
            $table->boolean('floating_contact_enabled')->default(false);
            $table->boolean('messenger_enabled')->default(false);
            $table->string('messenger_url')->nullable();
            $table->boolean('whatsapp_enabled')->default(false);
            $table->string('whatsapp_number', 20)->nullable();
            $table->string('whatsapp_message', 500)->nullable();
            $table->boolean('enable_wishlist')->default(true)->index();
            $table->boolean('enable_compare')->default(false);
            $table->boolean('enable_stock_management')->default(true);
            $table->boolean('enable_guest_checkout')->default(true);
            $table->boolean('allow_customer_registration')->default(true);
            $table->boolean('allow_guest_checkout')->default(true);
            $table->boolean('require_login_before_checkout')->default(false);
            $table->unsignedBigInteger('minimum_order_amount_cents')->default(0);
            $table->unsignedBigInteger('maximum_order_amount_cents')->nullable();
            $table->unsignedInteger('low_stock_threshold')->default(5);
            $table->boolean('allow_backorders')->default(false);
            $table->boolean('hide_out_of_stock_products')->default(false)->index();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();

            $table->index(['enable_reviews', 'enable_product_comments'], 'store_feedback_enabled_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_settings');
    }
};
