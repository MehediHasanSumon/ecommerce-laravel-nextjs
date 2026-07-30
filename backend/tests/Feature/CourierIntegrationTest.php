<?php

use App\Http\Resources\Admin\Settings\CourierProviderSettingResource;
use App\Jobs\CreateCourierShipment;
use App\Jobs\SyncCourierShipment;
use App\Mail\CourierShipmentStatusMail;
use App\Models\CourierApiLog;
use App\Models\CourierShipment;
use App\Models\Order;
use App\Models\Product;
use App\Models\Settings\CourierProviderSetting;
use App\Services\Admin\Settings\CourierSettingsService;
use App\Services\Admin\Settings\StoreSettingsService;
use App\Services\Courier\CourierAutomationService;
use App\Services\Courier\CourierManager;
use App\Services\Courier\CourierShipmentService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

beforeEach(function (): void {
    cache()->flush();
});

function courierOrder(array $overrides = []): Order
{
    $product = Product::query()->create([
        'name' => 'Courier Test Product',
        'slug' => 'courier-test-product-'.Str::lower(Str::random(8)),
        'status' => 'active',
        'sku' => 'COURIER-'.Str::upper(Str::random(8)),
        'product_type' => 'physical',
        'base_price_cents' => 150000,
        'currency' => 'BDT',
        'track_inventory' => false,
        'published_at' => now(),
    ]);

    $order = Order::query()->create(array_merge([
        'order_number' => 'ORD-20260730-'.Str::upper(Str::random(8)),
        'status' => 'confirmed',
        'payment_status' => 'pending',
        'shipping_status' => 'pending',
        'payment_method' => 'cash_on_delivery',
        'shipping_method_name' => 'Inside Dhaka',
        'currency' => 'BDT',
        'subtotal_cents' => 150000,
        'item_discount_cents' => 0,
        'coupon_discount_cents' => 0,
        'shipping_cents' => 8000,
        'tax_cents' => 0,
        'total_cents' => 158000,
        'billing_address' => [
            'full_name' => 'Courier Customer',
            'email' => 'courier.customer@example.com',
            'phone' => '01712345678',
            'country' => 'Bangladesh',
            'state' => 'Dhaka',
            'district' => 'Dhaka',
            'city' => 'Dhaka',
            'area' => 'Dhanmondi',
            'address_line' => 'Road 1, House 2',
        ],
        'shipping_address' => [
            'full_name' => 'Courier Customer',
            'email' => 'courier.customer@example.com',
            'phone' => '01712345678',
            'country' => 'Bangladesh',
            'state' => 'Dhaka',
            'district' => 'Dhaka',
            'city' => 'Dhaka',
            'area' => 'Dhanmondi',
            'address_line' => 'Road 1, House 2',
        ],
        'summary_snapshot' => [],
        'placed_at' => now(),
    ], $overrides));

    $order->items()->create([
        'product_id' => $product->id,
        'product_name' => $product->name,
        'sku' => $product->sku,
        'quantity' => 2,
        'unit_price_cents' => 75000,
        'line_subtotal_cents' => 150000,
        'line_discount_cents' => 0,
    ]);

    return $order;
}

function courierSetting(string $provider, array $overrides = []): CourierProviderSetting
{
    app(CourierSettingsService::class)->all();

    $setting = CourierProviderSetting::query()->where('provider', $provider)->firstOrFail();
    $setting->update(array_merge([
        'enabled' => true,
        'sandbox_mode' => true,
        'api_key' => 'courier-api-key',
        'api_secret' => 'courier-api-secret',
    ], $overrides));

    return $setting->fresh();
}

it('encrypts courier credentials and returns only masked values', function (): void {
    $setting = courierSetting('steadfast', [
        'api_key' => 'steadfast-key',
        'api_secret' => 'steadfast-secret',
        'webhook_secret' => 'webhook-secret',
    ]);

    $raw = CourierProviderSetting::query()->toBase()->find($setting->id);
    $payload = CourierProviderSettingResource::make($setting)->resolve();

    expect($raw->api_key)->not->toBe('steadfast-key')
        ->and($raw->api_secret)->not->toBe('steadfast-secret')
        ->and($raw->webhook_secret)->not->toBe('webhook-secret')
        ->and($payload['api_key'])->toBe('********')
        ->and($payload['api_secret'])->toBe('********')
        ->and($payload['webhook_secret'])->toBe('********')
        ->and($payload)->not->toHaveKeys(['access_token', 'refresh_token']);
});

it('creates and synchronizes a Steadfast shipment with attached API logs', function (): void {
    Mail::fake();
    courierSetting('steadfast');
    $order = courierOrder();
    Http::fake([
        'https://portal.packzy.com/api/v1/create_order' => Http::response([
            'status' => 200,
            'consignment' => [
                'consignment_id' => 123456,
                'tracking_code' => 'SF-TRACK-123',
                'status' => 'in_review',
                'delivery_charge' => 80,
            ],
        ]),
        'https://portal.packzy.com/api/v1/status_by_cid/123456' => Http::response([
            'status' => 200,
            'delivery_status' => 'delivered',
        ]),
    ]);

    $shipment = app(CourierShipmentService::class)->create($order, 'steadfast');
    expect($shipment->external_id)->toBe('123456')
        ->and($shipment->tracking_number)->toBe('SF-TRACK-123')
        ->and($shipment->delivery_charge_cents)->toBe(8000)
        ->and(CourierApiLog::query()->where('courier_shipment_id', $shipment->id)->exists())->toBeTrue();

    $synced = app(CourierShipmentService::class)->sync($shipment);
    expect($synced->status)->toBe('delivered')
        ->and($synced->cod_status)->toBe('collected');
    Mail::assertQueued(CourierShipmentStatusMail::class);

    Http::assertSent(fn ($request): bool => str_ends_with($request->url(), '/create_order')
        && $request->hasHeader('Api-Key', 'courier-api-key')
        && $request->hasHeader('Secret-Key', 'courier-api-secret')
        && $request['invoice'] === $order->order_number
        && $request['recipient_phone'] === '01712345678');
});

it('authenticates Pathao, caches locations, and creates an order', function (): void {
    $setting = courierSetting('pathao', ['default_store_id' => '77']);
    $order = courierOrder();
    Http::fake([
        'https://courier-api-sandbox.pathao.com/aladdin/api/v1/external/login' => Http::response([
            'access_token' => 'pathao-access-token',
            'refresh_token' => 'pathao-refresh-token',
            'expires_in' => 3600,
        ]),
        'https://courier-api-sandbox.pathao.com/aladdin/api/v1/countries/1/city-list' => Http::response([
            'data' => ['data' => [['city_id' => 1, 'city_name' => 'Dhaka']]],
        ]),
        'https://courier-api-sandbox.pathao.com/aladdin/api/v1/cities/1/zone-list' => Http::response([
            'data' => ['data' => [['zone_id' => 2, 'zone_name' => 'Dhanmondi']]],
        ]),
        'https://courier-api-sandbox.pathao.com/aladdin/api/v1/zones/2/area-list' => Http::response([
            'data' => ['data' => [['area_id' => 3, 'area_name' => 'Dhanmondi']]],
        ]),
        'https://courier-api-sandbox.pathao.com/aladdin/api/v1/orders' => Http::response([
            'data' => [
                'consignment_id' => 'PATHAO-123',
                'order_status' => 'Order_Created',
                'delivery_fee' => 90,
            ],
        ]),
    ]);

    $shipment = app(CourierShipmentService::class)->create($order, 'pathao');
    app(CourierManager::class)->provider('pathao')->cities($setting->fresh());

    expect($shipment->external_id)->toBe('PATHAO-123')
        ->and($shipment->delivery_charge_cents)->toBe(9000)
        ->and(CourierProviderSetting::query()->where('provider', 'pathao')->first()->access_token)->toBe('pathao-access-token');

    $cityRequests = collect(Http::recorded())->filter(
        fn (array $record): bool => str_contains($record[0]->url(), '/countries/1/city-list')
    );
    expect($cityRequests)->toHaveCount(1);
    Http::assertSent(fn ($request): bool => str_ends_with($request->url(), '/orders')
        && $request->hasHeader('Authorization', 'Bearer pathao-access-token')
        && $request['recipient_city'] === 1
        && $request['recipient_zone'] === 2
        && $request['recipient_area'] === 3);
});

it('prevents duplicate active shipments for one order', function (): void {
    courierSetting('steadfast');
    $order = courierOrder();
    Http::fake([
        'https://portal.packzy.com/api/v1/create_order' => Http::response([
            'consignment' => ['consignment_id' => 9001, 'tracking_code' => 'SF-9001'],
        ]),
    ]);

    app(CourierShipmentService::class)->create($order, 'steadfast');

    expect(fn () => app(CourierShipmentService::class)->create($order, 'steadfast'))
        ->toThrow(ValidationException::class);
    Http::assertSentCount(1);
});

it('validates Pathao webhook signatures and ignores replayed events', function (): void {
    Queue::fake();
    $setting = courierSetting('pathao', ['webhook_secret' => 'pathao-webhook-secret']);
    $order = courierOrder();
    $shipment = CourierShipment::query()->create([
        'public_id' => (string) Str::uuid(),
        'order_id' => $order->id,
        'courier_provider_setting_id' => $setting->id,
        'provider' => 'pathao',
        'external_id' => 'PATHAO-WEBHOOK-1',
        'tracking_number' => 'PATHAO-WEBHOOK-1',
        'merchant_order_id' => $order->order_number,
        'status' => 'pending',
        'delivery_status' => 'pending',
        'cod_status' => 'pending',
        'weight' => 0.5,
        'amount_to_collect_cents' => $order->total_cents,
    ]);
    $payload = [
        'event' => 'order.delivered',
        'merchant_order_id' => $order->order_number,
        'consignment_id' => $shipment->external_id,
        'order_status' => 'Delivered',
        'delivery_fee' => 90,
    ];

    $this->postJson('/api/courier-webhooks/pathao', $payload)
        ->assertUnauthorized();

    $this->withHeader('X-Pathao-Signature', 'pathao-webhook-secret')
        ->postJson('/api/courier-webhooks/pathao', $payload)
        ->assertStatus(202)
        ->assertJsonPath('data.processed', true);

    $this->withHeader('X-Pathao-Signature', 'pathao-webhook-secret')
        ->postJson('/api/courier-webhooks/pathao', $payload)
        ->assertStatus(202)
        ->assertJsonPath('data.duplicate', true);

    expect($shipment->fresh()->status)->toBe('delivered')
        ->and($shipment->fresh()->cod_status)->toBe('collected');
});

it('queues automatic creation and scheduled synchronization without duplicate work', function (): void {
    Queue::fake();
    courierSetting('steadfast');
    app(StoreSettingsService::class)->update([
        'automatic_shipment_creation' => 'after_order_confirmation',
        'automatic_courier_provider' => 'steadfast',
    ]);
    $order = courierOrder(['status' => 'confirmed']);

    app(CourierAutomationService::class)->dispatchIfEligible($order);
    Queue::assertPushed(CreateCourierShipment::class, fn (CreateCourierShipment $job): bool => $job->orderId === $order->id);

    $setting = CourierProviderSetting::query()->where('provider', 'steadfast')->firstOrFail();
    $shipment = CourierShipment::query()->create([
        'public_id' => (string) Str::uuid(),
        'order_id' => $order->id,
        'courier_provider_setting_id' => $setting->id,
        'provider' => 'steadfast',
        'external_id' => 'SCHEDULED-1',
        'tracking_number' => 'SCHEDULED-1',
        'merchant_order_id' => $order->order_number,
        'status' => 'in_transit',
        'delivery_status' => 'in_transit',
        'cod_status' => 'pending',
        'weight' => 0.5,
        'amount_to_collect_cents' => $order->total_cents,
        'last_synced_at' => now()->subHour(),
    ]);

    Artisan::call('couriers:sync-shipments', ['--limit' => 10]);
    Queue::assertPushed(SyncCourierShipment::class, fn (SyncCourierShipment $job): bool => $job->shipmentId === $shipment->id);
});

it('protects courier admin APIs and rejects unofficial API base URLs', function (): void {
    $unauthorizedToken = accessTokenWithPermissions([]);
    $this->withToken($unauthorizedToken)
        ->getJson('/api/admin/shipments')
        ->assertForbidden();

    $token = accessTokenWithPermissions([
        'can_view_courier_setting',
        'can_edit_courier_setting',
    ]);
    $response = $this->withToken($token)
        ->getJson('/api/admin/settings/couriers')
        ->assertOk()
        ->assertJsonPath('data.providers.0.api_key', '')
        ->assertJsonMissingPath('data.providers.0.access_token');

    $providers = $response->json('data.providers');
    $providers[0]['enabled'] = true;
    $providers[0]['api_key'] = 'key';
    $providers[0]['api_secret'] = 'secret';
    $providers[0]['api_base_url'] = 'https://internal.example.test/api';

    $this->withToken($token)
        ->putJson('/api/admin/settings/couriers', ['providers' => $providers])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['providers.0.api_base_url']);
});
