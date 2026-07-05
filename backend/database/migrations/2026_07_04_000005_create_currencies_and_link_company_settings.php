<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('currencies', function (Blueprint $table): void {
            $table->id();
            $table->string('country')->index();
            $table->char('currency', 3)->unique();
            $table->string('symbol', 20);
            $table->string('status', 20)->default('active')->index();
            $table->timestamps();
        });

        $now = now();
        foreach ($this->defaults() as $currency) {
            DB::table('currencies')->insertOrIgnore([
                ...$currency,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        Schema::table('company_settings', function (Blueprint $table): void {
            if (! Schema::hasColumn('company_settings', 'currency_id')) {
                $table->foreignId('currency_id')
                    ->nullable()
                    ->after('trade_license')
                    ->constrained('currencies')
                    ->nullOnDelete()
                    ->cascadeOnUpdate();
            }
        });

        $company = DB::table('company_settings')->first();
        if ($company) {
            $code = $company->default_currency ?: 'BDT';
            $currencyId = DB::table('currencies')->where('currency', $code)->value('id')
                ?: DB::table('currencies')->where('currency', 'BDT')->value('id');

            DB::table('company_settings')->where('id', $company->id)->update([
                'currency_id' => $currencyId,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('company_settings', function (Blueprint $table): void {
            if (Schema::hasColumn('company_settings', 'currency_id')) {
                $table->dropConstrainedForeignId('currency_id');
            }
        });

        Schema::dropIfExists('currencies');
    }

    private function defaults(): array
    {
        return [
            ['country' => 'Bangladesh', 'currency' => 'BDT', 'symbol' => '৳', 'status' => 'active'],
            ['country' => 'United States', 'currency' => 'USD', 'symbol' => '$', 'status' => 'active'],
            ['country' => 'European Union', 'currency' => 'EUR', 'symbol' => '€', 'status' => 'active'],
            ['country' => 'United Kingdom', 'currency' => 'GBP', 'symbol' => '£', 'status' => 'active'],
            ['country' => 'India', 'currency' => 'INR', 'symbol' => '₹', 'status' => 'active'],
            ['country' => 'United Arab Emirates', 'currency' => 'AED', 'symbol' => 'د.إ', 'status' => 'active'],
        ];
    }
};
