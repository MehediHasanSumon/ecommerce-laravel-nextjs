<?php

namespace App\Services\Orders;

use App\Models\Order;
use App\Models\OrderRefund;
use App\Models\OrderStatusHistory;
use App\Models\PaymentTransaction;
use App\Models\ShippingLog;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'packed', 'ready_for_shipment', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'];
    public const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded'];
    public const SHIPPING_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'returned'];

    public function paginate(array $filters, ?int $userId = null, ?string $guestToken = null): LengthAwarePaginator
    {
        $query = Order::query()
            ->with(['user:id,name,email', 'transactions' => fn ($query) => $query->latest()->limit(1)])
            ->withCount('items');

        if ($userId) {
            $query->where('user_id', $userId);
        } elseif ($guestToken) {
            $query->where('guest_token', $guestToken);
        }

        $this->applyFilters($query, $filters);

        $sort = in_array($filters['sort'] ?? '', ['order_number', 'status', 'payment_status', 'shipping_status', 'payment_method', 'shipping_method_name', 'total_cents', 'placed_at', 'created_at'], true)
            ? $filters['sort']
            : 'created_at';
        $direction = ($filters['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $perPage = min(max((int) ($filters['per_page'] ?? 10), 1), 100);

        return $query->orderBy($sort, $direction)->paginate($perPage);
    }

    public function findVisible(string $orderNumber, Request $request): Order
    {
        $guestToken = (string) $request->header('X-Guest-Token');
        abort_unless($request->user() || $guestToken !== '', 404);

        return $this->detailQuery()
            ->where('order_number', $orderNumber)
            ->where(function (Builder $query) use ($request, $guestToken): void {
                if ($request->user()) {
                    $query->where('user_id', $request->user()->id);
                }
                if ($guestToken !== '') {
                    $query->orWhere('guest_token', $guestToken);
                }
            })
            ->firstOrFail();
    }

    public function findAdmin(string|int $id): Order
    {
        return $this->detailQuery()
            ->where(fn (Builder $query) => $query->where('id', $id)->orWhere('order_number', $id))
            ->firstOrFail();
    }

    public function updateStatuses(Order $order, array $data, ?int $userId = null): Order
    {
        foreach (['status' => self::ORDER_STATUSES, 'payment_status' => self::PAYMENT_STATUSES, 'shipping_status' => self::SHIPPING_STATUSES] as $field => $allowed) {
            if (! array_key_exists($field, $data) || $data[$field] === $order->{$field}) {
                continue;
            }

            if (! in_array($data[$field], $allowed, true)) {
                throw ValidationException::withMessages([$field => ['Invalid status value.']]);
            }

            $from = $order->{$field};
            $order->update([$field => $data[$field]]);
            $this->record($order->fresh(), $this->historyType($field), $data[$field], $from, $this->titleFor($field, $data[$field]), $data['note'] ?? null, [], $userId);
        }

        if (array_key_exists('admin_notes', $data)) {
            $order->update(['admin_notes' => $data['admin_notes']]);
        }

        return $this->findAdmin($order->id);
    }

    public function record(Order $order, string $type, string $toStatus, ?string $fromStatus, string $title, ?string $note = null, array $payload = [], ?int $userId = null): OrderStatusHistory
    {
        return OrderStatusHistory::query()->create([
            'order_id' => $order->id,
            'user_id' => $userId,
            'type' => $type,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'title' => $title,
            'note' => $note,
            'payload' => $payload ?: null,
        ]);
    }

    public function syncPayment(Order $order, PaymentTransaction $transaction, string $status, ?string $note = null): void
    {
        $from = $order->payment_status;
        if ($from !== $status) {
            $order->update(['payment_status' => $status]);
        }

        $this->record($order->fresh(), 'payment', $status, $from, $status === 'paid' ? 'Payment completed' : 'Payment '.$status, $note, [
            'gateway' => $transaction->gateway,
            'transaction_id' => $transaction->gateway_transaction_id,
        ]);
    }

    private function detailQuery(): Builder
    {
        return Order::query()->with([
            'user:id,name,email',
            'items.product:id,name,slug',
            'items.product.images:id,product_id,url,is_primary,sort_order',
            'items.variant:id,sku',
            'transactions' => fn ($query) => $query->latest(),
            'histories' => fn ($query) => $query->latest(),
            'refunds' => fn ($query) => $query->latest(),
            'shippingLogs' => fn ($query) => $query->latest(),
        ]);
    }

    public function bulkUpdate(array $ids, array $data, ?int $userId = null): int
    {
        $orders = Order::query()->whereIn('id', $ids)->orWhereIn('order_number', $ids)->get();
        foreach ($orders as $order) {
            $this->updateStatuses($order, $data, $userId);
        }
        return $orders->count();
    }

    public function refund(Order $order, int $amountCents, string $reason, ?string $note = null, ?int $userId = null): Order
    {
        $refunded = (int) $order->refunds()->whereIn('status', ['pending', 'processed'])->sum('amount_cents');
        if ($amountCents <= 0 || $amountCents > max(0, $order->total_cents - $refunded)) {
            throw ValidationException::withMessages(['amount' => ['Invalid refund amount.']]);
        }

        OrderRefund::query()->create([
            'order_id' => $order->id,
            'user_id' => $userId,
            'amount_cents' => $amountCents,
            'status' => 'processed',
            'reason' => $reason,
            'note' => $note,
            'processed_at' => now(),
        ]);

        $newStatus = ($refunded + $amountCents) >= $order->total_cents ? 'refunded' : 'partially_refunded';
        $order->update(['payment_status' => $newStatus, 'status' => $newStatus === 'refunded' ? 'refunded' : $order->status]);
        $this->record($order->fresh(), 'refund', $newStatus, null, 'Refund processed', $note, ['amount_cents' => $amountCents, 'reason' => $reason], $userId);

        return $this->findAdmin($order->id);
    }

    public function logShipment(Order $order, array $data, ?int $userId = null): Order
    {
        ShippingLog::query()->create([
            'order_id' => $order->id,
            'user_id' => $userId,
            'status' => $data['status'],
            'courier' => $data['courier'] ?? null,
            'tracking_number' => $data['tracking_number'] ?? null,
            'tracking_url' => $data['tracking_url'] ?? null,
            'note' => $data['note'] ?? null,
            'shipped_at' => in_array($data['status'], ['shipped', 'delivered'], true) ? now() : null,
            'delivered_at' => $data['status'] === 'delivered' ? now() : null,
        ]);
        $this->updateStatuses($order, ['shipping_status' => $data['status'], 'note' => $data['note'] ?? null], $userId);

        return $this->findAdmin($order->id);
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        $query->when($filters['search'] ?? null, function (Builder $query, string $search): void {
            $query->where(function (Builder $query) use ($search): void {
                $query->where('order_number', 'like', "%{$search}%")
                    ->orWhere('payment_method', 'like', "%{$search}%")
                    ->orWhereHas('user', fn (Builder $user) => $user->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
            });
        });
        foreach (['status', 'payment_status', 'shipping_status', 'payment_method'] as $field) {
            $query->when($filters[$field] ?? null, fn (Builder $query, string $value) => $query->where($field, $value));
        }
        $query->when($filters['shipping_method'] ?? null, fn (Builder $query, string $value) => $query->where('shipping_method_name', 'like', "%{$value}%"));
        $query->when($filters['date_from'] ?? null, fn (Builder $query, string $value) => $query->whereDate('placed_at', '>=', $value));
        $query->when($filters['date_to'] ?? null, fn (Builder $query, string $value) => $query->whereDate('placed_at', '<=', $value));
        $query->when($filters['amount_min'] ?? null, fn (Builder $query, string $value) => $query->where('total_cents', '>=', (int) round(((float) $value) * 100)));
        $query->when($filters['amount_max'] ?? null, fn (Builder $query, string $value) => $query->where('total_cents', '<=', (int) round(((float) $value) * 100)));
    }

    private function historyType(string $field): string
    {
        return match ($field) {
            'payment_status' => 'payment',
            'shipping_status' => 'shipping',
            default => 'order',
        };
    }

    private function titleFor(string $field, string $status): string
    {
        $label = str_replace('_', ' ', $status);
        return ucfirst(str_replace('_', ' ', $field)).' changed to '.ucwords($label);
    }
}
