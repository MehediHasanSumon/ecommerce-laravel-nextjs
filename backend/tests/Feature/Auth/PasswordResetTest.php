<?php

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Laravel\Sanctum\PersonalAccessToken;

it('sends the same forgot password response for known and unknown emails', function () {
    Notification::fake();
    User::factory()->create(['email' => 'ada@example.test']);

    $known = $this->postJson('/api/auth/forgot-password', ['email' => 'ada@example.test']);
    $unknown = $this->postJson('/api/auth/forgot-password', ['email' => 'missing@example.test']);

    $known->assertOk()->assertJsonPath('message', 'If an account exists for that email, a password reset link has been sent.');
    $unknown->assertOk()->assertJsonPath('message', 'If an account exists for that email, a password reset link has been sent.');

    Notification::assertSentTo(User::first(), ResetPasswordNotification::class);
});

it('resets password with a valid token and revokes existing tokens', function () {
    Notification::fake();
    $user = User::factory()->create([
        'email' => 'ada@example.test',
        'password' => Hash::make('OldStr0ng!Pass'),
    ]);
    $user->createToken('access-token', ['access'], now()->addMinutes(15));

    $token = Password::broker()->createToken($user);

    $this->postJson('/api/auth/reset-password', [
        'email' => 'ada@example.test',
        'token' => $token,
        'password' => 'NewStr0ng!Pass',
        'password_confirmation' => 'NewStr0ng!Pass',
    ])->assertOk();

    $user->refresh();

    expect(Hash::check('NewStr0ng!Pass', $user->password))->toBeTrue()
        ->and(PersonalAccessToken::query()->count())->toBe(0);
});

it('rejects invalid and expired reset tokens', function () {
    $user = User::factory()->create(['email' => 'ada@example.test']);
    $token = Password::broker()->createToken($user);

    $this->postJson('/api/auth/reset-password', [
        'email' => 'ada@example.test',
        'token' => 'invalid-token',
        'password' => 'NewStr0ng!Pass',
        'password_confirmation' => 'NewStr0ng!Pass',
    ])->assertStatus(422)->assertJsonValidationErrors('token');

    DB::table('password_reset_tokens')
        ->where('email', 'ada@example.test')
        ->update(['created_at' => now()->subMinutes(31)]);

    $this->postJson('/api/auth/reset-password', [
        'email' => 'ada@example.test',
        'token' => $token,
        'password' => 'NewStr0ng!Pass',
        'password_confirmation' => 'NewStr0ng!Pass',
    ])->assertStatus(422)->assertJsonValidationErrors('token');
});
