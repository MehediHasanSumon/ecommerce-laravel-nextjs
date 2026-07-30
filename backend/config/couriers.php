<?php

return [
    'sync_interval_minutes' => 15,
    'sync_batch_size' => 100,
    'location_cache_seconds' => 86400,
    'http' => [
        'connect_timeout' => 10,
        'timeout' => 30,
        'retries' => 2,
        'retry_delay_ms' => 300,
    ],
    'providers' => [
        'steadfast' => [
            'label' => 'Steadfast Courier',
            'production_base_url' => 'https://portal.packzy.com/api/v1',
            'sandbox_base_url' => 'https://portal.packzy.com/api/v1',
        ],
        'pathao' => [
            'label' => 'Pathao Courier',
            'production_base_url' => 'https://api-hermes.pathao.com/aladdin/api/v1',
            'sandbox_base_url' => 'https://courier-api-sandbox.pathao.com/aladdin/api/v1',
        ],
    ],
];
