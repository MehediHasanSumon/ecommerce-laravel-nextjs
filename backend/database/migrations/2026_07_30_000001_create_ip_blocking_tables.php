<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('security_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('scope', 32)->default('global')->unique();
            $table->boolean('auto_blocking_enabled')->default(true);
            $table->boolean('enable_checkout_security')->default(true);
            $table->boolean('enable_cod_security')->default(true);
            $table->boolean('enable_payment_security')->default(true);
            $table->boolean('auto_block_critical_ips')->default(false);
            $table->unsignedSmallInteger('max_failed_login_attempts')->default(5);
            $table->unsignedSmallInteger('max_password_reset_attempts')->default(5);
            $table->unsignedSmallInteger('max_payment_failures')->default(8);
            $table->unsignedSmallInteger('failed_cod_threshold')->default(3);
            $table->unsignedSmallInteger('time_window_minutes')->default(10);
            $table->unsignedInteger('temporary_block_duration_minutes')->default(30);
            $table->unsignedSmallInteger('permanent_block_threshold')->default(3);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
        });

        Schema::create('ip_access_rules', function (Blueprint $table): void {
            $table->id();
            $table->string('ip_address', 64)->unique();
            $table->string('rule_type', 16)->index();
            $table->string('reason', 500)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();

            $table->index(['rule_type', 'created_at'], 'ip_access_rules_type_created_index');
        });

        Schema::create('security_trusted_proxies', function (Blueprint $table): void {
            $table->id();
            $table->string('network', 64)->unique();
            $table->string('label', 120)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
        });

        Schema::create('ip_blocks', function (Blueprint $table): void {
            $table->id();
            $table->string('ip_address', 45)->unique();
            $table->unsignedTinyInteger('ip_version');
            $table->string('type', 16)->default('manual');
            $table->string('status', 16)->default('active');
            $table->string('reason', 80);
            $table->text('notes')->nullable();
            $table->dateTime('blocked_at', precision: 6);
            $table->dateTime('expires_at', precision: 6)->nullable();
            $table->dateTime('last_activity_at', precision: 6)->nullable();
            $table->unsignedInteger('block_count')->default(1);
            $table->string('country_code', 2)->nullable();
            $table->string('country', 120)->nullable();
            $table->string('city', 120)->nullable();
            $table->string('isp', 255)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('device_type', 40)->nullable();
            $table->string('browser', 80)->nullable();
            $table->string('operating_system', 80)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'type', 'created_at', 'id'], 'ip_blocks_status_type_created_index');
            $table->index(['status', 'expires_at', 'id'], 'ip_blocks_status_expires_index');
            $table->index(['blocked_at', 'id'], 'ip_blocks_blocked_at_index');
            $table->index(['country_code', 'created_at', 'id'], 'ip_blocks_country_created_index');
            $table->index(['reason', 'created_at', 'id'], 'ip_blocks_reason_created_index');
            $table->index(['last_activity_at', 'id'], 'ip_blocks_activity_index');
        });

        Schema::create('ip_block_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('ip_block_id')->nullable()->constrained('ip_blocks')->nullOnDelete()->cascadeOnUpdate();
            $table->string('ip_address', 45)->nullable();
            $table->string('event_type', 40);
            $table->string('block_type', 16)->nullable();
            $table->string('reason', 500)->nullable();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->string('actor_name', 255)->nullable();
            $table->string('actor_email', 255)->nullable();
            $table->string('request_id', 64)->nullable();
            $table->json('metadata')->nullable();
            $table->dateTime('occurred_at', precision: 6);

            $table->index(['ip_block_id', 'occurred_at', 'id'], 'ip_block_events_block_time_index');
            $table->index(['ip_address', 'occurred_at', 'id'], 'ip_block_events_ip_time_index');
            $table->index(['event_type', 'occurred_at', 'id'], 'ip_block_events_type_time_index');
            $table->index(['actor_user_id', 'occurred_at', 'id'], 'ip_block_events_actor_time_index');
            $table->index(['occurred_at', 'id'], 'ip_block_events_time_index');
        });

        Schema::create('security_attempts', function (Blueprint $table): void {
            $table->id();
            $table->string('ip_address', 45);
            $table->string('event_type', 40);
            $table->string('route', 255)->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->char('identifier_hash', 64)->nullable();
            $table->char('user_agent_hash', 64)->nullable();
            $table->string('request_id', 64)->nullable();
            $table->boolean('triggered_block')->default(false);
            $table->json('metadata')->nullable();
            $table->dateTime('occurred_at', precision: 6);

            $table->index(['ip_address', 'event_type', 'occurred_at', 'id'], 'security_attempts_ip_event_time_index');
            $table->index(['identifier_hash', 'occurred_at', 'id'], 'security_attempts_identifier_time_index');
            $table->index(['triggered_block', 'occurred_at', 'id'], 'security_attempts_trigger_time_index');
            $table->index(['event_type', 'occurred_at', 'id'], 'security_attempts_event_time_index');
            $table->index(['occurred_at', 'id'], 'security_attempts_retention_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('security_attempts');
        Schema::dropIfExists('ip_block_events');
        Schema::dropIfExists('ip_blocks');
        Schema::dropIfExists('security_trusted_proxies');
        Schema::dropIfExists('ip_access_rules');
        Schema::dropIfExists('security_settings');
    }
};
