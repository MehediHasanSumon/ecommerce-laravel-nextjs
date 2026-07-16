<?php

use App\Models\Settings\CompanySetting;
use App\Models\Settings\StoreSetting;
use App\Models\User;
use App\Services\Installation\SettingsSchemaInspector;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

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

it('can create the optional admin with the admin role', function (): void {
    $password = 'Installer!Pass123';
    $adminPassword = 'Secondary!Pass123';

    $this->artisan('app:install', ['--use-defaults' => true])
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
        ->assertSuccessful();

    expect(User::query()->where('email', 'root@example.com')->firstOrFail()->hasRole('super-admin'))->toBeTrue()
        ->and(User::query()->where('email', 'admin@example.com')->firstOrFail()->hasRole('admin'))->toBeTrue();
});
