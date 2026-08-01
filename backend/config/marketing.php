<?php

use App\Services\Marketing\GoogleAnalyticsProvider;
use App\Services\Marketing\MetaConversionsProvider;

return [
    'providers' => [
        'meta' => MetaConversionsProvider::class,
        'google' => GoogleAnalyticsProvider::class,
    ],
    'meta' => [
        'graph_version' => env('META_GRAPH_API_VERSION', 'v26.0'),
        'base_url' => 'https://graph.facebook.com',
        'timeout' => (int) env('META_CONVERSIONS_TIMEOUT', 8),
    ],
    'google' => [
        'collect_url' => 'https://www.google-analytics.com/mp/collect',
        'debug_url' => 'https://www.google-analytics.com/debug/mp/collect',
        'timeout' => (int) env('GA4_MEASUREMENT_TIMEOUT', 8),
    ],
    'queue' => env('MARKETING_TRACKING_QUEUE', 'marketing'),
    'client_events' => [
        'page_view', 'view_content', 'view_item', 'view_item_list', 'view_category', 'view_brand',
        'view_collection', 'search', 'select_item', 'add_to_wishlist', 'add_to_cart',
        'remove_from_cart', 'view_cart', 'begin_checkout', 'add_shipping_info',
        'add_payment_info', 'purchase', 'complete_registration', 'sign_up', 'login', 'logout',
        'contact', 'subscribe', 'lead', 'generate_lead', 'view_promotion', 'select_promotion',
        'apply_coupon', 'refund',
    ],
];
