<?php

namespace App\Services\Fraud;

class FraudDotBdProvider extends ConfigurablePrivateFraudProvider
{
    public function key(): string
    {
        return 'fraud_bd';
    }
}
