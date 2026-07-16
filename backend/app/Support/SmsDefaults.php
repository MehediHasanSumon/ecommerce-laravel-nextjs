<?php

namespace App\Support;

use App\Services\Orders\OrderService;

class SmsDefaults
{
    public const PLACEHOLDERS = [
        'customer_name',
        'order_id',
        'verification_code',
        'order_status',
        'payment_status',
        'tracking_number',
        'total_amount',
        'store_name',
    ];

    public static function settings(): array
    {
        return [
            'enabled' => false,
            'provider' => 'generic_http',
            'provider_configuration' => [
                'method' => 'POST',
                'format' => 'json',
                'recipient_format' => 'digits',
                'recipient_parameter' => 'to',
                'message_parameter' => 'message',
                'sender_parameter' => 'sender_id',
                'route_parameter' => 'route',
                'api_key_parameter' => '',
                'api_secret_parameter' => '',
                'username_parameter' => '',
                'password_parameter' => '',
            ],
            'api_base_url' => null,
            'sender_id' => null,
            'route' => null,
            'default_country_code' => '880',
            'request_timeout' => 15,
            'test_number' => null,
            'require_guest_checkout_otp' => false,
            'require_registered_checkout_otp' => false,
            'otp_length' => 6,
            'otp_expiration_minutes' => 5,
            'otp_resend_cooldown_seconds' => 60,
            'otp_max_resends' => 3,
            'otp_max_verification_attempts' => 5,
            'otp_rate_limit_per_hour' => 10,
            'order_confirmation_enabled' => true,
            'order_status_events' => array_fill_keys(OrderService::ORDER_STATUSES, true),
            'shipping_status_events' => array_fill_keys(OrderService::SHIPPING_STATUSES, true),
        ];
    }

    public static function templates(): array
    {
        $templates = [
            [
                'event' => 'otp',
                'name' => 'Checkout verification code',
                'body' => '{verification_code} is your {store_name} verification code. It expires shortly. Do not share it.',
            ],
            [
                'event' => 'order_confirmation',
                'name' => 'Order confirmation',
                'body' => 'Hello {customer_name}, order {order_id} has been placed. Total: {total_amount}. Thank you for shopping with {store_name}.',
            ],
        ];

        foreach (OrderService::ORDER_STATUSES as $status) {
            $templates[] = [
                'event' => 'order_status_'.$status,
                'name' => 'Order status: '.ucwords(str_replace('_', ' ', $status)),
                'body' => 'Order {order_id} status is now {order_status}. - {store_name}',
            ];
        }

        foreach (OrderService::SHIPPING_STATUSES as $status) {
            $templates[] = [
                'event' => 'shipping_status_'.$status,
                'name' => 'Shipping status: '.ucwords(str_replace('_', ' ', $status)),
                'body' => 'Shipping for order {order_id} is now {order_status}. Tracking: {tracking_number}. - {store_name}',
            ];
        }

        return array_map(fn (array $template): array => [
            ...$template,
            'enabled' => true,
            'allowed_placeholders' => self::PLACEHOLDERS,
        ], $templates);
    }
}
