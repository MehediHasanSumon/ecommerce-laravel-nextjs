<?php

namespace App\Contracts\Fraud;

use App\Models\Settings\FraudProviderSetting;

interface FraudProvider
{
    public function key(): string;

    public function label(): string;

    public function capabilities(): array;

    public function testConnection(FraudProviderSetting $setting): array;

    public function check(FraudProviderSetting $setting, array $input, ?int $fraudCheckId = null): array;
}
