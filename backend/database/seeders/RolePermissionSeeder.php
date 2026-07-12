<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    /**
     * Seed the application's roles and permissions.
     */
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = 'web';

        $resources = [
            'user',
            'role',
            'permission',
            'order',
            'product',
            'brand',
            'category',
            'attribute',
            'attribute_value',
            'tag',
            'review',
            'collection',
            'currency',
            'discount',
            'warehouse',
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
            'email_setting',
            'sms_setting',
            'payment_setting',
            'seo_setting',
            'social_setting',
            'localization_setting',
            'maintenance_setting',
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

        $permissions = collect($resources)
            ->flatMap(fn (string $resource) => [
                "can_edit_{$resource}",
                "can_delete_{$resource}",
                "can_create_{$resource}",
                "can_view_{$resource}",
            ])
            ->push('can_apply_coupon')
            ->all();

        foreach ($permissions as $permission) {
            Permission::query()->firstOrCreate([
                'name' => $permission,
                'guard_name' => $guard,
            ]);
        }

        $user = Role::query()->firstOrCreate([
            'name' => 'user',
            'guard_name' => $guard,
        ]);

        $admin = Role::query()->firstOrCreate([
            'name' => 'admin',
            'guard_name' => $guard,
        ]);

        $superAdmin = Role::query()->firstOrCreate([
            'name' => 'super-admin',
            'guard_name' => $guard,
        ]);

        $user->syncPermissions([
            'can_view_account_dashboard',
            'can_view_account_profile',
            'can_edit_account_profile',
            'can_view_account_settings',
            'can_edit_account_settings',
            'can_view_address',
            'can_create_address',
            'can_edit_address',
            'can_delete_address',
            'can_view_order',
            'can_edit_order',
            'can_view_review',
            'can_create_review',
            'can_edit_review',
            'can_delete_review',
            'can_view_notification',
            'can_edit_notification',
            'can_delete_notification',
            'can_view_wishlist',
            'can_edit_wishlist',
            'can_view_checkout',
            'can_create_checkout',
            'can_apply_coupon',
        ]);
        $admin->syncPermissions($permissions);
        $superAdmin->syncPermissions($permissions);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
