<?php

namespace App\Services\Marketing;

use App\Jobs\DeliverMarketingTrackingEvent;
use App\Models\MarketingTrackingEvent;
use App\Models\Order;
use App\Models\User;
use App\Services\Admin\Settings\MarketingSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Throwable;

class MarketingEventService
{
    public function __construct(private readonly MarketingSettingsService $settings) {}

    public function track(
        string $eventName,
        array $payload = [],
        ?Request $request = null,
        ?Order $order = null,
        ?User $user = null,
        string $source = 'server',
        ?string $eventId = null,
        ?int $actorId = null,
    ): array {
        try {
            $eventName = Str::snake(trim($eventName));
            $eventId ??= (string) Str::uuid();
            $consent = $this->consent($request, $order, $payload);
            $payload = $this->context($payload, $request, $order, $user);

            return collect([
                'meta' => $this->settings->meta(),
                'google' => $this->settings->google(),
            ])->filter(fn ($setting, string $platform) => (bool) $setting->enabled
                && ($platform !== 'meta' || (bool) $setting->automatic_event_tracking))
                ->map(function ($setting, string $platform) use ($eventId, $eventName, $source, $consent, $user, $order, $actorId, $payload): MarketingTrackingEvent {
                    $serverEnabled = $platform === 'meta'
                        ? (bool) ($setting->conversions_api_enabled && $setting->server_side_tracking)
                        : (bool) ($setting->server_side_events && ($source !== 'browser' || ! $setting->client_side_events));
                    $status = $consent === 'denied' ? 'skipped' : ($serverEnabled ? 'queued' : 'recorded');
                    $event = MarketingTrackingEvent::query()->firstOrCreate(
                        ['platform' => $platform, 'event_id' => $eventId],
                        [
                            'public_id' => (string) Str::uuid(),
                            'event_name' => $eventName,
                            'source' => $source,
                            'status' => $status,
                            'consent_status' => $consent,
                            'user_id' => $user?->id ?? $order?->user_id,
                            'order_id' => $order?->id,
                            'triggered_by' => $actorId,
                            'payload' => $payload,
                            'error_message' => $consent === 'denied' ? 'Marketing consent was declined.' : null,
                            'occurred_at' => now(),
                        ],
                    );
                    if ($event->wasRecentlyCreated && $status === 'queued') {
                        DeliverMarketingTrackingEvent::dispatch($event->id)
                            ->onQueue((string) config('marketing.queue', 'marketing'))
                            ->afterCommit();
                    }

                    return $event;
                })->values()->all();
        } catch (Throwable $exception) {
            report($exception);

            return [];
        }
    }

    public function trackOrder(string $eventName, Order $order, array $extra = [], ?string $eventId = null): array
    {
        $order->loadMissing(['items.product.brand', 'items.product.category', 'user', 'guestCustomer']);
        $address = (array) $order->billing_address;
        $user = $order->user;
        $ecommerce = [
            'transaction_id' => $order->order_number,
            'currency' => $order->currency,
            'value' => round($order->total_cents / 100, 2),
            'tax' => round($order->tax_cents / 100, 2),
            'shipping' => round($order->shipping_cents / 100, 2),
            'coupon' => $order->coupon_code,
            'items' => $order->items->map(fn ($item): array => array_filter([
                'item_id' => (string) ($item->sku ?: $item->product_id),
                'item_name' => $item->product_name,
                'item_brand' => $item->product?->brand?->name,
                'item_category' => $item->product?->category?->name,
                'item_variant' => data_get($item->selection_snapshot, 'selected_variant'),
                'price' => round(($item->discounted_price_cents ?? $item->unit_price_cents) / 100, 2),
                'quantity' => (int) $item->quantity,
            ]))->all(),
            ...(array) ($extra['ecommerce'] ?? []),
        ];

        return $this->track(
            $eventName,
            [
                ...$extra,
                'transaction_id' => $order->order_number,
                'user' => [
                    'id' => $user?->id ?? $order->guest_customer_id,
                    'email' => $address['email'] ?? $user?->email ?? $order->guestCustomer?->email,
                    'phone' => $address['phone'] ?? $user?->phone ?? $order->guestCustomer?->phone,
                    'first_name' => Str::before((string) ($address['full_name'] ?? $user?->name), ' '),
                    'last_name' => Str::after((string) ($address['full_name'] ?? $user?->name), ' '),
                    'city' => $address['city'] ?? null,
                    'state' => $address['state'] ?? null,
                    'postal_code' => $address['postal_code'] ?? null,
                    'country' => $address['country'] ?? null,
                ],
                'ecommerce' => $ecommerce,
                'client_ip' => $order->client_ip,
                'user_agent' => $order->user_agent,
                'consent_status' => $order->marketing_consent_status,
            ],
            order: $order,
            user: $user,
            eventId: $eventId ?? "{$eventName}-order-{$order->id}",
        );
    }

    public function consent(?Request $request = null, ?Order $order = null, array $payload = []): string
    {
        $value = $payload['consent_status']
            ?? $request?->header('X-Marketing-Consent')
            ?? $request?->cookie('marketing_consent')
            ?? $order?->marketing_consent_status
            ?? 'unspecified';

        return in_array($value, ['granted', 'denied'], true) ? $value : 'unspecified';
    }

    private function context(array $payload, ?Request $request, ?Order $order, ?User $user): array
    {
        $clientId = Str::limit((string) (
            $payload['client_id']
            ?? $this->gaClientId($request?->cookie('_ga'))
            ?? $request?->header('X-Tracking-Client-Id')
            ?? ''
        ), 191, '');
        $sessionId = Str::limit((string) (
            $payload['session_id']
            ?? $request?->header('X-Tracking-Session-Id')
            ?? ''
        ), 191, '');

        return [
            ...$payload,
            'client_id' => $clientId ?: (string) Str::uuid(),
            'session_id' => $sessionId ?: null,
            'event_url' => Str::limit((string) ($payload['event_url'] ?? $request?->headers->get('referer') ?? ''), 2000, ''),
            'page_title' => Str::limit((string) ($payload['page_title'] ?? ''), 500, ''),
            'client_ip' => $payload['client_ip'] ?? $request?->ip() ?? $order?->client_ip,
            'user_agent' => Str::limit((string) ($payload['user_agent'] ?? $request?->userAgent() ?? $order?->user_agent), 2000, ''),
            'fbp' => $payload['fbp'] ?? $request?->cookie('_fbp'),
            'fbc' => $payload['fbc'] ?? $request?->cookie('_fbc'),
            'user' => [
                ...(array) ($payload['user'] ?? []),
                ...($user ? ['id' => $user->id, 'email' => $user->email, 'phone' => $user->phone] : []),
            ],
        ];
    }

    private function gaClientId(?string $cookie): ?string
    {
        if (! $cookie) {
            return null;
        }

        $parts = explode('.', $cookie);

        return count($parts) >= 4 ? implode('.', array_slice($parts, -2)) : null;
    }
}
