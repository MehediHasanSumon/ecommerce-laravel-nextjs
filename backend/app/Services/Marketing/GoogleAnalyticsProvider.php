<?php

namespace App\Services\Marketing;

use App\Contracts\Marketing\MarketingTrackingProvider;
use App\Models\MarketingTrackingEvent;
use App\Models\Settings\GoogleAnalyticsSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class GoogleAnalyticsProvider implements MarketingTrackingProvider
{
    private const EVENT_NAMES = [
        'view_content' => 'view_item',
        'view_category' => 'view_item_list',
        'view_brand' => 'view_item_list',
        'view_collection' => 'view_item_list',
        'complete_registration' => 'sign_up',
        'subscribe' => 'generate_lead',
        'lead' => 'generate_lead',
    ];

    public function key(): string
    {
        return 'google';
    }

    public function send(MarketingTrackingEvent $event, bool $test = false): array
    {
        $setting = GoogleAnalyticsSetting::query()->firstOrFail();
        if (! $setting->measurement_id || ! $setting->api_secret) {
            throw new RuntimeException('GA4 Measurement ID and Measurement Protocol API secret are required.');
        }

        $data = (array) $event->payload;
        $endpoint = ($test || $setting->debug_mode)
            ? (string) config('marketing.google.debug_url')
            : (string) config('marketing.google.collect_url');
        $ecommerce = $setting->enhanced_ecommerce ? (array) ($data['ecommerce'] ?? []) : [];
        $params = array_filter([
            'session_id' => $data['session_id'] ?? null,
            'engagement_time_msec' => (int) ($data['engagement_time_msec'] ?? 1),
            'page_location' => $data['event_url'] ?? null,
            'page_title' => $data['page_title'] ?? null,
            'search_term' => $data['search_term'] ?? null,
            'transaction_id' => $data['transaction_id'] ?? null,
            ...$ecommerce,
        ], fn ($value) => $value !== null && $value !== '');
        if ($setting->debug_mode) {
            $params['debug_mode'] = true;
        }

        $body = [
            'client_id' => (string) ($data['client_id'] ?? $event->event_id),
            'events' => [[
                'name' => self::EVENT_NAMES[$event->event_name] ?? $event->event_name,
                'params' => $params,
            ]],
        ];
        if ($test || $setting->debug_mode) {
            $body['validation_behavior'] = 'ENFORCE_RECOMMENDATIONS';
        }
        if ($setting->user_id_tracking && filled(data_get($data, 'user.id'))) {
            $body['user_id'] = (string) data_get($data, 'user.id');
        }

        $response = Http::acceptJson()
            ->asJson()
            ->connectTimeout(3)
            ->timeout((int) config('marketing.google.timeout', 8))
            ->retry(2, 250, throw: false)
            ->post($endpoint.'?'.http_build_query([
                'measurement_id' => $setting->measurement_id,
                'api_secret' => $setting->api_secret,
            ]), $body);
        $json = $response->json();
        if (! $response->successful()) {
            throw new RuntimeException(Str::limit((string) (data_get($json, 'validationMessages.0.description') ?? 'Google Analytics rejected the tracking event.'), 1000, ''));
        }
        if (($test || $setting->debug_mode) && (array) data_get($json, 'validationMessages', []) !== []) {
            throw new RuntimeException(Str::limit((string) data_get($json, 'validationMessages.0.description', 'GA4 validation failed.'), 1000, ''));
        }

        return is_array($json) ? $json : ['accepted' => true];
    }
}
