<?php

namespace App\Services\Marketing;

use App\Contracts\Marketing\MarketingTrackingProvider;
use App\Models\MarketingTrackingEvent;
use App\Models\Settings\MetaPixelSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class MetaConversionsProvider implements MarketingTrackingProvider
{
    private const EVENT_NAMES = [
        'page_view' => 'PageView',
        'view_content' => 'ViewContent',
        'view_item' => 'ViewContent',
        'view_item_list' => 'ViewCategory',
        'view_category' => 'ViewCategory',
        'view_brand' => 'ViewBrand',
        'view_collection' => 'ViewCollection',
        'search' => 'Search',
        'select_item' => 'ViewContent',
        'add_to_wishlist' => 'AddToWishlist',
        'add_to_cart' => 'AddToCart',
        'remove_from_cart' => 'RemoveFromCart',
        'view_cart' => 'ViewCart',
        'begin_checkout' => 'InitiateCheckout',
        'add_shipping_info' => 'AddShippingInfo',
        'add_payment_info' => 'AddPaymentInfo',
        'purchase' => 'Purchase',
        'complete_registration' => 'CompleteRegistration',
        'sign_up' => 'CompleteRegistration',
        'login' => 'Login',
        'logout' => 'Logout',
        'contact' => 'Contact',
        'subscribe' => 'Subscribe',
        'lead' => 'Lead',
        'generate_lead' => 'Lead',
        'view_promotion' => 'ViewPromotion',
        'select_promotion' => 'SelectPromotion',
        'apply_coupon' => 'ApplyCoupon',
        'refund' => 'Refund',
    ];

    public function key(): string
    {
        return 'meta';
    }

    public function send(MarketingTrackingEvent $event, bool $test = false): array
    {
        $setting = MetaPixelSetting::query()->firstOrFail();
        if (! $setting->pixel_id || ! $setting->access_token) {
            throw new RuntimeException('Meta Pixel ID and Conversions API access token are required.');
        }

        $payload = (array) $event->payload;
        $dataset = $setting->dataset_id ?: $setting->pixel_id;
        $endpoint = sprintf(
            '%s/%s/%s/events',
            rtrim((string) config('marketing.meta.base_url'), '/'),
            trim((string) config('marketing.meta.graph_version'), '/'),
            rawurlencode($dataset),
        );
        $body = [
            'data' => [[
                'event_name' => self::EVENT_NAMES[$event->event_name] ?? Str::studly($event->event_name),
                'event_time' => $event->occurred_at->timestamp,
                'event_id' => $event->event_id,
                'action_source' => 'website',
                'event_source_url' => $payload['event_url'] ?? null,
                'user_data' => $this->userData($payload, $setting->advanced_matching),
                'custom_data' => $this->customData($payload),
            ]],
        ];
        if (($test || $setting->debug_mode) && $setting->test_event_code) {
            $body['test_event_code'] = $setting->test_event_code;
        }

        $response = Http::acceptJson()
            ->asJson()
            ->withToken($setting->access_token)
            ->connectTimeout(3)
            ->timeout((int) config('marketing.meta.timeout', 8))
            ->retry(2, 250, throw: false)
            ->post($endpoint, $body);
        $json = $response->json();
        if (! $response->successful() || ! is_array($json) || isset($json['error'])) {
            throw new RuntimeException($this->errorMessage($json));
        }

        return $json;
    }

    private function userData(array $payload, bool $advancedMatching): array
    {
        $user = (array) ($payload['user'] ?? []);
        $data = array_filter([
            'client_ip_address' => $payload['client_ip'] ?? null,
            'client_user_agent' => $payload['user_agent'] ?? null,
            'fbp' => $payload['fbp'] ?? null,
            'fbc' => $payload['fbc'] ?? null,
            'external_id' => $this->hashed($user['id'] ?? $payload['client_id'] ?? null),
        ]);
        if (! $advancedMatching) {
            return $data;
        }

        return array_filter([
            ...$data,
            'em' => $this->hashed($user['email'] ?? null),
            'ph' => $this->hashed($this->phone($user['phone'] ?? null)),
            'fn' => $this->hashed($user['first_name'] ?? null),
            'ln' => $this->hashed($user['last_name'] ?? null),
            'ct' => $this->hashed($user['city'] ?? null),
            'st' => $this->hashed($user['state'] ?? null),
            'zp' => $this->hashed($user['postal_code'] ?? null),
            'country' => $this->hashed($user['country'] ?? null),
        ]);
    }

    private function customData(array $payload): array
    {
        $ecommerce = (array) ($payload['ecommerce'] ?? []);
        $items = collect((array) ($ecommerce['items'] ?? []));
        $firstItem = (array) ($items->first() ?? []);

        return array_filter([
            'currency' => $ecommerce['currency'] ?? null,
            'value' => $ecommerce['value'] ?? null,
            'content_ids' => $items->pluck('item_id')->filter()->values()->all(),
            'content_name' => $payload['content_name'] ?? $firstItem['item_name'] ?? null,
            'content_category' => $payload['content_category'] ?? null,
            'content_type' => $items->isNotEmpty() ? 'product' : null,
            'contents' => $items->map(fn (array $item): array => array_filter([
                'id' => (string) ($item['item_id'] ?? ''),
                'quantity' => (int) ($item['quantity'] ?? 1),
                'item_price' => isset($item['price']) ? (float) $item['price'] : null,
            ]))->all(),
            'num_items' => $items->sum(fn (array $item): int => (int) ($item['quantity'] ?? 1)) ?: null,
            'search_string' => $payload['search_term'] ?? null,
            'order_id' => $payload['transaction_id'] ?? null,
            'coupon' => $ecommerce['coupon'] ?? null,
        ], fn ($value) => $value !== null && $value !== '' && $value !== []);
    }

    private function hashed(mixed $value): ?string
    {
        if (! is_scalar($value) || trim((string) $value) === '') {
            return null;
        }

        return hash('sha256', mb_strtolower(trim((string) $value)));
    }

    private function phone(mixed $value): ?string
    {
        $phone = preg_replace('/\D+/', '', (string) $value);

        return $phone !== '' ? $phone : null;
    }

    private function errorMessage(mixed $body): string
    {
        return Str::limit((string) (data_get($body, 'error.message') ?? data_get($body, 'message') ?? 'Meta rejected the tracking event.'), 1000, '');
    }
}
