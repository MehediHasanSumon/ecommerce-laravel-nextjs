<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sms_settings', function (Blueprint $table): void {
            $table->id();
            $table->boolean('enabled')->default(false)->index();
            $table->string('provider', 60)->default('generic_http');
            $table->string('api_base_url', 1000)->nullable();
            $table->text('api_key')->nullable();
            $table->text('api_secret')->nullable();
            $table->text('username')->nullable();
            $table->text('password')->nullable();
            $table->string('sender_id', 120)->nullable();
            $table->string('route', 120)->nullable();
            $table->string('default_country_code', 8)->default('880');
            $table->unsignedSmallInteger('request_timeout')->default(15);
            $table->string('test_number', 40)->nullable();
            $table->boolean('require_guest_checkout_otp')->default(false);
            $table->boolean('require_registered_checkout_otp')->default(false);
            $table->unsignedTinyInteger('otp_length')->default(6);
            $table->unsignedSmallInteger('otp_expiration_minutes')->default(5);
            $table->unsignedSmallInteger('otp_resend_cooldown_seconds')->default(60);
            $table->unsignedTinyInteger('otp_max_resends')->default(3);
            $table->unsignedTinyInteger('otp_max_verification_attempts')->default(5);
            $table->unsignedSmallInteger('otp_rate_limit_per_hour')->default(10);
            $table->boolean('order_confirmation_enabled')->default(true);
            $table->json('order_status_events')->nullable();
            $table->json('shipping_status_events')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
        });

        Schema::create('sms_templates', function (Blueprint $table): void {
            $table->id();
            $table->string('event', 100)->unique();
            $table->string('name', 160);
            $table->text('body');
            $table->boolean('enabled')->default(true)->index();
            $table->json('allowed_placeholders')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
        });

        Schema::create('sms_logs', function (Blueprint $table): void {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->string('recipient', 40)->index();
            $table->string('type', 100)->index();
            $table->string('provider', 60)->nullable()->index();
            $table->text('message');
            $table->string('status', 40)->default('queued')->index();
            $table->string('provider_message_id', 255)->nullable();
            $table->json('api_response')->nullable();
            $table->text('error_message')->nullable();
            $table->unsignedTinyInteger('retry_count')->default(0);
            $table->timestamp('sent_at')->nullable()->index();
            $table->timestamp('failed_at')->nullable();
            $table->timestamps();

            $table->index(['type', 'status', 'created_at']);
        });

        Schema::create('sms_otp_challenges', function (Blueprint $table): void {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnUpdate()->cascadeOnDelete();
            $table->string('guest_token_hash', 64)->nullable()->index();
            $table->string('session_hash', 64)->index();
            $table->string('mobile', 40)->index();
            $table->string('purpose', 60)->default('checkout');
            $table->string('code_hash');
            $table->unsignedTinyInteger('verification_attempts')->default(0);
            $table->unsignedTinyInteger('resend_count')->default(0);
            $table->timestamp('last_sent_at');
            $table->timestamp('expires_at')->index();
            $table->timestamp('verified_at')->nullable()->index();
            $table->timestamp('used_at')->nullable();
            $table->timestamps();

            $table->index(['mobile', 'purpose', 'created_at']);
            $table->index(['user_id', 'purpose', 'verified_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_otp_challenges');
        Schema::dropIfExists('sms_logs');
        Schema::dropIfExists('sms_templates');
        Schema::dropIfExists('sms_settings');
    }
};
