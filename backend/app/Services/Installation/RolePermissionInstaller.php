<?php

namespace App\Services\Installation;

use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionInstaller
{
    private const RESOURCES = [
        'user',
        'role',
        'permission',
        'order',
        'customer',
        'product',
        'brand',
        'category',
        'attribute',
        'attribute_value',
        'tag',
        'review',
        'comment',
        'collection',
        'currency',
        'discount',
        'shipping_zone',
        'shipping_method',
        'blog',
        'contact_message',
        'company_setting',
        'hero_section',
        'home_page_setting',
        'home_feature_card_setting',
        'blog_setting',
        'store_setting',
        'payment_setting',
        'seo_setting',
        'footer_setting',
        'social_setting',
        'sms_setting',
        'sms_log',
        'dashboard',
        'sales_report',
        'revenue_report',
        'product_performance_report',
        'customer_analytics_report',
        'payment_report',
        'shipping_report',
        'inventory_report',
        'search_analytics',
        'account_dashboard',
        'account_profile',
        'account_settings',
        'address',
        'notification',
        'wishlist',
        'checkout',
    ];

    private const COURIER_PERMISSIONS = [
        'can_view_courier_setting',
        'can_create_courier_setting',
        'can_edit_courier_setting',
        'can_delete_courier_setting',
        'can_view_courier_shipment',
        'can_create_courier_shipment',
        'can_edit_courier_shipment',
        'can_delete_courier_shipment',
    ];

    private const MARKETING_ANALYTICS_PERMISSIONS = [
        'can_view_meta_pixel_setting',
        'can_create_meta_pixel_setting',
        'can_edit_meta_pixel_setting',
        'can_delete_meta_pixel_setting',
        'can_view_google_analytics_setting',
        'can_create_google_analytics_setting',
        'can_edit_google_analytics_setting',
        'can_delete_google_analytics_setting',
        'can_view_marketing_analytics',
        'can_create_marketing_analytics',
        'can_edit_marketing_analytics',
        'can_delete_marketing_analytics',
    ];

    private const FRAUD_AND_IP_PERMISSIONS = [
        'can_view_fraud_setting',
        'can_create_fraud_setting',
        'can_edit_fraud_setting',
        'can_delete_fraud_setting',
        'can_view_fraud_check',
        'can_create_fraud_check',
        'can_edit_fraud_check',
        'can_delete_fraud_check',
        'can_view_fraud_analytics',
        'can_create_fraud_analytics',
        'can_edit_fraud_analytics',
        'can_delete_fraud_analytics',
        'can-view-ip-block',
        'can-create-ip-block',
        'can-update-ip-block',
        'can-delete-ip-block',
    ];

    /**
     * @return array{roles: int, permissions: int}
     */
    public function install(): array
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = collect(self::RESOURCES)
            ->flatMap(fn (string $resource): array => [
                "can_edit_{$resource}",
                "can_delete_{$resource}",
                "can_create_{$resource}",
                "can_view_{$resource}",
            ])
            ->push('can_apply_coupon')
            ->push(...self::COURIER_PERMISSIONS)
            ->push(...self::MARKETING_ANALYTICS_PERMISSIONS)
            ->push(...self::FRAUD_AND_IP_PERMISSIONS)
            ->unique()
            ->values()
            ->all();

        foreach ($permissions as $permission) {
            Permission::query()->firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        $user = Role::query()->firstOrCreate(['name' => 'user', 'guard_name' => 'web']);
        $admin = Role::query()->firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $superAdmin = Role::query()->firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);

        $user->syncPermissions([]);
        $admin->syncPermissions($permissions);
        $superAdmin->syncPermissions($permissions);

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return [
            'roles' => Role::query()->whereIn('name', ['user', 'admin', 'super-admin'])->count(),
            'permissions' => Permission::query()->whereIn('name', $permissions)->count(),
        ];
    }
}
