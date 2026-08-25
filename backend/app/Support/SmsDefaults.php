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
            'api_base_url' => null,
            'sender_id' => null,
            'default_country_code' => '880',
            'test_number' => null,
            'require_guest_checkout_otp' => false,
            'require_registered_checkout_otp' => false,
            'otp_length' => 6,
            'otp_expiration_minutes' => 5,
            'order_confirmation_enabled' => true,
            'order_status_events' => array_fill_keys(OrderService::ORDER_STATUSES, true),
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

        return array_map(fn (array $template): array => [
            ...$template,
            'enabled' => true,
            'allowed_placeholders' => self::PLACEHOLDERS,
        ], $templates);
    }
}
