<?php

namespace App\Services\Sms;

use App\Services\Sms\Contracts\SmsProvider;
use App\Services\Sms\Providers\GenericHttpSmsProvider;
use InvalidArgumentException;

class SmsProviderManager
{
    public function driver(string $provider): SmsProvider
    {
        return match ($provider) {
            'generic_http' => app(GenericHttpSmsProvider::class),
            default => throw new InvalidArgumentException("Unsupported SMS provider [{$provider}]."),
        };
    }

    public function providers(): array
    {
        return [
            ['value' => 'generic_http', 'label' => 'Generic HTTP API'],
        ];
    }
}
