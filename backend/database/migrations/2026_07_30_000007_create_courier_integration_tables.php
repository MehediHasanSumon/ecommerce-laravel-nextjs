<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courier_provider_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('provider', 40)->unique();
            $table->boolean('enabled')->default(false)->index();
            $table->boolean('sandbox_mode')->default(true)->index();
            $table->string('api_base_url', 1000)->nullable();
            $table->text('api_key')->nullable();
            $table->text('api_secret')->nullable();
            $table->text('webhook_secret')->nullable();
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->timestamp('token_expires_at')->nullable();
            $table->string('default_store_id', 120)->nullable();
            $table->string('default_parcel_type', 60)->default('parcel');
            $table->string('default_item_description', 500)->nullable();
            $table->string('default_delivery_type', 60)->nullable();
            $table->string('default_payment_type', 60)->default('cash_on_delivery');
            $table->decimal('default_weight', 8, 2)->default(0.50);
            $table->string('cod_amount_rule', 40)->default('outstanding');
            $table->unsignedBigInteger('custom_cod_amount_cents')->default(0);
            $table->json('additional_configuration')->nullable();
            $table->unsignedInteger('display_order')->default(0)->index();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
        });

        Schema::create('courier_shipments', function (Blueprint $table): void {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('courier_provider_setting_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->string('provider', 40)->index();
            $table->string('external_id', 191)->nullable();
            $table->string('tracking_number', 191)->nullable()->index();
            $table->string('merchant_order_id', 191)->index();
            $table->string('status', 40)->default('pending')->index();
            $table->string('delivery_status', 60)->default('pending')->index();
            $table->string('cod_status', 60)->default('pending')->index();
            $table->string('raw_status', 191)->nullable();
            $table->string('parcel_type', 60)->nullable();
            $table->string('delivery_type', 60)->nullable();
            $table->string('payment_type', 60)->nullable();
            $table->string('item_description', 500)->nullable();
            $table->decimal('weight', 8, 2)->default(0.50);
            $table->unsignedBigInteger('amount_to_collect_cents')->default(0);
            $table->unsignedBigInteger('delivery_charge_cents')->nullable();
            $table->string('tracking_url', 1000)->nullable();
            $table->string('label_url', 1000)->nullable();
            $table->timestamp('estimated_delivery_at')->nullable();
            $table->json('provider_payload')->nullable();
            $table->json('provider_response')->nullable();
            $table->timestamp('shipment_created_at')->nullable()->index();
            $table->timestamp('last_synced_at')->nullable()->index();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->unsignedSmallInteger('retry_count')->default(0);
            $table->text('last_error')->nullable();
            $table->timestamps();

            $table->index(['provider', 'external_id']);
            $table->index(['order_id', 'created_at']);
            $table->index(['status', 'last_synced_at']);
            $table->index(['provider', 'status', 'created_at']);
        });

        Schema::create('courier_shipment_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('courier_shipment_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('event_fingerprint', 64)->unique();
            $table->string('provider_event_id', 191)->nullable();
            $table->string('status', 60)->index();
            $table->string('raw_status', 191)->nullable();
            $table->string('title', 191);
            $table->text('description')->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('occurred_at')->index();
            $table->timestamps();

            $table->index(['courier_shipment_id', 'occurred_at']);
        });

        Schema::create('courier_api_logs', function (Blueprint $table): void {
            $table->id();
            $table->uuid('request_id')->unique();
            $table->foreignId('courier_shipment_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->string('provider', 40)->index();
            $table->string('operation', 80)->index();
            $table->string('method', 10);
            $table->string('endpoint', 1000);
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->unsignedSmallInteger('http_status')->nullable()->index();
            $table->string('status', 30)->index();
            $table->unsignedInteger('execution_time_ms')->default(0);
            $table->unsignedSmallInteger('retry_count')->default(0);
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['provider', 'operation', 'created_at']);
            $table->index(['order_id', 'created_at']);
        });

        Schema::create('courier_webhook_events', function (Blueprint $table): void {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->string('provider', 40)->index();
            $table->string('event_fingerprint', 64)->unique();
            $table->string('external_event_id', 191)->nullable();
            $table->string('event_type', 120)->nullable()->index();
            $table->json('payload');
            $table->string('status', 30)->default('received')->index();
            $table->timestamp('processed_at')->nullable()->index();
            $table->text('error_message')->nullable();
            $table->timestamps();
        });

        Schema::table('store_settings', function (Blueprint $table): void {
            $table->string('automatic_shipment_creation', 50)->default('disabled');
            $table->string('automatic_courier_provider', 40)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('store_settings', function (Blueprint $table): void {
            $table->dropColumn(['automatic_shipment_creation', 'automatic_courier_provider']);
        });
        Schema::dropIfExists('courier_webhook_events');
        Schema::dropIfExists('courier_api_logs');
        Schema::dropIfExists('courier_shipment_events');
        Schema::dropIfExists('courier_shipments');
        Schema::dropIfExists('courier_provider_settings');
    }
};
