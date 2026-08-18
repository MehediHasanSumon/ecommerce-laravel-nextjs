<?php

namespace App\Services\Courier;

use App\Exceptions\CourierApiException;
use App\Models\CourierShipment;
use App\Models\Order;
use App\Models\Settings\CourierProviderSetting;

class SteadfastCourierProvider extends AbstractCourierProvider
{
    public function key(): string
    {
        return 'steadfast';
    }

    public function capabilities(): array
    {
        return [
            'create' => true,
            'cancel' => false,
            'track' => true,
            'remote_status' => true,
            'charge' => false,
            'cod_status' => true,
            'locations' => false,
            'stores' => false,
            'label' => false,
            'webhook' => false,
        ];
    }

    public function testConnection(CourierProviderSetting $setting): array
    {
        $response = $this->request($setting, 'test_connection', 'GET', '/get_balance');

        return [
            'connected' => true,
            'balance' => data_get($response, 'current_balance'),
        ];
    }

    public function createShipment(
        CourierProviderSetting $setting,
        Order $order,
        array $options = [],
        ?CourierShipment $shipment = null,
    ): array {
        $address = (array) $order->shipping_address;
        $payload = [
            'invoice' => $order->order_number,
            'recipient_name' => $address['full_name'] ?? $order->user?->name ?? 'Customer',
            'recipient_phone' => $this->phone((string) ($address['phone'] ?? '')),
            'recipient_address' => $this->address($address),
            'cod_amount' => round(((int) ($options['amount_to_collect_cents'] ?? 0)) / 100, 2),
            'note' => $options['special_instruction'] ?? $order->delivery_notes ?? null,
        ];
        $response = $this->request($setting, 'create_shipment', 'POST', '/create_order', $payload, $shipment);
        $consignment = (array) data_get($response, 'consignment', []);

        return [
            'external_id' => (string) ($consignment['consignment_id'] ?? ''),
            'tracking_number' => (string) ($consignment['tracking_code'] ?? $consignment['consignment_id'] ?? ''),
            'status' => 'pending',
            'delivery_status' => 'pending',
            'cod_status' => ((int) ($options['amount_to_collect_cents'] ?? 0)) > 0 ? 'pending' : 'not_applicable',
            'raw_status' => (string) ($consignment['status'] ?? 'pending'),
            'tracking_url' => null,
            'delivery_charge_cents' => $this->moneyToCents($consignment['delivery_charge'] ?? null),
            'payload' => $payload,
            'response' => $response,
        ];
    }

    public function trackShipment(CourierProviderSetting $setting, CourierShipment $shipment): array
    {
        $response = $this->request(
            $setting,
            'track_shipment',
            'GET',
            '/status_by_cid/'.rawurlencode((string) $shipment->external_id),
            shipment: $shipment,
        );
        $raw = mb_strtolower((string) data_get($response, 'delivery_status', 'pending'));
        $status = $this->normalizeStatus($raw);

        return [
            'status' => $status,
            'delivery_status' => $status,
            'cod_status' => $status === 'delivered' && $shipment->amount_to_collect_cents > 0
                ? 'collected'
                : $shipment->cod_status,
            'raw_status' => $raw,
            'response' => $response,
            'occurred_at' => now(),
        ];
    }

    private function request(
        CourierProviderSetting $setting,
        string $operation,
        string $method,
        string $path,
        array $payload = [],
        ?CourierShipment $shipment = null,
    ): array {
        return $this->http->request(
            $setting,
            $operation,
            $method,
            $this->baseUrl($setting).$path,
            $payload,
            [
                'Api-Key' => (string) $setting->api_key,
                'Secret-Key' => (string) $setting->api_secret,
            ],
            $shipment,
        );
    }

    private function normalizeStatus(string $status): string
    {
        $normalized = strtolower(trim($status));

        return match ($normalized) {
            'delivered' => 'delivered',
            'cancelled', 'cancelled_approval_pending' => 'cancelled',
            'return', 'returned' => 'returned',
            'partial_delivered', 'partial_delivered_approval_pending', 'unknown', 'unknown_approval_pending' => 'failed_delivery',
            'picked_up' => 'picked',
            'hold', 'in_review', 'delivered_approval_pending', 'in_transit' => 'in_transit',
            default => 'pending',
        };
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
}
