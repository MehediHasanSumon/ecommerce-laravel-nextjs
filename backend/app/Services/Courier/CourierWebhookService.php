<?php

namespace App\Services\Courier;

use App\Models\CourierShipment;
use App\Models\CourierWebhookEvent;
use App\Models\Settings\CourierProviderSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CourierWebhookService
{
    public function __construct(private readonly CourierShipmentService $shipments) {}

    public function handlePathao(Request $request): array
    {
        $setting = CourierProviderSetting::query()->where('provider', 'pathao')->where('enabled', true)->first();
        abort_unless($setting, 404);

        $provided = (string) $request->header('X-Pathao-Signature');
        $secret = (string) ($setting->webhook_secret ?: $setting->api_secret);
        $content = (string) $request->getContent();
        $hmacValid = $provided !== '' && $secret !== '' && hash_equals(hash_hmac('sha256', $content, $secret), $provided);
        $plainValid = $provided !== '' && $secret !== '' && hash_equals($secret, $provided);
        abort_unless($hmacValid || $plainValid, 401, 'Invalid webhook signature.');

        $payload = $request->validate([
            'event' => ['required', 'string', 'max:120'],
            'merchant_order_id' => ['required_without:consignment_id', 'nullable', 'string', 'max:191'],
            'consignment_id' => ['required_without:merchant_order_id', 'nullable', 'string', 'max:191'],
            'order_status' => ['nullable', 'string', 'max:191'],
            'delivery_fee' => ['nullable', 'numeric', 'min:0'],
        ]);
        $fingerprint = hash('sha256', json_encode([
            'event' => $payload['event'],
            'merchant_order_id' => $payload['merchant_order_id'] ?? null,
            'consignment_id' => $payload['consignment_id'] ?? null,
            'order_status' => $payload['order_status'] ?? null,
            'event_id' => $request->header('X-Event-ID') ?? $request->input('event_id') ?? null,
        ], JSON_THROW_ON_ERROR));
        $event = CourierWebhookEvent::query()->firstOrCreate(
            ['event_fingerprint' => $fingerprint],
            [
                'public_id' => (string) Str::uuid(),
                'provider' => 'pathao',
                'external_event_id' => isset($payload['consignment_id']) ? (string) $payload['consignment_id'] : null,
                'event_type' => $payload['event'],
                'payload' => $request->all(),
                'status' => 'received',
            ],
        );

        if (! $event->wasRecentlyCreated && $event->processed_at) {
            return ['processed' => false, 'duplicate' => true];
        }

        if ($payload['event'] === 'webhook_integration') {
            $event->update(['status' => 'processed', 'processed_at' => now()]);

            return ['processed' => true, 'integration' => true];
        }

        $shipment = CourierShipment::query()
            ->where('provider', 'pathao')
            ->where(function ($query) use ($payload): void {
                if (isset($payload['consignment_id'])) {
                    $query->where('external_id', (string) $payload['consignment_id']);
                }
                if (! empty($payload['merchant_order_id'])) {
                    $query->orWhere('merchant_order_id', $payload['merchant_order_id']);
                }
            })
            ->latest()
            ->first();

        if (! $shipment) {
            $event->update(['status' => 'ignored', 'processed_at' => now(), 'error_message' => 'No matching shipment.']);

            return ['processed' => false, 'missing_shipment' => true];
        }

        $rawStatus = (string) ($payload['order_status'] ?? $payload['event']);
        $status = $this->normalizePathaoStatus($rawStatus);
        $this->shipments->applyStatus($shipment, [
            'status' => $status,
            'delivery_status' => $status,
            'cod_status' => $this->codStatus($shipment, $payload['event'], $status),
            'raw_status' => $rawStatus,
            'delivery_charge_cents' => isset($payload['delivery_fee'])
                ? (int) round(((float) $payload['delivery_fee']) * 100)
                : null,
            'response' => $request->all(),
            'occurred_at' => now(),
        ], note: 'Pathao webhook status update.');

        $event->update(['status' => 'processed', 'processed_at' => now()]);

        return ['processed' => true, 'shipment_id' => $shipment->public_id];
    }

    private function normalizePathaoStatus(string $status): string
    {
        $status = Str::of($status)->lower()->replace([' ', '-', '.'], '_')->toString();

        return match (true) {
            str_contains($status, 'delivered') && ! str_contains($status, 'partial') => 'delivered',
            str_contains($status, 'returned'), str_contains($status, 'return') => 'returned',
            str_contains($status, 'cancel') => 'cancelled',
            str_contains($status, 'fail'), str_contains($status, 'partial'), str_contains($status, 'hold') => 'failed_delivery',
            str_contains($status, 'picked'), str_contains($status, 'pickup') => 'picked',
            str_contains($status, 'transit'), str_contains($status, 'hub'), str_contains($status, 'delivery'), str_contains($status, 'sorting') => 'in_transit',
            default => 'pending',
        };
    }

    private function codStatus(CourierShipment $shipment, string $event, string $status): string
    {
        if ($shipment->amount_to_collect_cents === 0) {
            return 'not_applicable';
        }
        if ($event === 'order.paid' || $status === 'delivered') {
            return 'collected';
        }

        return $shipment->cod_status;
    }
}
