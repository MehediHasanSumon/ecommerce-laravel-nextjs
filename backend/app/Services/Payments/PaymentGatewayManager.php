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
        BankTransferService $bankTransfer,
        SslCommerzService $sslCommerz,
        BkashService $bkash,
        NagadService $nagad,
    ) {
        $this->gateways = collect([$cod, $bankTransfer, $sslCommerz, $bkash, $nagad])->keyBy->gateway()->all();
    }

    public function enabledSettings()
    {
        $this->ensureDefaultSettings();

        return Cache::remember('checkout.payment-methods.enabled', 300, fn () => PaymentGatewaySetting::query()
            ->where('enabled', true)
            ->orderBy('display_order')
            ->get()
            ->filter(fn (PaymentGatewaySetting $setting) => isset($this->gateways[$setting->gateway]))
            ->values());
    }

    public function setting(string $gateway): PaymentGatewaySetting
    {
        $this->ensureDefaultSettings();

        $setting = PaymentGatewaySetting::query()->where('gateway', $gateway)->firstOrFail();
        abort_unless($setting->enabled, 422, 'The selected payment method is not enabled.');
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
        if (PaymentGatewaySetting::query()->exists()) {
            return;
        }

        foreach (SettingsDefaults::paymentGateways() as $gateway) {
            PaymentGatewaySetting::query()->create($gateway);
        }

        Cache::forget('checkout.payment-methods.enabled');
    }
}
