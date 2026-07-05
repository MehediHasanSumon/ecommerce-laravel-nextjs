<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

it('adds defensive security headers to api responses', function () {
    $this->getJson('/api/auth/me')
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'DENY')
        ->assertHeader('Referrer-Policy', 'no-referrer');
});

it('rate limits repeated login attempts', function () {
    User::factory()->create([
        'email' => 'ada@example.test',
        'password' => Hash::make('Str0ng!Passw0rd'),
    ]);

    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/auth/login', [
            'email' => 'ada@example.test',
            'password' => 'wrong-password',
        ])->assertStatus(422);
    }

    $this->postJson('/api/auth/login', [
        'email' => 'ada@example.test',
        'password' => 'wrong-password',
    ])->assertTooManyRequests();
});

it('treats injection style payloads as data during login validation', function () {
    $this->postJson('/api/auth/login', [
        'email' => "' OR 1=1 --",
        'password' => '<script>alert(1)</script>',
    ])->assertStatus(422)->assertJsonValidationErrors('email');
});

it('rejects expired sanctum tokens', function () {
    $user = User::factory()->create();
    $token = $user->createToken('access-token', ['access'], now()->subMinute())->plainTextToken;

    $this->withToken($token)->getJson('/api/auth/me')->assertUnauthorized();
});
