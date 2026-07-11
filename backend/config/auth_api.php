<?php

return [
    'access_token_expiration_minutes' => (int) env('AUTH_ACCESS_TOKEN_EXPIRATION_MINUTES', 10080),
    'password_reset_expiration_minutes' => (int) env('AUTH_PASSWORD_RESET_EXPIRATION_MINUTES', 30),
    'frontend_password_reset_url' => env('FRONTEND_PASSWORD_RESET_URL', env('APP_URL').'/reset-password'),
    'allowed_origins' => array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', '')))),
    'access_cookie_name' => env('AUTH_ACCESS_COOKIE_NAME', 'auth_access_token'),
];
