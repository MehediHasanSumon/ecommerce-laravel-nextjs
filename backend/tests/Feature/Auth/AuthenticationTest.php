<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\PersonalAccessToken;

beforeEach(function () {
    $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);
    $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequestsWithRedis::class);
    RateLimiter::clear('auth-register:127.0.0.1');
    RateLimiter::clear('auth-login:127.0.0.1');
});

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
        ->assertJsonMissingPath('data.tokens');

    $this->assertDatabaseHas('users', ['email' => 'ada@example.test']);
    expect(Hash::check('Str0ng!Passw0rd', User::first()->password))->toBeTrue();
});

it('rejects invalid registration payloads', function (array $payload, string $field) {
    $response = $this->postJson('/api/auth/register', $payload);

    $response->assertStatus(422)
        ->assertJsonPath('success', false)
        ->assertJsonPath('message', 'Validation failed.')
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
        'phone' => '01712345678',
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
        ->assertJsonMissingPath('data.tokens');

    // Test login using phone number
    $this->postJson('/api/auth/login', [
        'email' => '01712345678',
        'password' => 'Str0ng!Passw0rd',
    ])->assertOk()
        ->assertJsonPath('success', true);

    // Test login using international phone format
    $this->postJson('/api/auth/login', [
        'email' => '+8801712345678',
        'password' => 'Str0ng!Passw0rd',
    ])->assertOk()
        ->assertJsonPath('success', true);
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

it('reports non-sensitive auth session state', function () {
    $user = User::factory()->create();
    $access = $user->createToken('access-token', ['access'], now()->addMinutes(15))->plainTextToken;

    $this->getJson('/api/auth/session')
        ->assertOk()
        ->assertJsonPath('data.authenticated', false)
        ->assertJsonPath('data.has_access_token', false);

    $this->withToken($access)
        ->getJson('/api/auth/session')
        ->assertOk()
        ->assertJsonPath('data.authenticated', true)
        ->assertJsonPath('data.has_access_token', true)
        ->assertJsonPath('data.user.email', $user->email)
        ->assertCookieMissing(config('auth_api.access_cookie_name'))
        ->assertJsonMissingPath('data.access_token');
});

it('extends access token expiration when a valid session is used', function () {
    $user = User::factory()->create();
    $issued = $user->createToken('access-token', ['access'], now()->addMinutes(15));
    $access = $issued->plainTextToken;

    $this->travelTo(now()->addMinutes(5));

    $this->withToken($access)
        ->getJson('/api/auth/session')
        ->assertOk()
        ->assertCookieMissing(config('auth_api.access_cookie_name'));

    $issued->accessToken->refresh();

    expect($issued->accessToken->expires_at->timestamp)
        ->toBeGreaterThanOrEqual(now()->addMinutes(config('auth_api.access_token_expiration_minutes'))->subSeconds(2)->timestamp);

    $lastUsedAt = $issued->accessToken->last_used_at;
    $expiresAt = $issued->accessToken->expires_at;

    $this->travel(1)->minutes();

    $this->withToken($access)
        ->getJson('/api/auth/session')
        ->assertOk()
        ->assertCookieMissing(config('auth_api.access_cookie_name'));

    $issued->accessToken->refresh();

    expect($issued->accessToken->last_used_at->equalTo($lastUsedAt))->toBeTrue()
        ->and($issued->accessToken->expires_at->equalTo($expiresAt))->toBeTrue();
});

it('logs out by revoking the current token', function () {
    $user = User::factory()->create();
    $token = $user->createToken('access-token', ['access'], now()->addMinutes(15))->plainTextToken;

    $this->withToken($token)->postJson('/api/auth/logout')->assertOk();

    expect(PersonalAccessToken::query()->count())->toBe(0);
});
