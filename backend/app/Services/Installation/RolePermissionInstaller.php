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
        'account_dashboard',
        'account_profile',
        'account_settings',
        'address',
        'notification',
        'wishlist',
        'checkout',
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
            ->push(
                'can-view-ip-block',
                'can-create-ip-block',
                'can-update-ip-block',
                'can-delete-ip-block',
            )
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
