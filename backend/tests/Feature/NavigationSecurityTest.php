<?php

use App\Models\User;
use App\Services\Admin\RoleManagementService;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

function navigationToken(User $user): string
{
    return $user->createToken('navigation-test', ['access'], now()->addMinutes(15))->plainTextToken;
}

it('never exposes admin navigation through the public runtime endpoint', function (): void {
    $response = $this->getJson('/api/settings/navigation')
        ->assertOk()
        ->assertJsonMissingPath('data.navigation.admin_sidebar');

    $payload = json_encode($response->json('data'), JSON_THROW_ON_ERROR);

    expect($payload)
        ->not->toContain('/admin/')
        ->not->toContain('"permission"')
        ->not->toContain('admin_sidebar');
});

it('requires authentication and an administrator role for admin navigation', function (): void {
    $this->getJson('/api/admin/navigation')->assertUnauthorized();

    $customerRole = Role::query()->create(['name' => 'user', 'guard_name' => 'web']);
    $customer = User::factory()->create();
    $customer->assignRole($customerRole);

    $this->withToken(navigationToken($customer))
        ->getJson('/api/admin/navigation')
        ->assertForbidden()
        ->assertJsonPath('message', 'Administrator access is required.');
});

it('returns only enabled modules allowed by the authenticated administrators permissions', function (): void {
    $dashboard = Permission::query()->create(['name' => 'can_view_dashboard', 'guard_name' => 'web']);
    Permission::query()->create(['name' => 'can_view_order', 'guard_name' => 'web']);
    $role = Role::query()->create(['name' => 'operations-admin', 'guard_name' => 'web']);
    $role->givePermissionTo($dashboard);
    $admin = User::factory()->create();
    $admin->assignRole($role);

    $response = $this->withToken(navigationToken($admin))
        ->getJson('/api/admin/navigation')
        ->assertOk()
        ->assertJsonPath('data.navigation.0.items.0.href', '/admin/dashboard');

    $navigation = collect($response->json('data.navigation'));
    $items = $navigation->flatMap(fn (array $group) => $group['items']);
    $payload = json_encode($response->json('data'), JSON_THROW_ON_ERROR);

    expect($items->pluck('href')->all())
        ->toBe(['/admin/dashboard'])
        ->and($payload)
        ->not->toContain('"permission"')
        ->not->toContain('"enabled"')
        ->not->toContain('/admin/orders');
});

it('invalidates permission-specific admin navigation cache after a role update', function (): void {
    $dashboard = Permission::query()->create(['name' => 'can_view_dashboard', 'guard_name' => 'web']);
    $orders = Permission::query()->create(['name' => 'can_view_order', 'guard_name' => 'web']);
    $role = Role::query()->create(['name' => 'cache-admin', 'guard_name' => 'web']);
    $role->givePermissionTo($dashboard);
    $admin = User::factory()->create();
    $admin->assignRole($role);
    $token = navigationToken($admin);

    $this->withToken($token)->getJson('/api/admin/navigation')
        ->assertOk()
        ->assertJsonMissing(['href' => '/admin/orders']);

    app(RoleManagementService::class)->update($role, [
        'name' => $role->name,
        'permissions' => [$dashboard->name, $orders->name],
    ]);

    $this->withToken($token)->getJson('/api/admin/navigation')
        ->assertOk()
        ->assertJsonFragment(['href' => '/admin/orders']);
});
