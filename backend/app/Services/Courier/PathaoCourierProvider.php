<?php

namespace App\Services\Courier;

use App\Exceptions\CourierApiException;
use App\Models\CourierShipment;
use App\Models\Order;
use App\Models\Settings\CourierProviderSetting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class PathaoCourierProvider extends AbstractCourierProvider
{
    public function key(): string
    {
        return 'pathao';
    }

    public function capabilities(): array
    {
        return [
            'create' => true,
            'cancel' => true,
            'track' => true,
            'remote_status' => true,
            'charge' => true,
            'cod_status' => true,
            'locations' => true,
            'stores' => true,
            'label' => false,
            'webhook' => true,
        ];
    }

    public function testConnection(CourierProviderSetting $setting): array
    {
        $response = $this->authorizedRequest($setting, 'test_connection', 'GET', '/user/short-info');

        return [
            'connected' => true,
            'merchant' => data_get($response, 'data'),
        ];
    }

    public function createShipment(
        CourierProviderSetting $setting,
        Order $order,
        array $options = [],
        ?CourierShipment $shipment = null,
    ): array {
        $address = (array) $order->shipping_address;
        $locations = $this->resolveLocations($setting, $address, $options);
        $payload = [
            'store_id' => (int) ($options['store_id'] ?? $setting->default_store_id),
            'merchant_order_id' => $order->order_number,
            'recipient_name' => Str::limit(strip_tags((string) ($address['full_name'] ?? $order->user?->name ?? 'Customer')), 100, ''),
            'recipient_phone' => $this->phone((string) ($address['phone'] ?? '')),
            'recipient_secondary_phone' => '',
            'recipient_address' => Str::limit($this->address($address), 220, ''),
            'recipient_city' => $locations['city_id'],
            'recipient_zone' => $locations['zone_id'],
            'recipient_area' => $locations['area_id'],
            'delivery_type' => (int) ($options['delivery_type'] ?? $setting->default_delivery_type ?: 48),
            'item_type' => (int) ($options['parcel_type'] ?? $setting->default_parcel_type ?: 2),
            'special_instruction' => Str::limit(strip_tags((string) ($options['special_instruction'] ?? $order->delivery_notes ?? '')), 500, ''),
            'item_quantity' => max(1, (int) $order->items->sum('quantity')),
            'item_weight' => max(0.5, (float) ($options['weight'] ?? $setting->default_weight)),
            'item_description' => Str::limit(strip_tags((string) ($options['item_description'] ?? $setting->default_item_description ?? $this->items($order))), 500, ''),
            'amount_to_collect' => (int) round(((int) ($options['amount_to_collect_cents'] ?? 0)) / 100),
        ];
        $response = $this->authorizedRequest($setting, 'create_shipment', 'POST', '/orders', $payload, $shipment);
        $data = (array) data_get($response, 'data', []);
        $externalId = (string) ($data['consignment_id'] ?? $data['order_id'] ?? '');

        if ($externalId === '') {
            throw new CourierApiException('Pathao accepted the request but did not return a consignment ID.', 502, $response);
        }

        return [
            'external_id' => $externalId,
            'tracking_number' => $externalId,
            'status' => 'pending',
            'delivery_status' => 'pending',
            'cod_status' => ((int) $payload['amount_to_collect']) > 0 ? 'pending' : 'not_applicable',
            'raw_status' => (string) ($data['order_status'] ?? 'Order_Created'),
            'tracking_url' => $this->safeHttpsUrl($data['tracking_url'] ?? null),
            'label_url' => $this->safeHttpsUrl($data['label_url'] ?? null),
            'delivery_charge_cents' => $this->moneyToCents($data['delivery_fee'] ?? null),
            'payload' => $payload,
            'response' => $response,
        ];
    }

    public function trackShipment(CourierProviderSetting $setting, CourierShipment $shipment): array
    {
        $response = $this->authorizedRequest(
            $setting,
            'track_shipment',
            'GET',
            '/orders/'.rawurlencode((string) $shipment->external_id).'/info',
            shipment: $shipment,
        );
        $data = (array) data_get($response, 'data', $response);
        $raw = (string) ($data['order_status'] ?? $data['status'] ?? $shipment->raw_status);
        $status = $this->normalizeStatus($raw);

        return [
            'status' => $status,
            'delivery_status' => $status,
            'cod_status' => $this->codStatus($data, $status, $shipment),
            'raw_status' => $raw,
            'delivery_charge_cents' => $this->moneyToCents($data['delivery_fee'] ?? null),
            'estimated_delivery_at' => $data['estimated_delivery_date'] ?? null,
            'response' => $response,
            'occurred_at' => $data['updated_at'] ?? now(),
        ];
    }

    public function cancelShipment(CourierProviderSetting $setting, CourierShipment $shipment): array
    {
        $response = $this->authorizedRequest(
            $setting,
            'cancel_shipment',
            'POST',
            '/orders/'.rawurlencode((string) $shipment->external_id).'/cancel',
            shipment: $shipment,
        );

        return [
            'status' => 'cancelled',
            'delivery_status' => 'cancelled',
            'raw_status' => (string) data_get($response, 'data.order_status', 'Pickup_Cancelled'),
            'response' => $response,
            'occurred_at' => now(),
        ];
    }

    public function calculateCharge(CourierProviderSetting $setting, array $payload): array
    {
        $request = [
            'store_id' => (int) ($payload['store_id'] ?? $setting->default_store_id),
            'item_type' => (int) ($payload['item_type'] ?? $setting->default_parcel_type ?: 2),
            'delivery_type' => (int) ($payload['delivery_type'] ?? $setting->default_delivery_type ?: 48),
            'item_weight' => max(0.5, (float) ($payload['item_weight'] ?? $setting->default_weight)),
            'recipient_city' => (int) ($payload['recipient_city'] ?? 0),
            'recipient_zone' => (int) ($payload['recipient_zone'] ?? 0),
        ];
        $response = $this->authorizedRequest($setting, 'calculate_charge', 'POST', '/merchant/price-plan', $request);
        $data = (array) data_get($response, 'data', []);

        return [
            'delivery_charge_cents' => $this->moneyToCents($data['price'] ?? $data['delivery_charge'] ?? 0) ?? 0,
            'cod_charge_cents' => $this->moneyToCents($data['cod_charge'] ?? 0) ?? 0,
            'weight_charge_cents' => $this->moneyToCents($data['weight_charge'] ?? 0) ?? 0,
            'zone_charge_cents' => $this->moneyToCents($data['zone_charge'] ?? 0) ?? 0,
            'return_charge_cents' => $this->moneyToCents($data['return_charge'] ?? 0) ?? 0,
            'response' => $response,
        ];
    }

    public function stores(CourierProviderSetting $setting): array
    {
        return $this->cached($setting, 'stores', fn (): array => $this->itemsFrom(
            $this->authorizedRequest($setting, 'stores', 'GET', '/stores')
        ));
    }

    public function cities(CourierProviderSetting $setting): array
    {
        return $this->cached($setting, 'cities', fn (): array => $this->itemsFrom(
            $this->authorizedRequest($setting, 'cities', 'GET', '/countries/1/city-list')
        ));
    }

    public function zones(CourierProviderSetting $setting, int $cityId): array
    {
        return $this->cached($setting, "zones.{$cityId}", fn (): array => $this->itemsFrom(
            $this->authorizedRequest($setting, 'zones', 'GET', "/cities/{$cityId}/zone-list")
        ));
    }

    public function areas(CourierProviderSetting $setting, int $zoneId): array
    {
        return $this->cached($setting, "areas.{$zoneId}", fn (): array => $this->itemsFrom(
            $this->authorizedRequest($setting, 'areas', 'GET', "/zones/{$zoneId}/area-list")
        ));
    }

    private function authorizedRequest(
        CourierProviderSetting $setting,
        string $operation,
        string $method,
        string $path,
        array $payload = [],
        ?CourierShipment $shipment = null,
    ): array {
        $token = $this->token($setting);

        try {
            return $this->http->request(
                $setting,
                $operation,
                $method,
                $this->baseUrl($setting).$path,
                $payload,
                ['Authorization' => 'Bearer '.$token, 'Source' => 'ecommerce'],
                $shipment,
            );
        } catch (CourierApiException $exception) {
            if ($exception->statusCode !== 401) {
                throw $exception;
            }

            $setting->forceFill(['access_token' => null, 'token_expires_at' => null])->save();
            $token = $this->token($setting->refresh());

            return $this->http->request(
                $setting,
                $operation,
                $method,
                $this->baseUrl($setting).$path,
                $payload,
                ['Authorization' => 'Bearer '.$token, 'Source' => 'ecommerce'],
                $shipment,
            );
        }
    }

    private function token(CourierProviderSetting $setting): string
    {
        if ($setting->access_token && $setting->token_expires_at?->isAfter(now()->addMinutes(2))) {
            return (string) $setting->access_token;
        }

        return Cache::lock("courier.pathao.token.{$setting->id}", 20)->block(10, function () use ($setting): string {
            $setting->refresh();
            if ($setting->access_token && $setting->token_expires_at?->isAfter(now()->addMinutes(2))) {
                return (string) $setting->access_token;
            }

            $response = $this->http->request(
                $setting,
                'authenticate',
                'POST',
                $this->baseUrl($setting).'/external/login',
                [
                    'client_id' => (string) $setting->api_key,
                    'client_secret' => (string) $setting->api_secret,
                ],
            );
            $token = (string) data_get($response, 'access_token', '');
            if ($token === '') {
                throw new CourierApiException('Pathao authentication did not return an access token.', 502, $response);
            }

            $setting->forceFill([
                'access_token' => $token,
                'refresh_token' => data_get($response, 'refresh_token'),
                'token_expires_at' => now()->addSeconds(max(300, (int) data_get($response, 'expires_in', 3600))),
            ])->save();

            return $token;
        });
    }

    private function resolveLocations(CourierProviderSetting $setting, array $address, array $options): array
    {
        $cityId = (int) ($options['city_id'] ?? 0);
        $zoneId = (int) ($options['zone_id'] ?? 0);
        $areaId = (int) ($options['area_id'] ?? 0);

        if ($cityId <= 0) {
            $city = $this->findByName($this->cities($setting), [
                $address['city'] ?? null,
                $address['district'] ?? null,
                $address['state'] ?? null,
            ], ['city_name', 'name']);
            $cityId = (int) ($city['city_id'] ?? $city['id'] ?? 0);
        }
        if ($cityId <= 0) {
            throw new CourierApiException('Pathao city could not be matched from the shipping address. Select a city before creating the shipment.', 422);
        }

        if ($zoneId <= 0) {
            $zone = $this->findByName($this->zones($setting, $cityId), [
                $address['area'] ?? null,
                $address['city'] ?? null,
                $address['district'] ?? null,
            ], ['zone_name', 'name']);
            $zoneId = (int) ($zone['zone_id'] ?? $zone['id'] ?? 0);
        }
        if ($zoneId <= 0) {
            throw new CourierApiException('Pathao zone could not be matched from the shipping address. Select a zone before creating the shipment.', 422);
        }

        if ($areaId <= 0) {
            $area = $this->findByName($this->areas($setting, $zoneId), [
                $address['area'] ?? null,
                $address['address_line'] ?? null,
            ], ['area_name', 'name']);
            $areaId = (int) ($area['area_id'] ?? $area['id'] ?? 0);
        }

        return ['city_id' => $cityId, 'zone_id' => $zoneId, 'area_id' => $areaId ?: null];
    }

    private function findByName(array $items, array $values, array $nameKeys): array
    {
        $needles = collect($values)
            ->filter()
            ->map(fn ($value): string => Str::of((string) $value)->ascii()->lower()->squish()->toString());

        return collect($items)->first(function (array $item) use ($needles, $nameKeys): bool {
            $name = collect($nameKeys)->map(fn ($key) => data_get($item, $key))->filter()->first();
            $normalized = Str::of((string) $name)->ascii()->lower()->squish()->toString();

            return $needles->contains(fn (string $needle): bool => $needle !== '' && (
                $normalized === $needle || str_contains($normalized, $needle) || str_contains($needle, $normalized)
            ));
        }, []) ?: [];
    }

    private function normalizeStatus(string $status): string
    {
        $status = Str::of($status)->lower()->replace([' ', '-'], '_')->toString();

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

    private function codStatus(array $data, string $status, CourierShipment $shipment): string
    {
        $raw = mb_strtolower((string) ($data['payment_status'] ?? $data['cod_status'] ?? ''));
        if (str_contains($raw, 'paid') || str_contains($raw, 'collect')) {
            return 'collected';
        }
        if ($shipment->amount_to_collect_cents === 0) {
            return 'not_applicable';
        }

        return $status === 'delivered' ? 'collected' : $shipment->cod_status;
    }

    private function itemsFrom(array $response): array
    {
        $items = data_get($response, 'data.data', data_get($response, 'data', []));

        return is_array($items) ? array_values($items) : [];
    }

    private function cached(CourierProviderSetting $setting, string $suffix, callable $callback): array
    {
        return Cache::remember(
            "courier.pathao.{$setting->id}.{$setting->updated_at?->timestamp}.{$suffix}",
            now()->addSeconds((int) config('couriers.location_cache_seconds', 86400)),
            $callback,
        );
    }

    private function phone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?: '';
        if (str_starts_with($digits, '880')) {
            $digits = '0'.substr($digits, 3);
        } elseif (strlen($digits) === 10 && str_starts_with($digits, '1')) {
            $digits = '0'.$digits;
        }

        if (! preg_match('/^01[3-9][0-9]{8}$/', $digits)) {
            throw new CourierApiException('The shipping address must contain a valid Bangladesh mobile number.', 422);
        }

        return $digits;
    }

    private function address(array $address): string
    {
        return collect([
            $address['address_line'] ?? null,
            $address['area'] ?? null,
            $address['city'] ?? null,
            $address['district'] ?? null,
            $address['state'] ?? null,
            $address['postal_code'] ?? null,
        ])->filter()->implode(', ');
    }

    private function items(Order $order): string
    {
        return $order->items
            ->map(fn ($item): string => $item->product_name.' x '.$item->quantity)
            ->implode(', ');
    }
}
