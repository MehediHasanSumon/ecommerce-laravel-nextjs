<?php

namespace App\Http\Controllers\Api\Settings;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\Settings\CategoryDisplaySettingResource;
use App\Http\Resources\PaymentMethodResource;
use App\Http\Responses\ApiResponse;
use App\Models\Category;
use App\Models\Product;
use App\Models\Settings\ShippingMethod;
use App\Services\Admin\HomeFeatureCardService;
use App\Services\Admin\Settings\BlogSettingsService;
use App\Services\Admin\Settings\BrandSettingsService;
use App\Services\Admin\Settings\CategoryDisplaySettingsService;
use App\Services\Admin\Settings\CompanySettingsService;
use App\Services\Admin\Settings\HomeFeatureCardSettingsService;
use App\Services\Admin\Settings\HomePageSettingsService;
use App\Services\Admin\Settings\PaymentSettingsService;
use App\Services\Admin\Settings\SmsSettingsService;
use App\Services\Admin\Settings\SocialMediaSettingsService;
use App\Services\Admin\Settings\StoreSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class NavigationSettingsController extends Controller
{
    public function __construct(
        private readonly CompanySettingsService $companySettings,
        private readonly CategoryDisplaySettingsService $categoryDisplaySettings,
        private readonly HomeFeatureCardSettingsService $homeFeatureCardSettings,
        private readonly HomePageSettingsService $homePageSettings,
        private readonly BlogSettingsService $blogSettings,
        private readonly BrandSettingsService $brandSettings,
        private readonly HomeFeatureCardService $homeFeatureCards,
        private readonly StoreSettingsService $storeSettings,
        private readonly SocialMediaSettingsService $socialMediaSettings,
        private readonly PaymentSettingsService $paymentSettings,
        private readonly SmsSettingsService $smsSettings,
    ) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success(Cache::remember(
            'settings.navigation.runtime',
            now()->addMinutes(10),
            fn (): array => $this->payload()
        ));
    }

    private function payload(): array
    {
        $company = $this->companySettings->get();
        $store = $this->storeSettings->get();
        $categoryDisplay = CategoryDisplaySettingResource::make($this->categoryDisplaySettings->get())->resolve();
        $homeFeatureCardSettings = $this->homeFeatureCardSettings->get();
        $homePageSettings = $this->homePageSettings->runtime();
        $blogSettings = $this->blogSettings->runtime();
        $brandSettings = $this->brandSettings->runtime();
        $social = $this->socialMediaSettings->all();
        $payments = $this->paymentSettings->all();
        $siteName = $company->company_name;
        $currency = $company->currency;

        $modules = [
            'storefront' => true,
            'catalog' => true,
            'products' => true,
            'categories' => true,
            'brands' => (bool) $brandSettings['enabled'],
            'offers' => true,
            'blog' => (bool) $blogSettings['enabled'],
            'wishlist' => (bool) $store->enable_wishlist,
            'reviews' => (bool) $store->enable_reviews,
            'shipping' => ShippingMethod::query()->where('status', true)->exists(),
            'payments' => $payments->contains('enabled', true),
        ];

        return [
            'company_settings' => $company->toArray(),
            'website_settings' => $store->toArray(),
            'product_card_settings' => [
                'style' => $store->product_card_style,
                'layout' => $store->product_layout,
                'slider' => [
                    'loop' => (bool) $store->product_slider_loop,
                    'autoplay' => (bool) $store->product_slider_autoplay,
                    'autoplay_delay' => (int) $store->product_slider_autoplay_delay,
                    'transition_speed' => (int) $store->product_slider_transition_speed,
                    'pause_on_hover' => (bool) $store->product_slider_pause_on_hover,
                    'mouse_drag' => (bool) $store->product_slider_mouse_drag,
                    'touch_swipe' => (bool) $store->product_slider_touch_swipe,
                    'navigation' => (bool) $store->product_slider_navigation,
                    'pagination' => (bool) $store->product_slider_pagination,
                    'desktop_slides' => (int) $store->product_slider_desktop_slides,
                    'tablet_slides' => (int) $store->product_slider_tablet_slides,
                    'mobile_slides' => (int) $store->product_slider_mobile_slides,
                    'space_between' => (int) $store->product_slider_space_between,
                    'center_mode' => (bool) $store->product_slider_center_mode,
                ],
            ],
            'customer_settings' => [
                'allow_registration' => (bool) $store->allow_customer_registration,
                'allow_guest_checkout' => (bool) $store->allow_guest_checkout,
                'require_login_before_checkout' => ! (bool) $store->allow_guest_checkout,
            ],
            'sms_settings' => $this->smsSettings->runtime(),
            'appearance_settings' => [
                'logo' => $this->assetUrl($company->logo),
                'dark_logo' => $this->assetUrl($company->dark_logo),
                'favicon' => $this->assetUrl($company->favicon),
                'site_name' => $siteName,
            ],
            'module_settings' => $modules,
            'category_display_settings' => $categoryDisplay,
            'feature_card_settings' => [
                'enabled' => (bool) $homeFeatureCardSettings->enabled,
            ],
            'home_page_settings' => $homePageSettings,
            'blog_settings' => $blogSettings,
            'brand_settings' => $brandSettings,
            'theme_configuration' => [
                'currency' => $currency?->currency ?: 'BDT',
                'currency_symbol' => $currency?->symbol ?: '৳',
                'currency_country' => $currency?->country,
                'currency_position' => $company->currency_position,
                'decimal_places' => (int) ($company->decimal_places ?? 2),
                'decimal_separator' => $company->decimal_separator ?: '.',
                'thousands_separator' => $company->thousands_separator ?: ',',
                'timezone' => $company->timezone,
                'date_format' => $company->date_format,
                'time_format' => $company->time_format,
            ],
            'branding' => [
                'site_name' => $siteName,
                'company_name' => $company->company_name,
                'legal_company_name' => $company->legal_company_name,
                'logo' => $this->assetUrl($company->logo),
                'dark_logo' => $this->assetUrl($company->dark_logo),
                'favicon' => $this->assetUrl($company->favicon),
                'support_email' => $company->support_email,
                'support_phone' => $company->support_phone,
                'company_phone' => $company->company_phone,
                'address' => $company->full_address,
            ],
            'navigation' => [
                'frontend' => $this->frontendNavigation($modules, $company, $store),
                'admin_sidebar' => $this->adminSidebar($modules),
            ],
            'categories' => $this->categoryTree(),
            'home_feature_cards' => (bool) $homeFeatureCardSettings->enabled
                ? $this->homeFeatureCards->activeForRuntime()
                : [],
            'payment_methods' => PaymentMethodResource::collection(
                $payments->where('enabled', true)->sortBy('display_order')->values()
            )->resolve(),
            'social_links' => $social
                ->where('status', true)
                ->values()
                ->map(fn ($item): array => [
                    'platform' => $item->platform,
                    'url' => $item->url,
                    'icon' => $item->icon,
                    'open_in_new_tab' => (bool) $item->open_in_new_tab,
                ])
                ->all(),
        ];
    }

    private function frontendNavigation(array $modules, object $company, object $store): array
    {
        return collect([
            ['label' => 'Home', 'href' => '/', 'module' => 'storefront', 'enabled' => $modules['storefront']],
            ['label' => 'Shop', 'href' => '/shop', 'module' => 'catalog', 'enabled' => $modules['catalog']],
            ['label' => 'Categories', 'href' => '/categories', 'module' => 'categories', 'enabled' => $modules['categories']],
            ['label' => 'Brands', 'href' => '/brands', 'module' => 'brands', 'enabled' => $modules['brands']],
            ['label' => 'Offers', 'href' => '/deals', 'module' => 'offers', 'enabled' => $modules['offers']],
            ['label' => 'Blog', 'href' => '/blogs', 'module' => 'blog', 'enabled' => $modules['blog']],
            ['label' => 'Contact', 'href' => '/contact', 'module' => 'contact', 'enabled' => (bool) ($company->support_email || $company->support_phone)],
        ])->where('enabled', true)->values()->all();
    }

    private function categoryTree(): array
    {
        return Cache::remember(
            'categories.runtime.tree',
            now()->addMinutes(10),
            function (): array {
                $categories = Category::query()
                    ->whereNull('parent_id')
                    ->where('status', 'active')
                    ->with([
                        'children' => fn ($query) => $query
                            ->where('status', 'active')
                            ->orderBy('navbar_display_order')
                            ->orderBy('sort_order')
                            ->orderBy('name'),
                    ])
                    ->orderBy('home_display_order')
                    ->orderBy('sort_order')
                    ->orderBy('name')
                    ->get();

                $categoryIds = $categories
                    ->flatMap(fn (Category $category) => [$category->id, ...$category->children->pluck('id')->all()])
                    ->unique()
                    ->values();
                $counts = Product::query()
                    ->whereIn('category_id', $categoryIds)
                    ->where('status', 'active')
                    ->selectRaw('category_id, count(*) as aggregate')
                    ->groupBy('category_id')
                    ->pluck('aggregate', 'category_id');

                return $categories
                    ->map(fn (Category $category): array => $this->categoryPayload($category, $counts))
                    ->all();
            }
        );
    }

    private function categoryPayload(Category $category, $counts): array
    {
        $children = $category->children
            ->map(fn (Category $child): array => [
                'id' => $child->id,
                'name' => $child->name,
                'slug' => $child->slug,
                'description' => $child->description,
                'image_url' => $this->assetUrl($child->image_url),
                'icon' => $this->categoryIcon($child->icon),
                'product_count' => (int) ($counts[$child->id] ?? 0),
                'show_on_home' => (bool) $child->show_on_home,
                'show_in_navbar' => (bool) $child->show_in_navbar,
                'home_display_order' => (int) ($child->home_display_order ?? 0),
                'navbar_display_order' => (int) ($child->navbar_display_order ?? 0),
                'children' => [],
            ])
            ->all();
        $childProductCount = collect($children)->sum('product_count');

        return [
            'id' => $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
            'description' => $category->description,
            'image_url' => $this->assetUrl($category->image_url),
            'icon' => $this->categoryIcon($category->icon),
            'product_count' => (int) ($counts[$category->id] ?? 0) + $childProductCount,
            'show_on_home' => (bool) $category->show_on_home,
            'show_in_navbar' => (bool) $category->show_in_navbar,
            'home_display_order' => (int) ($category->home_display_order ?? 0),
            'navbar_display_order' => (int) ($category->navbar_display_order ?? 0),
            'children' => $children,
        ];
    }

    private function adminSidebar(array $modules): array
    {
        return [
            [
                'key' => 'main',
                'label' => 'Main',
                'type' => 'single',
                'items' => [
                    ['label' => 'Dashboard', 'href' => '/admin/dashboard', 'icon' => 'Home', 'permission' => 'can_view_dashboard', 'enabled' => true],
                ],
            ],
            [
                'key' => 'orders',
                'label' => 'Orders',
                'type' => 'single',
                'items' => [
                    ['label' => 'Order Management', 'href' => '/admin/orders', 'icon' => 'PackageCheck', 'permission' => 'can_view_order', 'enabled' => true],
                ],
            ],
            [
                'key' => 'customers',
                'label' => 'Customer Management',
                'type' => 'single',
                'items' => [
                    ['label' => 'Customer Management', 'href' => '/admin/customers', 'icon' => 'UsersRound', 'permission' => 'can_view_customer', 'enabled' => true],
                ],
            ],
            [
                'key' => 'products',
                'label' => 'Product Management',
                'icon' => 'Package',
                'type' => 'single',
                'items' => [
                    ['label' => 'Product Management', 'href' => '/admin/products', 'icon' => 'Package', 'permission' => 'can_view_product', 'enabled' => $modules['products']],
                ],
            ],
            [
                'key' => 'users',
                'label' => 'Users Management',
                'icon' => 'UsersRound',
                'type' => 'group',
                'items' => [
                    ['label' => 'User Management', 'href' => '/admin/users', 'icon' => 'UsersRound', 'permission' => 'users.view', 'enabled' => true],
                    ['label' => 'Role Management', 'href' => '/admin/roles', 'icon' => 'ShieldCheck', 'permission' => 'roles.view', 'enabled' => true],
                    ['label' => 'Permission Management', 'href' => '/admin/permissions', 'icon' => 'KeyRound', 'permission' => 'permissions.view', 'enabled' => true],
                ],
            ],
            [
                'key' => 'catalog',
                'label' => 'Catalog',
                'icon' => 'Layers3',
                'type' => 'group',
                'items' => [
                    ['label' => 'Brand Management', 'href' => '/admin/brands', 'icon' => 'Building2', 'permission' => 'can_view_brand', 'enabled' => $modules['brands']],
                    ['label' => 'Category Management', 'href' => '/admin/categories', 'icon' => 'Layers3', 'permission' => 'can_view_category', 'enabled' => $modules['categories']],
                    ['label' => 'Attribute Management', 'href' => '/admin/attributes', 'icon' => 'Shapes', 'permission' => 'can_view_attribute', 'enabled' => $modules['products']],
                    ['label' => 'Attribute Value Management', 'href' => '/admin/attribute-values', 'icon' => 'Boxes', 'permission' => 'can_view_attribute_value', 'enabled' => $modules['products']],
                    ['label' => 'Tag Management', 'href' => '/admin/tags', 'icon' => 'Tags', 'permission' => 'can_view_tag', 'enabled' => $modules['products']],
                    ['label' => 'Review Management', 'href' => '/admin/reviews', 'icon' => 'Star', 'permission' => 'can_view_review', 'enabled' => $modules['reviews']],
                ],
            ],
            [
                'key' => 'marketing',
                'label' => 'Marketing & Pricing',
                'icon' => 'Megaphone',
                'type' => 'group',
                'items' => [
                    ['label' => 'Collection Management', 'href' => '/admin/collections', 'icon' => 'ShoppingBag', 'permission' => 'can_view_collection', 'enabled' => $modules['products']],
                    ['label' => 'Currency Management', 'href' => '/admin/currencies', 'icon' => 'CircleDollarSign', 'permission' => 'can_view_currency', 'enabled' => true],
                    ['label' => 'Discount Management', 'href' => '/admin/discounts', 'icon' => 'CirclePercent', 'permission' => 'can_view_discount', 'enabled' => $modules['offers']],
                ],
            ],
            [
                'key' => 'content',
                'label' => 'Content',
                'icon' => 'Newspaper',
                'type' => 'group',
                'items' => [
                    ['label' => 'Blog Management', 'href' => '/admin/blogs', 'icon' => 'Newspaper', 'permission' => 'can_view_blog', 'enabled' => true],
                    ['label' => 'Contact Inbox', 'href' => '/admin/contact-messages', 'icon' => 'Mail', 'permission' => 'can_view_contact_message', 'enabled' => true],
                ],
            ],
            [
                'key' => 'reports',
                'label' => 'Reports & Analytics',
                'icon' => 'BarChart3',
                'type' => 'group',
                'items' => [
                    ['label' => 'Sales Reports', 'href' => '/admin/reports/sales', 'icon' => 'BarChart3', 'permission' => 'can_view_sales_report', 'enabled' => true],
                    ['label' => 'Revenue Analytics', 'href' => '/admin/reports/revenue', 'icon' => 'CircleDollarSign', 'permission' => 'can_view_revenue_report', 'enabled' => true],
                    ['label' => 'Product Performance', 'href' => '/admin/reports/product-performance', 'icon' => 'Package', 'permission' => 'can_view_product_performance_report', 'enabled' => true],
                    ['label' => 'Customer Analytics', 'href' => '/admin/reports/customer-analytics', 'icon' => 'UsersRound', 'permission' => 'can_view_customer_analytics_report', 'enabled' => true],
                    ['label' => 'Payment Reports', 'href' => '/admin/reports/payment', 'icon' => 'CreditCard', 'permission' => 'can_view_payment_report', 'enabled' => true],
                    ['label' => 'Shipping Reports', 'href' => '/admin/reports/shipping', 'icon' => 'PackageCheck', 'permission' => 'can_view_shipping_report', 'enabled' => true],
                    ['label' => 'Inventory Reports', 'href' => '/admin/reports/inventory', 'icon' => 'Warehouse', 'permission' => 'can_view_inventory_report', 'enabled' => true],
                ],
            ],
            [
                'key' => 'security',
                'label' => 'Security',
                'icon' => 'ShieldAlert',
                'type' => 'group',
                'items' => [
                    ['label' => 'IP Blocking', 'href' => '/admin/security/ip-blocks', 'icon' => 'ShieldAlert', 'permission' => 'can-view-ip-block', 'enabled' => true],
                ],
            ],
            [
                'key' => 'settings',
                'label' => 'Settings',
                'icon' => 'Settings2',
                'type' => 'group',
                'items' => [
                    ['label' => 'Company Settings', 'href' => '/admin/settings/company', 'icon' => 'Building2', 'permission' => 'can_view_company_setting', 'enabled' => true],
                    ['label' => 'Hero Section', 'href' => '/admin/settings/hero-section', 'icon' => 'LayoutGrid', 'permission' => 'can_view_hero_section', 'enabled' => true],
                    ['label' => 'Home Page Settings', 'href' => '/admin/settings/home-page', 'icon' => 'LayoutGrid', 'permission' => 'can_view_home_page_setting', 'enabled' => true],
                    ['label' => 'Feature Cards', 'href' => '/admin/settings/home-feature-cards', 'icon' => 'BadgeCheck', 'permission' => 'can_view_home_feature_card_setting', 'enabled' => true],
                    ['label' => 'Blog Settings', 'href' => '/admin/settings/blog', 'icon' => 'Newspaper', 'permission' => 'can_view_blog_setting', 'enabled' => true],
                    ['label' => 'Store Settings', 'href' => '/admin/settings/store', 'icon' => 'Store', 'permission' => 'can_view_store_setting', 'enabled' => true],
                    ['label' => 'Payment Settings', 'href' => '/admin/settings/payment', 'icon' => 'CreditCard', 'permission' => 'can_view_payment_setting', 'enabled' => true],
                    ['label' => 'Shipping Zones', 'href' => '/admin/settings/shipping-zones', 'icon' => 'MapPin', 'permission' => 'can_view_shipping_zone', 'enabled' => true],
                    ['label' => 'Shipping Methods', 'href' => '/admin/settings/shipping-methods', 'icon' => 'PackageCheck', 'permission' => 'can_view_shipping_method', 'enabled' => true],
                    ['label' => 'SEO Settings', 'href' => '/admin/settings/seo', 'icon' => 'Search', 'permission' => 'can_view_seo_setting', 'enabled' => true],
                    ['label' => 'Social Media', 'href' => '/admin/settings/social', 'icon' => 'Megaphone', 'permission' => 'can_view_social_setting', 'enabled' => true],
                    ['label' => 'SMS Settings', 'href' => '/admin/settings/sms', 'icon' => 'MessageSquareText', 'permission' => 'can_view_sms_setting', 'enabled' => true],
                    ['label' => 'SMS Logs', 'href' => '/admin/settings/sms/logs', 'icon' => 'ListChecks', 'permission' => 'can_view_sms_log', 'enabled' => true],
                    ['label' => 'Security Settings', 'href' => '/admin/settings/security', 'icon' => 'ShieldAlert', 'permission' => 'can-view-ip-block', 'enabled' => true],
                ],
            ],
        ];
    }

    private function assetUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        if (str_starts_with($path, '/storage/')) {
            return url($path);
        }

        if (str_starts_with($path, 'storage/')) {
            return url($path);
        }

        return Storage::disk('public')->url($path);
    }

    private function categoryIcon(?string $icon): ?string
    {
        if (! $icon) {
            return null;
        }

        $value = trim($icon);
        $lower = strtolower($value);
        $isAsset = str_starts_with($lower, 'http://')
            || str_starts_with($lower, 'https://')
            || str_starts_with($lower, '/storage/')
            || str_starts_with($lower, 'storage/')
            || str_starts_with($lower, 'data:image/')
            || str_ends_with($lower, '.svg')
            || str_contains($lower, '/');

        return $isAsset ? $this->assetUrl($value) : $value;
    }
}
