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
        ];
    }

    public static function store(): array
    {
        return [
            'enable_reviews' => true,
            'enable_wishlist' => true,
            'require_login_before_checkout' => false,
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

    public static function homePage(): array
    {
        return [
            'enable_product_section' => true,
            'products_per_section' => 20,
            'enable_testimonial_section' => true,
            'announcement_enabled' => true,
            'announcement_text' => 'Free shipping on orders over ৳75.00! Limited time offer.',
            'announcement_link_text' => 'Shop Now',
            'announcement_link_url' => '/shop',
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
            'enable_sitemap' => true,
            'sitemap_url' => rtrim((string) config('app.url'), '/').'/sitemap.xml',
            'og_title' => $appName,
            'og_description' => 'Discover quality products and reliable delivery from '.$appName.'.',
            'og_image' => null,
            'twitter_card_type' => 'summary_large_image',
            'twitter_title' => $appName,
            'twitter_description' => 'Discover quality products and reliable delivery from '.$appName.'.',
            'twitter_image' => null,
        ];
    }

    public static function paymentGateways(): array
    {
        return collect(['stripe', 'sslcommerz', 'bkash', 'nagad', 'paypal', 'aamarpay', 'cash_on_delivery'])
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
