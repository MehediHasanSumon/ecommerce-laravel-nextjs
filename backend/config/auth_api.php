<?php

return [
    'access_token_expiration_minutes' => (int) env('AUTH_ACCESS_TOKEN_EXPIRATION_MINUTES', 15),
    'refresh_token_expiration_minutes' => (int) env('AUTH_REFRESH_TOKEN_EXPIRATION_MINUTES', 20160),
    'refresh_token_reuse_grace_seconds' => (int) env('AUTH_REFRESH_TOKEN_REUSE_GRACE_SECONDS', 30),
    'password_reset_expiration_minutes' => (int) env('AUTH_PASSWORD_RESET_EXPIRATION_MINUTES', 30),
    'frontend_password_reset_url' => env('FRONTEND_PASSWORD_RESET_URL', env('APP_URL').'/reset-password'),
    'allowed_origins' => array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', '')))),
    'access_cookie_name' => env('AUTH_ACCESS_COOKIE_NAME', 'auth_access_token'),
    'refresh_cookie_name' => env('AUTH_REFRESH_COOKIE_NAME', 'auth_refresh_token'),
];
