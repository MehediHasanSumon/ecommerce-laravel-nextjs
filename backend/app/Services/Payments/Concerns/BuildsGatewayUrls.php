<?php

namespace App\Services\Payments\Concerns;

use App\Models\Settings\PaymentGatewaySetting;

trait BuildsGatewayUrls
{
    protected function configValue(PaymentGatewaySetting $setting, string $key, mixed $default = null): mixed
    {
        return ((array) ($setting->additional_configuration ?? []))[$key] ?? $default;
    }
}
