<?php

namespace App\Services\Payments;

use App\Models\Settings\PaymentGatewaySetting;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Support\Facades\Cache;

class PaymentGatewayManager
{
    /** @var array<string, PaymentGatewayInterface> */
    private array $gateways;

    public function __construct(
        CashOnDeliveryService $cod,
        StripeService $stripe,
        PaypalService $paypal,
        SslCommerzService $sslCommerz,
        BkashService $bkash,
        NagadService $nagad,
        AamarPayService $aamarPay,
    ) {
        $this->gateways = collect([$cod, $stripe, $paypal, $sslCommerz, $bkash, $nagad, $aamarPay])->keyBy->gateway()->all();
    }

    public function enabledSettings()
    {
        $this->ensureDefaultSettings();

        return PaymentGatewaySetting::query()
            ->where('enabled', true)
            ->orderBy('display_order')
            ->get()
            ->values();
    }

    public function setting(string $gateway, bool $requireEnabled = true): PaymentGatewaySetting
    {
        $this->ensureDefaultSettings();

        $setting = PaymentGatewaySetting::query()->where('gateway', $gateway)->firstOrFail();
        if ($requireEnabled) {
            abort_unless($setting->enabled, 422, 'The selected payment method is not enabled.');
        }
        abort_unless(isset($this->gateways[$gateway]), 422, 'The selected payment method is not supported by checkout.');

        return $setting;
    }

    public function gateway(string $gateway): PaymentGatewayInterface
    {
        abort_unless(isset($this->gateways[$gateway]), 422, 'The selected payment method is not supported by checkout.');

        return $this->gateways[$gateway];
    }

    private function ensureDefaultSettings(): void
    {
        foreach (SettingsDefaults::paymentGateways() as $gateway) {
            PaymentGatewaySetting::query()->firstOrCreate(
                ['gateway' => $gateway['gateway']],
                $gateway,
            );
        }

        Cache::forget('checkout.payment-methods.enabled');
    }
}
