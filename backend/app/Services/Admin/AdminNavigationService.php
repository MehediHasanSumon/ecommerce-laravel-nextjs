<?php

namespace App\Services\Admin;

use App\Models\User;
use App\Services\Admin\Settings\BrandSettingsService;
use App\Services\Admin\Settings\StoreSettingsService;
use Illuminate\Support\Facades\Cache;

class AdminNavigationService
{
    private const VERSION_KEY = 'navigation.admin.version';

    public function __construct(
        private readonly BrandSettingsService $brands,
        private readonly StoreSettingsService $store,
    ) {}

    public function for(User $user): array
    {
        $permissions = $user->getAllPermissions()->pluck('name')->sort()->values();
        $roles = $user->roles()->pluck('name')->sort()->values();
        $modules = $this->modules();
        $version = Cache::get(self::VERSION_KEY, 1);
        $signature = hash('sha256', json_encode([$permissions, $roles, $modules], JSON_THROW_ON_ERROR));

        return Cache::remember(
            "navigation.admin.{$version}.{$signature}",
            now()->addMinutes(10),
            fn (): array => $this->filter($user, $this->definition($modules)),
        );
    }

    public function invalidate(): void
    {
        Cache::add(self::VERSION_KEY, 1);
        Cache::increment(self::VERSION_KEY);
    }

    private function modules(): array
    {
        return [
            'products' => true,
            'categories' => true,
            'brands' => $this->brands->enabled(),
            'offers' => true,
            'reviews' => (bool) $this->store->get()->enable_reviews,
            'comments' => (bool) $this->store->get()->enable_product_comments,
        ];
    }

    private function filter(User $user, array $groups): array
    {
        return collect($groups)
            ->map(function (array $group) use ($user): array {
                $items = collect($group['items'])
                    ->filter(fn (array $item): bool => $item['enabled'] && $user->can($item['permission']))
                    ->map(fn (array $item): array => [
                        'label' => $item['label'],
                        'href' => $item['href'],
                        'icon' => $item['icon'],
                    ])
                    ->values()
                    ->all();

                return [
                    'key' => $group['key'],
                    'label' => $group['label'],
                    'icon' => $group['icon'] ?? null,
                    'type' => $group['type'],
                    'items' => $items,
                ];
            })
            ->filter(fn (array $group): bool => $group['items'] !== [])
            ->values()
            ->all();
    }

    private function definition(array $modules): array
    {
        return [
            ['key' => 'main', 'label' => 'Main', 'type' => 'single', 'items' => [
                $this->item('Dashboard', '/admin/dashboard', 'Home', 'can_view_dashboard'),
            ]],
            ['key' => 'orders', 'label' => 'Orders', 'type' => 'single', 'items' => [
                $this->item('Order Management', '/admin/orders', 'PackageCheck', 'can_view_order'),
                $this->item('Courier Shipments', '/admin/shipments', 'Truck', 'can_view_courier_shipment'),
            ]],
            ['key' => 'customers', 'label' => 'Customer Management', 'type' => 'single', 'items' => [
                $this->item('Customer Management', '/admin/customers', 'UsersRound', 'can_view_customer'),
            ]],
            ['key' => 'products', 'label' => 'Product Management', 'icon' => 'Package', 'type' => 'single', 'items' => [
                $this->item('Product Management', '/admin/products', 'Package', 'can_view_product', $modules['products']),
            ]],
            ['key' => 'users', 'label' => 'Users Management', 'icon' => 'UsersRound', 'type' => 'group', 'items' => [
                $this->item('User Management', '/admin/users', 'UsersRound', 'can_view_user'),
                $this->item('Role Management', '/admin/roles', 'ShieldCheck', 'can_view_role'),
                $this->item('Permission Management', '/admin/permissions', 'KeyRound', 'can_view_permission'),
            ]],
            ['key' => 'catalog', 'label' => 'Catalog', 'icon' => 'Layers3', 'type' => 'group', 'items' => [
                $this->item('Brand Management', '/admin/brands', 'Building2', 'can_view_brand', $modules['brands']),
                $this->item('Category Management', '/admin/categories', 'Layers3', 'can_view_category', $modules['categories']),
                $this->item('Attribute Management', '/admin/attributes', 'Shapes', 'can_view_attribute', $modules['products']),
                $this->item('Attribute Value Management', '/admin/attribute-values', 'Boxes', 'can_view_attribute_value', $modules['products']),
                $this->item('Tag Management', '/admin/tags', 'Tags', 'can_view_tag', $modules['products']),
                $this->item('Review Management', '/admin/reviews', 'Star', 'can_view_review', $modules['reviews']),
                $this->item('Comment Management', '/admin/comments', 'MessageSquareText', 'can_view_comment', $modules['comments']),
            ]],
            ['key' => 'marketing', 'label' => 'Marketing & Pricing', 'icon' => 'Megaphone', 'type' => 'group', 'items' => [
                $this->item('Collection Management', '/admin/collections', 'ShoppingBag', 'can_view_collection', $modules['products']),
                $this->item('Currency Management', '/admin/currencies', 'CircleDollarSign', 'can_view_currency'),
                $this->item('Discount Management', '/admin/discounts', 'CirclePercent', 'can_view_discount', $modules['offers']),
            ]],
            ['key' => 'content', 'label' => 'Content', 'icon' => 'Newspaper', 'type' => 'group', 'items' => [
                $this->item('Blog Management', '/admin/blogs', 'Newspaper', 'can_view_blog'),
                $this->item('Contact Inbox', '/admin/contact-messages', 'Mail', 'can_view_contact_message'),
            ]],
            ['key' => 'reports', 'label' => 'Reports & Analytics', 'icon' => 'BarChart3', 'type' => 'group', 'items' => [
                $this->item('Sales Reports', '/admin/reports/sales', 'BarChart3', 'can_view_sales_report'),
                $this->item('Revenue Analytics', '/admin/reports/revenue', 'CircleDollarSign', 'can_view_revenue_report'),
                $this->item('Product Performance', '/admin/reports/product-performance', 'Package', 'can_view_product_performance_report'),
                $this->item('Customer Analytics', '/admin/reports/customer-analytics', 'UsersRound', 'can_view_customer_analytics_report'),
                $this->item('Payment Reports', '/admin/reports/payment', 'CreditCard', 'can_view_payment_report'),
                $this->item('Shipping Reports', '/admin/reports/shipping', 'PackageCheck', 'can_view_shipping_report'),
                $this->item('Inventory Reports', '/admin/reports/inventory', 'Warehouse', 'can_view_inventory_report'),
                $this->item('Search Analytics', '/admin/search-analytics', 'Search', 'can_view_search_analytics'),
                $this->item('Fraud Analytics', '/admin/fraud-analytics', 'ShieldCheck', 'can_view_fraud_analytics'),
                $this->item('Marketing Analytics', '/admin/marketing-analytics', 'ChartNoAxesCombined', 'can_view_marketing_analytics'),
            ]],
            ['key' => 'security', 'label' => 'Security', 'icon' => 'ShieldAlert', 'type' => 'group', 'items' => [
                $this->item('IP Blocking', '/admin/security/ip-blocks', 'ShieldAlert', 'can-view-ip-block'),
            ]],
            ['key' => 'settings', 'label' => 'Settings', 'icon' => 'Settings2', 'type' => 'group', 'items' => [
                $this->item('Company Settings', '/admin/settings/company', 'Building2', 'can_view_company_setting'),
                $this->item('Hero Section', '/admin/settings/hero-section', 'LayoutGrid', 'can_view_hero_section'),
                $this->item('Home Page Settings', '/admin/settings/home-page', 'LayoutGrid', 'can_view_home_page_setting'),
                $this->item('Feature Cards', '/admin/settings/home-feature-cards', 'BadgeCheck', 'can_view_home_feature_card_setting'),
                $this->item('Blog Settings', '/admin/settings/blog', 'Newspaper', 'can_view_blog_setting'),
                $this->item('Store Settings', '/admin/settings/store', 'Store', 'can_view_store_setting'),
                $this->item('Payment Settings', '/admin/settings/payment', 'CreditCard', 'can_view_payment_setting'),
                $this->item('Shipping Zones', '/admin/settings/shipping-zones', 'MapPin', 'can_view_shipping_zone'),
                $this->item('Shipping Methods', '/admin/settings/shipping-methods', 'PackageCheck', 'can_view_shipping_method'),
                $this->item('Courier Integrations', '/admin/settings/couriers', 'Truck', 'can_view_courier_setting'),
                $this->item('Fraud Detection', '/admin/settings/fraud-detection', 'ShieldCheck', 'can_view_fraud_setting'),
                $this->item('Meta Pixel', '/admin/settings/meta-pixel', 'BarChart3', 'can_view_meta_pixel_setting'),
                $this->item('Google Analytics', '/admin/settings/google-analytics', 'ChartNoAxesCombined', 'can_view_google_analytics_setting'),
                $this->item('SEO Settings', '/admin/settings/seo', 'Search', 'can_view_seo_setting'),
                $this->item('Footer Settings', '/admin/settings/footer', 'LayoutGrid', 'can_view_footer_setting'),
                $this->item('SMS Settings', '/admin/settings/sms', 'MessageSquareText', 'can_view_sms_setting'),
                $this->item('SMS Logs', '/admin/settings/sms/logs', 'ListChecks', 'can_view_sms_log'),
                $this->item('Security Settings', '/admin/settings/security', 'ShieldAlert', 'can-view-ip-block'),
            ]],
        ];
    }

    private function item(string $label, string $href, string $icon, string $permission, bool $enabled = true): array
    {
        return compact('label', 'href', 'icon', 'permission', 'enabled');
    }
}
