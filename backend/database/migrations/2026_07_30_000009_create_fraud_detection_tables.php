<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fraud_provider_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('provider', 40)->unique();
            $table->boolean('enabled')->default(false)->index();
            $table->boolean('sandbox_mode')->default(true)->index();
            $table->string('api_url', 1000)->nullable();
            $table->text('api_key')->nullable();
            $table->text('api_secret')->nullable();
            $table->json('additional_configuration')->nullable();
            $table->string('connection_status', 30)->default('not_tested')->index();
            $table->timestamp('last_successful_connection_at')->nullable();
            $table->timestamp('last_connection_attempt_at')->nullable();
            $table->text('last_error')->nullable();
            $table->unsignedSmallInteger('consecutive_failures')->default(0);
            $table->timestamp('circuit_open_until')->nullable()->index();
            $table->unsignedInteger('display_order')->default(0)->index();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
        });

        Schema::create('fraud_checks', function (Blueprint $table): void {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('guest_customer_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('triggered_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('cached_from_id')->nullable()->constrained('fraud_checks')->nullOnDelete()->cascadeOnUpdate();
            $table->string('subject_type', 30)->index();
            $table->string('subject_key', 191)->nullable()->index();
            $table->string('input_fingerprint', 64)->index();
            $table->text('input_payload');
            $table->string('trigger', 60)->index();
            $table->boolean('is_automatic')->default(false)->index();
            $table->string('status', 30)->default('pending')->index();
            $table->unsignedTinyInteger('risk_score')->default(0)->index();
            $table->string('risk_level', 20)->default('safe')->index();
            $table->boolean('is_flagged')->default(false)->index();
            $table->boolean('blacklist_status')->nullable()->index();
            $table->unsignedInteger('fraud_matches')->default(0);
            $table->unsignedInteger('known_scam_reports')->default(0);
            $table->unsignedInteger('chargeback_reports')->default(0);
            $table->unsignedInteger('suspicious_activity_count')->default(0);
            $table->json('risk_reasons')->nullable();
            $table->text('recommendation')->nullable();
            $table->json('decision')->nullable();
            $table->unsignedSmallInteger('providers_requested')->default(0);
            $table->unsignedSmallInteger('providers_succeeded')->default(0);
            $table->unsignedSmallInteger('providers_failed')->default(0);
            $table->unsignedInteger('response_time_ms')->default(0);
            $table->timestamp('checked_at')->nullable()->index();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();

            $table->index(['subject_type', 'subject_key', 'checked_at']);
            $table->index(['input_fingerprint', 'status', 'expires_at']);
            $table->index(['risk_level', 'checked_at']);
            $table->index(['order_id', 'checked_at']);
            $table->index(['user_id', 'checked_at']);
            $table->index(['guest_customer_id', 'checked_at']);
        });

        Schema::create('fraud_provider_results', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('fraud_check_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('fraud_provider_setting_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->string('provider', 40)->index();
            $table->string('status', 30)->index();
            $table->unsignedTinyInteger('risk_score')->default(0)->index();
            $table->string('risk_level', 20)->default('safe')->index();
            $table->boolean('blacklist_status')->nullable();
            $table->unsignedInteger('fraud_matches')->default(0);
            $table->unsignedInteger('known_scam_reports')->default(0);
            $table->unsignedInteger('chargeback_reports')->default(0);
            $table->unsignedInteger('suspicious_activity_count')->default(0);
            $table->json('risk_reasons')->nullable();
            $table->text('recommendation')->nullable();
            $table->unsignedInteger('response_time_ms')->default(0);
            $table->text('raw_response')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->unique(['fraud_check_id', 'provider']);
            $table->index(['provider', 'status', 'created_at']);
        });

        Schema::create('fraud_api_logs', function (Blueprint $table): void {
            $table->id();
            $table->uuid('request_id')->unique();
            $table->foreignId('fraud_check_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->string('provider', 40)->index();
            $table->string('operation', 80)->index();
            $table->string('method', 10);
            $table->string('endpoint', 1000);
            $table->text('request_payload')->nullable();
            $table->text('response_payload')->nullable();
            $table->unsignedSmallInteger('http_status')->nullable()->index();
            $table->string('status', 30)->index();
            $table->unsignedInteger('response_time_ms')->default(0);
            $table->unsignedSmallInteger('retry_count')->default(0);
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['provider', 'operation', 'created_at']);
            $table->index(['fraud_check_id', 'created_at']);
        });

        Schema::table('orders', function (Blueprint $table): void {
            $table->foreignId('latest_fraud_check_id')->nullable()->after('guest_customer_id')->constrained('fraud_checks')->nullOnDelete()->cascadeOnUpdate();
            $table->string('fraud_status', 20)->default('unchecked')->after('shipping_status')->index();
            $table->unsignedTinyInteger('fraud_score')->nullable()->after('fraud_status')->index();
            $table->timestamp('fraud_checked_at')->nullable()->after('fraud_score')->index();
            $table->boolean('fraud_flagged')->default(false)->after('fraud_checked_at')->index();
            $table->boolean('fraud_hold')->default(false)->after('fraud_flagged')->index();
            $table->boolean('fraud_cod_blocked')->default(false)->after('fraud_hold')->index();
            $table->timestamp('fraud_approved_at')->nullable()->after('fraud_cod_blocked');
            $table->foreignId('fraud_approved_by')->nullable()->after('fraud_approved_at')->constrained('users')->nullOnDelete()->cascadeOnUpdate();
        });

        Schema::table('store_settings', function (Blueprint $table): void {
            $table->boolean('fraud_detection_enabled')->default(false);
            $table->boolean('fraud_auto_check_orders')->default(true);
            $table->boolean('fraud_auto_check_customers')->default(false);
            $table->boolean('fraud_check_during_checkout')->default(false);
            $table->boolean('fraud_check_before_cod_confirmation')->default(true);
            $table->boolean('fraud_check_before_shipment')->default(true);
            $table->unsignedTinyInteger('fraud_score_threshold')->default(60);
            $table->unsignedTinyInteger('fraud_critical_score_threshold')->default(85);
            $table->boolean('fraud_auto_flag_suspicious_orders')->default(true);
            $table->boolean('fraud_auto_hold_high_risk_orders')->default(true);
            $table->boolean('fraud_auto_reject_critical_risk_orders')->default(false);
            $table->boolean('fraud_block_cod_high_risk')->default(true);
            $table->boolean('fraud_require_admin_approval')->default(true);
            $table->json('fraud_provider_priority')->nullable();
            $table->boolean('fraud_result_caching_enabled')->default(true);
            $table->unsignedInteger('fraud_cache_duration_minutes')->default(1440);
        });
    }

    public function down(): void
    {
        Schema::table('store_settings', function (Blueprint $table): void {
            $table->dropColumn([
                'fraud_detection_enabled',
                'fraud_auto_check_orders',
                'fraud_auto_check_customers',
                'fraud_check_during_checkout',
                'fraud_check_before_cod_confirmation',
                'fraud_check_before_shipment',
                'fraud_score_threshold',
                'fraud_critical_score_threshold',
                'fraud_auto_flag_suspicious_orders',
                'fraud_auto_hold_high_risk_orders',
                'fraud_auto_reject_critical_risk_orders',
                'fraud_block_cod_high_risk',
                'fraud_require_admin_approval',
                'fraud_provider_priority',
                'fraud_result_caching_enabled',
                'fraud_cache_duration_minutes',
            ]);
        });

        Schema::table('orders', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('fraud_approved_by');
            $table->dropConstrainedForeignId('latest_fraud_check_id');
            $table->dropColumn([
                'fraud_status',
                'fraud_score',
                'fraud_checked_at',
                'fraud_flagged',
                'fraud_hold',
                'fraud_cod_blocked',
                'fraud_approved_at',
            ]);
        });

        Schema::dropIfExists('fraud_api_logs');
        Schema::dropIfExists('fraud_provider_results');
        Schema::dropIfExists('fraud_checks');
        Schema::dropIfExists('fraud_provider_settings');
    }
};
