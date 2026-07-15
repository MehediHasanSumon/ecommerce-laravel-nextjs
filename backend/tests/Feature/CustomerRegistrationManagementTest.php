<?php

use App\Models\Settings\StoreSetting;
use App\Services\Admin\Settings\StoreSettingsService;

it('disables customer registration through store settings', function (): void {
    app(StoreSettingsService::class)->update([
        'allow_customer_registration' => false,
        'allow_guest_checkout' => true,
        'require_login_before_checkout' => false,
    ]);

    $this->postJson('/api/auth/register', [
        'name' => 'Guest Shopper',
        'email' => 'guest@example.test',
        'password' => 'Str0ng!Passw0rd',
        'password_confirmation' => 'Str0ng!Passw0rd',
    ])->assertUnprocessable()
        ->assertJsonPath('errors.registration.0', 'Customer registration is currently disabled.');
});

it('blocks unauthenticated order placement when guest checkout is disabled', function (): void {
    app(StoreSettingsService::class)->update([
        'allow_customer_registration' => true,
        'allow_guest_checkout' => false,
        'require_login_before_checkout' => true,
    ]);

    $this->postJson('/api/checkout/place-order', [])->assertUnauthorized();
});

it('exposes customer settings through runtime navigation', function (): void {
    StoreSetting::query()->firstOrCreate([], [
        'allow_customer_registration' => true,
        'allow_guest_checkout' => true,
        'require_login_before_checkout' => false,
    ]);

    $this->getJson('/api/settings/navigation')
        ->assertOk()
        ->assertJsonPath('data.customer_settings.allow_registration', true)
        ->assertJsonPath('data.customer_settings.allow_guest_checkout', true)
        ->assertJsonPath('data.customer_settings.require_login_before_checkout', false);
});
