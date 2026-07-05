<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_settings', function (Blueprint $table) {
            $table->id();
            $table->string('mail_driver')->default('smtp')->index();
            $table->string('mail_host')->nullable();
            $table->unsignedSmallInteger('mail_port')->default(587);
            $table->string('encryption')->default('tls');
            $table->string('username')->nullable();
            $table->text('password')->nullable();
            $table->string('from_name');
            $table->string('from_email')->index();
            $table->string('reply_to_email')->nullable();
            $table->boolean('queue_emails')->default(true)->index();
            $table->boolean('enabled')->default(true)->index();
            $table->timestamp('last_tested_at')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_settings');
    }
};
