<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meta_pixel_settings', function (Blueprint $table): void {
            $table->id();
            $table->boolean('enabled')->default(false)->index();
            $table->string('pixel_id', 40)->nullable()->index();
            $table->boolean('conversions_api_enabled')->default(false);
            $table->text('access_token')->nullable();
            $table->text('test_event_code')->nullable();
            $table->string('dataset_id', 80)->nullable();
            $table->boolean('automatic_event_tracking')->default(true);
            $table->boolean('advanced_matching')->default(true);
            $table->boolean('server_side_tracking')->default(true);
            $table->boolean('browser_side_tracking')->default(true);
            $table->boolean('debug_mode')->default(false);
            $table->string('connection_status', 30)->default('not_tested')->index();
            $table->timestamp('last_successful_event_at')->nullable()->index();
            $table->timestamp('last_connection_attempt_at')->nullable();
            $table->text('last_response')->nullable();
            $table->text('last_error')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
        });

        Schema::create('google_analytics_settings', function (Blueprint $table): void {
            $table->id();
            $table->boolean('enabled')->default(false)->index();
            $table->string('measurement_id', 30)->nullable()->index();
            $table->text('api_secret')->nullable();
            $table->boolean('enhanced_ecommerce')->default(true);
            $table->boolean('debug_mode')->default(false);
            $table->boolean('user_id_tracking')->default(false);
            $table->boolean('server_side_events')->default(true);
            $table->boolean('client_side_events')->default(true);
            $table->boolean('anonymize_ip')->default(true);
            $table->boolean('respect_consent_mode')->default(true);
            $table->string('connection_status', 30)->default('not_tested')->index();
            $table->timestamp('last_successful_event_at')->nullable()->index();
            $table->timestamp('last_connection_attempt_at')->nullable();
            $table->text('last_response')->nullable();
            $table->text('last_error')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
        });

        Schema::create('marketing_tracking_events', function (Blueprint $table): void {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->string('event_id', 120);
            $table->string('platform', 20)->index();
            $table->string('event_name', 80)->index();
            $table->string('source', 20)->index();
            $table->string('status', 30)->default('queued')->index();
            $table->string('consent_status', 20)->default('unspecified')->index();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('triggered_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->text('payload')->nullable();
            $table->text('response')->nullable();
            $table->unsignedInteger('execution_time_ms')->default(0);
            $table->unsignedSmallInteger('retry_count')->default(0);
            $table->text('error_message')->nullable();
            $table->timestamp('occurred_at')->index();
            $table->timestamp('sent_at')->nullable()->index();
            $table->timestamps();

            $table->unique(['platform', 'event_id']);
            $table->index(['platform', 'status', 'occurred_at']);
            $table->index(['event_name', 'status', 'occurred_at']);
            $table->index(['order_id', 'event_name']);
        });

        Schema::table('orders', function (Blueprint $table): void {
            $table->string('marketing_consent_status', 20)->default('unspecified')->after('user_agent')->index();
        });
    }

    public function down(): void
    {
        Schema::table('orders', fn (Blueprint $table) => $table->dropColumn('marketing_consent_status'));
        Schema::dropIfExists('marketing_tracking_events');
        Schema::dropIfExists('google_analytics_settings');
        Schema::dropIfExists('meta_pixel_settings');
    }
};
