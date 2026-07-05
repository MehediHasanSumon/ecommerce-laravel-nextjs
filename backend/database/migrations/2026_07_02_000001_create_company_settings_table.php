<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_settings', function (Blueprint $table) {
            $table->id();
            $table->string('company_name');
            $table->string('legal_company_name')->nullable();
            $table->string('company_email')->nullable()->index();
            $table->string('company_phone')->nullable();
            $table->string('support_email')->nullable();
            $table->string('support_phone')->nullable();
            $table->string('logo')->nullable();
            $table->string('dark_logo')->nullable();
            $table->string('favicon')->nullable();
            $table->string('invoice_logo')->nullable();
            $table->string('country')->nullable()->index();
            $table->string('state')->nullable()->index();
            $table->string('city')->nullable()->index();
            $table->string('postal_code')->nullable();
            $table->text('full_address')->nullable();
            $table->string('tax_number')->nullable()->index();
            $table->string('trade_license')->nullable();
            $table->char('default_currency', 3)->default('BDT')->index();
            $table->string('currency_position', 10)->default('left');
            $table->string('timezone')->default('Asia/Dhaka')->index();
            $table->string('date_format')->default('d M Y');
            $table->string('time_format')->default('12h');
            $table->string('invoice_prefix', 20)->default('INV');
            $table->text('invoice_footer')->nullable();
            $table->text('invoice_terms')->nullable();
            $table->boolean('company_active')->default(true)->index();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_settings');
    }
};
