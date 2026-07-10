<?php

namespace App\Support\Admin;

class SettingsDefaults
{
    public static function company(): array
    {
        return [
            'company_name' => 'LuxeCart',
            'legal_company_name' => 'LuxeCart Commerce Ltd.',
            'company_email' => 'hello@luxecart.test',
            'company_phone' => '+880 1700-000000',
            'support_email' => 'support@luxecart.test',
            'support_phone' => '+880 1700-000001',
            'logo' => null,
            'dark_logo' => null,
            'favicon' => null,
            'invoice_logo' => null,
            'country' => 'Bangladesh',
            'state' => 'Dhaka',
            'city' => 'Dhaka',
            'postal_code' => '1205',
            'full_address' => 'House 12, Road 8, Dhanmondi, Dhaka, Bangladesh',
            'tax_number' => null,
            'trade_license' => null,
            'currency_id' => null,
            'currency_position' => 'left',
            'decimal_places' => 2,
            'decimal_separator' => '.',
            'thousands_separator' => ',',
            'timezone' => 'Asia/Dhaka',
            'date_format' => 'd M Y',
            'time_format' => '12h',
            'invoice_prefix' => 'INV',
            'invoice_footer' => 'Thank you for shopping with LuxeCart.',
            'invoice_terms' => 'All prices include applicable taxes unless noted otherwise.',
            'company_active' => true,
        ];
    }

    public static function store(): array
    {
        return [
            'store_name' => 'LuxeCart',
            'store_url' => config('app.url'),
            'store_email' => 'store@luxecart.test',
            'store_phone' => '+880 1700-000002',
            'products_per_page' => 24,
            'default_product_sorting' => 'latest',
            'default_product_view' => 'grid',
            'enable_reviews' => true,
            'enable_wishlist' => true,
            'enable_compare' => false,
            'enable_stock_management' => true,
            'enable_guest_checkout' => true,
            'require_login_before_checkout' => false,
            'minimum_order_amount_cents' => 0,
            'maximum_order_amount_cents' => null,
            'low_stock_threshold' => 5,
            'allow_backorders' => false,
            'hide_out_of_stock_products' => false,
        ];
    }

    public static function categoryDisplay(): array
    {
        return [
            'enable_home_category_section' => true,
            'category_display_mode' => 'landing_page',
        ];
    }

    public static function homeFeatureCards(): array
    {
        return [
            'enabled' => true,
        ];
    }

    public static function blog(): array
    {
        return [
            'enabled' => false,
            'layout' => 'grid',
            'list_enable_thumbnail' => true,
            'list_show_excerpt' => true,
            'list_show_author' => true,
            'list_show_published_date' => true,
            'list_show_reading_time' => true,
            'show_on_home' => false,
            'home_limit' => 3,
            'allow_comments' => true,
            'enable_related' => true,
            'enable_search' => true,
            'default_meta_title' => 'Blog',
            'default_meta_description' => 'Read the latest articles and updates from our store.',
            'open_graph_image' => null,
            'canonical_url' => null,
        ];
    }

    public static function brand(): array
    {
        return [
            'enabled' => true,
            'show_on_home' => true,
        ];
    }

    public static function homeFeatureCardItems(): array
    {
        return [
            ['icon' => 'Truck', 'title' => 'Free Shipping', 'description' => 'On qualifying orders', 'sort_order' => 0, 'status' => true],
            ['icon' => 'Shield', 'title' => 'Secure Payment', 'description' => '256-bit SSL encryption', 'sort_order' => 1, 'status' => true],
            ['icon' => 'RotateCcw', 'title' => 'Easy Returns', 'description' => '30-day return policy', 'sort_order' => 2, 'status' => true],
            ['icon' => 'HeadphonesIcon', 'title' => '24/7 Support', 'description' => 'Dedicated customer care', 'sort_order' => 3, 'status' => true],
        ];
    }

    public static function email(): array
    {
        return [
            'mail_driver' => 'smtp',
            'mail_host' => 'smtp.mailtrap.io',
            'mail_port' => 587,
            'encryption' => 'tls',
            'username' => null,
            'password' => null,
            'from_name' => 'LuxeCart',
            'from_email' => 'no-reply@luxecart.test',
            'reply_to_email' => 'support@luxecart.test',
            'queue_emails' => true,
            'enabled' => true,
        ];
    }

    public static function seo(): array
    {
        $appName = config('app.name', 'Ecommerce');

        return [
            'site_title' => $appName,
            'meta_title' => $appName.' - Modern Online Shopping',
            'meta_description' => 'Shop curated fashion, electronics, lifestyle products, and daily essentials at '.$appName.'.',
            'meta_keywords' => 'online shopping,ecommerce,luxecart,bangladesh',
            'canonical_url' => config('app.url'),
            'robots_index' => true,
            'robots_follow' => true,
            'robots_archive' => true,
            'enable_sitemap' => true,
            'sitemap_url' => rtrim((string) config('app.url'), '/').'/sitemap.xml',
            'og_title' => $appName,
            'og_description' => 'Discover quality products and reliable delivery from '.$appName.'.',
            'og_image' => null,
            'twitter_card_type' => 'summary_large_image',
            'twitter_title' => $appName,
            'twitter_description' => 'Discover quality products and reliable delivery from '.$appName.'.',
            'twitter_image' => null,
            'google_analytics_id' => null,
            'google_tag_manager_id' => null,
            'facebook_pixel_id' => null,
        ];
    }

    public static function localization(): array
    {
        return [
            'default_language' => 'en',
            'default_currency' => 'BDT',
            'timezone' => 'Asia/Dhaka',
            'date_format' => 'd M Y',
            'time_format' => '12h',
            'first_day_of_week' => 0,
            'rtl_mode' => false,
            'decimal_separator' => '.',
            'thousand_separator' => ',',
        ];
    }

    public static function maintenance(): array
    {
        return [
            'enabled' => false,
            'title' => 'Maintenance in progress',
            'message' => 'We are upgrading the store. Please check back shortly.',
            'estimated_return_time' => null,
            'allow_admin_access' => true,
            'allowed_ip_addresses' => [],
            'retry_after' => 3600,
            'maintenance_image' => null,
        ];
    }

    public static function smsProviders(): array
    {
        return [
            ['provider' => 'twilio', 'api_key' => null, 'api_secret' => null, 'sender_id' => 'LuxeCart', 'base_url' => null, 'is_default' => false, 'status' => false],
            ['provider' => 'vonage', 'api_key' => null, 'api_secret' => null, 'sender_id' => 'LuxeCart', 'base_url' => null, 'is_default' => false, 'status' => false],
            ['provider' => 'ssl_wireless', 'api_key' => null, 'api_secret' => null, 'sender_id' => 'LuxeCart', 'base_url' => 'https://smsplus.sslwireless.com', 'is_default' => true, 'status' => true],
            ['provider' => 'custom', 'api_key' => null, 'api_secret' => null, 'sender_id' => 'LuxeCart', 'base_url' => null, 'is_default' => false, 'status' => false],
        ];
    }

    public static function paymentGateways(): array
    {
        return collect(['stripe', 'sslcommerz', 'bkash', 'nagad', 'rocket', 'paypal', 'aamarpay', 'cash_on_delivery'])
            ->map(fn (string $gateway, int $index) => [
                'gateway' => $gateway,
                'enabled' => $gateway === 'cash_on_delivery',
                'sandbox_mode' => true,
                'public_key' => null,
                'secret_key' => null,
                'api_key' => null,
                'merchant_id' => null,
                'webhook_secret' => null,
                'additional_configuration' => [],
                'display_order' => $index,
            ])
            ->all();
    }

    public static function socialMedia(): array
    {
        return collect(['facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok', 'pinterest'])
            ->map(fn (string $platform, int $index) => [
                'platform' => $platform,
                'url' => "https://example.com/{$platform}",
                'icon' => $platform,
                'display_order' => $index,
                'open_in_new_tab' => true,
                'status' => in_array($platform, ['facebook', 'instagram', 'youtube'], true),
            ])
            ->all();
    }

}
