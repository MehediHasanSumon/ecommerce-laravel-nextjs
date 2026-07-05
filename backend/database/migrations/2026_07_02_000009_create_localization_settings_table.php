<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('localization_settings', function (Blueprint $table) {
            $table->id();
            $table->string('default_language', 10)->default('en')->index();
            $table->char('default_currency', 3)->default('BDT')->index();
            $table->string('timezone')->default('Asia/Dhaka')->index();
            $table->string('date_format')->default('d M Y');
            $table->string('time_format')->default('12h');
            $table->unsignedTinyInteger('first_day_of_week')->default(0);
            $table->boolean('rtl_mode')->default(false)->index();
            $table->string('decimal_separator', 5)->default('.');
            $table->string('thousand_separator', 5)->default(',');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('localization_settings');
    }
};
