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
        ];

        $permissions = collect($resources)
            ->flatMap(fn (string $resource) => [
                "can_edit_{$resource}",
                "can_delete_{$resource}",
                "can_create_{$resource}",
                "can_view_{$resource}",
            ])
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

        $user->syncPermissions([]);
        $admin->syncPermissions($permissions);
        $superAdmin->syncPermissions($permissions);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
