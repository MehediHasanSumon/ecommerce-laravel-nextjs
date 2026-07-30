<?php

return [
    'trusted_proxies' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('IP_BLOCKING_TRUSTED_PROXIES', ''))
    ))),
    'state_cache_seconds' => (int) env('IP_BLOCKING_STATE_CACHE_SECONDS', 120),
    'permanent_cache_seconds' => (int) env('IP_BLOCKING_PERMANENT_CACHE_SECONDS', 300),
    'negative_cache_seconds' => (int) env('IP_BLOCKING_NEGATIVE_CACHE_SECONDS', 60),
    'settings_cache_seconds' => (int) env('IP_BLOCKING_SETTINGS_CACHE_SECONDS', 300),
    'rules_cache_seconds' => (int) env('IP_BLOCKING_RULES_CACHE_SECONDS', 300),
    'attempt_retention_days' => (int) env('IP_BLOCKING_ATTEMPT_RETENTION_DAYS', 30),
    'event_retention_days' => (int) env('IP_BLOCKING_EVENT_RETENTION_DAYS', 730),
    'maintenance_batch_size' => (int) env('IP_BLOCKING_MAINTENANCE_BATCH_SIZE', 1000),
    'forwarded_headers' => [
        'cloudflare' => 'CF-Connecting-IP',
        'forwarded_for' => 'X-Forwarded-For',
        'real_ip' => 'X-Real-IP',
    ],
];
