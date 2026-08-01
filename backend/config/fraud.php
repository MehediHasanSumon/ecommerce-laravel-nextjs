<?php

return [
    'http' => [
        'connect_timeout' => (int) env('FRAUD_CONNECT_TIMEOUT', 3),
        'timeout' => (int) env('FRAUD_HTTP_TIMEOUT', 8),
        'retries' => (int) env('FRAUD_HTTP_RETRIES', 1),
        'retry_delay_ms' => (int) env('FRAUD_RETRY_DELAY_MS', 250),
    ],
    'circuit_breaker' => [
        'failure_threshold' => (int) env('FRAUD_CIRCUIT_FAILURE_THRESHOLD', 5),
        'cooldown_minutes' => (int) env('FRAUD_CIRCUIT_COOLDOWN_MINUTES', 10),
    ],
    'risk_levels' => [
        'safe' => 0,
        'low' => 20,
        'medium' => 45,
        'high' => 70,
        'critical' => 85,
    ],
    'providers' => [
        'fraudpeek' => [
            'label' => 'FraudPeek',
            'driver' => App\Services\Fraud\FraudPeekProvider::class,
            'production_url' => null,
            'sandbox_url' => null,
            'public_contract' => false,
            'requires_api_url' => true,
            'allowed_hosts' => [],
            'default_configuration' => [
                'method' => 'POST',
                'phone_field' => 'phone',
                'auth_header' => 'api_key',
            ],
        ],
        'fraud_bd' => [
            'label' => 'Fraud.bd',
            'driver' => App\Services\Fraud\FraudDotBdProvider::class,
            'production_url' => null,
            'sandbox_url' => null,
            'public_contract' => false,
            'requires_api_url' => true,
            'allowed_hosts' => [],
            'default_configuration' => [
                'method' => 'POST',
                'phone_field' => 'phone_number',
                'auth_header' => 'api_key',
            ],
        ],
        'fraudbd' => [
            'label' => 'FraudBD',
            'driver' => App\Services\Fraud\FraudBdOfficialProvider::class,
            'production_url' => 'https://fraudbd.com/api/check-courier-info',
            'sandbox_url' => 'https://fraudbd.com/api/sandbox/check-courier-info',
            'connection_url' => 'https://fraudbd.com/api/sandbox/check-api-connection',
            'public_contract' => true,
            'requires_api_url' => false,
            'allowed_hosts' => ['fraudbd.com', 'www.fraudbd.com'],
            'default_configuration' => [],
        ],
    ],
];
