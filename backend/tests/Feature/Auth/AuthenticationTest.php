<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

it('registers a user with normalized input and returns http only auth cookies', function () {
    $response = $this->postJson('/api/auth/register', [
        'name' => '  Ada Lovelace  ',
        'email' => '  ADA@example.test  ',
        'password' => 'Str0ng!Passw0rd',
        'password_confirmation' => 'Str0ng!Passw0rd',
    ]);

    $response->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.user.email', 'ada@example.test')
        ->assertCookie(config('auth_api.access_cookie_name'))
        ->assertCookie(config('auth_api.refresh_cookie_name'))
        ->assertJsonMissingPath('data.tokens');

    $this->assertDatabaseHas('users', ['email' => 'ada@example.test']);
    expect(Hash::check('Str0ng!Passw0rd', User::first()->password))->toBeTrue();
});

it('rejects invalid registration payloads', function (array $payload, string $field) {
    $response = $this->postJson('/api/auth/register', $payload);

    $response->assertStatus(422)
        ->assertJsonPath('success', false)
        ->assertJsonValidationErrors($field);
})->with([
    'missing name' => [['email' => 'a@example.test', 'password' => 'Str0ng!Passw0rd', 'password_confirmation' => 'Str0ng!Passw0rd'], 'name'],
    'invalid email' => [['name' => 'Ada', 'email' => 'not-an-email', 'password' => 'Str0ng!Passw0rd', 'password_confirmation' => 'Str0ng!Passw0rd'], 'email'],
    'weak password' => [['name' => 'Ada', 'email' => 'ada@example.test', 'password' => 'password', 'password_confirmation' => 'password'], 'password'],
    'mismatched confirmation' => [['name' => 'Ada', 'email' => 'ada@example.test', 'password' => 'Str0ng!Passw0rd', 'password_confirmation' => 'Different!123'], 'password'],
    'xss name' => [['name' => '<script>alert(1)</script>', 'email' => 'ada@example.test', 'password' => 'Str0ng!Passw0rd', 'password_confirmation' => 'Str0ng!Passw0rd'], 'name'],
]);

it('rejects duplicate emails', function () {
    User::factory()->create(['email' => 'ada@example.test']);

    $this->postJson('/api/auth/register', [
        'name' => 'Ada Lovelace',
        'email' => 'ADA@example.test',
        'password' => 'Str0ng!Passw0rd',
        'password_confirmation' => 'Str0ng!Passw0rd',
    ])->assertStatus(422)->assertJsonValidationErrors('email');
});

it('logs in with valid credentials and rejects invalid credentials', function () {
    User::factory()->create([
        'email' => 'ada@example.test',
        'password' => Hash::make('Str0ng!Passw0rd'),
    ]);

    $this->postJson('/api/auth/login', [
        'email' => 'ada@example.test',
        'password' => 'wrong-password',
    ])->assertStatus(422)->assertJsonValidationErrors('email');

    $this->postJson('/api/auth/login', [
        'email' => 'ADA@example.test',
        'password' => 'Str0ng!Passw0rd',
    ])->assertOk()
        ->assertJsonPath('success', true)
        ->assertCookie(config('auth_api.access_cookie_name'))
        ->assertCookie(config('auth_api.refresh_cookie_name'))
        ->assertJsonMissingPath('data.tokens');
});

it('protects authenticated endpoints and accepts valid access cookies', function () {
    $user = User::factory()->create();

    $this->getJson('/api/auth/me')->assertUnauthorized();

    $token = $user->createToken('access-token', ['access'], now()->addMinutes(15))->plainTextToken;

    $this->withToken($token)
        ->getJson('/api/auth/me')
        ->assertOk()
        ->assertJsonPath('data.user.email', $user->email);
});

it('refuses access tokens on refresh endpoint', function () {
    $user = User::factory()->create();
    $access = $user->createToken('access-token', ['access'], now()->addMinutes(15))->plainTextToken;

    $this->withToken($access)->postJson('/api/auth/refresh')->assertUnauthorized();
});

it('reports non-sensitive auth session state', function () {
    $user = User::factory()->create();
    $access = $user->createToken('access-token', ['access'], now()->addMinutes(15))->plainTextToken;
    $refresh = $user->createToken('refresh-token', ['refresh'], now()->addMinutes(120))->plainTextToken;

    $this->getJson('/api/auth/session')
        ->assertOk()
        ->assertJsonPath('data.authenticated', false)
        ->assertJsonPath('data.has_access_token', false)
        ->assertJsonPath('data.has_refresh_token', false);

    $this->withCookie(config('auth_api.access_cookie_name'), $access)
        ->withCookie(config('auth_api.refresh_cookie_name'), $refresh)
        ->getJson('/api/auth/session')
        ->assertOk()
        ->assertJsonPath('data.authenticated', true)
        ->assertJsonPath('data.has_access_token', true)
        ->assertJsonPath('data.has_refresh_token', true)
        ->assertJsonMissingPath('data.access_token')
        ->assertJsonMissingPath('data.refresh_token');
});

it('allows refresh when access token is expired but refresh token is valid', function () {
    $user = User::factory()->create();
    $access = $user->createToken('access-token', ['access'], now()->subMinute())->plainTextToken;
    $refresh = $user->createToken('refresh-token', ['refresh'], now()->addMinutes(120))->plainTextToken;

    $this->withCookie(config('auth_api.access_cookie_name'), $access)
        ->withCookie(config('auth_api.refresh_cookie_name'), $refresh)
        ->getJson('/api/auth/me')
        ->assertUnauthorized();

    $this->withCookie(config('auth_api.refresh_cookie_name'), $refresh)
        ->postJson('/api/auth/refresh')
        ->assertOk()
        ->assertCookie(config('auth_api.access_cookie_name'))
        ->assertCookie(config('auth_api.refresh_cookie_name'));
});

it('rotates refresh tokens', function () {
    $user = User::factory()->create();
    $refresh = $user->createToken('refresh-token', ['refresh'], now()->addMinutes(120))->plainTextToken;

    $this->withToken($refresh)
        ->postJson('/api/auth/refresh')
        ->assertOk()
        ->assertCookie(config('auth_api.access_cookie_name'))
        ->assertCookie(config('auth_api.refresh_cookie_name'))
        ->assertJsonMissingPath('data.tokens');

    expect(PersonalAccessToken::query()->where('name', 'refresh-token')->count())->toBe(1);
});

it('gracefully handles one duplicate refresh request during token rotation', function () {
    $user = User::factory()->create();
    $refresh = $user->createToken('refresh-token', ['refresh'], now()->addMinutes(120))->plainTextToken;

    $this->withToken($refresh)->postJson('/api/auth/refresh')->assertOk();
    $this->withToken($refresh)->postJson('/api/auth/refresh')->assertOk();
    $this->withToken($refresh)->postJson('/api/auth/refresh')->assertUnauthorized();
});

it('logs out by revoking the current token', function () {
    $user = User::factory()->create();
    $token = $user->createToken('access-token', ['access'], now()->addMinutes(15))->plainTextToken;

    $this->withToken($token)->postJson('/api/auth/logout')->assertOk();

    expect(PersonalAccessToken::query()->count())->toBe(0);
});
