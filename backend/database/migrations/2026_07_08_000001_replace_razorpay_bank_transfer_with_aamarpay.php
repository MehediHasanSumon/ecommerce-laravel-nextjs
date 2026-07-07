<?php

use App\Models\Settings\PaymentGatewaySetting;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        PaymentGatewaySetting::query()
            ->whereIn('gateway', ['razorpay', 'bank_transfer'])
            ->delete();

        PaymentGatewaySetting::query()->firstOrCreate(
            ['gateway' => 'aamarpay'],
            [
                'enabled' => false,
                'sandbox_mode' => true,
                'public_key' => null,
                'secret_key' => null,
                'api_key' => null,
                'merchant_id' => null,
                'webhook_secret' => null,
                'additional_configuration' => [
                    'display_name' => 'aamarPay',
                    'checkout_description' => 'Pay securely with aamarPay.',
                ],
                'display_order' => 6,
            ],
        );
    }

    public function down(): void
    {
        PaymentGatewaySetting::query()
            ->where('gateway', 'aamarpay')
            ->delete();

        foreach (['razorpay', 'bank_transfer'] as $index => $gateway) {
            PaymentGatewaySetting::query()->firstOrCreate(
                ['gateway' => $gateway],
                [
                    'enabled' => false,
                    'sandbox_mode' => true,
                    'public_key' => null,
                    'secret_key' => null,
                    'api_key' => null,
                    'merchant_id' => null,
                    'webhook_secret' => null,
                    'additional_configuration' => [],
                    'display_order' => 7 + $index,
                ],
            );
        }
    }
};
