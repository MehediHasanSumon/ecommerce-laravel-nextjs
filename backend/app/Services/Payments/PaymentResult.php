<?php

namespace App\Services\Payments;

class PaymentResult
{
    public function __construct(
        public readonly string $status,
        public readonly ?string $redirectUrl = null,
        public readonly array $payload = [],
    ) {}
}
