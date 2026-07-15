<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('store_settings', function (Blueprint $table): void {
            $table->boolean('allow_customer_registration')->default(true);
            $table->boolean('allow_guest_checkout')->default(true);
        });

        Schema::create('guest_customers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('linked_user_id')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->string('name');
            $table->string('email')->nullable()->index();
            $table->string('phone', 40)->index();
            $table->json('billing_address')->nullable();
            $table->json('shipping_address')->nullable();
            $table->string('status', 24)->default('active')->index();
            $table->text('notes')->nullable();
            $table->timestamp('last_order_at')->nullable()->index();
            $table->timestamps();

            $table->index(['email', 'phone']);
        });

        Schema::table('orders', function (Blueprint $table): void {
            $table->foreignId('guest_customer_id')->nullable()->after('user_id')->constrained('guest_customers')->nullOnDelete()->cascadeOnUpdate();
            $table->string('source', 24)->default('storefront')->index();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('guest_customer_id');
            $table->dropColumn('source');
        });

        Schema::dropIfExists('guest_customers');

        Schema::table('store_settings', function (Blueprint $table): void {
            $table->dropColumn(['allow_customer_registration', 'allow_guest_checkout']);
        });
    }
};
