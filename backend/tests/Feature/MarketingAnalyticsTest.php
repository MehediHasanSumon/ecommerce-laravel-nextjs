<?php

use App\Http\Resources\Admin\Settings\GoogleAnalyticsSettingResource;
use App\Http\Resources\Admin\Settings\MetaPixelSettingResource;
use App\Jobs\DeliverMarketingTrackingEvent;
use App\Models\MarketingTrackingEvent;
use App\Models\Settings\GoogleAnalyticsSetting;
use App\Models\Settings\MetaPixelSetting;
use App\Models\User;
use App\Services\Admin\Settings\MarketingSettingsService;
use App\Services\Marketing\GoogleAnalyticsProvider;
use App\Services\Marketing\MarketingEventService;
use App\Services\Marketing\MarketingProviderManager;
use App\Services\Marketing\MetaConversionsProvider;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;

beforeEach(function (): void {
    cache()->flush();
});

function metaSettingsPayload(array $overrides = []): array
{
    return array_merge([
        'enabled' => true,
        'pixel_id' => '1234567890',
        'conversions_api_enabled' => true,
        'access_token' => 'meta-secret-token',
        'test_event_code' => 'TEST123',
        'dataset_id' => null,
        'automatic_event_tracking' => true,
        'advanced_matching' => true,
        'server_side_tracking' => true,
        'browser_side_tracking' => true,
        'debug_mode' => false,
    ], $overrides);
}

function googleSettingsPayload(array $overrides = []): array
{
    return array_merge([
        'enabled' => true,
        'measurement_id' => 'G-ABCDEF1234',
        'api_secret' => 'google-secret-token',
        'enhanced_ecommerce' => true,
        'debug_mode' => false,
        'user_id_tracking' => true,
        'server_side_events' => true,
        'client_side_events' => true,
        'anonymize_ip' => true,
        'respect_consent_mode' => true,
    ], $overrides);
}

function marketingEvent(string $platform, string $name = 'purchase', array $payload = []): MarketingTrackingEvent
{
    return MarketingTrackingEvent::query()->create([
        'public_id' => (string) Str::uuid(),
        'event_id' => (string) Str::uuid(),
        'platform' => $platform,
        'event_name' => $name,
        'source' => 'server',
        'status' => 'queued',
        'consent_status' => 'granted',
        'payload' => array_merge([
            'client_id' => 'client.123',
            'event_url' => 'https://store.example.test/products/example',
        ], $payload),
        'occurred_at' => now(),
    ]);
}

it('encrypts marketing credentials and exposes only masked values', function (): void {
    $service = app(MarketingSettingsService::class);
    $meta = $service->updateMeta(metaSettingsPayload(), null);
    $google = $service->updateGoogle(googleSettingsPayload(), null);

    $rawMeta = MetaPixelSetting::query()->toBase()->first();
    $rawGoogle = GoogleAnalyticsSetting::query()->toBase()->first();
    $metaResource = MetaPixelSettingResource::make($meta)->resolve();
    $googleResource = GoogleAnalyticsSettingResource::make($google)->resolve();

    expect($rawMeta->access_token)->not->toBe('meta-secret-token')
        ->and($rawMeta->test_event_code)->not->toBe('TEST123')
        ->and($rawGoogle->api_secret)->not->toBe('google-secret-token')
        ->and($metaResource['access_token'])->toBe('********')
        ->and($metaResource['test_event_code'])->toBe('********')
        ->and($googleResource['api_secret'])->toBe('********')
        ->and(json_encode($metaResource))->not->toContain('meta-secret-token')
        ->and(json_encode($googleResource))->not->toContain('google-secret-token');
});

it('protects dedicated marketing settings and analytics APIs with permissions', function (): void {
    $user = User::factory()->create();
    $token = $user->createToken('marketing-no-permission', ['access'], now()->addMinutes(15))->plainTextToken;

    $this->withToken($token)->getJson('/api/admin/settings/meta-pixel')->assertForbidden();
    $this->withToken($token)->getJson('/api/admin/settings/google-analytics')->assertForbidden();
    $this->withToken($token)->getJson('/api/admin/marketing-analytics')->assertForbidden();

    foreach (['can_view_meta_pixel_setting', 'can_edit_meta_pixel_setting', 'can_view_google_analytics_setting', 'can_edit_google_analytics_setting', 'can_view_marketing_analytics'] as $name) {
        Permission::query()->firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        $user->givePermissionTo($name);
    }

    $this->withToken($token)
        ->putJson('/api/admin/settings/meta-pixel', metaSettingsPayload())
        ->assertOk()
        ->assertJsonPath('data.settings.access_token', '********');

    $this->withToken($token)
        ->putJson('/api/admin/settings/google-analytics', googleSettingsPayload())
        ->assertOk()
        ->assertJsonPath('data.settings.api_secret', '********');

    $this->withToken($token)
        ->getJson('/api/admin/marketing-analytics')
        ->assertOk()
        ->assertJsonStructure(['data' => ['analytics' => ['summary', 'top_events', 'platforms']]]);
});

it('builds a hashed Meta Conversions API event with the shared event id', function (): void {
    app(MarketingSettingsService::class)->updateMeta(metaSettingsPayload(), null);
    $event = marketingEvent('meta', 'purchase', [
        'user' => ['email' => 'CUSTOMER@EXAMPLE.COM', 'phone' => '+880 1712-345678'],
        'ecommerce' => [
            'currency' => 'BDT',
            'value' => 1250,
            'items' => [['item_id' => 'SKU-1', 'item_name' => 'Test Product', 'price' => 1250, 'quantity' => 1]],
        ],
    ]);
    Http::fake(['graph.facebook.com/*' => Http::response(['events_received' => 1], 200)]);

    $response = app(MetaConversionsProvider::class)->send($event);

    expect($response['events_received'])->toBe(1);
    Http::assertSent(function ($request) use ($event): bool {
        $payload = $request->data();

        return str_contains($request->url(), '/v26.0/1234567890/events')
            && $request->hasHeader('Authorization', 'Bearer meta-secret-token')
            && data_get($payload, 'data.0.event_id') === $event->event_id
            && data_get($payload, 'data.0.event_name') === 'Purchase'
            && data_get($payload, 'data.0.user_data.em') === hash('sha256', 'customer@example.com')
            && data_get($payload, 'data.0.user_data.ph') === hash('sha256', '8801712345678');
    });
});

it('validates GA4 Measurement Protocol events against the debug endpoint', function (): void {
    app(MarketingSettingsService::class)->updateGoogle(googleSettingsPayload(), null);
    $event = marketingEvent('google', 'add_to_cart', [
        'client_id' => '12345.67890',
        'ecommerce' => [
            'currency' => 'BDT',
            'value' => 500,
            'items' => [['item_id' => 'SKU-2', 'item_name' => 'GA Product', 'price' => 500, 'quantity' => 1]],
        ],
    ]);
    Http::fake(['www.google-analytics.com/*' => Http::response(['validationMessages' => []], 200)]);

    app(GoogleAnalyticsProvider::class)->send($event, true);

    Http::assertSent(function ($request): bool {
        $payload = $request->data();

        return str_contains($request->url(), '/debug/mp/collect')
            && str_contains($request->url(), 'measurement_id=G-ABCDEF1234')
            && str_contains($request->url(), 'api_secret=google-secret-token')
            && $payload['client_id'] === '12345.67890'
            && data_get($payload, 'events.0.name') === 'add_to_cart'
            && $payload['validation_behavior'] === 'ENFORCE_RECOMMENDATIONS';
    });
});

it('honors enhanced ecommerce settings and browser tracking identifiers', function (): void {
    Queue::fake();
    app(MarketingSettingsService::class)->updateGoogle(
        googleSettingsPayload(['enhanced_ecommerce' => false, 'client_side_events' => false]),
        null,
    );
    $request = request()->create('https://store.example.test/cart', 'POST');
    $request->headers->set('X-Marketing-Consent', 'granted');
    $request->headers->set('X-Tracking-Client-Id', 'client-browser-123');
    $request->headers->set('X-Tracking-Session-Id', 'session-browser-456');

    $events = app(MarketingEventService::class)->track(
        'add_to_cart',
        ['ecommerce' => [
            'currency' => 'BDT',
            'value' => 500,
            'items' => [['item_id' => 'SKU-2', 'item_name' => 'GA Product', 'price' => 500, 'quantity' => 1]],
        ]],
        $request,
        eventId: 'browser-context-event',
    );
    $event = collect($events)->firstWhere('platform', 'google');
    Http::fake(['www.google-analytics.com/*' => Http::response(['validationMessages' => []], 200)]);

    app(GoogleAnalyticsProvider::class)->send($event, true);

    expect(data_get($event->payload, 'client_id'))->toBe('client-browser-123')
        ->and(data_get($event->payload, 'session_id'))->toBe('session-browser-456');
    Http::assertSent(function ($request): bool {
        $params = (array) data_get($request->data(), 'events.0.params', []);

        return ($request->data()['client_id'] ?? null) === 'client-browser-123'
            && ($params['session_id'] ?? null) === 'session-browser-456'
            && ! array_key_exists('items', $params)
            && ! array_key_exists('currency', $params)
            && ! array_key_exists('value', $params);
    });
});

it('skips denied consent and deduplicates repeated browser event ids', function (): void {
    Queue::fake();
    $settings = app(MarketingSettingsService::class);
    $settings->updateMeta(metaSettingsPayload(), null);
    $settings->updateGoogle(googleSettingsPayload(), null);
    $service = app(MarketingEventService::class);

    $denied = $service->track('page_view', [
        'consent_status' => 'denied',
        'event_url' => 'https://store.example.test',
    ], eventId: 'consent-denied-event', source: 'browser');
    $service->track('add_to_cart', [
        'consent_status' => 'granted',
        'event_url' => 'https://store.example.test/cart',
    ], eventId: 'shared-cart-event', source: 'browser');
    $service->track('add_to_cart', [
        'consent_status' => 'granted',
        'event_url' => 'https://store.example.test/cart',
    ], eventId: 'shared-cart-event', source: 'browser');

    expect(collect($denied)->pluck('status')->unique()->all())->toBe(['skipped'])
        ->and(MarketingTrackingEvent::query()->where('event_id', 'shared-cart-event')->count())->toBe(2)
        ->and(MarketingTrackingEvent::query()->where('event_id', 'shared-cart-event')->where('platform', 'google')->value('status'))->toBe('recorded');
    Queue::assertPushed(DeliverMarketingTrackingEvent::class, 1);
});

it('records retry state before a failed queued delivery is exhausted', function (): void {
    app(MarketingSettingsService::class)->updateMeta(metaSettingsPayload(), null);
    $event = marketingEvent('meta', 'page_view');
    Http::fake(['graph.facebook.com/*' => Http::response(['error' => ['message' => 'Temporary outage']], 503)]);
    $job = new DeliverMarketingTrackingEvent($event->id);

    expect(fn () => $job->handle(app(MarketingProviderManager::class)))->toThrow(RuntimeException::class);
    expect($event->fresh()->status)->toBe('retrying')
        ->and($event->fresh()->error_message)->toContain('Temporary outage');

    $job->failed(new RuntimeException('Temporary outage'));
    expect($event->fresh()->status)->toBe('failed')
        ->and(MetaPixelSetting::query()->value('connection_status'))->toBe('failed');
});

it('returns filtered paginated logs without exposing provider credentials', function (): void {
    $user = User::factory()->create();
    $permission = Permission::query()->firstOrCreate(['name' => 'can_view_marketing_analytics', 'guard_name' => 'web']);
    $user->givePermissionTo($permission);
    $token = $user->createToken('marketing-logs', ['access'], now()->addMinutes(15))->plainTextToken;
    marketingEvent('meta', 'purchase')->update(['status' => 'sent', 'response' => ['events_received' => 1], 'sent_at' => now()]);
    marketingEvent('google', 'page_view')->update(['status' => 'failed', 'error_message' => 'Validation failed']);

    $response = $this->withToken($token)
        ->getJson('/api/admin/marketing-analytics/logs?platform=meta&status=sent&sort=event_name&direction=asc')
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 1)
        ->assertJsonPath('data.events.0.platform', 'meta')
        ->assertJsonPath('data.events.0.event_name', 'purchase');

    expect(json_encode($response->json()))->not->toContain('meta-secret-token')
        ->not->toContain('google-secret-token');
});
