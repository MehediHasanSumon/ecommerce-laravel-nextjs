<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    private const PERMISSIONS = [
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

    public function up(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        foreach (self::PERMISSIONS as $name) {
            $permission = Permission::query()->firstOrCreate(['name' => $name, 'guard_name' => 'web']);
            foreach (['admin', 'super-admin'] as $roleName) {
                Role::query()->where('name', $roleName)->where('guard_name', 'web')->first()?->givePermissionTo($permission);
            }
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        Permission::query()->whereIn('name', self::PERMISSIONS)->where('guard_name', 'web')->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
