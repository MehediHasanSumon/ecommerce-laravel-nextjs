<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_addresses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('label', 80)->default('Home');
            $table->string('full_name');
            $table->string('phone', 40);
            $table->string('email')->nullable();
            $table->string('country', 100);
            $table->string('state', 120);
            $table->string('district', 120);
            $table->string('city', 120);
            $table->string('area', 120)->nullable();
            $table->string('postal_code', 40)->nullable();
            $table->text('address_line');
            $table->boolean('is_default_billing')->default(false)->index();
            $table->boolean('is_default_shipping')->default(false)->index();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'is_default_billing']);
            $table->index(['user_id', 'is_default_shipping']);
        });

        Schema::create('orders', function (Blueprint $table): void {
            $table->id();
            $table->string('order_number', 40)->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('cart_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->string('guest_token', 120)->nullable()->index();
            $table->string('status', 40)->default('pending')->index();
            $table->string('payment_status', 40)->default('pending')->index();
            $table->string('payment_method', 80)->index();
            $table->foreignId('shipping_method_id')->nullable()->constrained('shipping_methods')->nullOnDelete()->cascadeOnUpdate();
            $table->string('shipping_method_name')->nullable();
            $table->string('currency', 10)->default('BDT');
            $table->unsignedBigInteger('subtotal_cents')->default(0);
            $table->unsignedBigInteger('item_discount_cents')->default(0);
            $table->unsignedBigInteger('coupon_discount_cents')->default(0);
            $table->unsignedBigInteger('shipping_cents')->default(0);
            $table->unsignedBigInteger('tax_cents')->default(0);
            $table->unsignedBigInteger('total_cents')->default(0);
            $table->string('coupon_code', 100)->nullable();
            $table->json('coupon_snapshot')->nullable();
            $table->json('billing_address');
            $table->json('shipping_address');
            $table->json('summary_snapshot');
            $table->string('client_ip', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('placed_at')->nullable()->index();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
            $table->index(['payment_method', 'payment_status']);
        });

        Schema::create('order_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->nullOnDelete()->cascadeOnUpdate();
            $table->string('product_name');
            $table->string('sku')->nullable();
            $table->unsignedInteger('quantity');
            $table->unsignedBigInteger('unit_price_cents');
            $table->unsignedBigInteger('discounted_price_cents')->nullable();
            $table->unsignedBigInteger('line_subtotal_cents');
            $table->unsignedBigInteger('line_discount_cents')->default(0);
            $table->json('selection_snapshot')->nullable();
            $table->json('pricing_snapshot')->nullable();
            $table->json('tax_snapshot')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'product_id']);
        });

        Schema::create('checkout_sessions', function (Blueprint $table): void {
            $table->id();
            $table->uuid('session_key')->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('cart_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->string('payment_method', 80)->nullable();
            $table->string('status', 40)->default('open')->index();
            $table->json('payload_snapshot')->nullable();
            $table->timestamp('expires_at')->index();
            $table->timestamps();
        });

        Schema::create('payment_transactions', function (Blueprint $table): void {
            $table->id();
            $table->uuid('transaction_key')->unique();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('checkout_session_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->string('gateway', 80)->index();
            $table->string('status', 40)->default('initiated')->index();
            $table->string('gateway_transaction_id')->nullable()->index();
            $table->string('gateway_payment_id')->nullable()->index();
            $table->unsignedBigInteger('amount_cents');
            $table->string('currency', 10);
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->json('verification_payload')->nullable();
            $table->timestamp('authorized_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->string('failure_code')->nullable();
            $table->text('failure_message')->nullable();
            $table->timestamps();

            $table->unique(['gateway', 'gateway_transaction_id']);
            $table->index(['order_id', 'status']);
        });

        Schema::create('payment_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('payment_transaction_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->string('gateway', 80)->index();
            $table->string('event', 80)->index();
            $table->string('level', 20)->default('info');
            $table->json('payload')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_logs');
        Schema::dropIfExists('payment_transactions');
        Schema::dropIfExists('checkout_sessions');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('customer_addresses');
    }
};
