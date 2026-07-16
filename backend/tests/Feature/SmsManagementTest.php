<?php

use App\Jobs\SendSms;
use App\Models\Order;
use App\Models\Settings\SmsSetting;
use App\Models\SmsLog;
use App\Models\SmsOtpChallenge;
use App\Models\User;
use App\Services\Admin\Settings\SmsSettingsService;
use App\Services\Sms\SmsDeliveryService;
use App\Services\Sms\SmsService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;

beforeEach(function (): void {
    cache()->flush();
});

it('exposes disabled OTP requirements without attempting to send SMS', function (): void {
    $this->withHeader('X-Guest-Token', 'guest-disabled')
        ->getJson('/api/checkout/mobile-verification')
        ->assertOk()
        ->assertJsonPath('data.required', false)
        ->assertJsonPath('data.enabled', false);

    expect(SmsLog::query()->count())->toBe(0);
});

it('issues and verifies a session-bound guest checkout OTP', function (): void {
    Queue::fake();
    app(SmsSettingsService::class)->update([
        'enabled' => true,
        'api_base_url' => 'https://sms.example.test/send',
        'require_guest_checkout_otp' => true,
    ]);

    $headers = ['X-Guest-Token' => 'guest-otp-session'];
    $challengeId = $this->withHeaders($headers)
        ->postJson('/api/checkout/mobile-verification/send', ['mobile' => '01700000000'])
        ->assertOk()
        ->assertJsonPath('data.required', true)
        ->json('data.challenge_id');

    $challenge = SmsOtpChallenge::query()->where('public_id', $challengeId)->firstOrFail();
    $challenge->update(['code_hash' => Hash::make('123456')]);

    $this->withHeaders($headers)
        ->postJson('/api/checkout/mobile-verification/verify', [
            'challenge_id' => $challengeId,
            'mobile' => '01700000000',
            'code' => '123456',
        ])
        ->assertOk()
        ->assertJsonPath('data.verified', true);

    expect($challenge->fresh()->verified_at)->not->toBeNull()
        ->and(SmsLog::query()->where('type', 'otp')->exists())->toBeTrue();
    Queue::assertPushed(SendSms::class);
});

it('rejects verification from a different guest session', function (): void {
    Queue::fake();
    app(SmsSettingsService::class)->update([
        'enabled' => true,
        'api_base_url' => 'https://sms.example.test/send',
        'require_guest_checkout_otp' => true,
    ]);

    $challengeId = $this->withHeader('X-Guest-Token', 'guest-one')
        ->postJson('/api/checkout/mobile-verification/send', ['mobile' => '01700000001'])
        ->json('data.challenge_id');

    SmsOtpChallenge::query()->where('public_id', $challengeId)->update(['code_hash' => Hash::make('123456')]);

    $this->withHeader('X-Guest-Token', 'guest-two')
        ->postJson('/api/checkout/mobile-verification/verify', [
            'challenge_id' => $challengeId,
            'mobile' => '01700000001',
            'code' => '123456',
        ])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Validation failed.');
});

it('stores provider credentials encrypted and does not expose them in settings payload', function (): void {
    $service = app(SmsSettingsService::class);
    $service->update([
        'api_key' => 'secret-api-key',
        'api_secret' => 'secret-api-token',
    ]);

    $raw = SmsSetting::query()->toBase()->first();
    $payload = $service->payload()['settings'];

    expect($raw->api_key)->not->toBe('secret-api-key')
        ->and($raw->api_secret)->not->toBe('secret-api-token')
        ->and($payload['api_key_configured'])->toBeTrue()
        ->and($payload['api_secret_configured'])->toBeTrue()
        ->and(array_key_exists('api_key', $payload))->toBeFalse();
});

it('manages dedicated SMS settings and logs through permission-protected admin APIs', function (): void {
    $user = User::factory()->create();
    foreach (['can_view_sms_setting', 'can_edit_sms_setting', 'can_view_sms_log'] as $permission) {
        Permission::query()->create(['name' => $permission, 'guard_name' => 'web']);
        $user->givePermissionTo($permission);
    }
    $token = $user->createToken('sms-admin', ['access'], now()->addMinutes(15))->plainTextToken;

    $payload = $this->withToken($token)
        ->getJson('/api/admin/settings/sms')
        ->assertOk()
        ->assertJsonMissingPath('data.settings.api_key')
        ->json('data');

    $payload['settings']['enabled'] = false;
    $payload['settings']['otp_length'] = 7;
    $payload['settings']['templates'] = $payload['templates'];

    $this->withToken($token)
        ->putJson('/api/admin/settings/sms', $payload['settings'])
        ->assertOk()
        ->assertJsonPath('data.settings.otp_length', 7);

    SmsLog::query()->create([
        'public_id' => (string) Str::uuid(),
        'recipient' => '+8801700000004',
        'type' => 'test',
        'provider' => 'generic_http',
        'message' => 'Admin log test',
        'status' => 'sent',
        'sent_at' => now(),
    ]);

    $this->withToken($token)
        ->getJson('/api/admin/sms-logs?status=sent')
        ->assertOk()
        ->assertJsonPath('data.logs.0.recipient', '+8801700000004')
        ->assertJsonPath('meta.pagination.total', 1);
});

it('delivers queued messages through the generic HTTP provider and records the response', function (): void {
    Http::fake([
        'https://sms.example.test/send' => Http::response(['message_id' => 'provider-123'], 200),
    ]);
    app(SmsSettingsService::class)->update([
        'enabled' => true,
        'api_base_url' => 'https://sms.example.test/send',
        'api_key' => 'api-key',
    ]);

    $log = SmsLog::query()->create([
        'public_id' => (string) Str::uuid(),
        'recipient' => '+8801700000002',
        'type' => 'test',
        'provider' => 'generic_http',
        'message' => 'Provider test',
        'status' => 'queued',
    ]);

    app(SmsDeliveryService::class)->deliver($log);

    expect($log->fresh()->status)->toBe('sent')
        ->and($log->fresh()->provider_message_id)->toBe('provider-123');
    Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer api-key')
        && $request['to'] === '8801700000002'
        && $request['message'] === 'Provider test');
});

it('queues order confirmation and status messages using editable templates', function (): void {
    Queue::fake();
    app(SmsSettingsService::class)->update([
        'enabled' => true,
        'api_base_url' => 'https://sms.example.test/send',
        'order_confirmation_enabled' => true,
    ]);
    $order = Order::query()->create([
        'order_number' => 'ORD-SMS-1001',
        'status' => 'pending',
        'payment_status' => 'pending',
        'payment_method' => 'cash_on_delivery',
        'currency' => 'BDT',
        'subtotal_cents' => 10000,
        'total_cents' => 10000,
        'billing_address' => ['full_name' => 'SMS Customer', 'phone' => '01700000003'],
        'shipping_address' => ['full_name' => 'SMS Customer', 'phone' => '01700000003'],
        'summary_snapshot' => [],
        'placed_at' => now(),
    ]);

    app(SmsService::class)->queueOrderEvent('order_confirmation', $order);

    $log = SmsLog::query()->firstOrFail();
    expect($log->recipient)->toBe('+8801700000003')
        ->and($log->message)->toContain('ORD-SMS-1001')
        ->and($log->message)->toContain('SMS Customer');
});
