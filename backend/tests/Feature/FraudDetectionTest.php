<?php

use App\Http\Resources\Admin\Settings\FraudProviderSettingResource;
use App\Models\FraudApiLog;
use App\Models\Order;
use App\Models\Settings\FraudProviderSetting;
use App\Models\User;
use App\Services\Admin\Settings\FraudSettingsService;
use App\Services\Admin\Settings\StoreSettingsService;
use App\Services\Fraud\FraudCheckService;
use App\Services\Fraud\FraudDecisionService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

beforeEach(function (): void {
    cache()->flush();
    config()->set('fraud.http.retries', 0);
});

function fraudSetting(string $provider, array $overrides = []): FraudProviderSetting
{
    app(FraudSettingsService::class)->all();
    $setting = FraudProviderSetting::query()->where('provider', $provider)->firstOrFail();
    $setting->update(array_merge([
        'enabled' => true,
        'sandbox_mode' => true,
        'api_key' => 'fraud-api-key',
    ], $overrides));
    cache()->forget('fraud.enabled.providers');

    return $setting->fresh();
}

function configureFraudStore(array $overrides = []): void
{
    app(StoreSettingsService::class)->update(array_merge([
        'fraud_detection_enabled' => true,
        'fraud_auto_check_orders' => true,
        'fraud_auto_check_customers' => false,
        'fraud_check_during_checkout' => true,
        'fraud_check_before_cod_confirmation' => true,
        'fraud_check_before_shipment' => true,
        'fraud_score_threshold' => 60,
        'fraud_critical_score_threshold' => 85,
        'fraud_auto_flag_suspicious_orders' => true,
        'fraud_auto_hold_high_risk_orders' => true,
        'fraud_auto_reject_critical_risk_orders' => false,
        'fraud_block_cod_high_risk' => true,
        'fraud_require_admin_approval' => true,
        'fraud_provider_priority' => ['fraudpeek', 'fraud_bd', 'fraudbd'],
        'fraud_result_caching_enabled' => true,
        'fraud_cache_duration_minutes' => 1440,
    ], $overrides));
}

function fraudOrder(array $overrides = []): Order
{
    return Order::query()->create(array_merge([
        'order_number' => 'ORD-FRAUD-'.Str::upper(Str::random(10)),
        'status' => 'confirmed',
        'payment_status' => 'pending',
        'shipping_status' => 'pending',
        'payment_method' => 'cash_on_delivery',
        'currency' => 'BDT',
        'subtotal_cents' => 100000,
        'item_discount_cents' => 0,
        'coupon_discount_cents' => 0,
        'shipping_cents' => 8000,
        'tax_cents' => 0,
        'total_cents' => 108000,
        'billing_address' => [
            'full_name' => 'Fraud Test Customer',
            'email' => 'fraud.customer@example.com',
            'phone' => '01712345678',
            'country' => 'Bangladesh',
            'state' => 'Dhaka',
            'district' => 'Dhaka',
            'city' => 'Dhaka',
            'address_line' => 'Road 1, House 2',
        ],
        'shipping_address' => [
            'full_name' => 'Fraud Test Customer',
            'email' => 'fraud.customer@example.com',
            'phone' => '01712345678',
            'country' => 'Bangladesh',
            'state' => 'Dhaka',
            'district' => 'Dhaka',
            'city' => 'Dhaka',
            'address_line' => 'Road 1, House 2',
        ],
        'summary_snapshot' => [],
        'placed_at' => now(),
    ], $overrides));
}

function fraudBdResponse(int $cancelRate = 60, string $risk = 'high'): array
{
    return [
        'status' => true,
        'message' => 'Courier information found.',
        'data' => [
            'Summaries' => ['pathao' => [
                'courier_name' => 'Pathao',
                'risk_level' => $risk,
                'message' => 'Courier history has elevated cancellations.',
            ]],
            'totalSummary' => [
                'total' => 10,
                'success' => 4,
                'cancel' => 6,
                'successRate' => 40,
                'cancelRate' => $cancelRate,
            ],
        ],
    ];
}

it('encrypts provider credentials and exposes only masked values', function (): void {
    $setting = fraudSetting('fraudpeek', [
        'api_url' => 'https://merchant.fraudpeek.example/api/check',
        'api_key' => 'fraudpeek-key',
        'api_secret' => 'fraudpeek-secret',
    ]);

    $raw = FraudProviderSetting::query()->toBase()->find($setting->id);
    $payload = FraudProviderSettingResource::make($setting)->resolve();

    expect($raw->api_key)->not->toBe('fraudpeek-key')
        ->and($raw->api_secret)->not->toBe('fraudpeek-secret')
        ->and($payload['api_key'])->toBe('********')
        ->and($payload['api_secret'])->toBe('********')
        ->and($payload)->not->toHaveKeys(['consecutive_failures']);
});

it('parses the official FraudBD response and logs redacted requests', function (): void {
    configureFraudStore();
    fraudSetting('fraudbd');
    Http::fake([
        'https://fraudbd.com/api/sandbox/check-courier-info' => Http::response(fraudBdResponse(60, 'very_high'), 200),
    ]);

    $check = app(FraudCheckService::class)->check(
        ['phone' => '+8801712345678', 'name' => '<b>Customer</b>'],
        'manual',
    );

    expect($check->status)->toBe('completed')
        ->and($check->risk_score)->toBe(90)
        ->and($check->risk_level)->toBe('critical')
        ->and($check->fraud_matches)->toBe(6)
        ->and($check->input_payload['phone'])->toBe('01712345678')
        ->and($check->input_payload['name'])->toBe('Customer')
        ->and(FraudApiLog::query()->where('fraud_check_id', $check->id)->count())->toBe(1);

    Http::assertSent(fn ($request): bool => $request->url() === 'https://fraudbd.com/api/sandbox/check-courier-info'
        && $request->hasHeader('api_key', 'fraud-api-key')
        && $request['phone_number'] === '01712345678');
});

it('aggregates multiple providers while retaining partial failures', function (): void {
    configureFraudStore(['fraud_result_caching_enabled' => false]);
    fraudSetting('fraudpeek', [
        'api_url' => 'https://fraudpeek.example/api/check',
        'additional_configuration' => [
            'method' => 'POST',
            'phone_field' => 'phone',
            'auth_header' => 'X-Api-Key',
        ],
    ]);
    fraudSetting('fraud_bd', [
        'api_url' => 'https://fraud-bd.example/api/check',
        'additional_configuration' => [
            'method' => 'POST',
            'phone_field' => 'phone_number',
            'auth_header' => 'api_key',
        ],
    ]);
    fraudSetting('fraudbd');
    Http::fake([
        'https://fraudpeek.example/api/check' => Http::response([
            'data' => [
                'risk_score' => 88,
                'risk_level' => 'critical',
                'fraud_matches' => 2,
                'reasons' => ['Known scam report'],
                'recommendation' => 'Reject COD.',
            ],
        ]),
        'https://fraud-bd.example/api/check' => Http::response(['message' => 'Unavailable'], 503),
        'https://fraudbd.com/api/sandbox/check-courier-info' => Http::response(fraudBdResponse(30, 'medium')),
    ]);

    $check = app(FraudCheckService::class)->check(['phone' => '01712345678'], 'manual');

    expect($check->status)->toBe('partial')
        ->and($check->risk_score)->toBe(88)
        ->and($check->risk_level)->toBe('critical')
        ->and($check->providers_requested)->toBe(3)
        ->and($check->providers_succeeded)->toBe(2)
        ->and($check->providers_failed)->toBe(1)
        ->and($check->providerResults->where('status', 'failed')->first()->provider)->toBe('fraud_bd');
});

it('reuses cached checks without calling providers twice', function (): void {
    configureFraudStore();
    fraudSetting('fraudbd');
    Http::fake([
        'https://fraudbd.com/api/sandbox/check-courier-info' => Http::response(fraudBdResponse(), 200),
    ]);

    $service = app(FraudCheckService::class);
    $first = $service->check(['phone' => '01712345678'], 'manual');
    $cached = $service->check(['phone' => '01712345678'], 'manual');

    expect($first->status)->toBe('completed')
        ->and($cached->status)->toBe('cached')
        ->and($cached->cached_from_id)->toBe($first->id)
        ->and($cached->providerResults)->toHaveCount(1);
    Http::assertSentCount(1);
});

it('holds high-risk orders until an administrator approves them', function (): void {
    configureFraudStore();
    fraudSetting('fraudbd');
    $order = fraudOrder();
    Http::fake([
        'https://fraudbd.com/api/sandbox/check-courier-info' => Http::response(fraudBdResponse(), 200),
    ]);

    $checks = app(FraudCheckService::class);
    $check = $checks->check(
        $checks->inputForOrder($order),
        'order',
        $order->order_number,
        $order,
        trigger: 'before_shipment',
        automatic: true,
    );
    $order->refresh();

    expect($check->risk_level)->toBe('high')
        ->and($order->fraud_flagged)->toBeTrue()
        ->and($order->fraud_hold)->toBeTrue()
        ->and($order->fraud_cod_blocked)->toBeTrue()
        ->and(fn () => app(FraudDecisionService::class)->assertShipmentAllowed($order->fresh('latestFraudCheck')))
        ->toThrow(ValidationException::class);

    $approver = User::factory()->create();
    app(FraudDecisionService::class)->approve($order, $approver->id);
    expect(fn () => app(FraudDecisionService::class)->assertShipmentAllowed($order->fresh('latestFraudCheck')))
        ->not->toThrow(ValidationException::class);
});

it('protects fraud APIs and returns analytics using the shared response envelope', function (): void {
    $this->withToken(accessTokenWithPermissions([]))
        ->getJson('/api/admin/fraud-analytics')
        ->assertForbidden();

    $token = accessTokenWithPermissions([
        'can_view_fraud_analytics',
        'can_view_fraud_setting',
        'can_create_fraud_check',
    ]);
    configureFraudStore();
    fraudSetting('fraudbd');
    Http::fake([
        'https://fraudbd.com/api/sandbox/check-courier-info' => Http::response(fraudBdResponse(), 200),
    ]);

    $this->withToken($token)
        ->postJson('/api/admin/fraud-checks', ['phone' => '01712345678'])
        ->assertCreated()
        ->assertJsonPath('data.check.risk_level', 'high')
        ->assertJsonPath('data.check.providers.0.raw_response', null);

    $this->withToken($token)
        ->getJson('/api/admin/fraud-analytics?days=30')
        ->assertOk()
        ->assertJsonPath('data.analytics.summary.today_checks', 1)
        ->assertJsonPath('data.analytics.providers.0.provider', 'fraudbd');
});

it('validates provider configuration and masks settings API credentials', function (): void {
    $token = accessTokenWithPermissions([
        'can_view_fraud_setting',
        'can_edit_fraud_setting',
    ]);
    fraudSetting('fraudbd', ['api_key' => 'private-key']);

    $this->withToken($token)
        ->getJson('/api/admin/settings/fraud-detection')
        ->assertOk()
        ->assertJsonPath('data.providers.2.api_key', '********')
        ->assertJsonMissingPath('data.providers.2.consecutive_failures');

    $payload = [
        'settings' => [
            'fraud_detection_enabled' => true,
            'fraud_auto_check_orders' => true,
            'fraud_auto_check_customers' => false,
            'fraud_check_during_checkout' => true,
            'fraud_check_before_cod_confirmation' => true,
            'fraud_check_before_shipment' => true,
            'fraud_score_threshold' => 60,
            'fraud_critical_score_threshold' => 85,
            'fraud_auto_flag_suspicious_orders' => true,
            'fraud_auto_hold_high_risk_orders' => true,
            'fraud_auto_reject_critical_risk_orders' => false,
            'fraud_block_cod_high_risk' => true,
            'fraud_require_admin_approval' => true,
            'fraud_provider_priority' => ['fraudpeek', 'fraud_bd', 'fraudbd'],
            'fraud_result_caching_enabled' => true,
            'fraud_cache_duration_minutes' => 1440,
        ],
        'providers' => [
            ['provider' => 'fraudpeek', 'enabled' => false, 'sandbox_mode' => true],
            ['provider' => 'fraud_bd', 'enabled' => false, 'sandbox_mode' => true],
            [
                'provider' => 'fraudbd',
                'enabled' => true,
                'sandbox_mode' => false,
                'api_url' => 'https://internal.example.test/api',
                'api_key' => 'private-key',
            ],
        ],
    ];

    $this->withToken($token)
        ->putJson('/api/admin/settings/fraud-detection', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['providers.2.api_url']);

    $payload['providers'][0] = [
        'provider' => 'fraudpeek',
        'enabled' => true,
        'sandbox_mode' => true,
        'api_url' => 'https://fraudpeek.example/api/check?token=must-not-be-logged',
        'api_key' => 'private-key',
    ];
    $payload['providers'][2]['api_url'] = null;

    $this->withToken($token)
        ->putJson('/api/admin/settings/fraud-detection', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['providers.0.api_url']);
});
