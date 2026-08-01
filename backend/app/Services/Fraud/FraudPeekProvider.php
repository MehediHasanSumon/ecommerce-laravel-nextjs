<?php

namespace App\Services\Fraud;

class FraudPeekProvider extends ConfigurablePrivateFraudProvider
{
    public function key(): string
    {
        return 'fraudpeek';
    }
}
