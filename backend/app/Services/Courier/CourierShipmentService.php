<?php

namespace App\Services\Courier;

use App\Jobs\CreateCourierShipment;
use App\Jobs\SyncCourierShipment;
use App\Models\CourierShipment;
use App\Models\CourierShipmentEvent;
use App\Models\Order;
use App\Models\ShippingLog;
use App\Services\Admin\Settings\CourierSettingsService;
use App\Services\Orders\OrderService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CourierShipmentService
{
    public const STATUSES = ['pending', 'picked', 'in_transit', 'delivered', 'returned', 'cancelled', 'failed_delivery'];

    public const COD_STATUSES = ['pending', 'collected', 'settled', 'failed', 'not_applicable'];

    public function __construct(
        private readonly CourierManager $manager,
        private readonly CourierSettingsService $settings,
        private readonly OrderService $orders,
        private readonly CourierNotificationService $notifications,
    ) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = CourierShipment::query()
            ->with([
                'order:id,order_number,user_id,guest_customer_id,billing_address,total_cents,currency',
                'order.user:id,name,email,phone',
                'order.guestCustomer:id,name,email,phone',
            ])
            ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                $escaped = '%'.addcslashes(trim($search), '\\%_').'%';
                $query->where(fn (Builder $builder) => $builder
                    ->where('tracking_number', 'like', $escaped)
                    ->orWhere('external_id', 'like', $escaped)
                    ->orWhere('merchant_order_id', 'like', $escaped)
                    ->orWhereHas('order', fn (Builder $order) => $order->where('order_number', 'like', $escaped)));
            })
            ->when($filters['provider'] ?? null, fn (Builder $query, string $provider) => $query->where('provider', $provider))
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['cod_status'] ?? null, fn (Builder $query, string $status) => $query->where('cod_status', $status))
            ->when($filters['date_from'] ?? null, fn (Builder $query, string $date) => $query->whereDate('shipment_created_at', '>=', $date))
            ->when($filters['date_to'] ?? null, fn (Builder $query, string $date) => $query->whereDate('shipment_created_at', '<=', $date));

        $sort = in_array($filters['sort'] ?? '', ['merchant_order_id', 'provider', 'status', 'cod_status', 'delivery_charge_cents', 'shipment_created_at', 'last_synced_at', 'created_at'], true)
            ? $filters['sort']
            : 'created_at';
        $direction = ($filters['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';

        return $query->orderBy($sort, $direction)
            ->paginate(min(max((int) ($filters['per_page'] ?? 20), 1), 100));
    }

    public function find(string|int $shipment): CourierShipment
    {
        $query = CourierShipment::query()
            ->with([
                'order.user:id,name,email,phone',
                'order.guestCustomer:id,name,email,phone',
                'events' => fn ($query) => $query->latest('occurred_at'),
                'apiLogs' => fn ($query) => $query->latest()->limit(100),
            ]);

        return is_numeric($shipment)
            ? $query->whereKey((int) $shipment)->firstOrFail()
            : $query->where('public_id', $shipment)->firstOrFail();
    }

    public function create(Order $order, string $provider, array $options = [], ?int $userId = null): CourierShipment
    {
        $setting = $this->settings->findEnabled($provider);
        $adapter = $this->manager->provider($provider);
        abort_unless($adapter->capabilities()['create'] ?? false, 422, 'This courier does not support shipment creation.');

        $shipment = DB::transaction(function () use ($order, $provider, $setting, $options): CourierShipment {
            $lockedOrder = Order::query()->lockForUpdate()->with('items')->findOrFail($order->id);
            $existing = CourierShipment::query()
                ->where('order_id', $lockedOrder->id)
                ->whereNotIn('status', ['cancelled', 'returned', 'failed_delivery'])
                ->lockForUpdate()
                ->latest()
                ->first();
            if ($existing) {
                throw ValidationException::withMessages([
                    'order' => ['This order already has an active courier shipment.'],
                ]);
            }

            return CourierShipment::query()->create([
                'public_id' => (string) Str::uuid(),
                'order_id' => $lockedOrder->id,
                'courier_provider_setting_id' => $setting->id,
                'provider' => $provider,
                'merchant_order_id' => $lockedOrder->order_number,
                'status' => 'pending',
                'delivery_status' => 'pending',
                'cod_status' => 'pending',
                'parcel_type' => (string) ($options['parcel_type'] ?? $setting->default_parcel_type),
                'delivery_type' => (string) ($options['delivery_type'] ?? $setting->default_delivery_type),
                'payment_type' => (string) ($options['payment_type'] ?? $setting->default_payment_type),
                'item_description' => (string) ($options['item_description'] ?? $setting->default_item_description),
                'weight' => max(0.1, (float) ($options['weight'] ?? $setting->default_weight)),
                'amount_to_collect_cents' => $this->codAmount($lockedOrder, $setting, $options),
                'provider_payload' => $options ?: null,
            ]);
        }, 3);

        try {
            $result = $adapter->createShipment(
                $setting,
                $order->fresh(['items', 'user']),
                [
                    ...$options,
                    'amount_to_collect_cents' => $shipment->amount_to_collect_cents,
                    'weight' => $shipment->weight,
                ],
                $shipment,
            );
            $shipment->forceFill([
                'external_id' => $result['external_id'] ?: null,
                'tracking_number' => $result['tracking_number'] ?: null,
                'status' => $result['status'] ?? 'pending',
                'delivery_status' => $result['delivery_status'] ?? 'pending',
                'cod_status' => $result['cod_status'] ?? $shipment->cod_status,
                'raw_status' => $result['raw_status'] ?? null,
                'tracking_url' => $result['tracking_url'] ?? null,
                'label_url' => $result['label_url'] ?? null,
                'delivery_charge_cents' => $result['delivery_charge_cents'] ?? null,
                'provider_payload' => $result['payload'] ?? $shipment->provider_payload,
                'provider_response' => $result['response'] ?? null,
                'shipment_created_at' => now(),
                'last_synced_at' => now(),
                'last_error' => null,
            ])->save();
            $this->recordEvent($shipment, $shipment->status, $shipment->raw_status, 'Shipment created', 'Shipment created with '.$adapter->label(), $result['response'] ?? []);
            $this->writeShippingLog($shipment, $userId, 'Courier shipment created.');

            return $this->find($shipment->public_id);
        } catch (\Throwable $exception) {
            $shipment->forceFill([
                'status' => 'failed_delivery',
                'delivery_status' => 'failed_delivery',
                'last_error' => Str::limit($exception->getMessage(), 5000, ''),
                'retry_count' => $shipment->retry_count + 1,
            ])->save();
            $this->recordEvent($shipment, 'failed_delivery', null, 'Shipment creation failed', $exception->getMessage());
            throw $exception;
        }
    }

    public function sync(CourierShipment $shipment, ?int $userId = null): CourierShipment
    {
        if (in_array($shipment->status, ['delivered', 'returned', 'cancelled'], true)) {
            return $this->find($shipment->public_id);
        }

        $setting = $shipment->setting ?: $this->settings->findEnabled($shipment->provider);
        $provider = $this->manager->provider($shipment->provider);
        abort_unless($provider->capabilities()['remote_status'] ?? false, 422, 'Remote status synchronization is not supported by this courier.');

        $result = $provider->trackShipment($setting, $shipment);
        $this->applyStatus($shipment, $result, $userId, 'Courier status synchronized.');

        return $this->find($shipment->public_id);
    }

    public function cancel(CourierShipment $shipment, ?int $userId = null): CourierShipment
    {
        abort_if(in_array($shipment->status, ['delivered', 'returned', 'cancelled'], true), 422, 'This shipment can no longer be cancelled.');
        $setting = $shipment->setting ?: $this->settings->findEnabled($shipment->provider);
        $provider = $this->manager->provider($shipment->provider);
        abort_unless($provider->capabilities()['cancel'] ?? false, 422, 'Cancellation is not supported by this courier.');

        $result = $provider->cancelShipment($setting, $shipment);
        $this->applyStatus($shipment, $result, $userId, 'Courier shipment cancelled.');

        return $this->find($shipment->public_id);
    }

    public function applyStatus(CourierShipment $shipment, array $result, ?int $userId = null, ?string $note = null): void
    {
        $previous = $shipment->status;
        $previousRaw = $shipment->raw_status;
        $previousCod = $shipment->cod_status;
        $status = in_array($result['status'] ?? '', self::STATUSES, true) ? $result['status'] : 'pending';
        $shipment->forceFill([
            'status' => $status,
            'delivery_status' => $result['delivery_status'] ?? $status,
            'cod_status' => $result['cod_status'] ?? $shipment->cod_status,
            'raw_status' => $result['raw_status'] ?? $shipment->raw_status,
            'delivery_charge_cents' => $result['delivery_charge_cents'] ?? $shipment->delivery_charge_cents,
            'estimated_delivery_at' => $result['estimated_delivery_at'] ?? $shipment->estimated_delivery_at,
            'provider_response' => $result['response'] ?? $shipment->provider_response,
            'last_synced_at' => now(),
            'delivered_at' => $status === 'delivered' ? ($shipment->delivered_at ?: now()) : $shipment->delivered_at,
            'cancelled_at' => $status === 'cancelled' ? ($shipment->cancelled_at ?: now()) : $shipment->cancelled_at,
            'last_error' => null,
        ])->save();

        if (
            $previous !== $status
            || ($result['raw_status'] ?? $previousRaw) !== $previousRaw
            || ($result['cod_status'] ?? $previousCod) !== $previousCod
        ) {
            $this->recordEvent(
                $shipment,
                $status,
                $result['raw_status'] ?? null,
                'Shipment '.Str::headline($status),
                $note,
                $result['response'] ?? [],
                $result['occurred_at'] ?? now(),
            );
        }

        if ($previous !== $status) {
            $this->writeShippingLog($shipment, $userId, $note);
            $this->notifications->queueStatusEmail($shipment->loadMissing('order.user'));
        }
    }

    public function dispatchBulkCreate(array $orderIds, string $provider, array $options = [], ?int $userId = null): int
    {
        $numericIds = collect($orderIds)->filter(fn ($id): bool => is_numeric($id))->map(fn ($id): int => (int) $id);
        $orderNumbers = collect($orderIds)->reject(fn ($id): bool => is_numeric($id))->map(fn ($id): string => (string) $id);
        $ids = Order::query()
            ->where(function (Builder $query) use ($numericIds, $orderNumbers): void {
                if ($numericIds->isNotEmpty()) {
                    $query->whereIn('id', $numericIds);
                }
                if ($orderNumbers->isNotEmpty()) {
                    $numericIds->isNotEmpty()
                        ? $query->orWhereIn('order_number', $orderNumbers)
                        : $query->whereIn('order_number', $orderNumbers);
                }
            })
            ->pluck('id');
        $ids->each(fn ($id) => CreateCourierShipment::dispatch((int) $id, $provider, $options, $userId)->afterCommit());

        return $ids->count();
    }

    public function dispatchBulkSync(array $shipmentIds, ?int $userId = null): int
    {
        $numericIds = collect($shipmentIds)->filter(fn ($id): bool => is_numeric($id))->map(fn ($id): int => (int) $id);
        $publicIds = collect($shipmentIds)->reject(fn ($id): bool => is_numeric($id))->map(fn ($id): string => (string) $id);
        $ids = CourierShipment::query()
            ->where(function (Builder $query) use ($numericIds, $publicIds): void {
                if ($numericIds->isNotEmpty()) {
                    $query->whereIn('id', $numericIds);
                }
                if ($publicIds->isNotEmpty()) {
                    $numericIds->isNotEmpty()
                        ? $query->orWhereIn('public_id', $publicIds)
                        : $query->whereIn('public_id', $publicIds);
                }
            })
            ->pluck('id');
        $ids->each(fn ($id) => SyncCourierShipment::dispatch((int) $id, $userId)->afterCommit());

        return $ids->count();
    }

    private function codAmount(Order $order, $setting, array $options): int
    {
        if (array_key_exists('amount_to_collect', $options)) {
            return max(0, (int) round(((float) $options['amount_to_collect']) * 100));
        }

        return match ($setting->cod_amount_rule) {
            'order_total' => (int) $order->total_cents,
            'zero' => 0,
            'custom' => (int) $setting->custom_cod_amount_cents,
            default => $order->payment_status === 'paid' ? 0 : (int) $order->total_cents,
        };
    }

    private function recordEvent(
        CourierShipment $shipment,
        string $status,
        ?string $rawStatus,
        string $title,
        ?string $description = null,
        array $payload = [],
        mixed $occurredAt = null,
    ): void {
        $occurredAt = $occurredAt ? Carbon::parse($occurredAt) : now();
        $fingerprint = hash('sha256', implode('|', [
            $shipment->id,
            $status,
            $rawStatus,
            $title,
            hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR)),
        ]));

        CourierShipmentEvent::query()->firstOrCreate(
            ['event_fingerprint' => $fingerprint],
            [
                'courier_shipment_id' => $shipment->id,
                'status' => $status,
                'raw_status' => $rawStatus,
                'title' => $title,
                'description' => $description,
                'payload' => $payload ?: null,
                'occurred_at' => $occurredAt,
            ],
        );
    }

    private function writeShippingLog(CourierShipment $shipment, ?int $userId, ?string $note): void
    {
        $orderStatus = $this->orderShippingStatus($shipment->status);
        ShippingLog::query()->create([
            'order_id' => $shipment->order_id,
            'user_id' => $userId,
            'status' => $orderStatus,
            'courier' => $this->manager->provider($shipment->provider)->label(),
            'tracking_number' => $shipment->tracking_number,
            'tracking_url' => $shipment->tracking_url,
            'note' => $note,
            'shipped_at' => in_array($orderStatus, ['shipped', 'in_transit', 'delivered'], true) ? now() : null,
            'delivered_at' => $orderStatus === 'delivered' ? now() : null,
        ]);

        $order = Order::query()->find($shipment->order_id);
        if ($order && $order->shipping_status !== $orderStatus) {
            $this->orders->updateStatuses($order, ['shipping_status' => $orderStatus, 'note' => $note], $userId);
        }
    }

    private function orderShippingStatus(string $status): string
    {
        return match ($status) {
            'picked' => 'picked',
            'in_transit' => 'in_transit',
            'delivered' => 'delivered',
            'returned' => 'returned',
            'cancelled' => 'cancelled',
            'failed_delivery' => 'failed_delivery',
            default => 'pending',
        };
    }
}
