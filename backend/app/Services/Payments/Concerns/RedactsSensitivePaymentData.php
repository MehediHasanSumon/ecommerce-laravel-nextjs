<?php

namespace App\Services\Payments\Concerns;

trait RedactsSensitivePaymentData
{
    protected function redact(array $payload): array
    {
        $sensitive = ['store_passwd', 'password', 'secret', 'secret_key', 'api_key', 'app_secret', 'key_secret', 'private_key', 'webhook_secret'];

        foreach ($payload as $key => $value) {
            if (in_array(strtolower((string) $key), $sensitive, true)) {
                $payload[$key] = '********';
                continue;
            }

            if (is_array($value)) {
                $payload[$key] = $this->redact($value);
            }
        }

        return $payload;
    }
}
