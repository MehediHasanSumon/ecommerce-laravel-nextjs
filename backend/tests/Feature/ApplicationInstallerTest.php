<?php

use App\Models\Settings\CompanySetting;
use App\Models\Settings\StoreSetting;
use App\Models\User;
use App\Services\Installation\SettingsSchemaInspector;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

function courierPermissions(): array
{
    return [
        'can_view_courier_setting',
        'can_create_courier_setting',
        'can_edit_courier_setting',
        'can_delete_courier_setting',
        'can_view_courier_shipment',
        'can_create_courier_shipment',
        'can_edit_courier_shipment',
        'can_delete_courier_shipment',
    ];
}

function fraudAndIpPermissions(): array
{
    return [
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
}

function marketingAnalyticsPermissions(): array
{
    return [
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
}

it('keeps the role permission seeder available and idempotent', function (): void {
    $this->seed(RolePermissionSeeder::class);

    $roleCount = Role::query()->count();
    $permissionCount = Permission::query()->count();

    $this->seed(RolePermissionSeeder::class);

    expect($roleCount)->toBe(3)
        ->and($permissionCount)->toBeGreaterThan(0)
        ->and(Role::query()->count())->toBe($roleCount)
        ->and(Permission::query()->count())->toBe($permissionCount)
        ->and(Role::findByName('admin')->permissions()->count())->toBe($permissionCount)
        ->and(Role::findByName('super-admin')->permissions()->count())->toBe($permissionCount)
        ->and(Permission::query()->whereIn('name', fraudAndIpPermissions())->count())->toBe(count(fraudAndIpPermissions()))
        ->and(Role::findByName('admin')->hasAllPermissions(fraudAndIpPermissions()))->toBeTrue()
        ->and(Role::findByName('super-admin')->hasAllPermissions(fraudAndIpPermissions()))->toBeTrue()
        ->and(Permission::query()->whereIn('name', courierPermissions())->count())->toBe(count(courierPermissions()))
        ->and(Role::findByName('admin')->hasAllPermissions(courierPermissions()))->toBeTrue()
        ->and(Role::findByName('super-admin')->hasAllPermissions(courierPermissions()))->toBeTrue()
        ->and(Permission::query()->whereIn('name', marketingAnalyticsPermissions())->count())->toBe(count(marketingAnalyticsPermissions()))
        ->and(Role::findByName('admin')->hasAllPermissions(marketingAnalyticsPermissions()))->toBeTrue()
        ->and(Role::findByName('super-admin')->hasAllPermissions(marketingAnalyticsPermissions()))->toBeTrue();
});

it('discovers configurable settings fields directly from the model and database schema', function (): void {
    Schema::table('store_settings', function ($table): void {
        $table->string('future_installer_option')->nullable();
    });

    $inspector = app(SettingsSchemaInspector::class);
    $companyFields = collect($inspector->fields(new CompanySetting))->keyBy('name');
    $storeFields = collect($inspector->fields(new StoreSetting))->keyBy('name');

    expect($companyFields)
        ->toHaveKeys(['company_name', 'currency_id', 'decimal_places'])
        ->not->toHaveKeys(['id', 'updated_by', 'created_at', 'updated_at'])
        ->and($companyFields['currency_id']['foreign_key']['foreign_table'])->toBe('currencies')
        ->and($storeFields)
        ->toHaveKey('future_installer_option')
        ->not->toHaveKeys(['id', 'updated_by', 'created_at', 'updated_at'])
        ->and($storeFields['enable_reviews']['input_type'])->toBe('boolean')
        ->and($storeFields['product_slider_autoplay_delay']['input_type'])->toBe('integer');
});

it('installs settings roles permissions and the initial super admin idempotently', function (): void {
    $password = 'Installer!Pass123';

    $this->artisan('app:install', ['--use-defaults' => true])
        ->expectsQuestion('Super Admin name', 'Root Admin')
        ->expectsQuestion('Super Admin email', 'root@example.com')
        ->expectsQuestion('Super Admin password', $password)
        ->expectsQuestion('Confirm Super Admin password', $password)
        ->expectsQuestion('Super Admin mobile number (optional)', '+8801700000000')
        ->expectsConfirmation('Would you like to create an Admin user?', 'no')
        ->expectsConfirmation('Would you like to create a Customer (User)?', 'no')
        ->assertSuccessful();

    $user = User::query()->where('email', 'root@example.com')->firstOrFail();
    $roleCount = Role::query()->count();
    $permissionCount = Permission::query()->count();

    expect(CompanySetting::query()->count())->toBe(1)
        ->and(StoreSetting::query()->count())->toBe(1)
        ->and($user->name)->toBe('Root Admin')
        ->and($user->phone)->toBe('+8801700000000')
        ->and($user->hasRole('super-admin'))->toBeTrue()
        ->and(Hash::check($password, $user->password))->toBeTrue()
        ->and($roleCount)->toBe(3)
        ->and($permissionCount)->toBeGreaterThan(0);

    $this->artisan('app:install', ['--use-defaults' => true])
        ->expectsQuestion('Super Admin name', 'Root Admin Updated')
        ->expectsQuestion('Super Admin email', 'root@example.com')
        ->expectsQuestion('Super Admin password (leave blank to keep the current password)', '')
        ->expectsQuestion('Super Admin mobile number (optional)', '+8801700000000')
        ->expectsConfirmation('Would you like to create an Admin user?', 'no')
        ->expectsConfirmation('Would you like to create a Customer (User)?', 'no')
        ->assertSuccessful();

    $user->refresh();

    expect(CompanySetting::query()->count())->toBe(1)
        ->and(StoreSetting::query()->count())->toBe(1)
        ->and(User::query()->where('email', 'root@example.com')->count())->toBe(1)
        ->and(Role::query()->count())->toBe($roleCount)
        ->and(Permission::query()->count())->toBe($permissionCount)
        ->and($user->name)->toBe('Root Admin Updated')
        ->and(Hash::check($password, $user->password))->toBeTrue();
});

it('can create the optional admin and customer with corresponding roles', function (): void {
    $password = 'Installer!Pass123';
    $adminPassword = 'Secondary!Pass123';
    $userPassword = 'Customer!Pass123';

    $this->artisan('app:install')
        ->expectsQuestion('Company Name', 'My Awesome Store')
        ->expectsQuestion('Super Admin name', 'Root Admin')
        ->expectsQuestion('Super Admin email', 'root@example.com')
        ->expectsQuestion('Super Admin password', $password)
        ->expectsQuestion('Confirm Super Admin password', $password)
        ->expectsQuestion('Super Admin mobile number (optional)', null)
        ->expectsConfirmation('Would you like to create an Admin user?', 'yes')
        ->expectsQuestion('Admin name', 'Store Admin')
        ->expectsQuestion('Admin email', 'admin@example.com')
        ->expectsQuestion('Admin password', $adminPassword)
        ->expectsQuestion('Confirm Admin password', $adminPassword)
        ->expectsQuestion('Admin mobile number (optional)', null)
        ->expectsConfirmation('Would you like to create a Customer (User)?', 'yes')
        ->expectsQuestion('Customer name', 'John Customer')
        ->expectsQuestion('Customer email', 'customer@example.com')
        ->expectsQuestion('Customer password', $userPassword)
        ->expectsQuestion('Confirm Customer password', $userPassword)
        ->expectsQuestion('Customer mobile number (optional)', null)
        ->assertSuccessful();

    expect(CompanySetting::query()->first()->company_name)->toBe('My Awesome Store')
        ->and(User::query()->where('email', 'root@example.com')->firstOrFail()->hasRole('super-admin'))->toBeTrue()
        ->and(User::query()->where('email', 'admin@example.com')->firstOrFail()->hasRole('admin'))->toBeTrue()
        ->and(User::query()->where('email', 'customer@example.com')->firstOrFail()->hasRole('user'))->toBeTrue();
});
